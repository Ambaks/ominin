-- Les réservations (bulle_parts) font partie de l'offre Menu : même taux, même
-- circuit de paiement. Leur commission compte donc comme celle d'une commande,
-- dans l'assiette des commerciaux comme dans les recettes d'Ominin.

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
           least(p_to, c.commission_from + make_interval(months => cfg.term_months),
                 coalesce(c.ended_at, 'infinity')) as hi
    from cfg
    where c.commission_from is not null and c.validated_at is not null
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

create or replace function public.admin_revenue_months()
returns table (month date, source text, provider text, payments bigint, volume_cents bigint, fee_cents bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  return query
  select x.m, x.src, x.prov, count(*)::bigint, sum(x.volume)::bigint, sum(x.fee)::bigint
  from (
    select case when o.type = 'collect' then 'collect' else 'menu' end as src,
           case when o.square_payment_id is not null then 'square'
                when o.stripe_payment_intent_id is not null or o.stripe_session_id is not null then 'stripe'
                else e.payment_provider::text end as prov,
           date_trunc('month', o.created_at at time zone 'Europe/Paris')::date as m,
           coalesce((select round(sum(oi.quantity * oi.unit_price) * 100)
                     from public.order_items oi where oi.order_id = o.id), 0) as volume,
           coalesce(o.platform_fee_cents, 0) as fee
    from public.orders o
    join public.etablissements e on e.id = o.etablissement_id
    where o.paid_online and o.status <> 'annulee' and not e.demo
      and e.payment_provider is distinct from 'demo'
    union all
    select 'menu', 'square', date_trunc('month', p.paid_at at time zone 'Europe/Paris')::date,
           p.amount_cents, coalesce(p.fee_cents, 0)
    from public.bulle_parts p
    join public.etablissements e on e.id = p.etablissement_id
    where p.status = 'payee' and p.method = 'en_ligne' and p.square_payment_id is not null and not e.demo
    union all
    select 'shop', 'stripe', date_trunc('month', o.paid_at at time zone 'Europe/Paris')::date,
           o.total_cents, coalesce(o.platform_fee_cents, 0)
    from public.shop_orders o
    join public.shops s on s.id = o.shop_id
    where o.paid_at is not null and not s.demo
    union all
    select 'club',
           case when p.stripe_payment_intent_id is not null then 'stripe' else e.payment_provider::text end,
           date_trunc('month', p.paid_at at time zone 'Europe/Paris')::date,
           p.amount_cents, p.fee_cents
    from public.club_payments p
    join public.etablissements e on e.id = p.etablissement_id
    where p.status = 'payee' and p.refunded_at is null and not e.demo
    union all
    select 'manual', null, date_trunc('month', i.paid_at at time zone 'Europe/Paris')::date,
           i.eligible_ht_cents - i.credited_cents, i.eligible_ht_cents - i.credited_cents
    from public.ominin_invoice_payments i
    where i.stripe_invoice_id is null
  ) x
  group by x.m, x.src, x.prov
  order by x.m;
end;
$$;
