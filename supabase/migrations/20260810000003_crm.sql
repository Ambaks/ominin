-- ---------------------------------------------------------------------------
-- CRM interne (admin.ominin.com) : prospection des restaurants de Montpellier
-- et du littoral. Tables préfixées crm_ — « restaurants » entrerait en
-- collision mentale avec etablissements (les clients payants) ; le préfixe
-- suit la convention clip_* / collect_*.
--
-- Modèle d'autorisation : allowlist admin_users + is_admin() en SECURITY
-- DEFINER, une seule policy « for all » par table sous la forme initplan
-- (select is_admin()) — évaluée une fois par requête, pas par ligne (même
-- correctif de perf que 20260709000003_rls_perf.sql). Ni anon ni un
-- restaurateur connecté ne voient quoi que ce soit : aucune donnée de
-- prospection n'est publique. Le client navigateur des admins écrit
-- directement sous RLS, comme /gestion.
--
-- Pas de realtime : 1-2 utilisateurs internes, rien de temps-réel critique.
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

-- --------------------------------------------------------------------------
-- Énums
-- --------------------------------------------------------------------------

create type public.crm_restaurant_category as enum
  ('restaurant', 'fast_food', 'cafe', 'bar', 'bakery', 'pizzeria',
   'brasserie', 'hotel_restaurant', 'other');

create type public.crm_lead_status as enum
  ('new', 'to_contact', 'contacted', 'visited', 'appointment_scheduled',
   'proposal', 'negotiation', 'signed', 'lost', 'not_interested');

create type public.crm_priority as enum ('low', 'medium', 'high');

create type public.crm_activity_type as enum
  ('note', 'call', 'email', 'visit', 'whatsapp', 'appointment', 'demo',
   'follow_up', 'status_change');

create type public.crm_task_status as enum ('open', 'done', 'cancelled');

create type public.crm_appointment_status as enum
  ('scheduled', 'completed', 'cancelled', 'no_show');

create type public.crm_appointment_type as enum
  ('visit', 'demo', 'signing', 'follow_up', 'other');

-- --------------------------------------------------------------------------
-- Allowlist admin
-- --------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Dénormalisé pour l'affichage : auth.users est inaccessible au client
  -- (même raison que memberships.email).
  email text not null,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER : lit admin_users sans repasser par sa propre policy.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;

create policy "admin read" on public.admin_users
  for select to authenticated using ((select public.is_admin()));
-- Pas de policy d'écriture : l'enrôlement se fait par SQL dans le dashboard
-- (service_role bypasse RLS).

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

create table public.crm_restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  category public.crm_restaurant_category not null default 'restaurant',
  cuisine text,
  address text,
  city text,
  postal_code text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  phone text,
  -- Pivot de la détection de doublons et de la recherche par téléphone
  -- (« 04 67… » ≡ « 0467… »).
  phone_normalized text generated always as
    (nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')) stored,
  email text,
  website text,
  menu_url text,
  google_maps_url text,
  instagram_url text,
  -- Provenance : 'manual' | 'csv_import' | 'seed' | futur 'google_places'…
  source text not null default 'manual',
  -- Identifiant chez la source externe (place_id Google) : prêt pour les
  -- imports API, unicité par source.
  external_id text,
  owner_name text,
  owner_phone text,
  owner_email text,
  -- Informations durables à ne jamais rater (« parler à Sarah, pas au
  -- comptoir ») — distinctes des notes horodatées du fil d'activité.
  important_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Suppression douce : l'historique commercial d'un restaurant retiré
  -- garde de la valeur.
  deleted_at timestamptz
);

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.crm_restaurants (id) on delete cascade,
  status public.crm_lead_status not null default 'new',
  priority public.crm_priority not null default 'medium',
  estimated_value numeric check (estimated_value >= 0),
  assigned_to uuid references auth.users (id) on delete set null,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 1:1 aujourd'hui ; lever cette contrainte suffira pour du multi-pipeline.
  unique (restaurant_id)
);

