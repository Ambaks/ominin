-- Espèces + carte sur la même addition. Jusqu'ici « qui a réglé quoi » ne
-- vivait que sur les lignes (order_items.paid_mode) et les montants s'en
-- déduisaient par somme. Un client qui pose 20 € en liquide et passe les 30 €
-- restants en carte n'avait donc nulle part où s'écrire : la coupure ne tombe
-- pas sur une frontière de ligne.
--
-- order_payments porte désormais les montants — une ligne par jambe de
-- règlement. Les lignes gardent leur rôle, dire ce qui est réglé et ce qui
-- attend encore, et « mixte » n'a plus à encoder un montant.

-- ---------------------------------------------------------------------------
-- Le registre. Une jambe n'est jamais « mixte » : c'est précisément ce que
-- deux jambes remplacent. Les montants sont hors pourboire, comme les totaux
-- par mode de la page Paiements — le pourboire reste sur orders.tip_amount,
-- d'où le partage par serveur le relève.

create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  mode public.payment_mode not null check (mode <> 'mixte'),
  amount numeric(10,2) not null check (amount > 0),
  -- Espèces seules : ce que le client a tendu, ce qu'on lui a rendu. Porté
  -- par la première jambe espèces du règlement, pour qu'un encaissement à
  -- cheval sur deux commandes ne compte pas deux fois la coupure reçue.
  cash_given numeric(10,2),
  cash_change numeric(10,2),
  paid_at timestamptz not null default now(),
  constraint order_payments_cash_only check (
    mode = 'especes' or (cash_given is null and cash_change is null)
  )
);

create index order_payments_order_idx on public.order_payments (order_id);

alter table public.order_payments enable row level security;

-- Lecture pour les membres de l'établissement ; aucune policy d'écriture :
-- seules les fonctions d'encaissement (security definer) posent des jambes.
create policy "member read" on public.order_payments
  for select to authenticated
  using (order_id in (
    select id from public.orders
    where etablissement_id in (select public.member_etablissements())
  ));

-- L'historique se relit depuis les lignes : un mode par ligne, donc une jambe
-- par (commande, mode). Le registre devient ainsi la seule source des totaux,
-- sans que la page Paiements ait deux façons de compter.
insert into public.order_payments (
  order_id, mode, amount, cash_given, cash_change, paid_at
)
select
  oi.order_id,
  oi.paid_mode,
  sum(oi.quantity * oi.unit_price),
  case when oi.paid_mode = 'especes' then max(o.cash_given) end,
  case when oi.paid_mode = 'especes' then max(o.cash_change) end,
  coalesce(max(oi.paid_at), max(o.created_at))
from public.order_items oi
join public.orders o on o.id = oi.order_id
where oi.paid_mode is not null
group by oi.order_id, oi.paid_mode;

-- Un encaissement effacé (gérant, page Paiements : voidCashPayment remet
-- payment_mode à null) emporte ses jambes — la caisse ne doit pas garder la
-- trace d'un règlement annulé, et le client n'a pas de droit d'écriture ici.
create function public.clear_order_payments()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.payment_mode is not null and new.payment_mode is null then
    delete from order_payments where order_id = new.id;
  end if;
  return new;
end;
$$;

create trigger orders_clear_payments
  after update of payment_mode on public.orders
  for each row execute function public.clear_order_payments();

-- ---------------------------------------------------------------------------
-- Une ligne réglée dans un paiement mixte porte « mixte » : c'est justement
-- ce que order_items_paid_mode_simple (20260904000003_item_payments.sql)
-- interdisait, faute d'un endroit où écrire les montants. Le registre l'offre,
-- la contrainte n'a plus de raison d'être — la ligne dit qu'elle est réglée,
-- order_payments dit avec quoi.

alter table public.order_items drop constraint order_items_paid_mode_simple;

