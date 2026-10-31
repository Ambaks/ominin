-- Pilotage d'un établissement : ce qui manque pour décider, pas seulement pour
-- constater. Quatre trous dans la mesure, et une fonction qui lit le tout.
--
--   - orders.ready_at : sans lui, le temps passé au bar ne se coupe pas entre
--     préparation et attente du client.
--   - tables.zone : le plan de salle n'existait que dans un fichier d'impression.
--   - menu_suggestion_stats : order_items.accord dit ce qui a été pris, rien ne
--     disait ce qui avait été proposé.
--   - etablissements.pilotage_from : les essais d'avant l'ouverture ne sont pas
--     des clients.
--
-- La mesure reste celle de 20260911000001_menu_analytics : aucune donnée
-- personnelle, aucun identifiant qui survive à l'onglet. Le compteur de
-- suggestions est un total par jour, sans lien avec la visite.

-- --------------------------------------------------------------------------
-- L'heure où une commande devient prête
-- --------------------------------------------------------------------------

-- Qui l'a marquée prête, qui l'a remise : le compte connecté, pas forcément la
-- personne (une tablette partagée n'a qu'un compte). Null quand c'est le serveur
-- ou la caisse qui écrit. Les commandes ne se lisent qu'entre membres du
-- restaurant : le client n'y a pas accès.
alter table public.orders
  add column ready_at timestamptz,
  add column ready_by uuid references auth.users (id) on delete set null,
  add column handed_over_by uuid references auth.users (id) on delete set null;

create function public.stamp_ready()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'prete' and old.status <> 'prete' then
    new.ready_at := now();
    new.ready_by := auth.uid();
  -- « Prête » annulée d'un toucher : la commande n'a jamais été prête.
  elsif new.status = 'payee' and old.status = 'prete' then
    new.ready_at := null;
    new.ready_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.stamp_handed_over()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is not null and new.status = 'servie'
     and old.status <> 'servie' then
    new.handed_over_at := now();
    new.handed_over_by := auth.uid();
  end if;
  return new;
end;
$$;

-- Même rang que orders_stamp_handed_over : après orders_enforce_update_rights,
-- qui ne voit que ce que le serveur a écrit.
create trigger orders_stamp_ready
  before update of status on public.orders
  for each row execute function public.stamp_ready();

-- --------------------------------------------------------------------------
-- Le plan de salle
-- --------------------------------------------------------------------------

alter table public.tables add column zone text;

-- Plan de la caisse du Caffè Panis, photos du 2026-10-22.
update public.tables set zone = 'Panis'
where etablissement_id = '0f5e66e1-0f68-4b0c-8844-7a8660d1c254'
  and number = any(array[
    10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25, 26, 29, 30, 31, 32,
    33, 34, 35, 36, 39, 40, 41, 44, 45, 49, 50, 51, 52, 54, 55, 59, 60, 61, 62,
    63, 64, 65, 66, 69, 70, 71, 72, 73, 74, 75, 76, 79, 80, 81, 82, 83, 84, 85,
    86, 89
  ]);
update public.tables set zone = 'Saint-Raph'
where etablissement_id = '0f5e66e1-0f68-4b0c-8844-7a8660d1c254'
  and number = any(array[
    100, 101, 105, 200, 201, 202, 205, 300, 301, 302, 305, 400, 401, 500, 501,
    502, 505, 600, 601, 602, 603, 604, 605, 700, 701, 702, 703, 704, 705, 706,
    800, 801, 802, 803, 804, 805, 806
  ]);
update public.tables set zone = 'Intérieur'
where etablissement_id = '0f5e66e1-0f68-4b0c-8844-7a8660d1c254'
  and number = any(array[902, 903, 904, 905, 906]);

-- --------------------------------------------------------------------------
-- Le début du décompte
-- --------------------------------------------------------------------------

alter table public.etablissements add column pilotage_from timestamptz;

comment on column public.etablissements.pilotage_from is
  'Pilotage : rien de plus ancien n''est compté. Ce qui précède l''ouverture réelle n''est que des essais.';

