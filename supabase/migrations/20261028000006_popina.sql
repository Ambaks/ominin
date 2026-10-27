-- Popina : les ventes saisies sur la caisse deviennent des commandes Ominin.
-- HubRise ne fait que l'aller (nos commandes vers la caisse) : Popina n'y
-- pousse pas ses propres ventes. Le retour passe par l'API Popina (lecture
-- seule) et ses webhooks, rattrapés par une relecture horaire.
--
-- Une vente arrive une fois réglée, close : servie, avec ses lignes et ses
-- règlements. Commandes, Paiements et les chiffres la comptent comme les
-- autres ; elle porte source = 'popina' et reste en lecture seule. Elle a
-- déjà vécu sur la caisse : ni numéro du jour, ni ticket cuisine, ni envoi
-- à HubRise, ni fidélité, ni stock.

-- ---------------------------------------------------------------------------
-- Connexion. Une clé d'API par lieu, remise par le support Popina : c'est un
-- secret, RLS activée sans aucune policy — service_role uniquement. Le statut
-- passe par /api/popina/connect (réservée au gérant).
create table public.popina_connections (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  api_key text not null,
  location_id text not null unique,
  location_name text,
  connected_at timestamptz not null default now(),
  -- Posé sur un 401 (clé révoquée), effacé quand le gérant colle une clé :
  -- la relecture horaire passe ces connexions.
  last_failed_at timestamptz,
  last_sale_at timestamptz,
  reconciled_at timestamptz
);

alter table public.popina_connections enable row level security;

-- ---------------------------------------------------------------------------
-- Commandes venues de la caisse.
alter table public.orders
  add column source text check (source = 'popina'),
  add column popina_order_id text unique,
  add check ((source is null) = (popina_order_id is null));

-- Une vente au comptoir de la caisse n'a ni table ni numéro Ominin.
alter table public.orders drop constraint orders_type_table_check;
alter table public.orders add constraint orders_type_table_check check (
  case type
    when 'sur_place' then table_id is not null or order_number is not null or source is not null
    else table_id is null and order_number is null
  end
);

-- Posé par import_till_sales le temps de l'import : les déclencheurs des
-- lignes ne voient pas la commande, ils lisent ce drapeau. Les règlements
-- importés, eux, sont marqués till_payment, que hubrise_enqueue_payments
-- passe déjà.
create function public.till_import_active()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('ominin.till_import', true), '') = 'on'
$$;

-- Les déclencheurs qui n'ont rien à faire d'une vente déjà vécue sur la
-- caisse, recréés à l'identique avec une condition de plus.
drop trigger orders_assign_number on public.orders;
create trigger orders_assign_number
  before insert on public.orders
  for each row when (new.source is null)
  execute function public.assign_order_number();

drop trigger orders_sur_place_offre on public.orders;
create trigger orders_sur_place_offre
  before insert on public.orders
  for each row when (new.source is null)
  execute function public.check_sur_place_offre();

drop trigger orders_bulle_payee on public.orders;
create trigger orders_bulle_payee
  before insert on public.orders
  for each row when (new.table_id is not null and new.source is null)
  execute function public.orders_bulle_payee();

drop trigger hubrise_enqueue_order on public.orders;
create constraint trigger hubrise_enqueue_order
  after insert or update of paid_online, online_payment_started_at on public.orders
  deferrable initially deferred
  for each row when (new.source is null)
  execute function public.hubrise_enqueue_order();

drop trigger orders_sync_tickets on public.orders;
create trigger orders_sync_tickets
  after insert or update of status, paid_online on public.orders
  for each row when (new.source is null)
  execute function public.sync_order_tickets();

drop trigger orders_counter_hold on public.orders;
create trigger orders_counter_hold
  before update of status on public.orders
  for each row when (new.source is null)
  execute function public.hold_numbered_order();

drop trigger orders_restore_stock on public.orders;
create trigger orders_restore_stock
  after update of status on public.orders
  for each row when (new.source is null)
  execute function public.restore_stock_on_cancel();

drop trigger orders_loyalty_cancel on public.orders;
create trigger orders_loyalty_cancel
  after update of status on public.orders
  for each row when (new.source is null)
  execute function public.loyalty_cancel();

drop trigger orders_loyalty_earn on public.orders;
create trigger orders_loyalty_earn
  after update of payment_mode on public.orders
  for each row when (new.source is null)
  execute function public.loyalty_earn();

drop trigger order_items_loyalty_spend on public.order_items;
create trigger order_items_loyalty_spend
  after insert or delete or update of quantity on public.order_items
  for each row when (not public.till_import_active())
  execute function public.loyalty_resync_spend();

-- Lecture seule : la vente se corrige sur la caisse, qui reste la référence.
-- Seul l'import l'écrit (une annulation faite sur la caisse). La suppression
-- reste permise : celle d'un établissement emporte ses commandes.
create function public.till_order_read_only()
returns trigger
language plpgsql
as $$
begin
  -- La suppression d'un serveur ou d'un client fidélité vide sa référence
  -- (on delete set null) : seule écriture permise hors import.
  if not public.till_import_active()
     and to_jsonb(new) - 'staff_id' - 'loyalty_customer_id'
         is distinct from to_jsonb(old) - 'staff_id' - 'loyalty_customer_id' then
    raise exception 'Vente de la caisse : elle se modifie sur la caisse.';
  end if;
  return new;