-- Journal append-only : pas d'updated_at.
create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.crm_restaurants (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete set null,
  type public.crm_activity_type not null,
  title text,
  description text,
  -- Coordonnées d'une visite, {from, to} d'un changement de statut…
  metadata jsonb not null default '{}',
  -- Null pour les écritures service_role (seed, console).
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.crm_restaurants (id) on delete cascade,
  first_name text not null check (length(trim(first_name)) between 1 and 120),
  last_name text,
  role text,
  phone text,
  email text,
  notes text,
  is_decision_maker boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  -- Nullable : une tâche peut être générale (préparer un argumentaire…).
  restaurant_id uuid references public.crm_restaurants (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 300),
  description text,
  due_at timestamptz,
  priority public.crm_priority not null default 'medium',
  status public.crm_task_status not null default 'open',
  completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_appointments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.crm_restaurants (id) on delete cascade,
  contact_id uuid references public.crm_contacts (id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 300),
  start_at timestamptz not null,
  end_at timestamptz check (end_at is null or end_at > start_at),
  location text,
  notes text,
  status public.crm_appointment_status not null default 'scheduled',
  type public.crm_appointment_type not null default 'visit',
  -- Prêt pour la synchro Google Calendar : null tant qu'elle n'existe pas.
  google_event_id text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.crm_restaurant_tags (
  restaurant_id uuid not null
    references public.crm_restaurants (id) on delete cascade,
  tag_id uuid not null references public.crm_tags (id) on delete cascade,
  primary key (restaurant_id, tag_id)
);

-- --------------------------------------------------------------------------
-- Index. Les chemins chauds de crm_restaurants sont partiels sur
-- deleted_at is null : toutes les listes filtrent dessus, et l'index reste
-- petit à dizaines de milliers de lignes.
-- --------------------------------------------------------------------------

create unique index crm_restaurants_slug_key
  on public.crm_restaurants (slug) where deleted_at is null;
create unique index crm_restaurants_source_external_key
  on public.crm_restaurants (source, external_id) where external_id is not null;
-- Recherche floue + détection de doublons (crm_find_duplicates).
create index crm_restaurants_name_trgm_idx
  on public.crm_restaurants using gin (lower(name) extensions.gin_trgm_ops)
  where deleted_at is null;
create index crm_restaurants_city_idx
  on public.crm_restaurants (lower(city)) where deleted_at is null;
-- Filtre par cadre (bounding box) de la carte.
create index crm_restaurants_geo_idx
  on public.crm_restaurants (latitude, longitude) where deleted_at is null;
create index crm_restaurants_phone_idx
  on public.crm_restaurants (phone_normalized) where phone_normalized is not null;
create index crm_restaurants_email_idx
  on public.crm_restaurants (lower(email)) where email is not null;
create index crm_restaurants_created_idx
  on public.crm_restaurants (created_at desc);

create index crm_leads_status_idx on public.crm_leads (status);
create index crm_leads_follow_up_idx
  on public.crm_leads (next_follow_up_at) where next_follow_up_at is not null;
create index crm_leads_assigned_idx on public.crm_leads (assigned_to);

create index crm_activities_restaurant_idx
  on public.crm_activities (restaurant_id, created_at desc);
-- Fil global (« activité cette semaine » du tableau de bord).
create index crm_activities_created_idx
  on public.crm_activities (created_at desc);

create index crm_contacts_restaurant_idx on public.crm_contacts (restaurant_id);
create index crm_tasks_status_due_idx on public.crm_tasks (status, due_at);
create index crm_tasks_restaurant_idx on public.crm_tasks (restaurant_id);
create index crm_appointments_start_idx on public.crm_appointments (start_at);
create index crm_appointments_restaurant_idx
  on public.crm_appointments (restaurant_id);
create index crm_restaurant_tags_tag_idx on public.crm_restaurant_tags (tag_id);
create unique index crm_tags_name_key on public.crm_tags (lower(name));

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

-- Première apparition du pattern dans le schéma (aucune table existante n'a
-- d'updated_at) : fonction générique, un trigger par table CRM mutable.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger crm_restaurants_touch before update on public.crm_restaurants
  for each row execute function public.set_updated_at();
create trigger crm_leads_touch before update on public.crm_leads
  for each row execute function public.set_updated_at();
create trigger crm_contacts_touch before update on public.crm_contacts
  for each row execute function public.set_updated_at();
create trigger crm_tasks_touch before update on public.crm_tasks
  for each row execute function public.set_updated_at();
create trigger crm_appointments_touch before update on public.crm_appointments
  for each row execute function public.set_updated_at();

-- Invariant : chaque restaurant naît avec son lead, quel que soit le chemin
-- d'insertion (UI, import CSV, seed, futur import API).
create or replace function public.crm_create_lead()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.crm_leads (restaurant_id) values (new.id);
  return new;
end;
$$;

create trigger crm_restaurants_create_lead
  after insert on public.crm_restaurants
  for each row execute function public.crm_create_lead();

-- Journal automatique des changements de statut : aucun chemin d'écriture ne
-- peut l'oublier. created_by null si l'écriture vient du service_role.
create or replace function public.crm_log_status_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.crm_activities
      (restaurant_id, lead_id, type, metadata, created_by)
    values
      (new.restaurant_id, new.id, 'status_change',
       jsonb_build_object('from', old.status, 'to', new.status), auth.uid());
  end if;
  return new;
end;
$$;

create trigger crm_leads_log_status
  after update of status on public.crm_leads
  for each row execute function public.crm_log_status_change();

-- crm_leads.next_follow_up_at = plus proche échéance des tâches ouvertes du
-- lead. Champ dérivé maintenu ici plutôt que dans chaque chemin d'écriture
-- applicatif (création, complétion, édition, seed…) : impossible à désynchroniser.
create or replace function public.crm_recompute_follow_up(p_lead uuid)
returns void
language sql security definer
set search_path = public
as $$
  update public.crm_leads
  set next_follow_up_at = (
    select min(due_at) from public.crm_tasks
    where lead_id = p_lead and status = 'open' and due_at is not null
  )
  where id = p_lead;
$$;
revoke execute on function public.crm_recompute_follow_up(uuid) from public, anon, authenticated;

create or replace function public.crm_sync_next_follow_up()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op <> 'DELETE' and new.lead_id is not null then
    perform public.crm_recompute_follow_up(new.lead_id);
  end if;
  if tg_op <> 'INSERT' and old.lead_id is not null
     and (tg_op = 'DELETE' or old.lead_id is distinct from new.lead_id) then
    perform public.crm_recompute_follow_up(old.lead_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger crm_tasks_sync_follow_up
  after insert or update or delete on public.crm_tasks
  for each row execute function public.crm_sync_next_follow_up();

-- --------------------------------------------------------------------------
-- RLS : une policy par table, admins uniquement.
-- --------------------------------------------------------------------------

alter table public.crm_restaurants enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_appointments enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_restaurant_tags enable row level security;

create policy "admin all" on public.crm_restaurants
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.crm_leads
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.crm_activities
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.crm_contacts
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.crm_tasks
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.crm_appointments
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.crm_tags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.crm_restaurant_tags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- --------------------------------------------------------------------------
-- Détection de doublons pour l'import CSV. SECURITY INVOKER volontaire :
-- s'exécute sous la RLS de l'appelant, donc réservée de fait aux admins.
-- Les doublons sont signalés à l'humain, jamais rejetés en dur : deux
-- « Le Bistrot » peuvent légitimement coexister.
-- --------------------------------------------------------------------------

create or replace function public.crm_find_duplicates(
  p_name text,
  p_city text default null,
  p_phone text default null,
  p_email text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (restaurant_id uuid, name text, city text, reason text)
language sql stable
set search_path = public, extensions
as $$
  select r.id, r.name, r.city,
    case
      when r.phone_normalized is not null and r.phone_normalized =
           nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '')
        then 'phone'
      when p_email is not null and lower(r.email) = lower(p_email)
        then 'email'
      else 'name_proximity'
    end
  from public.crm_restaurants r
  where r.deleted_at is null and (
    r.phone_normalized =
      nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '')
    or (p_email is not null and lower(r.email) = lower(p_email))
    or (similarity(lower(r.name), lower(p_name)) > 0.5
        and ((p_city is not null and lower(r.city) = lower(p_city))
             -- ≈ 165 m en latitude, ≈ 160 m en longitude à 43° N.
             or (p_lat is not null and p_lng is not null
                 and r.latitude is not null and r.longitude is not null
                 and abs(r.latitude - p_lat) < 0.0015
                 and abs(r.longitude - p_lng) < 0.002)))
  );
$$;

revoke execute on function
  public.crm_find_duplicates(text, text, text, text, double precision, double precision)
  from public, anon;
grant execute on function
  public.crm_find_duplicates(text, text, text, text, double precision, double precision)
  to authenticated;
