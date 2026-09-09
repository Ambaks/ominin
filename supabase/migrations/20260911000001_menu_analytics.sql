-- Analytique du menu QR, pour l'admin d'Ominin.
--
-- Ce qu'on veut savoir d'un client : son menu est-il ouvert, et les gens qui
-- l'ouvrent finissent-ils par commander ? Rien de tout cela n'était mesuré —
-- GA4 exclut délibérément les menus QR (cookie-consent.tsx), parce qu'on
-- n'interrompt pas un client attablé avec une bannière.
--
-- D'où la forme retenue : mesure de première partie, sans cookie, sans IP,
-- sans user-agent, sans identifiant qui survive à l'onglet — l'exemption
-- « mesure d'audience » de la CNIL. Il n'existe aucune colonne de données
-- personnelles dans ce fichier, et c'est volontaire.
--
-- On n'enregistre pas un journal d'événements : une visite est UNE ligne
-- qu'on fait avancer. L'entonnoir est une colonne, pas un historique. Le
-- volume ne croît donc qu'avec les visites, jamais avec les clics.

create type public.menu_stage as enum (
  'vue', 'categorie', 'plat', 'panier', 'commande', 'paiement'
);

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

-- Une visite. L'id est tiré par le navigateur (crypto.randomUUID en
-- sessionStorage) : il meurt avec l'onglet et ne suit personne.
-- fillfactor : last_seen_at est réécrit toutes les 45 s, on garde de la place
-- dans la page pour que ces mises à jour restent HOT.
create table public.menu_sessions (
  id uuid primary key,
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  -- null : menu ouvert hors table (lien direct, QR de vitrine).
  table_number int,
  stage public.menu_stage not null default 'vue',
  item_clicks int not null default 0,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  order_id uuid references public.orders (id) on delete set null
) with (fillfactor = 80);

-- « Qui est sur le menu maintenant » : dernier signe de vie, par restaurant.
create index menu_sessions_live_idx
  on public.menu_sessions (etablissement_id, last_seen_at desc);
create index menu_sessions_day_idx
  on public.menu_sessions (etablissement_id, started_at);

-- Clics par plat, agrégés à la journée dès l'écriture. Un plat consulté mille
-- fois reste une ligne : c'est ce qui rend le suivi par plat abordable.
create table public.menu_item_clicks (
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  day date not null,
  clicks int not null default 0,
  primary key (etablissement_id, day, item_id)
);

-- L'entonnoir des jours révolus, pour que la courbe historique survive à la
-- purge des visites. Une ligne par restaurant et par jour, pour toujours.
create table public.menu_stats_daily (
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  day date not null,
  sessions int not null default 0,
  categories int not null default 0,
  plats int not null default 0,
  paniers int not null default 0,
  commandes int not null default 0,
  paiements int not null default 0,
  item_clicks int not null default 0,
  primary key (etablissement_id, day)
);

-- Garde-fou de débit. La clé anon est publique : menu_track est appelable par
-- n'importe qui. On ne peut pas l'empêcher, on peut borner les dégâts.
create table public.menu_track_budget (
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  minute timestamptz not null,
  n int not null default 0,
  primary key (etablissement_id, minute)
);

-- RLS active, aucune policy : ces tables ne se lisent et ne s'écrivent que par
-- les fonctions ci-dessous (même parti pris que call_throttle).
alter table public.menu_sessions enable row level security;
alter table public.menu_item_clicks enable row level security;
alter table public.menu_stats_daily enable row level security;
alter table public.menu_track_budget enable row level security;

-- --------------------------------------------------------------------------
-- Ingestion (anon)
-- --------------------------------------------------------------------------

