-- L'onglet Analyses du gérant : ce qui fait gagner ou perdre de l'argent au
-- restaurant, calculé en base pour ne jamais lui faire charger ses commandes.
--
-- Les coûts ne vivent pas sur `items`, lisible par tout le monde depuis le menu :
-- un client verrait ce que coûte son assiette. Ils ont leurs tables, que seul le
-- gérant lit. Le coût de la main-d'œuvre est un taux moyen par établissement, pas
-- un salaire par personne.

create table public.item_costs (
  item_id uuid primary key references public.items (id) on delete cascade,
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  -- Coût matière d'une portion, hors taxes.
  unit_cost numeric(10, 2) not null check (unit_cost >= 0),
  updated_at timestamptz not null default now()
);

create index item_costs_etablissement_idx on public.item_costs (etablissement_id);

create table public.category_costs (
  category_id uuid primary key references public.categories (id) on delete cascade,
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  -- Part du prix hors taxes partie en matière, faute de coût exact par article.
  cost_percent numeric(5, 2) not null check (cost_percent between 0 and 100),
  updated_at timestamptz not null default now()
);

create index category_costs_etablissement_idx on public.category_costs (etablissement_id);

create table public.analyses_settings (
  etablissement_id uuid primary key references public.etablissements (id) on delete cascade,
  -- Coût horaire moyen, charges comprises.
  hourly_labor_cost numeric(8, 2) check (hourly_labor_cost >= 0),
  -- Nuls : les objectifs par défaut de l'application.
  food_cost_target numeric(5, 2) check (food_cost_target > 0 and food_cost_target <= 100),
  labor_cost_target numeric(5, 2) check (labor_cost_target > 0 and labor_cost_target <= 100),
  prime_cost_target numeric(5, 2) check (prime_cost_target > 0 and prime_cost_target <= 100),
  updated_at timestamptz not null default now()
);

alter table public.item_costs enable row level security;
alter table public.category_costs enable row level security;
alter table public.analyses_settings enable row level security;

revoke all on public.item_costs, public.category_costs, public.analyses_settings from anon;

create policy "gerant read" on public.item_costs
  for select to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant write" on public.item_costs
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (
    public.current_member_role(etablissement_id) = 'gerant'
    and exists (
      select 1 from public.items i
      where i.id = item_costs.item_id and i.etablissement_id = item_costs.etablissement_id
    )
  );

create policy "gerant read" on public.category_costs
  for select to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant write" on public.category_costs
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (
    public.current_member_role(etablissement_id) = 'gerant'
    and exists (
      select 1 from public.categories c
      where c.id = category_costs.category_id and c.etablissement_id = category_costs.etablissement_id
    )
  );

create policy "gerant read" on public.analyses_settings
  for select to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant write" on public.analyses_settings
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

