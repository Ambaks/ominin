-- Retours de Marwan (30/10). Un commercial retire un restaurant de sa fiche :
-- il quitte son tableau de bord et redevient libre pour tous, tant que rien
-- n'a été créé pour lui. La trace reste : la carte dit qui est passé en
-- dernier et quand. Y retourner le remet au tableau de bord, par une visite
-- plus récente que le retrait.

create table public.commercial_removed (
  restaurant_id uuid not null references public.crm_restaurants (id) on delete cascade,
  commercial_id uuid not null references public.commerciaux (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (restaurant_id, commercial_id)
);
create index commercial_removed_commercial_id_idx on public.commercial_removed (commercial_id);

alter table public.commercial_removed enable row level security;
create policy "admin read" on public.commercial_removed
  for select to authenticated using ((select public.is_admin()));

create function public.commercial_remove_restaurant(p_restaurant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
begin
  if exists (select 1 from public.commercial_signups s
             where s.restaurant_id = p_restaurant and s.commercial_id = me.id and s.etablissement_id is not null)
     or exists (select 1 from public.commercial_clients c
                where c.restaurant_id = p_restaurant and c.commercial_id = me.id) then
    raise exception 'Son inscription a commencé : ce restaurant reste à toi.';
  end if;
  if not exists (select 1 from public.commercial_visits x where x.restaurant_id = p_restaurant and x.commercial_id = me.id)
     and not exists (select 1 from public.commercial_signups s where s.restaurant_id = p_restaurant and s.commercial_id = me.id) then
    raise exception 'Tu n''as ni visité ni inscrit ce restaurant.';
  end if;

  delete from public.commercial_signups
  where restaurant_id = p_restaurant and commercial_id = me.id and finished_at is null;
  delete from public.commercial_holds where restaurant_id = p_restaurant and commercial_id = me.id;
  update public.commercial_visit_requests set status = 'released', decided_at = now()
  where restaurant_id = p_restaurant and holder_id = me.id and status in ('pending', 'refused');
  insert into public.commercial_removed (restaurant_id, commercial_id) values (p_restaurant, me.id)
  on conflict (restaurant_id, commercial_id) do update set at = now();
end;
$$;
revoke execute on function public.commercial_remove_restaurant(uuid) from public, anon;
grant execute on function public.commercial_remove_restaurant(uuid) to authenticated;

-- La fiche de la carte dit aussi le dernier passage, tous commerciaux confondus.
drop function public.commercial_map(uuid);
create function public.commercial_map(p_restaurant uuid default null)
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
      q.created_at + make_interval(days => (public.commercial_cfg()).visit_request_days),
      coalesce(pc.first_name, pc.email),
      p.at
    from public.crm_restaurants r
    left join public.commercial_holds h on h.restaurant_id = r.id
    left join public.commerciaux c on c.id = h.commercial_id
    left join public.commercial_visit_requests q
      on q.restaurant_id = r.id and q.requester_id = me.id and q.status in ('pending', 'refused')
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
revoke execute on function public.commercial_map(uuid) from public, anon;
grant execute on function public.commercial_map(uuid) to authenticated;

-- Le tableau de bord ne garde que ce qui n'a pas été retiré depuis le dernier passage.
create or replace function public.commercial_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  cfg as (select * from public.commercial_cfg()),
  rate as (select public.commercial_rate(me.id) as percent from me),
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
    'percent', rate.percent,
    'term_months', cfg.term_months,
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
      'commission_until', least(c.commission_from + make_interval(months => cfg.term_months), c.ended_at),
      'earned_cents', (select round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
                                    * rate.percent / 100)::bigint
                       from public.commercial_base(c, c.commission_from, 'infinity') b),
      'month_cents', (select round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
                                   * rate.percent / 100)::bigint
                      from public.commercial_base(c, month.lo, 'infinity') b)
    ) as item
    from places p
    join public.crm_restaurants r on r.id = p.restaurant_id
    cross join me cross join month
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
  from cfg, rate;
$$;