create function public.admin_set_pilotage_from(p_etab uuid, p_from timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administration.';
  end if;
  update etablissements set pilotage_from = p_from where id = p_etab;
end;
$$;

revoke execute on function public.admin_set_pilotage_from(uuid, timestamptz)
  from public, anon;
grant execute on function public.admin_set_pilotage_from(uuid, timestamptz)
  to authenticated;

-- --------------------------------------------------------------------------
-- Les ruptures
-- --------------------------------------------------------------------------

-- Chaque bascule de items.disponible, sans geste de plus pour l'équipe. Un plat
-- déjà coupé avant ce déploiement n'a pas de ligne tant qu'il ne rebascule pas.
create table public.item_availability_log (
  id bigint generated always as identity primary key,
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  disponible boolean not null,
  changed_at timestamptz not null default now()
);

create index item_availability_log_etab_idx
  on public.item_availability_log (etablissement_id, item_id, changed_at);

alter table public.item_availability_log enable row level security;

-- SECURITY DEFINER : la table n'a aucune policy, et l'écriture vient de
-- n'importe quel rôle qui peut couper un plat, caisse comprise.
create function public.log_item_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into item_availability_log (etablissement_id, item_id, disponible)
  values (new.etablissement_id, new.id, new.disponible);
  return null;
end;
$$;

revoke execute on function public.log_item_availability()
  from public, anon, authenticated;

create trigger items_log_availability
  after update of disponible on public.items
  for each row
  when (old.disponible is distinct from new.disponible)
  execute function public.log_item_availability();

-- --------------------------------------------------------------------------
-- Les suggestions proposées
-- --------------------------------------------------------------------------

-- Les accords, plus la suite du repas. Pas accord_source : cet enum dit d'où
-- vient une ligne commandée, et le tableau du gérant en tire ses graphiques.
create type public.menu_suggestion_kind as enum (
  'panier', 'fiche', 'formule', 'apres_repas'
);

-- Une ligne par restaurant, jour et sorte de suggestion : le menu l'incrémente
-- une fois par visite, jamais à chaque affichage. Comme menu_stats_daily, ce
-- total ne contient rien de personnel et se garde.
create table public.menu_suggestion_stats (
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  day date not null,
  kind public.menu_suggestion_kind not null,
  shown int not null default 0,
  primary key (etablissement_id, day, kind)
);

alter table public.menu_suggestion_stats enable row level security;

-- Nouveau paramètre, avec défaut : un menu resté ouvert pendant le déploiement
-- continue d'appeler la fonction sans lui.
drop function public.menu_track(text, uuid, public.menu_stage, int, uuid[], uuid);

create function public.menu_track(
  p_slug text,
  p_session uuid,
  p_stage public.menu_stage,
  p_table int default null,
  p_items uuid[] default null,
  p_order uuid default null,
  p_shown public.menu_suggestion_kind[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c_throttle_seconds constant int := 5;
  c_budget_per_minute constant int := 300;
  c_session_ttl_days constant int := 35;
  c_click_ttl_days constant int := 400;
  c_prune_odds constant numeric := 0.005;
  c_max_items constant int := 20;
  v_etab uuid;
  v_minute timestamptz := date_trunc('minute', now());
  v_n int;
  v_items uuid[];
begin
  select id into v_etab from etablissements where slug = p_slug;
  -- Silence volontaire : un mouchard qui lève une exception casse la page
  -- qu'il mesure. Aucun appel de menu_track ne doit jamais être visible.
  if v_etab is null then
    return;
  end if;

  insert into menu_track_budget (etablissement_id, minute, n)
  values (v_etab, v_minute, 1)
  on conflict (etablissement_id, minute) do update set n = menu_track_budget.n + 1
  returning n into v_n;
  if v_n > c_budget_per_minute then
    return;
  end if;

  -- Purge opportuniste : le cron nocturne fait le travail, ceci garantit qu'un
  -- projet en pause ne gonfle pas indéfiniment (repris d'omilink_enroll).
  if random() < c_prune_odds then
    delete from menu_track_budget where minute < now() - interval '1 hour';
    delete from menu_sessions
      where last_seen_at < now() - make_interval(days => c_session_ttl_days);
    delete from menu_item_clicks
      where day < current_date - c_click_ttl_days;
  end if;

  -- On ne retient que des plats de CE restaurant : impossible de gonfler la
  -- carte d'un voisin. Le filtrage précède le compteur de la visite, sans quoi
  -- l'entonnoir et le palmarès ne diraient pas le même nombre de clics.
  if p_items is not null then
    select array_agg(id) into v_items
    from items
    where etablissement_id = v_etab
      and id = any(p_items[1:c_max_items]);
  end if;

  insert into menu_sessions (
    id, etablissement_id, table_number, stage, item_clicks, order_id
  )
  values (
    p_session, v_etab, p_table, p_stage,
    coalesce(array_length(v_items, 1), 0),
    p_order
  )
  on conflict (id) do update
    set stage = greatest(menu_sessions.stage, excluded.stage),
        item_clicks = menu_sessions.item_clicks + excluded.item_clicks,
        order_id = coalesce(excluded.order_id, menu_sessions.order_id),
        last_seen_at = now()
    -- Une session appartient à un seul restaurant : un id rejoué ailleurs est
    -- sans effet. Et on n'écrit que si l'étape avance ou si le délai est passé.
    where menu_sessions.etablissement_id = excluded.etablissement_id
      and (
        menu_sessions.stage < excluded.stage
        or excluded.order_id is not null
        or menu_sessions.last_seen_at
             < now() - make_interval(secs => c_throttle_seconds)
      );

  if p_shown is not null then
    insert into menu_suggestion_stats (etablissement_id, day, kind, shown)
    select distinct v_etab, current_date, kind, 1 from unnest(p_shown) as t(kind)
    on conflict (etablissement_id, day, kind)
      do update set shown = menu_suggestion_stats.shown + 1;
  end if;

  if v_items is null then
    return;
  end if;

  insert into menu_item_clicks (etablissement_id, item_id, day, clicks)
  select v_etab, id, current_date, 1 from unnest(v_items) as t(id)
  on conflict (etablissement_id, day, item_id)
    do update set clicks = menu_item_clicks.clicks + 1;
end;
$$;

grant execute on function
  public.menu_track(text, uuid, public.menu_stage, int, uuid[], uuid, public.menu_suggestion_kind[])
  to anon, authenticated;

-- --------------------------------------------------------------------------
-- La lecture
-- --------------------------------------------------------------------------

-- Tout d'un coup, en un seul document : l'onglet s'affiche d'un bloc, et les
-- sections partagent les mêmes commandes au lieu de les relire chacune.
--
-- Les commandes de la caisse (source = 'popina') ne servent qu'à la part du QR :
-- elles n'ont ni visite, ni numéro, ni temps de préparation.
--
-- Une tentative en ligne expirée supprime sa commande (discard_online_payment) :
-- menu_sessions.order_id repasse à null. Une visite ne compte donc comme
-- convertie que si sa commande existe encore, et ces tentatives ne laissent pas
-- de quoi calculer un taux d'échec. menu_item_clicks compte les ajouts au
-- panier, pas les fiches ouvertes : il ne dit rien de ce qui a été vu.
create function public.admin_menu_pilotage(
  p_etab uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_return_days int,
  p_limit int,
  p_ready_batch_seconds int
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with venue as (
    select e.id, e.bar_pickup, e.pilotage_from,
           greatest(p_from, coalesce(e.pilotage_from, p_from)) as from_at,
           ((now() at time zone 'Europe/Paris')::date
             at time zone 'Europe/Paris') as today_at
    from etablissements e
    where e.id = p_etab and (select public.is_admin())
  ),
  visits as (
    select s.*,
           extract(hour from s.started_at at time zone 'Europe/Paris')::int as hour
    from menu_sessions s, venue v
    where s.etablissement_id = v.id
      and s.started_at >= v.from_at and s.started_at < p_to
  ),
  all_orders as (
    select o.*
    from orders o, venue v
    where o.etablissement_id = v.id
      and o.type = 'sur_place'
      and o.created_at >= v.from_at and o.created_at < p_to
  ),
  lines as (
    select oi.order_id,
           min(oi.paid_at) as paid_first,
           sum(oi.quantity * oi.unit_price) as total,
           coalesce(sum(oi.quantity * oi.unit_price)
             filter (where oi.paid_at is not null), 0) as paid_total,
           sum(oi.quantity)::int as quantity,
           count(*)::int as line_count
    from order_items oi
    join all_orders o on o.id = oi.order_id
    group by oi.order_id
  ),
  placed as (
    select o.*, l.paid_first,
           coalesce(l.total, 0) as total,
           coalesce(l.paid_total, 0) as paid_total,
           coalesce(l.quantity, 0) as quantity,
           coalesce(l.line_count, 0) as line_count,
           extract(hour from o.created_at at time zone 'Europe/Paris')::int as hour
    from all_orders o
    left join lines l on l.order_id = o.id
    where o.status <> 'annulee' and o.source is null
  ),
  numbered as (
    select p.*,
           extract(epoch from p.ready_at - p.paid_first) as paid_to_ready,
           extract(epoch from p.handed_over_at - p.ready_at) as ready_to_handed,
           extract(epoch from p.handed_over_at - p.paid_first) as paid_to_handed,
           extract(hour from p.paid_first at time zone 'Europe/Paris')::int as paid_hour
    from placed p
    where p.order_number is not null and p.paid_first is not null
  ),
  ready_marks as (
    select ready_at,
           lag(ready_at) over w as previous_at,
           lead(ready_at) over w as next_at
    from numbered
    where ready_at is not null
    window w as (order by ready_at)
  ),
  -- Ce qui reste à remettre au moment où une commande est payée. Balayage des
  -- entrées et sorties plutôt qu'une jointure de chaque commande sur toutes les
  -- autres. Une commande jamais remise n'y entre pas : elle resterait ouverte
  -- pour toujours et gonflerait la file de tous les jours suivants.
  bar_events as (
    select id, paid_first as at, 1 as delta
    from numbered where handed_over_at > paid_first
    union all
    select id, handed_over_at, -1
    from numbered where handed_over_at > paid_first
  ),
  bar_queue as (
    select id, delta,
           sum(delta) over (order by at, delta rows unbounded preceding) - 1 as open_orders
    from bar_events
  ),
  saturation as (
    select q.open_orders::int as open_orders, n.paid_to_ready, n.paid_to_handed
    from bar_queue q
    join numbered n on n.id = q.id
    where q.delta = 1
  ),
  hours as (
    select h.hour,
           coalesce(v.visits, 0) as visits,
           coalesce(v.baskets, 0) as baskets,
           coalesce(v.converted, 0) as converted,
           coalesce(o.orders, 0) as orders,
           coalesce(o.revenue, 0) as revenue,
           o.basket
    from generate_series(0, 23) as h(hour)
    left join (
      select hour, count(*)::int as visits,
             count(*) filter (where stage >= 'panier')::int as baskets,
             count(*) filter (where order_id is not null)::int as converted
      from visits group by hour
    ) v on v.hour = h.hour
    left join (
      select hour, count(*)::int as orders, sum(paid_total) as revenue,
             avg(total) as basket
      from placed group by hour
    ) o on o.hour = h.hour
    where v.hour is not null or o.hour is not null
  ),
  order_categories as (
    select distinct oi.order_id, c.name
    from order_items oi
    join placed p on p.id = oi.order_id
    join items i on i.id = oi.item_id
    join categories c on c.id = i.category_id
  ),
  category_pairs as (
    select a.name as first, b.name as second, count(*)::int as orders
    from order_categories a
    join order_categories b on b.order_id = a.order_id and a.name < b.name
    group by 1, 2
    order by 3 desc, 1, 2
    limit p_limit
  ),
  member_first as (
    select o.loyalty_customer_id as customer_id, min(o.created_at) as first_at
    from orders o, venue v
    where o.etablissement_id = v.id
      and o.loyalty_customer_id is not null
      and o.status <> 'annulee'
    group by 1
  ),
  cohort as (
    select m.customer_id,
           exists (
             select 1 from orders later
             where later.loyalty_customer_id = m.customer_id
               and later.status <> 'annulee'
               and (later.created_at at time zone 'Europe/Paris')::date
                 > (m.first_at at time zone 'Europe/Paris')::date
               and later.created_at <= m.first_at + make_interval(days => p_return_days)
           ) as returned
    from member_first m, venue v
    where m.first_at >= v.from_at
      and m.first_at < least(p_to, now()) - make_interval(days => p_return_days)
  ),
  accepted as (
    select oi.accord as kind, count(distinct oi.order_id)::int as orders,
           sum(oi.quantity * oi.unit_price) as revenue
    from order_items oi
    join placed p on p.id = oi.order_id
    where oi.accord is not null
    group by 1
  ),
  shown as (
    select s.kind, sum(s.shown)::int as shown
    from menu_suggestion_stats s, venue v
    where s.etablissement_id = v.id
      and s.day >= v.from_at::date and s.day <= p_to::date
    group by 1
  ),
  availability as (
    select l.item_id, l.disponible, l.changed_at,
           lead(l.changed_at) over (
             partition by l.item_id order by l.changed_at, l.id
           ) as until
    from item_availability_log l
    where l.etablissement_id = p_etab
  ),
  sold_out as (
    select a.item_id,
           count(*) filter (where a.changed_at >= v.from_at)::int as times,
           sum(extract(epoch from
             least(coalesce(a.until, now()), p_to) - greatest(a.changed_at, v.from_at)
           )) as seconds,
           bool_or(a.until is null) as still_out
    from availability a, venue v
    where not a.disponible
      and a.changed_at < p_to
      and coalesce(a.until, now()) > v.from_at
    group by a.item_id
  ),
  bar_people as (
    select who, count(*) filter (where role = 'ready')::int as marked_ready,
           percentile_cont(0.5) within group (order by seconds)
             filter (where role = 'ready' and seconds >= 0) as paid_to_ready_s,
           count(*) filter (where role = 'handed')::int as handed_over,
           percentile_cont(0.5) within group (order by seconds)
             filter (where role = 'handed' and seconds >= 0) as ready_to_handed_s
    from (
      select ready_by as who, 'ready' as role, paid_to_ready as seconds
      from numbered where ready_by is not null
      union all
      select handed_over_by, 'handed', ready_to_handed
      from numbered where handed_over_by is not null
    ) t
    group by who
  ),
  item_sales as (
    select distinct oi.item_id
    from order_items oi
    join placed p on p.id = oi.order_id
    where oi.item_id is not null
  )
  select jsonb_build_object(
    'venue', jsonb_build_object(
      'bar_pickup', v.bar_pickup,
      'pilotage_from', v.pilotage_from,
      'from_at', v.from_at,
      'first_visit_at', (select min(started_at) from visits)
    ),
    'till', jsonb_build_object(
      'connected',
        exists (select 1 from popina_connections c where c.etablissement_id = v.id),
      'sales', (select count(*)::int from all_orders where source = 'popina' and status <> 'annulee'),
      'revenue', (
        select coalesce(sum(l.paid_total), 0)
        from all_orders o join lines l on l.order_id = o.id
        where o.source = 'popina' and o.status <> 'annulee'
      ),
      'qr_revenue', (select coalesce(sum(paid_total), 0) from placed)
    ),
    'reach', jsonb_build_object(
      'visits', (select count(*)::int from visits),
      'without_table', (select count(*)::int from visits where table_number is null),
      'tables', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'number', t.number, 'zone', t.zone,
                 'visits', coalesce(n.visits, 0), 'orders', coalesce(n.orders, 0)
               ) order by t.number)
        from tables t
        left join (
          select table_number, count(*)::int as visits,
                 count(*) filter (where order_id is not null)::int as orders
          from visits group by table_number
        ) n on n.table_number = t.number
        where t.etablissement_id = v.id
      ), '[]'::jsonb)
    ),
    'conversion', jsonb_build_object(
      'median_to_order_s', (
        select percentile_cont(0.5) within group (
          order by extract(epoch from o.created_at - s.started_at)
        )
        from visits s join placed o on o.id = s.order_id
        where o.created_at >= s.started_at
      ),
      'hours', coalesce((
        select jsonb_agg(to_jsonb(h) order by h.hour) from hours h
      ), '[]'::jsonb)
    ),
    'bar', (
      select jsonb_build_object(
        'orders', count(*)::int,
        'with_ready', count(*) filter (where ready_at is not null)::int,
        'paid_to_ready_median_s', percentile_cont(0.5) within group (order by paid_to_ready)
          filter (where paid_to_ready >= 0),
        'paid_to_ready_max_s', max(paid_to_ready) filter (where paid_to_ready >= 0),
        'ready_to_handed_median_s', percentile_cont(0.5) within group (order by ready_to_handed)
          filter (where ready_to_handed >= 0),
        'ready_to_handed_max_s', max(ready_to_handed) filter (where ready_to_handed >= 0),
        'paid_to_handed_median_s', percentile_cont(0.5) within group (order by paid_to_handed)
          filter (where paid_to_handed >= 0),
        'paid_to_handed_max_s', max(paid_to_handed) filter (where paid_to_handed >= 0),
        'promised', count(*) filter (
          where estimated_ready_at is not null and ready_at is not null
        )::int,
        'promise_kept', count(*) filter (where ready_at <= estimated_ready_at)::int,
        'closed_days_orders', count(*) filter (where created_at < v.today_at)::int,
        'never_handed', count(*) filter (
          where created_at < v.today_at and handed_over_at is null
        )::int,
        'handed_without_ready', count(*) filter (
          where handed_over_at is not null and ready_at is null
        )::int,
        'ready_batched', (
          select count(*)::int from ready_marks
          where ready_at - previous_at <= make_interval(secs => p_ready_batch_seconds)
             or next_at - ready_at <= make_interval(secs => p_ready_batch_seconds)
        ),
        'waiting_now', count(*) filter (
          where created_at >= v.today_at and ready_at is not null and handed_over_at is null
        )::int,
        'waiting_median_s', percentile_cont(0.5) within group (
          order by extract(epoch from now() - ready_at)
        ) filter (
          where created_at >= v.today_at and ready_at is not null and handed_over_at is null
        ),
        'ready_never_collected', count(*) filter (
          where created_at < v.today_at and ready_at is not null and handed_over_at is null
        )::int
      )
      from numbered
    ),
    'bar_hours', coalesce((
      select jsonb_agg(row_to_json(h) order by h.hour)
      from (
        select paid_hour as hour, count(*)::int as orders,
               percentile_cont(0.5) within group (order by paid_to_ready)
                 filter (where paid_to_ready >= 0) as paid_to_ready_s,
               percentile_cont(0.5) within group (order by ready_to_handed)
                 filter (where ready_to_handed >= 0) as ready_to_handed_s,
               percentile_cont(0.5) within group (order by paid_to_handed)
                 filter (where paid_to_handed >= 0) as paid_to_handed_s
        from numbered
        group by paid_hour
      ) h
    ), '[]'::jsonb),
    'bar_people', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', coalesce(st.name, m.display_name, m.email, 'Hors équipe'),
               'marked_ready', p.marked_ready,
               'paid_to_ready_s', p.paid_to_ready_s,
               'handed_over', p.handed_over,
               'ready_to_handed_s', p.ready_to_handed_s
             ) order by p.marked_ready + p.handed_over desc)
      from bar_people p
      left join memberships m on m.user_id = p.who and m.etablissement_id = v.id
      left join staff st on st.user_id = p.who and st.etablissement_id = v.id
    ), '[]'::jsonb),
    'sold_out', coalesce((
      select jsonb_agg(row_to_json(s) order by s.seconds desc)
      from (
        select i.name, so.times, so.seconds, so.still_out
        from sold_out so
        join items i on i.id = so.item_id
        order by so.seconds desc
        limit p_limit
      ) s
    ), '[]'::jsonb),
    'saturation', coalesce((
      select jsonb_agg(row_to_json(s) order by s.open_orders)
      from (
        select open_orders, count(*)::int as orders,
               percentile_cont(0.5) within group (order by paid_to_ready)
                 filter (where paid_to_ready >= 0) as paid_to_ready_s,
               percentile_cont(0.5) within group (order by paid_to_handed)
                 as paid_to_handed_s
        from saturation
        group by open_orders
      ) s
    ), '[]'::jsonb),
    'basket', (
      select jsonb_build_object(
        'orders', count(*)::int,
        'average', avg(total),
        'quantity_average', avg(quantity),
        'several_lines', count(*) filter (where line_count > 1)::int,
        'pairs', coalesce(
          (select jsonb_agg(to_jsonb(cp) order by cp.orders desc, cp.first, cp.second)
           from category_pairs cp),
          '[]'::jsonb
        )
      )
      from placed
    ),
    'menu', jsonb_build_object(
      'items', (select count(*)::int from items i where i.etablissement_id = v.id),
      'sold', (select count(*)::int from item_sales)
    ),
    'suggestions', (
      select jsonb_agg(jsonb_build_object(
               'kind', k.kind,
               'shown', coalesce(shown.shown, 0),
               'orders', coalesce(accepted.orders, 0),
               'revenue', coalesce(accepted.revenue, 0)
             ) order by k.kind)
      from unnest(enum_range(null::public.menu_suggestion_kind)) as k(kind)
      left join shown on shown.kind = k.kind
      left join accepted on accepted.kind::text = k.kind::text
    ),
    'loyalty', jsonb_build_object(
      'signups', (
        select count(*)::int from loyalty_customers c
        where c.etablissement_id = v.id
          and c.created_at >= v.from_at and c.created_at < p_to
      ),
      'orders_with_member', (
        select count(*)::int from placed where loyalty_customer_id is not null
      ),
      'cohort', (select count(*)::int from cohort),
      'returned', (select count(*)::int from cohort where returned),
      'wheel_spins', (
        select count(*)::int
        from loyalty_entries le
        join loyalty_customers c on c.id = le.customer_id
        where c.etablissement_id = v.id and le.kind = 'roue'
          and le.created_at >= v.from_at and le.created_at < p_to
      ),
      'redemptions', (
        select count(*)::int
        from loyalty_entries le
        join loyalty_customers c on c.id = le.customer_id
        where c.etablissement_id = v.id and le.kind = 'depense'
          and le.created_at >= v.from_at and le.created_at < p_to
      )
    ),
    'payment', jsonb_build_object(
      'online', (select count(*)::int from placed where paid_online),
      'at_bar', (
        select count(*)::int from placed
        where not paid_online and paid_first is not null
      ),
      'unpaid', (select count(*)::int from placed where paid_first is null),
      'online_revenue', (
        select coalesce(sum(paid_total), 0) from placed where paid_online
      ),
      'at_bar_revenue', (
        select coalesce(sum(paid_total), 0) from placed where not paid_online
      ),
      'cancelled', (
        select count(*)::int from all_orders
        where status = 'annulee' and source is null
      ),
      'refunded', (select count(*)::int from placed where refunded_at is not null),
      'tips', (select coalesce(sum(tip_amount), 0) from placed)
    )
  )
  from venue v;
$$;

revoke execute on function
  public.admin_menu_pilotage(uuid, timestamptz, timestamptz, int, int, int)
  from public, anon;
grant execute on function
  public.admin_menu_pilotage(uuid, timestamptz, timestamptz, int, int, int)
  to authenticated;