-- Mêmes règles que `isPaid`, `paidAt` et `orderTotal` (lib/gestion/selectors.ts)
-- et que gestion_daily_sales : le CA d'ici et celui de l'accueil doivent concorder.
-- p_from et p_to (exclu) sont des jours de service.
create function public.gestion_analyses(
  p_etablissement_id uuid,
  p_from date,
  p_to date,
  p_history_from date,
  p_day_end_hour int,
  p_default_vat numeric,
  p_replaced_minutes int,
  p_visit_gap_hours int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prev_from date := p_from - (p_to - p_from);
  v_start date := least(p_from - (p_to - p_from), p_history_from);
  v_result jsonb;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;

  with paid_base as materialized (
    select
      o.id,
      o.table_id,
      o.platform_fee_cents,
      o.loyalty_customer_id,
      service.at_local,
      service.at_local::date as service_day,
      extract(isodow from service.at_local)::int as dow,
      extract(hour from service.at_local)::int as service_hour,
      case
        when service.at_local::date >= p_from then 'current'
        when service.at_local::date >= v_prev_from then 'previous'
      end as period,
      o.created_at,
      o.customer_phone
    from orders o
    cross join lateral (
      select (
        coalesce(
          (select max(p.paid_at) from order_payments p where p.order_id = o.id),
          o.created_at
        ) at time zone 'Europe/Paris'
      ) - make_interval(hours => p_day_end_hour) as at_local
    ) service
    where o.etablissement_id = p_etablissement_id
      and o.created_at >= ((v_start - 7)::timestamp at time zone 'Europe/Paris')
      and o.created_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
      and service.at_local::date >= v_start
      and service.at_local::date < p_to
      and case
        when o.type = 'collect' then
          o.status <> 'annulee' and (o.paid_online or o.payment_mode is not null)
        else
          o.status in ('payee', 'servie')
          or (o.order_number is not null and o.status = 'prete')
      end
  ),
  -- Un passage : les commandes d'une table sans trou de plus de p_visit_gap_hours,
  -- pour qu'un midi et un soir fassent deux passages. Sans table, chaque commande
  -- en est un.
  paid as materialized (
    select
      gaps.*,
      case
        when gaps.table_id is not null then
          gaps.table_id::text || '/' || gaps.service_day || '/'
            || sum(gaps.starts_visit) over (
                 partition by gaps.table_id, gaps.service_day order by gaps.created_at, gaps.id
               )
        else gaps.id::text
      end as visit
    from (
      select
        b.*,
        case
          when b.created_at - lag(b.created_at) over (
                 partition by b.table_id, b.service_day order by b.created_at, b.id
               ) <= make_interval(hours => p_visit_gap_hours) then 0
          else 1
        end as starts_visit
      from paid_base b
    ) gaps
  ),
  lines as materialized (
    select
      paid.id as order_id,
      paid.period,
      paid.visit,
      paid.service_day,
      li.item_id,
      li.name,
      li.accord,
      it.category_id,
      li.quantity,
      li.unit_price,
      li.quantity * li.unit_price as revenue,
      li.quantity * li.unit_price / vat.factor as revenue_ht,
      coalesce(
        li.quantity * ic.unit_cost,
        -- Une ligne offerte coûte sa matière : la part s'applique au prix de la carte.
        case
          when li.unit_price > 0 then li.quantity * li.unit_price / vat.factor
          else li.quantity * it.price / vat.factor
        end * cc.cost_percent / 100
      ) as cost,
      case
        when ic.unit_cost is not null then 'exact'
        when cc.cost_percent is not null and it.id is not null then 'categorie'
      end as cost_source
    from paid
    join order_items li on li.order_id = paid.id
    left join items it on it.id = li.item_id
    left join item_costs ic on ic.item_id = li.item_id
    left join category_costs cc on cc.category_id = it.category_id
    cross join lateral (
      select 1 + coalesce(li.vat_rate, it.vat_rate, p_default_vat) / 100 as factor
    ) vat
  ),
  order_totals as (
    select order_id, sum(revenue) as revenue from lines group by order_id
  ),
  summary as (
    select
      paid.period,
      count(distinct paid.id)::int as orders,
      count(distinct paid.visit)::int as visits,
      count(distinct paid.visit) filter (where paid.table_id is not null)::int as table_visits,
      coalesce(sum(paid.platform_fee_cents), 0) / 100.0 as platform_fees
    from paid
    where paid.period is not null
    group by paid.period
  ),
  line_summary as (
    select
      period,
      coalesce(sum(revenue), 0) as revenue,
      coalesce(sum(revenue_ht), 0) as revenue_ht,
      coalesce(sum(cost), 0) as cost,
      coalesce(sum(cost) filter (where cost_source = 'exact'), 0) as cost_exact,
      coalesce(sum(revenue_ht) filter (where cost is not null), 0) as costed_revenue_ht,
      coalesce(sum(quantity) filter (where unit_price = 0), 0)::int as free_units
    from lines
    where period is not null
    group by period
  ),
  repeat_visits as (
    select period, count(*)::int as visits
    from (
      select period, visit
      from paid
      where period is not null and table_id is not null
      group by period, visit
      having count(*) > 1
    ) r
    group by period
  ),
  days as (
    select
      paid.service_day as day,
      coalesce(sum(t.revenue), 0) as revenue,
      count(*)::int as orders,
      count(distinct paid.visit)::int as visits
    from paid
    left join order_totals t on t.order_id = paid.id
    group by paid.service_day
  ),
  heat as (
    select
      paid.dow,
      paid.service_hour as hour,
      coalesce(sum(t.revenue), 0) as revenue,
      count(*)::int as orders
    from paid
    left join order_totals t on t.order_id = paid.id
    where paid.period = 'current'
    group by paid.dow, paid.service_hour
  ),
  item_sales as (
    select
      item_id,
      coalesce(sum(quantity), 0)::int as units,
      coalesce(sum(revenue), 0) as revenue,
      coalesce(sum(revenue_ht), 0) as revenue_ht,
      sum(cost) as cost,
      count(distinct visit)::int as visits
    from lines
    where period = 'current' and item_id is not null
    group by item_id
  ),
  category_sales as (
    select
      category_id,
      count(distinct visit)::int as visits,
      sum(quantity)::int as units,
      sum(revenue) as revenue,
      sum(revenue_ht) as revenue_ht
    from lines
    where period = 'current' and category_id is not null
    group by category_id
  ),
  -- Une rupture ne compte qu'aux heures où le restaurant vendait : une nuit de
  -- fermeture n'a rien fait perdre.
  active_hours as (
    select distinct
      ((date_trunc('hour', paid.at_local) + make_interval(hours => p_day_end_hour))
        at time zone 'Europe/Paris') as hour_start
    from paid
    where paid.period = 'current'
  ),
  availability as (
    select
      l.item_id,
      l.disponible,
      l.changed_at as from_at,
      coalesce(
        lead(l.changed_at) over (partition by l.item_id order by l.changed_at, l.id),
        now()
      ) as to_at
    from item_availability_log l
    where l.etablissement_id = p_etablissement_id
  ),
  sold_out as (
    select a.item_id, count(distinct h.hour_start)::int as hours
    from availability a
    join active_hours h
      on h.hour_start < a.to_at
     and h.hour_start + interval '1 hour' > a.from_at
    where not a.disponible
    group by a.item_id
  ),
  labor as (
    select
      local.at_local::date as day,
      extract(isodow from local.at_local)::int as dow,
      extract(hour from local.at_local)::int as hour,
      sum(extract(epoch from least(t.ended_at, h + interval '1 hour') - greatest(t.started_at, h))) / 3600.0 as hours
    from time_entries t
    cross join lateral generate_series(
      date_trunc('hour', t.started_at),
      t.ended_at - interval '1 microsecond',
      interval '1 hour'
    ) h
    cross join lateral (
      select (greatest(t.started_at, h) at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour) as at_local
    ) local
    where t.etablissement_id = p_etablissement_id
      and t.ended_at is not null
      and t.started_at >= ((v_prev_from - 1)::timestamp at time zone 'Europe/Paris')
      and t.started_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
      and local.at_local::date >= v_prev_from
      and local.at_local::date < p_to
    group by 1, 2, 3
  ),
  -- Un client parti sans payer en ligne n'a rien annulé : ce panier-là se lit dans
  -- online_payment_attempts. Restent les commandes annulées par le service, et celles
  -- payées en ligne puis annulées par la caisse.
  cancelled_orders as (
    select
      case when service_day >= p_from then 'current' else 'previous' end as period,
      c.id,
      c.table_id,
      c.customer_phone,
      c.created_at,
      coalesce((select sum(i.quantity * i.unit_price) from order_items i where i.order_id = c.id), 0) as revenue
    from orders c
    cross join lateral (
      select ((c.created_at at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour))::date as service_day
    ) d
    where c.etablissement_id = p_etablissement_id
      and c.status = 'annulee'
      and (c.online_payment_started_at is null or c.paid_online)
      and c.created_at >= ((v_prev_from - 1)::timestamp at time zone 'Europe/Paris')
      and c.created_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
      and d.service_day >= v_prev_from
      and d.service_day < p_to
  ),
  replaced_orders as (
    select c.id
    from cancelled_orders c
    join paid p on p.table_id = c.table_id
    where p.created_at > c.created_at
      and p.created_at <= c.created_at + make_interval(mins => p_replaced_minutes)
    union
    select c.id
    from cancelled_orders c
    join paid p on p.customer_phone = c.customer_phone
    where p.created_at > c.created_at
      and p.created_at <= c.created_at + make_interval(mins => p_replaced_minutes)
  ),
  cancelled as (
    select c.period, c.revenue, r.id is not null as replaced
    from cancelled_orders c
    left join replaced_orders r on r.id = c.id
  ),
  member_orders as (
    select
      paid.period,
      paid.loyalty_customer_id is not null as member,
      paid.loyalty_customer_id,
      paid.visit,
      paid.service_day,
      coalesce(t.revenue, 0) as revenue
    from paid
    left join order_totals t on t.order_id = paid.id
    where paid.period = 'current'
  ),
  returning_members as (
    select loyalty_customer_id
    from member_orders
    where member
    group by loyalty_customer_id
    having count(distinct service_day) > 1
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'current', (
        select jsonb_build_object(
          'orders', coalesce(s.orders, 0), 'visits', coalesce(s.visits, 0),
          'table_visits', coalesce(s.table_visits, 0), 'repeat_visits', coalesce(r.visits, 0),
          'platform_fees', coalesce(s.platform_fees, 0),
          'revenue', coalesce(l.revenue, 0), 'revenue_ht', coalesce(l.revenue_ht, 0),
          'cost', coalesce(l.cost, 0), 'cost_exact', coalesce(l.cost_exact, 0),
          'costed_revenue_ht', coalesce(l.costed_revenue_ht, 0), 'free_units', coalesce(l.free_units, 0)
        )
        from (select 1) one
        left join summary s on s.period = 'current'
        left join line_summary l on l.period = 'current'
        left join repeat_visits r on r.period = 'current'
      ),
      'previous', (
        select jsonb_build_object(
          'orders', coalesce(s.orders, 0), 'visits', coalesce(s.visits, 0),
          'table_visits', coalesce(s.table_visits, 0), 'repeat_visits', coalesce(r.visits, 0),
          'platform_fees', coalesce(s.platform_fees, 0),
          'revenue', coalesce(l.revenue, 0), 'revenue_ht', coalesce(l.revenue_ht, 0),
          'cost', coalesce(l.cost, 0), 'cost_exact', coalesce(l.cost_exact, 0),
          'costed_revenue_ht', coalesce(l.costed_revenue_ht, 0), 'free_units', coalesce(l.free_units, 0)
        )
        from (select 1) one
        left join summary s on s.period = 'previous'
        left join line_summary l on l.period = 'previous'
        left join repeat_visits r on r.period = 'previous'
      )
    ),
    'days', coalesce((select jsonb_agg(d order by d.day) from days d), '[]'::jsonb),
    'heat', coalesce((select jsonb_agg(h) from heat h), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'name', i.name,
        'category_id', i.category_id,
        'price', i.price,
        'vat_rate', i.vat_rate,
        'disponible', i.disponible,
        'unit_cost', ic.unit_cost,
        'units', coalesce(s.units, 0),
        'visits', coalesce(s.visits, 0),
        'revenue', coalesce(s.revenue, 0),
        'revenue_ht', coalesce(s.revenue_ht, 0),
        'cost', s.cost,
        'sold_out_hours', coalesce(so.hours, 0)
      ) order by i.position)
      from items i
      left join item_costs ic on ic.item_id = i.id
      left join item_sales s on s.item_id = i.id
      left join sold_out so on so.item_id = i.id
      where i.etablissement_id = p_etablissement_id
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_id', c.id,
        'name', c.name,
        'cost_percent', cc.cost_percent,
        'visits', coalesce(s.visits, 0),
        'units', coalesce(s.units, 0),
        'revenue', coalesce(s.revenue, 0),
        'revenue_ht', coalesce(s.revenue_ht, 0)
      ) order by c.position)
      from categories c
      left join category_costs cc on cc.category_id = c.id
      left join category_sales s on s.category_id = c.id
      where c.etablissement_id = p_etablissement_id
    ), '[]'::jsonb),
    'active_hours', (select count(*)::int from active_hours),
    'labor', coalesce((select jsonb_agg(l) from labor l), '[]'::jsonb),
    'settings', (
      select to_jsonb(a) - 'etablissement_id' - 'updated_at'
      from analyses_settings a
      where a.etablissement_id = p_etablissement_id
    ),
    'cancelled', jsonb_build_object(
      'current', (
        select jsonb_build_object(
          'orders', count(*)::int,
          'revenue', coalesce(sum(revenue), 0),
          'lost_orders', count(*) filter (where not replaced)::int,
          'lost_revenue', coalesce(sum(revenue) filter (where not replaced), 0)
        )
        from cancelled where period = 'current'
      ),
      'previous', (
        select jsonb_build_object(
          'orders', count(*)::int,
          'revenue', coalesce(sum(revenue), 0),
          'lost_orders', count(*) filter (where not replaced)::int,
          'lost_revenue', coalesce(sum(revenue) filter (where not replaced), 0)
        )
        from cancelled where period = 'previous'
      )
    ),
    'funnel', jsonb_build_object(
      'current', (
        select jsonb_build_object(
          'sessions', coalesce(sum(sessions), 0)::int,
          'paniers', coalesce(sum(paniers), 0)::int,
          'commandes', coalesce(sum(commandes), 0)::int,
          'paiements', coalesce(sum(paiements), 0)::int
        )
        from menu_stats_daily
        where etablissement_id = p_etablissement_id and day >= p_from and day < p_to
      ),
      'previous', (
        select jsonb_build_object(
          'sessions', coalesce(sum(sessions), 0)::int,
          'paniers', coalesce(sum(paniers), 0)::int,
          'commandes', coalesce(sum(commandes), 0)::int,
          'paiements', coalesce(sum(paiements), 0)::int
        )
        from menu_stats_daily
        where etablissement_id = p_etablissement_id and day >= v_prev_from and day < p_from
      )
    ),
    'payments', (
      select jsonb_build_object(
        'attempts', count(*)::int,
        'succeeded', count(*) filter (where outcome = 'reussi')::int,
        'failed', count(*) filter (where outcome = 'echoue')::int
      )
      from online_payment_attempts
      where etablissement_id = p_etablissement_id
        and outcome <> 'en_cours'
        and ((started_at at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour))::date >= p_from
        and ((started_at at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour))::date < p_to
    ),
    'loyalty', (
      select jsonb_build_object(
        'member_orders', count(*) filter (where member)::int,
        'member_revenue', coalesce(sum(revenue) filter (where member), 0),
        'other_orders', count(*) filter (where not member)::int,
        'other_revenue', coalesce(sum(revenue) filter (where not member), 0),
        'members', count(distinct loyalty_customer_id)::int,
        'returning', (select count(*)::int from returning_members)
      )
      from member_orders
    ),
    'accords', coalesce((
      select jsonb_agg(a)
      from (
        select accord as source, sum(quantity)::int as units, sum(revenue) as revenue
        from lines
        where period = 'current' and accord is not null
        group by accord
      ) a
    ), '[]'::jsonb),
    'after_meal', (
      select jsonb_build_object(
        'shown', count(distinct appearance) filter (where event = 'apparue')::int,
        'added', count(distinct appearance) filter (where event in ('ajout', 'ajout_combo'))::int,
        'ordered', count(distinct appearance) filter (where event = 'commande')::int
      )
      from after_meal_events
      where etablissement_id = p_etablissement_id
        and ((created_at at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour))::date >= p_from
        and ((created_at at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour))::date < p_to
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.gestion_analyses(uuid, date, date, date, int, numeric, int, int)
  from public, anon;
grant execute on function public.gestion_analyses(uuid, date, date, date, int, numeric, int, int)
  to authenticated;
