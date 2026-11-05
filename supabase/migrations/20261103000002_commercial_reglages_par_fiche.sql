-- Retours de Marwan (03/11). Le taux, la durée de commission, le délai d'une
-- demande de visite et le rayon de recherche se règlent sur la fiche de
-- chaque commercial, plus dans les réglages communs : ceux-ci ne donnent plus
-- que les valeurs d'une fiche à l'invitation. Le taux peut aussi baisser, pour
-- corriger une erreur ; chaque relevé envoyé garde le taux qu'il porte.

drop trigger commerciaux_commission_guard on public.commerciaux;
drop function public.commerciaux_commission_guard();
drop function public.admin_set_commission_percent(uuid, numeric);

alter table public.commerciaux
  add column term_months int check (term_months > 0),
  add column visit_request_days int check (visit_request_days > 0),
  add column search_radius_km int check (search_radius_km > 0);

update public.commerciaux m
set commission_percent = greatest(coalesce(m.commission_percent, cfg.commission_percent), cfg.commission_percent),
    term_months = cfg.term_months,
    visit_request_days = cfg.visit_request_days,
    search_radius_km = cfg.search_radius_km
from public.commercial_cfg() cfg;

-- Une fiche naît avec les réglages communs ; le délai vide (jamais libéré) en vient aussi.
create function public.commerciaux_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.commercial_settings := public.commercial_cfg();
begin
  new.commission_percent := coalesce(new.commission_percent, cfg.commission_percent);
  new.term_months := coalesce(new.term_months, cfg.term_months);
  new.visit_request_days := coalesce(new.visit_request_days, cfg.visit_request_days);
  new.search_radius_km := coalesce(new.search_radius_km, cfg.search_radius_km);
  return new;
end;
$$;
revoke execute on function public.commerciaux_defaults() from public, anon, authenticated;
create trigger commerciaux_defaults
  before insert on public.commerciaux
  for each row execute function public.commerciaux_defaults();

alter table public.commerciaux
  alter column commission_percent set not null,
  alter column term_months set not null,
  alter column search_radius_km set not null;

