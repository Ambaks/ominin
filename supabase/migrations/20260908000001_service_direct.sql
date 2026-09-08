-- La salle ne suit plus les commandes que l'imprimante a prises en charge.
-- Une commande sur place encaissée part en cuisine (ticket Omilink) et se
-- clôt dans la foulée : elle passe directement à l'historique, l'onglet
-- « À servir » n'a rien à montrer. Il ne reprend son rôle de filet que
-- lorsque aucun boîtier vivant ne peut sortir le ticket : la commande reste
-- alors « payée », à servir article par article comme avant.
--
-- L'encaissement se fait aussi à l'unité : deux nems commandés ensemble ne
-- se règlent plus forcément ensemble (voir pay_order_items, qui scinde la
-- ligne quand une partie seulement est réglée).

-- ---------------------------------------------------------------------------
-- Le ticket sortira-t-il ? Un boîtier qui s'annonce encore dessert au moins
-- une imprimante. La fenêtre est celle de l'onglet Terminaux
-- (TERMINAL_ONLINE_WINDOW_MS dans frontend/lib/gestion/constants.ts) : le
-- boîtier s'annonce toutes les quelques secondes, une minute de silence est
-- une panne.

create function public.printer_online(p_etablissement_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from printers p
    join omilink_devices d on d.id = p.device_id
    where p.etablissement_id = p_etablissement_id
      and d.last_seen_at > now() - interval '1 minute'
  );
$$;

