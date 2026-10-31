-- La matière du brouillon de planning : heure par heure, qui était là, ce qui a été
-- commandé, combien de temps les clients ont attendu. Le calcul lui-même vit dans
-- lib/gestion/analyses.ts. Chaque restaurant règle ce qu'un serveur tient par heure :
-- nul, c'est la valeur par défaut de l'application.
alter table public.analyses_settings
  add column orders_per_server_hour numeric(5, 1) check (orders_per_server_hour > 0);

--
-- Une commande compte à l'heure où elle est passée, pas à celle où elle est réglée :
-- c'est là qu'elle donne du travail. Même règle de commande payée que `isPaid` et
-- gestion_analyses. Une fiche de cuisine compte en cuisine, un serveur en salle ; le
-- gérant peut pointer sans être en service : il ne compte pas.
create function public.gestion_staffing(
  p_etablissement_id uuid,
  p_from date,
  p_to date,
  p_day_end_hour int,
  p_max_entry_hours int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;

  with placed as materialized (
    select
      o.id,
      o.created_at,
      o.paid_online,
      (o.created_at at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour) as at_local
    from orders o
    where o.etablissement_id = p_etablissement_id
      and o.created_at >= ((p_from - 1)::timestamp at time zone 'Europe/Paris')
      and o.created_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
      and case
        when o.type = 'collect' then
          o.status <> 'annulee' and (o.paid_online or o.payment_mode is not null)
        else
          o.status in ('payee', 'servie')
          or (o.order_number is not null and o.status = 'prete')
      end
  ),
  in_range as (
    select
      p.*,
      p.at_local::date as day,
      extract(isodow from p.at_local)::int as dow,
      extract(hour from p.at_local)::int as hour
    from placed p
    where p.at_local::date >= p_from and p.at_local::date < p_to
  ),
  volumes as (
    select day, dow, hour, count(*)::int as orders
    from in_range
    group by day, dow, hour
  ),
  -- L'attente d'un client qui règle au comptoir ou à table : de la commande au premier
  -- règlement. Payer en ligne ne fait attendre personne.
  waits as (
    select
      r.dow,
      r.hour,
      count(*)::int as orders,
      percentile_cont(0.5) within group (
        order by extract(epoch from first_payment.at - r.created_at)
      ) as median_seconds
    from in_range r
    cross join lateral (
      select min(pay.paid_at) as at from order_payments pay where pay.order_id = r.id
    ) first_payment
    where not r.paid_online
      and first_payment.at >= r.created_at
    group by r.dow, r.hour
  ),
  -- Au-delà de p_max_entry_hours, c'est un départ oublié, pas une présence.
  staff_hours as (
    select
      local.at_local::date as day,
      extract(isodow from local.at_local)::int as dow,
      extract(hour from local.at_local)::int as hour,
      case when st.role = 'cuisinier' then 'cuisine' else 'salle' end as team,
      t.staff_id,
      st.hidden,
      sum(extract(epoch from least(t.ended_at, h + interval '1 hour') - greatest(t.started_at, h))) / 3600.0 as hours
    from time_entries t
    join staff st on st.id = t.staff_id
    cross join lateral generate_series(
      date_trunc('hour', t.started_at),
      t.ended_at - interval '1 microsecond',
      interval '1 hour'
    ) h
    cross join lateral (
      select (greatest(t.started_at, h) at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour) as at_local
    ) local
    where t.etablissement_id = p_etablissement_id
      and st.role <> 'gerant'
      and t.ended_at is not null
      and t.ended_at - t.started_at <= make_interval(hours => p_max_entry_hours)
      and t.started_at >= ((p_from - 1)::timestamp at time zone 'Europe/Paris')
      and t.started_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
      and local.at_local::date >= p_from
      and local.at_local::date < p_to
    group by 1, 2, 3, 4, 5, 6
  )
  select jsonb_build_object(
    'volumes', coalesce((select jsonb_agg(v) from volumes v), '[]'::jsonb),
    'waits', coalesce((select jsonb_agg(w) from waits w), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(s)
      from (
        select day, dow, hour, team, sum(hours) as hours
        from staff_hours
        group by day, dow, hour, team
      ) s
    ), '[]'::jsonb),
    -- Une fiche masquée ne se planifie pas.
    'habits', coalesce((
      select jsonb_agg(h)
      from (
        select staff_id, team, dow, count(distinct day)::int as days, sum(hours) as hours
        from staff_hours
        where not hidden
        group by staff_id, team, dow
      ) h
    ), '[]'::jsonb),
    'settings', (
      select jsonb_build_object(
        'hourly_labor_cost', a.hourly_labor_cost,
        'orders_per_server_hour', a.orders_per_server_hour
      )
      from analyses_settings a
      where a.etablissement_id = p_etablissement_id
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.gestion_staffing(uuid, date, date, int, int) from public, anon;
grant execute on function public.gestion_staffing(uuid, date, date, int, int) to authenticated;
