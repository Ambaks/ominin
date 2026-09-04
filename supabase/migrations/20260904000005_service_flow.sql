-- Flux de service « on encaisse d'abord », et une salle sans écran cuisine.
-- Les tickets sortent sur l'imprimante (Omilink) : le cuisinier n'a plus de
-- vue commandes. Sur place, une commande naît « en attente » (à encaisser),
-- passe « payée » à l'encaissement — c'est là qu'elle part en cuisine — puis
-- « servie » quand tout est arrivé à table. Le serveur n'a que deux gestes,
-- article par article : Encaisser, Servie. Le click & collect, payé en ligne
-- à la commande, garde son cycle en_attente → en_preparation → prete →
-- retiree. Les groupes de tables et l'affectation des serveurs disparaissent :
-- une addition, une table.

-- ---------------------------------------------------------------------------
-- Service par article.

alter table public.order_items add column served_at timestamptz;

-- ---------------------------------------------------------------------------
-- Groupes de tables et affectation des serveurs : retirés.

drop trigger if exists orders_snapshot_server on public.orders;
drop function if exists public.snapshot_order_server();
drop function if exists public.create_table_group(uuid[], boolean);
drop trigger if exists tables_enforce_update_rights on public.tables;
drop function if exists public.enforce_table_update_rights();

alter table public.orders drop column group_id, drop column server_id;
alter table public.tables drop column group_id, drop column server_id;
drop table public.table_groups;

-- Sans groupement ni affectation, seul le gérant modifie les tables ; le
-- serveur en ouvre au besoin via place_order (nouveau numéro).
drop policy "gerant serveur update" on public.tables;
create policy "gerant update" on public.tables
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

-- ---------------------------------------------------------------------------
-- Données existantes : une commande sur place en cuisine ou servie mais non
-- réglée redevient « à encaisser » ; réglée en ligne, elle est « à servir ».

alter table public.orders disable trigger orders_enforce_transition;
update public.orders
set status = (case when paid_online then 'payee' else 'en_attente' end)::public.order_status
where type = 'sur_place'
  and status in ('en_attente', 'en_preparation', 'prete', 'servie')
  and status <> (case when paid_online then 'payee' else 'en_attente' end)::public.order_status;
alter table public.orders enable trigger orders_enforce_transition;

update public.order_items oi
set paid_mode = 'en_ligne', paid_at = o.created_at
from public.orders o
where o.id = oi.order_id
  and o.paid_online
  and o.status = 'payee'
  and oi.paid_mode is null;

-- ---------------------------------------------------------------------------
-- Transitions. Sur place : en_attente → payee (encaissement) → servie ;
-- l'annulation reste ouverte à chaque étape (le gérant peut annuler un
-- encaissement, voir enforce_order_update_rights). Collect : inchangé.

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
    when 'en_attente' then new.status in ('payee', 'annulee')
    when 'payee' then new.status in ('servie', 'annulee')
    when 'servie' then new.status = 'annulee'
    else false
  end) then
    raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
  end if;
  return new;
end;
$$;

-- Droits par rôle. Le cuisinier n'a plus la main sur les commandes (les
-- tickets s'impriment). Le serveur encaisse (en_attente → payee, colonnes de
-- paiement), sert (payee → servie) et suit le collect (en_preparation,
-- prete, retiree, estimation) ; il ne touche pas aux commandes closes et
-- n'annule pas — réservé au gérant.
create or replace function public.enforce_order_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  v_role := current_member_role(new.etablissement_id);
  if v_role = 'gerant' then
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at'
         is distinct from to_jsonb(old) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at'
       or old.status in ('servie', 'annulee', 'retiree')
       or (new.status <> old.status
           and new.status not in ('payee', 'servie', 'en_preparation', 'prete', 'retiree')) then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;

-- ---------------------------------------------------------------------------
-- Encaissement d'une sélection d'articles : commandes sur place en attente,
-- non réglées en ligne. Une commande dont toutes les lignes sont réglées passe
-- « payée » — et part en cuisine (ticket, voir enqueue_order_tickets).