-- ---------------------------------------------------------------------------
-- Encaissement. Reprise de 20260908000001_service_direct.sql : p_mode accepte
-- « mixte », p_cash_amount porte alors la part réglée en espèces (pourboire
-- compris, c'est ce que le client annonce), et chaque règlement pose ses
-- jambes dans order_payments — mode unique compris, pour que le registre soit
-- complet. L'ancienne signature est supprimée : deux surcharges rendraient
-- l'appel ambigu pour PostgREST.

drop function public.pay_order_items(jsonb, public.payment_mode, numeric, numeric, numeric);

create function public.pay_order_items(
  p_items jsonb,
  p_mode public.payment_mode,
  p_cash_given numeric default null,
  p_cash_change numeric default null,
  p_tip numeric default null,
  p_cash_amount numeric default null
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
  v_tip numeric;
  v_goods numeric;
  v_due numeric;
  v_cash_left numeric;
  v_cash numeric;
  v_cash_noted boolean := false;
  v_mode public.payment_mode;
  v_sel record;
  v_line public.order_items;
begin
  if p_mode not in ('especes', 'carte', 'mixte') then
    raise exception 'Mode de paiement invalide.';
  end if;
  if p_mode = 'carte' and (p_cash_given is not null or p_cash_change is not null) then
    raise exception 'Montants en espèces sans règlement en espèces.';
  end if;
  if p_mode <> 'mixte' and p_cash_amount is not null then
    raise exception 'Répartition espèces/carte hors règlement mixte.';
  end if;
  v_tip := coalesce(p_tip, 0);
  if v_tip < 0 then
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

  -- Marchandise de la sélection, aux quantités réglées : la base du partage.
  select sum(oi.unit_price * (t.value->>'quantity')::int) into v_goods
  from jsonb_array_elements(p_items) as t(value)
  join order_items oi on oi.id = (t.value->>'item_id')::uuid;
  v_due := v_goods + v_tip;

  if p_mode = 'mixte' then
    if p_cash_amount is null or p_cash_amount <= 0 or p_cash_amount >= v_due then
      raise exception 'La part en espèces doit être strictement comprise entre 0 et le total.';
    end if;
    if p_cash_given is not null and p_cash_given < p_cash_amount then
      raise exception 'Le montant reçu est inférieur à la part en espèces.';
    end if;
  end if;

  v_printed := printer_online(v_etab);

  -- Le pourboire du règlement va à la plus ancienne commande touchée ; posé
  -- avant la clôture, que le trigger de droits du serveur interdit de
  -- retoucher une fois la commande payée.
  if v_tip > 0 then
    select id into v_tip_order from orders
    where id = any(v_order_ids)
    order by created_at
    limit 1;
    update orders
    set tip_amount = coalesce(tip_amount, 0) + v_tip
    where id = v_tip_order;
  end if;

  -- Jambes du règlement, commande par commande de la plus ancienne à la plus
  -- récente : les espèces couvrent la marchandise jusqu'à épuisement de leur
  -- part, la carte prend la suite. Ce qu'il reste d'espèces après la dernière
  -- ligne va au pourboire, hors registre — c'est bien le partage annoncé par
  -- le client, lu de haut en bas de l'addition.
  v_cash_left := case p_mode
    when 'especes' then v_due
    when 'mixte' then p_cash_amount
    else 0
  end;
  for v_sel in
    select o.id as order_id,
           sum(oi.unit_price * (t.value->>'quantity')::int) as goods
    from jsonb_array_elements(p_items) as t(value)
    join order_items oi on oi.id = (t.value->>'item_id')::uuid
    join orders o on o.id = oi.order_id
    group by o.id, o.created_at
    order by o.created_at
  loop
    v_cash := least(v_cash_left, v_sel.goods);
    v_cash_left := v_cash_left - v_cash;
    if v_cash > 0 then
      insert into order_payments (order_id, mode, amount, cash_given, cash_change)
      values (
        v_sel.order_id, 'especes', v_cash,
        case when v_cash_noted then null else p_cash_given end,
        case when v_cash_noted then null else p_cash_change end
      );
      v_cash_noted := true;
    end if;
    if v_sel.goods > v_cash then
      insert into order_payments (order_id, mode, amount)
      values (v_sel.order_id, 'carte', v_sel.goods - v_cash);
    end if;
  end loop;

  -- Chaque ligne sélectionnée, à concurrence de la quantité réglée. Une part
  -- seulement ⇒ la ligne est scindée : la part réglée devient une ligne à
  -- part, le reste attend son tour et peut partir dans un autre mode. Un
  -- règlement mixte marque ses lignes « mixte » : le détail des montants est
  -- dans le registre, la ligne dit seulement qu'elle est réglée.
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

revoke execute on function public.pay_order_items(jsonb, public.payment_mode, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.pay_order_items(jsonb, public.payment_mode, numeric, numeric, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- Règlement en ligne : même clôture qu'avant, et sa jambe au registre pour
-- que les totaux par mode se lisent au même endroit que le comptoir.

create or replace function public.mark_order_paid_online(p_order_id uuid, p_tip numeric default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_printed boolean;
  v_amount numeric;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  v_printed := v_order.type = 'sur_place'
    and v_order.status = 'en_attente'
    and printer_online(v_order.etablissement_id);

  select coalesce(sum(quantity * unit_price), 0) into v_amount
  from order_items
  where order_id = p_order_id and paid_mode is null;

  update order_items
  set paid_mode = 'en_ligne',
      paid_at = now(),
      served_at = case when v_printed then now() else served_at end
  where order_id = p_order_id and paid_mode is null;

  if v_amount > 0 then
    insert into order_payments (order_id, mode, amount)
    values (p_order_id, 'en_ligne', v_amount);
  end if;

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