-- Appelée par le menu, en lot : à chaque changement d'étape, à chaque battement
-- de cœur, et au masquage de l'onglet. Jamais à chaque clic.
--
-- Les plafonds sont des littéraux et non des paramètres : la fonction est
-- exposée à anon, un paramètre serait un plafond choisi par l'appelant.
create function public.menu_track(
  p_slug text,
  p_session uuid,
  p_stage public.menu_stage,
  p_table int default null,
  p_items uuid[] default null,
  p_order uuid default null
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
  public.menu_track(text, uuid, public.menu_stage, int, uuid[], uuid)
  to anon, authenticated;

-- --------------------------------------------------------------------------
-- Lecture transverse (admin)
-- --------------------------------------------------------------------------
--
-- Des fonctions SECURITY DEFINER plutôt qu'une policy is_admin() sur orders :
-- une policy ajouterait une branche OR au plan de TOUTES les requêtes de
-- TOUS les restaurants, sur la table la plus sollicitée de la base, pour deux
-- utilisateurs internes.
--
-- Le chiffre d'affaires se calcule à la maille order_items.paid_at, seule
-- maille juste depuis le paiement par article : une commande peut être
-- « servie » avec des lignes encore impayées, et « payée » sans que son statut
-- l'indique. Et une addition espèces annulée (payee → annulee) ne remet pas
-- paid_at à null — d'où le filtre sur annulee, sans lequel on facturerait du
-- vide.

create function public.admin_menu_overview(p_from timestamptz, p_to timestamptz)
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
  where (select public.is_admin())
  order by e.name;
$$;

-- Série quotidienne d'un restaurant : recettes et fréquentation côte à côte.
-- Les visites viennent des sessions tant qu'elles existent, du rollup au-delà,
-- la frontière étant la plus vieille session encore en base. Aucune journée
-- n'est donc comptée deux fois, même si le cron a sauté un tour.
create function public.admin_menu_series(
  p_etab uuid, p_from timestamptz, p_to timestamptz
)
returns table (
  day date,
  revenue numeric,
  orders_count int,
  sessions int,
  converted int
)
language sql
stable
security definer
set search_path = public
as $$
  with cutoff as (
    select coalesce(min(started_at)::date, current_date) as d
    from menu_sessions where etablissement_id = p_etab
  ),
  money as (
    select oi.paid_at::date as day,
           sum(oi.quantity * oi.unit_price) as revenue,
           count(distinct o.id)::int as orders_count
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.etablissement_id = p_etab
      and o.type = 'sur_place'
      and o.status <> 'annulee'
      and oi.paid_at >= p_from and oi.paid_at < p_to
    group by 1
  ),
  visits as (
    select s.started_at::date as day,
           count(*)::int as sessions,
           count(*) filter (where s.stage >= 'commande')::int as converted
    from menu_sessions s
    where s.etablissement_id = p_etab
      and s.started_at >= p_from and s.started_at < p_to
    group by 1
    union all
    select d.day, d.sessions, d.commandes
    from menu_stats_daily d
    where d.etablissement_id = p_etab
      and d.day < (select d from cutoff)
      and d.day >= p_from::date and d.day < p_to::date
  )
  select coalesce(money.day, visits.day),
         coalesce(money.revenue, 0), coalesce(money.orders_count, 0),
         coalesce(visits.sessions, 0), coalesce(visits.converted, 0)
  from money
  full outer join visits on visits.day = money.day
  where (select public.is_admin())
  order by 1;
$$;

create function public.admin_menu_funnel(
  p_etab uuid, p_from timestamptz, p_to timestamptz
)
returns table (
  sessions int, categories int, plats int,
  paniers int, commandes int, paiements int, item_clicks int
)
language sql
stable
security definer
set search_path = public
as $$
  with cutoff as (
    select coalesce(min(started_at)::date, current_date) as d
    from menu_sessions where etablissement_id = p_etab
  ),
  rows as (
    select count(*)::int as sessions,
           count(*) filter (where stage >= 'categorie')::int as categories,
           count(*) filter (where stage >= 'plat')::int as plats,
           count(*) filter (where stage >= 'panier')::int as paniers,
           count(*) filter (where stage >= 'commande')::int as commandes,
           count(*) filter (where stage >= 'paiement')::int as paiements,
           coalesce(sum(item_clicks), 0)::int as item_clicks
    from menu_sessions
    where etablissement_id = p_etab
      and started_at >= p_from and started_at < p_to
    union all
    select sessions, categories, plats, paniers, commandes, paiements, item_clicks
    from menu_stats_daily
    where etablissement_id = p_etab
      and day < (select d from cutoff)
      and day >= p_from::date and day < p_to::date
  )
  select coalesce(sum(sessions), 0)::int, coalesce(sum(categories), 0)::int,
         coalesce(sum(plats), 0)::int, coalesce(sum(paniers), 0)::int,
         coalesce(sum(commandes), 0)::int, coalesce(sum(paiements), 0)::int,
         coalesce(sum(item_clicks), 0)::int
  from rows
  where (select public.is_admin());
$$;

-- Le palmarès qui compte : ce qu'on regarde contre ce qui se vend. L'écart est
-- la seule donnée que le restaurateur ne peut obtenir nulle part ailleurs.
create function public.admin_menu_items(
  p_etab uuid, p_from timestamptz, p_to timestamptz
)
returns table (
  item_id uuid, name text, clicks int, sold int, revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with clicks as (
    select c.item_id, sum(c.clicks)::int as clicks
    from menu_item_clicks c
    where c.etablissement_id = p_etab
      and c.day >= p_from::date and c.day < p_to::date
    group by c.item_id
  ),
  sold as (
    select oi.item_id,
           sum(oi.quantity)::int as sold,
           sum(oi.quantity * oi.unit_price) as revenue
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.etablissement_id = p_etab
      and o.type = 'sur_place'
      and o.status <> 'annulee'
      and oi.paid_at >= p_from and oi.paid_at < p_to
      and oi.item_id is not null
    group by oi.item_id
  )
  select i.id, i.name,
         coalesce(clicks.clicks, 0), coalesce(sold.sold, 0),
         coalesce(sold.revenue, 0)
  from items i
  left join clicks on clicks.item_id = i.id
  left join sold on sold.item_id = i.id
  where i.etablissement_id = p_etab
    and (clicks.item_id is not null or sold.item_id is not null)
    and (select public.is_admin())
  order by coalesce(clicks.clicks, 0) desc, coalesce(sold.sold, 0) desc;
$$;

-- Le direct. Une session est « en cours » tant que son dernier battement est
-- récent : c'est une comparaison d'horodatage, pas un flux d'événements — d'où
-- une interrogation périodique côté admin plutôt qu'un abonnement realtime,
-- qui coûterait une websocket par convive attablé.
create function public.admin_menu_live(p_window_seconds int)
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
  where (select public.is_admin())
  group by e.id, e.name, e.slug
  order by e.name;
$$;

-- Le fil des commandes qui tombent : tous clients confondus, ou un seul.
create function public.admin_menu_feed(p_limit int, p_etab uuid default null)
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
    and (select public.is_admin())
  order by o.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke execute on function
  public.admin_menu_overview(timestamptz, timestamptz) from public, anon;
revoke execute on function
  public.admin_menu_series(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function
  public.admin_menu_funnel(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function
  public.admin_menu_items(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_menu_live(int) from public, anon;
revoke execute on function public.admin_menu_feed(int, uuid) from public, anon;

grant execute on function
  public.admin_menu_overview(timestamptz, timestamptz) to authenticated;
grant execute on function
  public.admin_menu_series(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function
  public.admin_menu_funnel(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function
  public.admin_menu_items(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_menu_live(int) to authenticated;
grant execute on function public.admin_menu_feed(int, uuid) to authenticated;

-- --------------------------------------------------------------------------
-- Consolidation nocturne (service_role, workflow menu-rollup.yml)
-- --------------------------------------------------------------------------

-- Idempotente : elle recalcule toutes les journées révolues encore présentes,
-- pas seulement la veille. Un cron qui saute une nuit se rattrape donc seul.
create function public.menu_rollup(
  p_session_ttl_days int,
  p_click_ttl_days int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int;
begin
  insert into menu_stats_daily (
    etablissement_id, day, sessions, categories, plats,
    paniers, commandes, paiements, item_clicks
  )
  select etablissement_id, started_at::date,
         count(*)::int,
         count(*) filter (where stage >= 'categorie')::int,
         count(*) filter (where stage >= 'plat')::int,
         count(*) filter (where stage >= 'panier')::int,
         count(*) filter (where stage >= 'commande')::int,
         count(*) filter (where stage >= 'paiement')::int,
         coalesce(sum(item_clicks), 0)::int
  from menu_sessions
  where started_at < current_date
  group by 1, 2
  on conflict (etablissement_id, day) do update
    set sessions = excluded.sessions,
        categories = excluded.categories,
        plats = excluded.plats,
        paniers = excluded.paniers,
        commandes = excluded.commandes,
        paiements = excluded.paiements,
        item_clicks = excluded.item_clicks;
  get diagnostics v_days = row_count;

  delete from menu_track_budget where minute < now() - interval '1 hour';
  delete from menu_sessions
    where last_seen_at < now() - make_interval(days => p_session_ttl_days);
  delete from menu_item_clicks
    where day < current_date - p_click_ttl_days;

  return v_days;
end;
$$;

revoke execute on function public.menu_rollup(int, int)
  from public, anon, authenticated;
grant execute on function public.menu_rollup(int, int) to service_role;