create or replace function public.pay_order_items(
  p_item_ids uuid[],
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
  v_order_ids uuid[];
  v_order_id uuid;
  v_tip_order uuid;
  v_mode public.payment_mode;
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
  if array_length(p_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  if exists (
    select 1 from unnest(p_item_ids) as t(id)
    where not exists (select 1 from order_items oi where oi.id = t.id)
  ) then
    raise exception 'Article introuvable.';
  end if;

  select array_agg(id) into v_order_ids
  from (
    select distinct o.id
    from orders o
    join order_items oi on oi.order_id = o.id
    where oi.id = any(p_item_ids)
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
  if exists (
    select 1 from order_items where id = any(p_item_ids) and paid_mode is not null
  ) then
    raise exception 'Certains articles sont déjà encaissés.';
  end if;

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

  update order_items
  set paid_mode = p_mode, paid_at = now()
  where id = any(p_item_ids);

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
    update orders
    set status = 'payee',
        payment_mode = v_mode,
        cash_given = case when p_mode = 'especes' then p_cash_given end,
        cash_change = case when p_mode = 'especes' then p_cash_change end
    where id = v_order_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service d'une sélection d'articles : commandes sur place payées. Une
-- commande dont toutes les lignes sont servies passe « servie » : close.

create function public.serve_order_items(p_item_ids uuid[])
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_role public.member_role;
  v_order_ids uuid[];
  v_order_id uuid;
begin
  if array_length(p_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  if exists (
    select 1 from unnest(p_item_ids) as t(id)
    where not exists (select 1 from order_items oi where oi.id = t.id)
  ) then
    raise exception 'Article introuvable.';
  end if;

  select array_agg(id) into v_order_ids
  from (
    select distinct o.id
    from orders o
    join order_items oi on oi.order_id = o.id
    where oi.id = any(p_item_ids)
  ) s;

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
    where id = any(v_order_ids) and (type <> 'sur_place' or status <> 'payee')
  ) then
    raise exception 'Seuls les articles d''une commande payée se servent.';
  end if;
  if exists (
    select 1 from order_items where id = any(p_item_ids) and served_at is not null
  ) then
    raise exception 'Certains articles sont déjà servis.';
  end if;

  update order_items set served_at = now() where id = any(p_item_ids);

  for v_order_id in
    select id from orders where id = any(v_order_ids) order by created_at
  loop
    if not exists (
      select 1 from order_items where order_id = v_order_id and served_at is null
    ) then
      update orders set status = 'servie' where id = v_order_id;
    end if;
  end loop;
end;
$$;

revoke execute on function public.serve_order_items(uuid[]) from public, anon;
grant execute on function public.serve_order_items(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Règlement en ligne confirmé (webhook Stripe connecté, vérification SumUp) :
-- pose le drapeau, le mode, le pourboire choisi par le client, marque les
-- lignes, et fait partir la commande en cuisine (payee) si elle attendait son
-- encaissement. Idempotente. Backend uniquement (clé service).

create function public.mark_order_paid_online(p_order_id uuid, p_tip numeric default null)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform 1 from orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  update orders
  set paid_online = true,
      payment_mode = 'carte',
      tip_amount = case when coalesce(p_tip, 0) > 0 then p_tip else tip_amount end,
      status = case
        when type = 'sur_place' and status = 'en_attente' then 'payee'
        else status
      end
  where id = p_order_id;
  update order_items
  set paid_mode = 'en_ligne', paid_at = now()
  where order_id = p_order_id and paid_mode is null;
end;
$$;

revoke execute on function public.mark_order_paid_online(uuid, numeric)
  from public, anon, authenticated;
grant execute on function public.mark_order_paid_online(uuid, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- Tickets cuisine : une commande sur place s'imprime à son encaissement
-- (passage à payee), une commande collect dès sa création (payée en ligne).
-- Un ticket encore en attente n'a plus de raison de sortir quand la commande
-- est servie, retirée ou annulée.

create or replace function public.enqueue_order_tickets()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.type <> 'collect' then
    return new;
  end if;
  if tg_op = 'UPDATE' and (new.status <> 'payee' or old.status = 'payee') then
    return new;
  end if;
  insert into print_jobs (etablissement_id, printer_id, order_id, kind)
  select new.etablissement_id, id, new.id, 'order'
  from printers where etablissement_id = new.etablissement_id;
  return new;
end;
$$;

drop trigger orders_enqueue_tickets on public.orders;
create trigger orders_enqueue_tickets
  after insert or update of status on public.orders
  for each row execute function public.enqueue_order_tickets();

create or replace function public.cancel_order_tickets()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status not in ('en_attente', 'en_preparation', 'payee') then
    update print_jobs set status = 'cancelled'
    where order_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order : depuis la salle, le serveur ou le gérant ouvre une table qui
-- n'existe pas encore (nouveau numéro) ; le client du menu QR, lui, scanne
-- forcément une table connue. Copie de 20260817000001_sumup.sql, seule la
-- résolution de la table change.

create or replace function public.place_order(
  p_slug text,
  p_table_number int,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_offre public.offre;
  v_table uuid;
  v_order uuid;
  v_line jsonb;
  v_item public.items;
  v_qty int;
  v_supplement numeric;
  v_options jsonb;
  v_choice jsonb;
  v_group jsonb;
  v_opt jsonb;
  v_found boolean;
  v_count int;
  v_role public.member_role;
begin
  select id, offre into v_etab, v_offre from etablissements where slug = p_slug;
  if v_etab is null then
    raise exception 'Établissement introuvable.';
  end if;
  -- La commande à table est une capacité des offres Smart et Connect.
  if v_offre not in ('smart', 'connect') then
    raise exception 'La commande en ligne n''est pas activée pour cet établissement.';
  end if;

  select id into v_table from tables
  where etablissement_id = v_etab and number = p_table_number;
  if v_table is null then
    v_role := current_member_role(v_etab);
    if p_table_number < 1 or v_role is null or v_role not in ('gerant', 'serveur') then
      raise exception 'Table introuvable.';
    end if;
    insert into tables (etablissement_id, number)
    values (v_etab, p_table_number)
    returning id into v_table;
  end if;

  v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_count = 0 then
    raise exception 'Commande vide.';
  end if;
  if v_count > 50 then
    raise exception 'Trop d''articles dans la commande.';
  end if;

  insert into orders (etablissement_id, table_id)
  values (v_etab, v_table)
  returning id into v_order;

  for v_line in select value from jsonb_array_elements(p_items) as t(value)
  loop
    v_qty := coalesce((v_line->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Quantité invalide.';
    end if;

    -- for update : sérialise les commandes concurrentes sur le même item,
    -- le test de stock ci-dessous lit donc une valeur à jour.
    select * into v_item from items
    where id = (v_line->>'item_id')::uuid and etablissement_id = v_etab
    for update;
    if not found then
      raise exception 'Article introuvable.';
    end if;
    if not v_item.disponible then
      raise exception 'Article indisponible : %.', v_item.name;
    end if;
    if v_item.stock is not null and v_item.stock < v_qty then
      raise exception 'Stock insuffisant pour : %.', v_item.name;
    end if;

    -- Options : valider chaque choix contre item.options et figer nom + supplément.
    v_supplement := 0;
    v_options := '[]'::jsonb;
    for v_choice in
      select value from jsonb_array_elements(coalesce(v_line->'choices', '[]'::jsonb)) as t(value)
    loop
      v_found := false;
      for v_group in select value from jsonb_array_elements(v_item.options) as t(value)
      loop
        if v_group->>'id' = v_choice->>'group_id' then
          for v_opt in select value from jsonb_array_elements(v_group->'choices') as t(value)
          loop
            if v_opt->>'id' = v_choice->>'choice_id' then
              v_supplement := v_supplement + coalesce((v_opt->>'supplement')::numeric, 0);
              v_options := v_options || jsonb_build_array(jsonb_build_object(
                'groupName', v_group->>'name',
                'choiceName', v_opt->>'name',
                'supplement', coalesce((v_opt->>'supplement')::numeric, 0)
              ));
              v_found := true;
            end if;
          end loop;
        end if;
      end loop;
      if not v_found then
        raise exception 'Option invalide pour : %.', v_item.name;
      end if;
    end loop;

    -- Groupes obligatoires : un choix requis.
    for v_group in select value from jsonb_array_elements(v_item.options) as t(value)
    loop
      if coalesce((v_group->>'obligatoire')::boolean, false)
         and not exists (
           select 1
           from jsonb_array_elements(coalesce(v_line->'choices', '[]'::jsonb)) as c(value)
           where c.value->>'group_id' = v_group->>'id'
         ) then
        raise exception 'Choix obligatoire manquant pour : %.', v_item.name;
      end if;
    end loop;

    insert into order_items (order_id, item_id, name, quantity, unit_price, options, vat_rate)
    values (v_order, v_item.id, v_item.name, v_qty, v_item.price + v_supplement, v_options, v_item.vat_rate);

    if v_item.stock is not null then
      update items set stock = stock - v_qty where id = v_item.id;
    end if;
  end loop;

  return v_order;
end;
$$;
