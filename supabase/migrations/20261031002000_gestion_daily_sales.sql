-- Les ventes jour par jour d'une période que la gestion ne charge pas : la
-- fenêtre de commandes s'arrête à la plus longue période d'analytique, et la
-- comparer à celle d'avant demanderait de tout relire ligne à ligne. Mêmes
-- règles que `isPaid`, `paidAt` et `orderTotal` (lib/gestion/selectors.ts).
create function public.gestion_daily_sales(
  p_etablissement_id uuid,
  p_from date,
  p_to date,
  p_day_end_hour int
)
returns table (day date, revenue numeric, orders int)
language sql
stable
security definer
set search_path = public
as $$
  with paid as (
    select
      o.id,
      (
        coalesce(
          (select max(p.paid_at) from order_payments p where p.order_id = o.id),
          o.created_at
        ) at time zone 'Europe/Paris'
      ) - make_interval(hours => p_day_end_hour) as service_at
    from orders o
    where o.etablissement_id = p_etablissement_id
      and o.etablissement_id in (select public.member_etablissements())
      and o.created_at >= ((p_from - 7)::timestamp at time zone 'Europe/Paris')
      and o.created_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
      and case
        when o.type = 'collect' then
          o.status <> 'annulee' and (o.paid_online or o.payment_mode is not null)
        else
          o.status in ('payee', 'servie')
          or (o.order_number is not null and o.status = 'prete')
      end
  )
  select
    paid.service_at::date,
    coalesce(sum(lines.total), 0),
    count(*)::int
  from paid
  cross join lateral (
    select sum(i.quantity * i.unit_price) as total
    from order_items i
    where i.order_id = paid.id
  ) lines
  where paid.service_at::date >= p_from and paid.service_at::date < p_to
  group by 1
  order by 1;
$$;

revoke execute on function public.gestion_daily_sales(uuid, date, date, int) from public, anon;
grant execute on function public.gestion_daily_sales(uuid, date, date, int) to authenticated;
