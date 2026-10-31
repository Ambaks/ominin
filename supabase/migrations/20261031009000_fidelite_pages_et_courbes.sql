-- L'onglet Fidélité ne charge plus tous ses clients d'un coup : la base envoie
-- une page, recherche comprise, et le total de ce qui correspond. Ses résultats
-- passent de la semaine seule à une série par période : les jours de la période
-- et ceux d'avant, ou toutes les semaines depuis la première carte.

drop function public.loyalty_customers_summary(uuid);
drop function public.loyalty_stats_weeks(uuid);

create function public.loyalty_customers_page(
  p_etablissement_id uuid,
  p_search text,
  p_limit int,
  p_offset int
)
returns table (
  id uuid,
  contact text,
  points int,
  last_activity timestamptz,
  hubrise_customer_id text,
  total int
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  return query
  select lc.id,
         lc.contact,
         coalesce(sum(le.points), 0)::int,
         greatest(lc.created_at, max(le.created_at)),
         lc.hubrise_customer_id,
         (count(*) over ())::int
  from loyalty_customers lc
  left join loyalty_entries le on le.customer_id = lc.id
  where lc.etablissement_id = p_etablissement_id
    and position(p_search in lower(lc.contact)) > 0
  group by lc.id
  order by 4 desc, lc.id
  limit p_limit offset p_offset;
end;
$$;

-- p_days renseigné : 2 × p_days jours, le plus ancien d'abord (la période d'avant
-- puis la période). Null : les semaines depuis la première carte. `active` : la
-- case est au moins contemporaine de la première carte ; avant, pas de programme
-- à comparer. members et phones : les cumuls à la fin de la case ; new_* : ce que
-- la case y a ajouté. Un téléphone compte à sa première fois chez cet établissement.
create function public.loyalty_stats_series(p_etablissement_id uuid, p_days int)
returns table (
  bucket date,
  active boolean,
  paid_orders int,
  card_orders int,
  rewards_used int,
  members int,
  new_members int,
  phones int,
  new_phones int
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_unit text := case when p_days is null then 'week' else 'day' end;
  v_step interval := case when p_days is null then interval '1 week' else interval '1 day' end;
  v_first timestamptz;
  v_from date;
  v_since timestamptz;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  select min(lc.created_at) into v_first
  from loyalty_customers lc where lc.etablissement_id = p_etablissement_id;
  if v_first is null then
    return;
  end if;
  v_from := case
    when p_days is null then date_trunc('week', v_first at time zone 'Europe/Paris')::date
    else (now() at time zone 'Europe/Paris')::date - (2 * p_days - 1)
  end;
  v_since := v_from::timestamp at time zone 'Europe/Paris';
  return query
  with buckets as (
    select generate_series(
      v_from,
      date_trunc(v_unit, now() at time zone 'Europe/Paris')::date,
      v_step
    )::date as bucket
  ),
  paid as (
    select date_trunc(v_unit, o.created_at at time zone 'Europe/Paris')::date as bucket,
           count(*)::int as paid_orders,
           count(o.loyalty_customer_id)::int as card_orders
    from orders o
    where o.etablissement_id = p_etablissement_id
      and o.payment_mode is not null and o.status <> 'annulee'
      and o.created_at >= v_since
    group by 1
  ),
  gifts as (
    select date_trunc(v_unit, o.created_at at time zone 'Europe/Paris')::date as bucket,
           sum(oi.quantity)::int as rewards_used
    from orders o
    join order_items oi on oi.order_id = o.id and oi.loyalty_points is not null
    where o.etablissement_id = p_etablissement_id and o.status <> 'annulee'
      and o.created_at >= v_since
    group by 1
  ),
  cards as (
    select lc.created_at as at
    from loyalty_customers lc
    where lc.etablissement_id = p_etablissement_id
  ),
  devices as (
    select min(d.created_at) as at
    from loyalty_devices d
    join loyalty_customers lc
      on lc.contact = d.contact and lc.etablissement_id = p_etablissement_id
    group by d.contact
  )
  select b.bucket,
         b.bucket >= date_trunc(v_unit, v_first at time zone 'Europe/Paris')::date,
         coalesce(p.paid_orders, 0),
         coalesce(p.card_orders, 0),
         coalesce(g.rewards_used, 0),
         m.total, m.fresh,
         t.total, t.fresh
  from buckets b
  left join paid p on p.bucket = b.bucket
  left join gifts g on g.bucket = b.bucket
  cross join lateral (
    select (b.bucket::timestamp at time zone 'Europe/Paris') as starts,
           ((b.bucket + v_step)::timestamp at time zone 'Europe/Paris') as ends
  ) span
  cross join lateral (
    select count(*) filter (where c.at < span.ends)::int as total,
           count(*) filter (where c.at >= span.starts and c.at < span.ends)::int as fresh
    from cards c
  ) m
  cross join lateral (
    select count(*) filter (where d.at < span.ends)::int as total,
           count(*) filter (where d.at >= span.starts and d.at < span.ends)::int as fresh
    from devices d
  ) t
  order by b.bucket;
end;
$$;

revoke execute on function public.loyalty_customers_page(uuid, text, int, int) from public, anon;
revoke execute on function public.loyalty_stats_series(uuid, int) from public, anon;
grant execute on function public.loyalty_customers_page(uuid, text, int, int) to authenticated;
grant execute on function public.loyalty_stats_series(uuid, int) to authenticated;