end;
$$;

create trigger orders_till_read_only
  before update on public.orders
  for each row when (old.source is not null)
  execute function public.till_order_read_only();

create function public.till_lines_read_only()
returns trigger
language plpgsql
as $$
begin
  -- La suppression d'un article de la carte vide item_id (on delete set
  -- null) : seule écriture permise hors import.
  if tg_op = 'UPDATE' and to_jsonb(new) - 'item_id' = to_jsonb(old) - 'item_id' then
    return new;
  end if;
  if not public.till_import_active() and exists (
    select 1 from public.orders
    where id = new.order_id and source is not null
  ) then
    raise exception 'Vente de la caisse : elle se modifie sur la caisse.';
  end if;
  return new;
end;
$$;

create trigger order_items_till_read_only
  before insert or update on public.order_items
  for each row execute function public.till_lines_read_only();

create trigger order_payments_till_read_only
  before insert or update on public.order_payments
  for each row execute function public.till_lines_read_only();

revoke execute on function public.till_order_read_only() from public, anon, authenticated;
revoke execute on function public.till_lines_read_only() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Import des ventes, rejouable : une vente déjà là n'est pas réécrite, sauf
-- annulée après coup. Ignorées : les ventes jamais réglées, et nos propres
-- commandes revenues de la caisse par HubRise (déjà comptées).
-- p_sales : [{popina_order_id, status ('paid' | 'canceled'), table_name,
--   opened_at, paid_at, tips, external_order_id,
--   items: [{name, quantity, unit_price, options}],
--   payments: [{mode ('especes' | 'carte'), amount}]}]
create function public.import_till_sales(
  p_etablissement_id uuid,
  p_sales jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  sale jsonb;
  existing orders;
  v_order uuid;
  v_modes text[];
  imported int := 0;
begin
  perform set_config('ominin.till_import', 'on', true);

  for sale in select * from jsonb_array_elements(p_sales) loop
    -- Le webhook et la relecture horaire peuvent porter la même vente en
    -- même temps : l'un attend l'autre, puis la trouve.
    perform pg_advisory_xact_lock(hashtext('till:' || (sale->>'popina_order_id')));

    if sale->>'external_order_id' is not null and exists (
      select 1 from orders
      where etablissement_id = p_etablissement_id
        and source is null
        and (hubrise_order_id = sale->>'external_order_id'
             or id = case
               when sale->>'external_order_id'
                    ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               then (sale->>'external_order_id')::uuid
             end)
    ) then
      continue;
    end if;

    select * into existing
    from orders
    where popina_order_id = sale->>'popina_order_id'
      and etablissement_id = p_etablissement_id
    for update;

    if found then
      if sale->>'status' = 'canceled' and existing.status <> 'annulee' then
        update orders set status = 'annulee' where id = existing.id;
      end if;
      -- Relue d'abord par l'API, qui ne donne pas la table : le webhook
      -- arrivé ensuite la complète.
      if existing.table_id is null and sale->>'table_name' is not null then
        update orders set table_id = (
          select id from tables
          where etablissement_id = p_etablissement_id
            and number::text = sale->>'table_name'
        )
        where id = existing.id;
      end if;
      continue;
    end if;
    if sale->>'status' <> 'paid' then
      continue;
    end if;

    select array_agg(distinct payment->>'mode') into v_modes
    from jsonb_array_elements(sale->'payments') payment;

    insert into orders (
      etablissement_id, type, table_id, status, payment_mode, created_at,
      tip_amount, source, popina_order_id
    ) values (
      p_etablissement_id,
      'sur_place',
      (select id from tables
       where etablissement_id = p_etablissement_id
         and number::text = sale->>'table_name'),
      'servie',
      case
        when cardinality(v_modes) > 1 then 'mixte'
        else v_modes[1]::payment_mode
      end,
      coalesce((sale->>'opened_at')::timestamptz, (sale->>'paid_at')::timestamptz, now()),
      nullif((sale->>'tips')::numeric, 0),
      'popina',
      sale->>'popina_order_id'
    )
    returning id into v_order;

    -- L'article de la carte, quand la caisse le nomme comme nous : les
    -- meilleures ventes le comptent avec ceux commandés au menu.
    insert into order_items (order_id, item_id, name, quantity, unit_price, options)
    select v_order,
      (select min(id::text)::uuid from items
       where etablissement_id = p_etablissement_id
         and lower(name) = lower(line->>'name')
       having count(*) = 1),
      line->>'name',
      (line->>'quantity')::int,
      (line->>'unit_price')::numeric,
      coalesce(line->'options', '[]')
    from jsonb_array_elements(sale->'items') line;

    insert into order_payments (order_id, mode, amount, paid_at, till_payment)
    select v_order,
      (payment->>'mode')::payment_mode,
      (payment->>'amount')::numeric,
      coalesce((sale->>'paid_at')::timestamptz, now()),
      true
    from jsonb_array_elements(sale->'payments') payment;

    imported := imported + 1;
  end loop;

  -- Le drapeau vaut jusqu'à la fin de la transaction : rendu tout de suite,
  -- pour qu'aucune autre écriture ne passe les gardes.
  perform set_config('ominin.till_import', '', true);
  return imported;
end;
$$;

revoke execute on function public.import_till_sales(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.import_till_sales(uuid, jsonb) to service_role;
