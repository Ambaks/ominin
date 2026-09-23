-- Sécurise chaque encaissement par un code dédié de quatre chiffres, permet
-- d'annuler une unité avant règlement et rattache les tarifs « journée
-- entière » à la journée de service du restaurant.

-- ---------------------------------------------------------------------------
-- Code d'encaissement

create table public.payment_pins (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.payment_pins enable row level security;

alter table public.etablissements
  add column payment_pin_set boolean not null default false;

create function public.set_payment_pin(
  p_etablissement_id uuid,
  p_code text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_admin_hash text;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_code is null or p_code !~ '^[0-9]{4}$' then
    raise exception 'Le code d''encaissement doit compter exactement 4 chiffres.';
  end if;
  select pin_hash into v_admin_hash
  from admin_pins
  where etablissement_id = p_etablissement_id;
  if v_admin_hash is not null
     and extensions.crypt(p_code, v_admin_hash) = v_admin_hash then
    raise exception 'Le code d''encaissement doit être différent du code Admin.';
  end if;
  insert into payment_pins (etablissement_id, pin_hash)
  values (
    p_etablissement_id,
    extensions.crypt(p_code, extensions.gen_salt('bf'))
  )
  on conflict (etablissement_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  update etablissements
  set payment_pin_set = true
  where id = p_etablissement_id;
end;
$$;

revoke execute on function public.set_payment_pin(uuid, text)
  from public, anon;
grant execute on function public.set_payment_pin(uuid, text)
  to authenticated;

create function public.verify_payment_pin(
  p_etablissement_id uuid,
  p_code text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if current_member_role(p_etablissement_id) is null then
    return false;
  end if;
  select pin_hash into v_hash
  from payment_pins
  where etablissement_id = p_etablissement_id;
  return v_hash is not null
    and p_code is not null
    and extensions.crypt(p_code, v_hash) = v_hash;
end;
$$;

revoke execute on function public.verify_payment_pin(uuid, text)
  from public, anon;
grant execute on function public.verify_payment_pin(uuid, text)
  to authenticated;

-- Empêche aussi de remplacer ultérieurement le code Admin par le code caisse.
create or replace function public.set_admin_pin(
  p_etablissement_id uuid,
  p_code text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_payment_hash text;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    delete from admin_pins where etablissement_id = p_etablissement_id;
    update etablissements
    set admin_pin_set = false
    where id = p_etablissement_id;
    return;
  end if;
  if p_code !~ '^[0-9]{4,8}$' then
    raise exception 'Le code doit compter de 4 à 8 chiffres.';
  end if;
  select pin_hash into v_payment_hash
  from payment_pins
  where etablissement_id = p_etablissement_id;
  if v_payment_hash is not null
     and extensions.crypt(p_code, v_payment_hash) = v_payment_hash then
    raise exception 'Le code Admin doit être différent du code d''encaissement.';
  end if;
  insert into admin_pins (etablissement_id, pin_hash)
  values (
    p_etablissement_id,
    extensions.crypt(p_code, extensions.gen_salt('bf'))
  )
  on conflict (etablissement_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  update etablissements
  set admin_pin_set = true
  where id = p_etablissement_id;
end;
$$;

-- L'ancienne fonction devient un détail d'implémentation inaccessible à
-- PostgREST ; le nouveau point d'entrée vérifie le code avant de l'appeler.
alter function public.pay_order_items(
  jsonb,
  public.payment_mode,
  numeric,
  numeric,
  numeric,
  numeric
) rename to pay_order_items_internal;

revoke execute on function public.pay_order_items_internal(
  jsonb,
  public.payment_mode,
  numeric,
  numeric,
  numeric,
  numeric
) from public, anon, authenticated, service_role;

create function public.pay_order_items(
  p_items jsonb,
  p_mode public.payment_mode,
  p_payment_code text,
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
  v_hash text;
begin
  select o.etablissement_id into v_etab
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.id = (p_items->0->>'item_id')::uuid;
  if v_etab is null then
    raise exception 'Aucun article sélectionné.';
  end if;
  select pin_hash into v_hash
  from payment_pins
  where etablissement_id = v_etab;
  if v_hash is null then
    raise exception 'Configurez d''abord le code d''encaissement dans les réglages Admin.';
  end if;
  if current_member_role(v_etab) is null
     or p_payment_code is null
     or extensions.crypt(p_payment_code, v_hash) <> v_hash then
    raise exception 'Code d''encaissement incorrect.';
  end if;
  perform public.pay_order_items_internal(
    p_items,
    p_mode,
    p_cash_given,
    p_cash_change,
    p_tip,
    p_cash_amount
  );
end;
$$;

revoke execute on function public.pay_order_items(
  jsonb,
  public.payment_mode,
  text,
  numeric,
  numeric,
  numeric,
  numeric
) from public, anon;
grant execute on function public.pay_order_items(
  jsonb,
  public.payment_mode,
  text,
  numeric,
  numeric,
  numeric,
  numeric
) to authenticated;

-- ---------------------------------------------------------------------------
-- Annulation d'une unité avant encaissement

create function public.cancel_order_item(
  p_item_id uuid,
  p_quantity integer default 1
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_line public.order_items;
  v_order public.orders;
  v_order_id uuid;
  v_role public.member_role;
  v_mode public.payment_mode;
  v_printed boolean;
  v_cash_given numeric;
  v_cash_change numeric;
begin
  select order_id into v_order_id
  from order_items
  where id = p_item_id;
  if v_order_id is null then
    raise exception 'Article introuvable.';
  end if;

  select * into v_order
  from orders
  where id = v_order_id
  for update;
  select * into v_line
  from order_items
  where id = p_item_id;

  v_role := current_member_role(v_order.etablissement_id);
  if v_role is null or v_role not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;
  if v_order.type <> 'sur_place'
     or v_order.status <> 'en_attente'
     or v_order.paid_online
     or v_order.online_payment_started_at is not null then
    raise exception 'Seuls les articles en attente d''encaissement peuvent être annulés.';
  end if;
  if v_line.paid_mode is not null then
    raise exception 'Un article déjà encaissé ne peut pas être annulé ici.';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > v_line.quantity then
    raise exception 'Quantité invalide.';
  end if;

  -- Dernière unité d'une commande jamais encaissée : conserver sa ligne dans
  -- l'historique et laisser le trigger d'annulation restaurer son stock.
  if p_quantity = v_line.quantity
     and not exists (
       select 1 from order_items
       where order_id = v_order.id and id <> v_line.id
     ) then
    update orders
    set status = 'annulee'
    where id = v_order.id;
    return;
  end if;

  if p_quantity = v_line.quantity then
    delete from order_items where id = v_line.id;
  else
    update order_items
    set quantity = quantity - p_quantity
    where id = v_line.id;
  end if;

  update items
  set stock = stock + p_quantity
  where id = v_line.item_id and stock is not null;

  -- Si c'était le dernier reste d'une addition partiellement réglée, les
  -- articles payés partent maintenant en cuisine et la commande se clôt.
  if not exists (
    select 1 from order_items
    where order_id = v_order.id and paid_mode is null
  ) then
    select case
      when count(distinct paid_mode) = 1
        then (array_agg(distinct paid_mode))[1]
      else 'mixte'::public.payment_mode
    end
    into v_mode
    from order_items
    where order_id = v_order.id;

    select
      case when count(cash_given) = 1 then max(cash_given) end,
      case when count(cash_change) = 1 then max(cash_change) end
    into v_cash_given, v_cash_change
    from order_payments
    where order_id = v_order.id;

    v_printed := printer_online(v_order.etablissement_id);
    if v_printed then
      update order_items
      set served_at = now()
      where order_id = v_order.id;
    end if;
    update orders
    set status = (
          case when v_printed then 'servie' else 'payee' end
        )::public.order_status,
        payment_mode = v_mode,
        cash_given = v_cash_given,
        cash_change = v_cash_change
    where id = v_order.id;
  end if;
end;
$$;

revoke execute on function public.cancel_order_item(uuid, integer)
  from public, anon;
grant execute on function public.cancel_order_item(uuid, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Tarifs planifiés selon la journée de service

create or replace function public.tarifs_actifs(
  p_etablissement uuid,
  p_at timestamptz default now()
)
returns table (item_id uuid, price numeric, rule_name text)
language sql
stable
security definer
set search_path = public
as $$
  with moment as (
    select
      p_at at time zone 'Europe/Paris' as local_ts,
      p_at at time zone 'Europe/Paris'
        - make_interval(hours => coalesce(s.day_end_hour, 0)) as service_ts
    from (select 1) seed
    left join etablissement_settings s
      on s.etablissement_id = p_etablissement
  ),
  applicable as (
    select r.*
    from price_rules r, moment m
    where r.etablissement_id = p_etablissement
      and r.actif
      and case
        -- Une journée entière se termine à l'heure de fin de service, pas à
        -- minuit : le dimanche soir reste donc dimanche après 00 h.
        when r.starts_at is null then
          extract(isodow from m.service_ts)::smallint = any (r.days)
        when r.starts_at < r.ends_at then
          extract(isodow from m.service_ts)::smallint = any (r.days)
          and m.local_ts::time >= r.starts_at
          and m.local_ts::time < r.ends_at
        else
          (extract(isodow from m.local_ts)::smallint = any (r.days)
            and m.local_ts::time >= r.starts_at)
          or (extract(isodow from m.local_ts - interval '1 day')::smallint
                = any (r.days)
            and m.local_ts::time < r.ends_at)
      end
  ),
  cible as (
    select
      i.id as item_id,
      i.price as base,
      a.name,
      a.direction,
      a.unit,
      a.value,
      a.created_at,
      (t.item_id is not null) as precise
    from applicable a
    join price_rule_targets t on t.rule_id = a.id
    join items i
      on i.etablissement_id = p_etablissement
      and (i.id = t.item_id or i.category_id = t.category_id)
  ),
  retenue as (
    select distinct on (cible.item_id) cible.*
    from cible
    order by cible.item_id, cible.precise desc, cible.created_at desc
  )
  select
    retenue.item_id,
    public.prix_ajuste(
      retenue.base,
      retenue.direction,
      retenue.unit,
      retenue.value
    ),
    retenue.name
  from retenue
  where public.prix_ajuste(
      retenue.base,
      retenue.direction,
      retenue.unit,
      retenue.value
    ) <> retenue.base;
$$;
