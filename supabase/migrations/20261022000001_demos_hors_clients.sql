-- Les démonstrations ne sont pas des clients. Trattoria Lucia (la carte de
-- démonstration des landings et des démos filmées des Reels) et Cire & Lin
-- (la boutique fictive des captures de l'agent social) restent en ligne,
-- mais sortent de l'onglet Clients de l'admin et des alertes.
-- ---------------------------------------------------------------------------

alter table public.etablissements add column demo boolean not null default false;
alter table public.shops add column demo boolean not null default false;

update public.etablissements set demo = true where slug = 'trattoria-lucia';
update public.shops set demo = true where slug = 'cire-et-lin';

-- Onglet Clients, produit Menu : la liste et ses chiffres.
create or replace function public.admin_menu_overview(p_from timestamptz, p_to timestamptz)
returns table (
  etablissement_id uuid,
  name text,
  slug text,
  offre public.offre,
  fee_percent numeric,
  revenue numeric,
  tips numeric,
  orders_count int,
  commission numeric,
  sessions int,
  converted int,
  provider public.payment_provider,
  provider_ready boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with paid as (
    select o.etablissement_id,
           sum(oi.quantity * oi.unit_price) as revenue,
           count(distinct o.id)::int as orders_count
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.type = 'sur_place'
      and o.status <> 'annulee'
      and oi.paid_at >= p_from and oi.paid_at < p_to
    group by o.etablissement_id
  ),
  fees as (
    select o.etablissement_id,
           sum(o.platform_fee_cents)::numeric / 100 as commission,
           sum(coalesce(o.tip_amount, 0)) as tips
    from orders o
    where o.type = 'sur_place'
      and o.paid_online
      and o.status <> 'annulee'
      and o.created_at >= p_from and o.created_at < p_to
    group by o.etablissement_id
  ),
  visits as (
    select s.etablissement_id,
           count(*)::int as sessions,
           count(*) filter (where s.stage >= 'commande')::int as converted
    from menu_sessions s
    where s.started_at >= p_from and s.started_at < p_to
    group by s.etablissement_id
  )
  select e.id, e.name, e.slug, e.offre, e.platform_fee_percent,
         coalesce(paid.revenue, 0), coalesce(fees.tips, 0),
         coalesce(paid.orders_count, 0), coalesce(fees.commission, 0),
         coalesce(visits.sessions, 0), coalesce(visits.converted, 0),
         e.payment_provider,
         case e.payment_provider
           when 'stripe' then coalesce(pa.charges_enabled, false)
           when 'square' then sq.etablissement_id is not null
           when 'sumup' then su.etablissement_id is not null
           else false
         end
  from etablissements e
  left join paid on paid.etablissement_id = e.id
  left join fees on fees.etablissement_id = e.id
  left join visits on visits.etablissement_id = e.id
  left join payment_accounts pa on pa.etablissement_id = e.id
  left join square_accounts sq on sq.etablissement_id = e.id
  left join sumup_accounts su on su.etablissement_id = e.id
  where not e.demo
    and (select public.is_admin())
  order by e.name;
$$;

-- Onglet Clients, « en direct » : salles ouvertes en ce moment.
create or replace function public.admin_menu_live(p_window_seconds int)
returns table (
  etablissement_id uuid,
  name text,
  slug text,
  live_sessions int,
  open_orders int,
  last_order_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.name, e.slug,
         count(distinct s.id)::int,
         count(distinct o.id) filter (
           where o.status in ('en_attente', 'en_preparation', 'prete')
         )::int,
         max(o.created_at)
  from etablissements e
  left join menu_sessions s
    on s.etablissement_id = e.id
   and s.last_seen_at > now() - make_interval(secs => p_window_seconds)
  left join orders o
    on o.etablissement_id = e.id
   and o.type = 'sur_place'
   and o.created_at > now() - interval '1 day'
  where not e.demo
    and (select public.is_admin())
  group by e.id, e.name, e.slug
  order by e.name;
$$;

-- Fil des dernières commandes, tous restaurants : sans ceux de la démo.
create or replace function public.admin_menu_feed(p_limit int, p_etab uuid default null)
returns table (
  order_id uuid,
  etablissement_id uuid,
  name text,
  slug text,
  table_number int,
  status public.order_status,
  paid_online boolean,
  total numeric,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, e.id, e.name, e.slug, t.number, o.status, o.paid_online,
         coalesce((
           select sum(oi.quantity * oi.unit_price)
           from order_items oi where oi.order_id = o.id
         ), 0),
         o.created_at
  from orders o
  join etablissements e on e.id = o.etablissement_id
  left join tables t on t.id = o.table_id
  where o.type = 'sur_place'
    and (p_etab is null or o.etablissement_id = p_etab)
    and (p_etab is not null or not e.demo)
    and (select public.is_admin())
  order by o.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

-- Onglet Clients, produit Shop.
create or replace function public.admin_shop_overview(p_from timestamptz, p_to timestamptz)
returns table (
  shop_id uuid,
  name text,
  slug text,
  is_active boolean,
  created_at timestamptz,
  owner_email text,
  subscription_status text,
  charges_enabled boolean,
  paid_orders int,
  revenue_cents bigint,
  fee_cents bigint,
  refunded int,
  to_prepare int,
  last_paid_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with period as (
    select o.shop_id,
           count(*)::int as paid_orders,
           sum(o.total_cents)::bigint as revenue_cents,
           sum(o.platform_fee_cents)::bigint as fee_cents,
           count(*) filter (
             where o.payment_status in ('refunded', 'partially_refunded')
           )::int as refunded
    from shop_orders o
    where o.paid_at >= p_from and o.paid_at < p_to
    group by o.shop_id
  ),
  standing as (
    select o.shop_id,
           count(*) filter (where o.status in ('paid', 'preparing'))::int
             as to_prepare,
           max(o.paid_at) as last_paid_at
    from shop_orders o
    group by o.shop_id
  ),
  owners as (
    select m.shop_id, min(m.email) as email
    from shop_members m
    where m.role = 'proprietaire'
    group by m.shop_id
  )
  select s.id, s.name, s.slug, s.is_active, s.created_at, owners.email,
         sub.status, coalesce(pa.charges_enabled, false),
         coalesce(period.paid_orders, 0), coalesce(period.revenue_cents, 0),
         coalesce(period.fee_cents, 0), coalesce(period.refunded, 0),
         coalesce(standing.to_prepare, 0), standing.last_paid_at
  from shops s
  left join period on period.shop_id = s.id
  left join standing on standing.shop_id = s.id
  left join owners on owners.shop_id = s.id
  left join shop_subscriptions sub on sub.shop_id = s.id
  left join shop_payment_accounts pa on pa.shop_id = s.id
  where not s.demo
    and (select public.is_admin())
  order by s.name;
$$;

-- Chiffres des alertes (« client qui décroche ») : une démo ne décroche pas.
create or replace function public.admin_service_figures(p_from timestamptz, p_to timestamptz)
returns table (
  kind text,
  id uuid,
  name text,
  revenue numeric,
  commission numeric,
  orders int,
  sessions int
)
language sql
stable
security definer
set search_path = public
as $$
  with paid as (
    select o.etablissement_id,
           sum(oi.quantity * oi.unit_price) as revenue,
           count(distinct o.id)::int as orders
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.status <> 'annulee'
      and oi.paid_at >= p_from and oi.paid_at < p_to
    group by o.etablissement_id
  ),
  fees as (
    select o.etablissement_id, sum(o.platform_fee_cents)::numeric / 100 as commission
    from orders o
    where o.paid_online and o.status <> 'annulee'
      and o.created_at >= p_from and o.created_at < p_to
    group by o.etablissement_id
  ),
  visits as (
    select s.etablissement_id, count(*)::int as sessions
    from menu_sessions s
    where s.started_at >= p_from and s.started_at < p_to
    group by s.etablissement_id
  )
  select 'etablissement', e.id, e.name,
         coalesce(paid.revenue, 0), coalesce(fees.commission, 0),
         coalesce(paid.orders, 0), coalesce(visits.sessions, 0)
  from etablissements e
  left join paid on paid.etablissement_id = e.id
  left join fees on fees.etablissement_id = e.id
  left join visits on visits.etablissement_id = e.id
  where not e.demo
  union all
  select 'shop', s.id, s.name,
         coalesce(sum(o.total_cents) filter (where o.paid_at >= p_from and o.paid_at < p_to), 0)::numeric / 100,
         coalesce(sum(o.platform_fee_cents) filter (where o.paid_at >= p_from and o.paid_at < p_to), 0)::numeric / 100,
         (count(o.id) filter (where o.paid_at >= p_from and o.paid_at < p_to))::int,
         0
  from shops s
  left join shop_orders o on o.shop_id = s.id
  where not s.demo
  group by s.id, s.name;
$$;