create or replace function public.commercial_rate(p_commercial uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select commission_percent from public.commerciaux where id = p_commercial;
$$;

create or replace function public.commercial_contract_end(c public.commerciaux)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(c.ended_at,
    (select min(a.accepted_at) from public.legal_acceptances a
     where a.commercial_id = c.id and a.scope = 'commercial')
    + make_interval(months => c.term_months)
    + case when c.option_exercised_at is not null
        then make_interval(years => cfg.option_years) else interval '0' end)
  from public.commercial_cfg() cfg;
$$;

-- La commission d'un client court la durée de son commercial.
create or replace function public.commercial_base(c public.commercial_clients, p_from timestamptz, p_to timestamptz)
returns table (menu_cents bigint, shop_cents bigint, club_cents bigint, invoice_cents bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (select * from public.commercial_cfg()),
  span as (
    select greatest(p_from, c.commission_from) as lo,
           least(p_to, c.commission_from + make_interval(months => m.term_months),
                 coalesce(c.ended_at, 'infinity')) as hi
    from public.commerciaux m
    where m.id = c.commercial_id and c.commission_from is not null and c.validated_at is not null
  )
  select
    coalesce((select sum(o.platform_fee_cents)::bigint from public.orders o
              join public.etablissements e on e.id = o.etablissement_id, span
              where o.etablissement_id = c.etablissement_id and o.paid_online and o.status <> 'annulee'
                and not e.demo and e.payment_provider is distinct from 'demo'
                and o.created_at >= span.lo and o.created_at < span.hi), 0)
    + coalesce((select sum(p.fee_cents)::bigint from public.bulle_parts p
                join public.etablissements e on e.id = p.etablissement_id, span
                where p.etablissement_id = c.etablissement_id and p.status = 'payee' and p.method = 'en_ligne'
                  and p.square_payment_id is not null and not e.demo
                  and p.paid_at >= span.lo and p.paid_at < span.hi), 0),
    coalesce((select sum(o.platform_fee_cents)::bigint from public.shop_orders o
              join public.shops s on s.id = o.shop_id, span
              where o.shop_id = c.shop_id and o.paid_at is not null and not s.demo
                and o.paid_at >= span.lo and o.paid_at < span.hi), 0),
    coalesce((select sum(p.fee_cents)::bigint from public.club_payments p
              join public.etablissements e on e.id = p.etablissement_id, span, cfg
              where cfg.club_fees_included and p.etablissement_id = c.etablissement_id
                and p.status = 'payee' and p.refunded_at is null and not e.demo
                and p.paid_at >= span.lo and p.paid_at < span.hi), 0),
    coalesce((select sum(i.eligible_ht_cents - i.credited_cents)::bigint from public.ominin_invoice_payments i, span
              where (i.etablissement_id = c.etablissement_id or i.shop_id = c.shop_id)
                and i.paid_at >= span.lo and i.paid_at < span.hi), 0);
$$;

-- Le délai d'une demande est celui du commercial qui suit le restaurant.
create or replace function public.commercial_release_requests()
returns table (id uuid, status text, discord_message_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commercial_visit_requests;
  v_advanced boolean;
begin
  for v in
    select r.* from public.commercial_visit_requests r
    join public.commerciaux m on m.id = r.holder_id
    where r.status in ('pending', 'refused') and m.visit_request_days is not null
      and r.created_at + make_interval(days => m.visit_request_days) <= now()
    for update of r
  loop
    v_advanced := exists (
      select 1 from public.commercial_visits cv
      where cv.restaurant_id = v.restaurant_id and cv.commercial_id = v.holder_id and cv.created_at > v.created_at
    ) or exists (
      select 1 from public.commercial_signups s
      where s.restaurant_id = v.restaurant_id and s.commercial_id = v.holder_id and s.created_at > v.created_at
    );
    if not v_advanced then
      delete from public.commercial_holds where restaurant_id = v.restaurant_id and commercial_id = v.holder_id;
    end if;
    update public.commercial_visit_requests r
    set status = case when v_advanced then 'kept' else 'released' end, decided_at = now()
    where r.id = v.id;
    id := v.id;
    status := case when v_advanced then 'kept' else 'released' end;
    discord_message_id := v.discord_message_id;
    return next;
  end loop;
end;
$$;

create or replace function public.commercial_map(p_restaurant uuid default null)
returns table (
  id uuid, name text, address text, city text, phone text, google_maps_url text,
  latitude double precision, longitude double precision,
  state text, holder text, mine boolean, contacted_by_lea boolean,
  request text, request_ends timestamptz,
  last_by text, last_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
begin
  return query
    select r.id, r.name, r.address, r.city, r.phone, r.google_maps_url, r.latitude, r.longitude,
      case
        when public.commercial_is_client(r) then 'client'
        when h.restaurant_id is not null then 'visited'
        else 'free'
      end,
      coalesce(c.first_name, c.email),
      h.commercial_id is not distinct from me.id and h.restaurant_id is not null,
      exists (
        select 1 from public.outreach_emails e
        where e.restaurant_id = r.id and e.direction = 'outbound' and e.sent_at is not null
      ),
      q.status,
      q.created_at + make_interval(days => qh.visit_request_days),
      coalesce(pc.first_name, pc.email),
      p.at
    from public.crm_restaurants r
    left join public.commercial_holds h on h.restaurant_id = r.id
    left join public.commerciaux c on c.id = h.commercial_id
    left join public.commercial_visit_requests q
      on q.restaurant_id = r.id and q.requester_id = me.id and q.status in ('pending', 'refused')
    left join public.commerciaux qh on qh.id = q.holder_id
    left join lateral (
      select y.commercial_id, y.at from (
        select v.commercial_id, v.created_at as at from public.commercial_visits v where v.restaurant_id = r.id
        union all
        select s.commercial_id, s.created_at from public.commercial_signups s where s.restaurant_id = r.id
        union all
        select x.commercial_id, x.at from public.commercial_removed x where x.restaurant_id = r.id
      ) y order by y.at desc limit 1
    ) p on true
    left join public.commerciaux pc on pc.id = p.commercial_id
    where r.deleted_at is null and r.outreach_opted_out_at is null
      and (p_restaurant is null or r.id = p_restaurant)
      and r.latitude is not null and r.longitude is not null;
end;
$$;

create or replace function public.commercial_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  month as (select (date_trunc('month', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris' as lo),
  mine as (
    select v.restaurant_id, v.created_at as at from public.commercial_visits v, me where v.commercial_id = me.id
    union all
    select s.restaurant_id, s.created_at from public.commercial_signups s, me where s.commercial_id = me.id
  ),
  places as (
    select m.restaurant_id, max(m.at) as at from mine m
    group by m.restaurant_id
    having max(m.at) > coalesce((select x.at from public.commercial_removed x, me
                                 where x.restaurant_id = m.restaurant_id and x.commercial_id = me.id), '-infinity')
  )
  select jsonb_build_object(
    'percent', me.commission_percent,
    'term_months', me.term_months,
    'restaurants', coalesce((select jsonb_agg(item order by item ->> 'at' desc) from (
    select jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'at', p.at,
      'status', case
        when c.id is not null then 'signed'
        when s.id is not null then 'waiting'
        else v.outcome
      end,
      'missing', case
        when c.id is not null or s.id is null then null
        when s.etablissement_id is null then array['account']
        else array_remove(array[
          case when not exists (select 1 from public.payment_accounts a
                                where a.etablissement_id = s.etablissement_id and a.charges_enabled) then 'stripe' end,
          case when not exists (select 1 from public.hubrise_connections h
                                where h.etablissement_id = s.etablissement_id) then 'hubrise' end
        ], null)
      end,
      'signup_id', s.id,
      'commission_from', c.commission_from,
      'commission_until', least(c.commission_from + make_interval(months => me.term_months), c.ended_at),
      'earned_cents', (select round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
                                    * me.commission_percent / 100)::bigint
                       from public.commercial_base(c, c.commission_from, 'infinity') b),
      'month_cents', (select round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
                                   * me.commission_percent / 100)::bigint
                      from public.commercial_base(c, month.lo, 'infinity') b)
    ) as item
    from places p
    join public.crm_restaurants r on r.id = p.restaurant_id
    cross join month
    left join lateral (
      select * from public.commercial_clients c
      where c.restaurant_id = r.id and c.commercial_id = me.id and c.validated_at is not null
      order by c.commission_from desc limit 1
    ) c on true
    left join lateral (
      select * from public.commercial_signups s
      where s.restaurant_id = r.id and s.commercial_id = me.id
      order by s.created_at desc limit 1
    ) s on true
    left join lateral (
      select v.outcome from public.commercial_visits v
      where v.restaurant_id = r.id and v.commercial_id = me.id
      order by v.created_at desc limit 1
    ) v on true
  ) items), '[]'))
  from me;
$$;

create or replace function public.commercial_restaurant_recap(p_restaurant uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v jsonb;
begin
  select jsonb_build_object(
    'id', r.id, 'name', r.name, 'address', r.address, 'phone', r.phone,
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'at', x.created_at, 'outcome', x.outcome, 'reason', x.reason, 'note', x.note,
        'contact_name', x.contact_name, 'contact_phone', x.contact_phone, 'contact_email', x.contact_email)
        order by x.created_at desc)
      from public.commercial_visits x where x.restaurant_id = r.id and x.commercial_id = me.id), '[]'),
    'signup', (
      select jsonb_build_object(
        'id', s.id, 'at', s.created_at, 'kind', s.kind, 'account', s.etablissement_id is not null,
        'manager_name', s.manager_name, 'manager_phone', s.manager_phone, 'manager_email', s.manager_email,
        'photos', cardinality(s.photos), 'finished_at', s.finished_at,
        'stripe', exists (select 1 from public.payment_accounts a where a.etablissement_id = s.etablissement_id and a.charges_enabled),
        'hubrise', exists (select 1 from public.hubrise_connections h where h.etablissement_id = s.etablissement_id),
        'stripe_later', s.stripe_later, 'hubrise_later', s.hubrise_later)
      from public.commercial_signups s
      where s.restaurant_id = r.id and s.commercial_id = me.id
      order by s.created_at desc limit 1),
    'client', (
      select jsonb_build_object(
        'commission_from', c.commission_from,
        'commission_until', least(c.commission_from + make_interval(months => me.term_months), c.ended_at))
      from public.commercial_clients c
      where c.restaurant_id = r.id and c.commercial_id = me.id and c.validated_at is not null
      order by c.commission_from desc limit 1))
  into v
  from public.crm_restaurants r
  where r.id = p_restaurant
    and (exists (select 1 from public.commercial_visits x where x.restaurant_id = r.id and x.commercial_id = me.id)
         or exists (select 1 from public.commercial_signups s where s.restaurant_id = r.id and s.commercial_id = me.id));
  if v is null then
    raise exception 'Tu n''as ni visité ni inscrit ce restaurant.';
  end if;
  return v;
end;
$$;

create or replace function public.commercial_map_search(
  p_query text,
  p_lat double precision,
  p_lng double precision,
  p_limit int
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  search as (
    select public.commercial_search_key(p_query) as key,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as origin
  )
  select jsonb_build_object(
    'radius_km', me.search_radius_km,
    'results', coalesce((
      select jsonb_agg(found order by found.distance_m)
      from (
        select r.id, r.name, r.city, r.latitude, r.longitude,
          extensions.st_distance(place.point, search.origin) as distance_m
        from public.crm_restaurants r
        cross join lateral (
          select extensions.st_setsrid(extensions.st_makepoint(r.longitude, r.latitude), 4326)::extensions.geography as point
        ) place
        where r.deleted_at is null and r.outreach_opted_out_at is null
          and r.latitude is not null and r.longitude is not null
          and search.key <> ''
          and position(search.key in public.commercial_search_key(r.name)) > 0
          and extensions.st_dwithin(place.point, search.origin, me.search_radius_km * 1000)
        order by distance_m
        limit p_limit
      ) found
    ), '[]')
  )
  from me, search;
$$;