revoke execute on function public.printer_online(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Transitions. Sur place, l'encaissement clôt la commande d'un coup quand son
-- ticket part en cuisine : en_attente → servie devient un chemin légitime, à
-- côté de en_attente → payee → servie (imprimante muette).

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.type = 'collect' then
    if not (case old.status
      when 'en_attente' then new.status in ('en_preparation', 'annulee')
      when 'en_preparation' then new.status in ('prete', 'annulee')
      when 'prete' then new.status in ('retiree', 'annulee')
      else false
    end) then
      raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
    end if;
  elsif not (case old.status
    when 'en_attente' then new.status in ('payee', 'servie', 'annulee')
    when 'payee' then new.status in ('servie', 'annulee')
    when 'servie' then new.status = 'annulee'
    else false
  end) then
    raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tickets cuisine : un seul trigger, pour que l'ordre des deux gestes soit lu
-- dans le code et non déduit du nom des triggers. Une commande close abandonne
-- d'abord ce qui n'est pas encore sorti — un ticket resté en file pendant une
-- panne n'a plus lieu d'être imprimé une fois la table servie — puis le
-- règlement met le sien en file. Une commande qui se clôt d'un trait
-- (en_attente → servie) n'a rien à abandonner : son ticket est créé ensuite.

create or replace function public.sync_order_tickets()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status in ('servie', 'retiree', 'annulee') then
    update print_jobs set status = 'cancelled'
    where order_id = new.id and status = 'pending';
  end if;
  if (tg_op = 'INSERT' and new.type = 'collect')
     or (tg_op = 'UPDATE' and old.status = 'en_attente'
         and new.status in ('payee', 'servie')) then
    insert into print_jobs (etablissement_id, printer_id, order_id, kind)
    select new.etablissement_id, id, new.id, 'order'
    from printers where etablissement_id = new.etablissement_id;
  end if;
  return new;
end;
$$;

drop trigger orders_enqueue_tickets on public.orders;
drop trigger orders_cancel_tickets on public.orders;
drop function public.enqueue_order_tickets();
drop function public.cancel_order_tickets();

create trigger orders_sync_tickets
  after insert or update of status on public.orders
  for each row execute function public.sync_order_tickets();

-- ---------------------------------------------------------------------------
-- Encaissement. Reprise de 20260904000005_service_flow.sql, deux évolutions :
-- la sélection porte sur des quantités (`[{item_id, quantity}]`) et non plus
-- sur des lignes entières, et la commande entièrement réglée passe « servie »
-- plutôt que « payée » quand son ticket part vraiment en cuisine.
-- L'ancienne signature est supprimée : deux surcharges rendraient l'appel
-- ambigu pour PostgREST.

drop function public.pay_order_items(uuid[], public.payment_mode, numeric, numeric, numeric);

create function public.pay_order_items(
  p_items jsonb,
  p_mode public.payment_mode,
  p_cash_given numeric default null,
  p_cash_change numeric default null,
  p_tip numeric default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_role public.member_role;
  v_printed boolean;
  v_item_ids uuid[];
  v_order_ids uuid[];
  v_order_id uuid;
  v_tip_order uuid;
  v_mode public.payment_mode;
  v_sel record;
  v_line public.order_items;
begin
  if p_mode not in ('especes', 'carte') then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_mode <> 'especes' and (p_cash_given is not null or p_cash_change is not null) then
    raise exception 'Montants en espèces sans règlement en espèces.';
  end if;
  if p_tip is not null and p_tip < 0 then
    raise exception 'Pourboire invalide.';
  end if;

  select array_agg(distinct (value->>'item_id')::uuid) into v_item_ids
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as t(value);
  if array_length(v_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  -- Une même ligne deux fois dans la sélection fausserait le découpage.
  if array_length(v_item_ids, 1) <> jsonb_array_length(p_items) then
    raise exception 'Sélection invalide.';
  end if;
  if exists (
    select 1 from unnest(v_item_ids) as t(id)
    where not exists (select 1 from order_items oi where oi.id = t.id)
  ) then
    raise exception 'Article introuvable.';
  end if;

  select array_agg(id) into v_order_ids
  from (
    select distinct o.id
    from orders o
    join order_items oi on oi.order_id = o.id
    where oi.id = any(v_item_ids)
  ) s;

  -- Verrou : deux encaissements simultanés de la même table se sérialisent,
  -- le second voit les articles déjà réglés par le premier.
  perform 1 from orders where id = any(v_order_ids) for update;

  select etablissement_id into v_etab from orders where id = v_order_ids[1];
  if exists (
    select 1 from orders
    where id = any(v_order_ids) and etablissement_id <> v_etab
  ) then
    raise exception 'Les articles doivent appartenir au même établissement.';
  end if;
  -- Un non-membre n'a pas de rôle : le null ne doit pas passer le test.
  v_role := current_member_role(v_etab);
  if v_role is null or v_role not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;
  if exists (
    select 1 from orders
    where id = any(v_order_ids)
      and (type <> 'sur_place' or status <> 'en_attente' or paid_online)
  ) then
    raise exception 'Seules les commandes en attente d''encaissement se règlent ici.';
  end if;

  v_printed := printer_online(v_etab);

  -- Le pourboire du règlement va à la plus ancienne commande touchée ; posé
  -- avant la clôture, que le trigger de droits du serveur interdit de
  -- retoucher une fois la commande payée.
  if coalesce(p_tip, 0) > 0 then
    select id into v_tip_order from orders
    where id = any(v_order_ids)
    order by created_at
    limit 1;
    update orders
    set tip_amount = coalesce(tip_amount, 0) + p_tip
    where id = v_tip_order;
  end if;

  -- Chaque ligne sélectionnée, à concurrence de la quantité réglée. Une part
  -- seulement ⇒ la ligne est scindée : la part réglée devient une ligne à
  -- part, le reste attend son tour et peut partir dans un autre mode.
  for v_sel in
    select (value->>'item_id')::uuid as item_id, (value->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) as t(value)
  loop
    select * into v_line from order_items where id = v_sel.item_id;
    if v_line.paid_mode is not null then
      raise exception 'Certains articles sont déjà encaissés.';
    end if;
    if v_sel.quantity is null or v_sel.quantity < 1
       or v_sel.quantity > v_line.quantity then
      raise exception 'Quantité invalide.';
    end if;
    if v_sel.quantity = v_line.quantity then
      update order_items
      set paid_mode = p_mode, paid_at = now()
      where id = v_line.id;
    else
      update order_items
      set quantity = quantity - v_sel.quantity
      where id = v_line.id;
      insert into order_items (
        order_id, item_id, name, quantity, unit_price, options, vat_rate,
        paid_mode, paid_at
      )
      values (
        v_line.order_id, v_line.item_id, v_line.name, v_sel.quantity,
        v_line.unit_price, v_line.options, v_line.vat_rate, p_mode, now()
      );
    end if;
  end loop;

  for v_order_id in
    select id from orders where id = any(v_order_ids) order by created_at
  loop
    if exists (
      select 1 from order_items where order_id = v_order_id and paid_mode is null
    ) then
      continue;
    end if;
    -- Ce règlement a touché la commande : un seul mode distinct, c'est le sien.
    select case when count(distinct paid_mode) = 1 then p_mode else 'mixte' end
      into v_mode
    from order_items
    where order_id = v_order_id;
    -- Le ticket part en cuisine : plus rien à suivre en salle, la commande
    -- rejoint l'historique. Ses articles sont servis d'office — c'est la
    -- cuisine qui les porte à table, pas un écran.
    if v_printed then
      update order_items set served_at = now() where order_id = v_order_id;
    end if;
    update orders
    set status = (case when v_printed then 'servie' else 'payee' end)::public.order_status,
        payment_mode = v_mode,
        cash_given = case when p_mode = 'especes' then p_cash_given end,
        cash_change = case when p_mode = 'especes' then p_cash_change end
    where id = v_order_id;
  end loop;
end;
$$;

revoke execute on function public.pay_order_items(jsonb, public.payment_mode, numeric, numeric, numeric) from public, anon;
grant execute on function public.pay_order_items(jsonb, public.payment_mode, numeric, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- Règlement en ligne : même clôture. Copie de 20260904000005_service_flow.sql.

create or replace function public.mark_order_paid_online(p_order_id uuid, p_tip numeric default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_printed boolean;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  v_printed := v_order.type = 'sur_place'
    and v_order.status = 'en_attente'
    and printer_online(v_order.etablissement_id);

  update order_items
  set paid_mode = 'en_ligne',
      paid_at = now(),
      served_at = case when v_printed then now() else served_at end
  where order_id = p_order_id and paid_mode is null;

  update orders
  set paid_online = true,
      payment_mode = 'carte',
      tip_amount = case when coalesce(p_tip, 0) > 0 then p_tip else tip_amount end,
      status = case
        when type <> 'sur_place' or status <> 'en_attente' then status
        when v_printed then 'servie'
        else 'payee'
      end
  where id = p_order_id;
end;
$$;
