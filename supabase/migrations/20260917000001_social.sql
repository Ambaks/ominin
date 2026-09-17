-- Réseaux sociaux : un agent publie chaque jour un carrousel par marque
-- (Ominin, Shop, Menu, Collect) sur ses comptes, relève les résultats et
-- réécrit sa propre ligne éditoriale à partir de ce qu'ils montrent.
--
-- Instagram et Facebook sont publiés par l'API Graph de Meta. Snapchat n'a
-- pas d'API de publication organique : l'agent prépare les visuels, l'admin
-- les poste à la main depuis /admin/reseaux et y reporte les vues.
-- ---------------------------------------------------------------------------

alter table public.outreach_runs drop constraint outreach_runs_job_check;
alter table public.outreach_runs add constraint outreach_runs_job_check
  check (job in (
    'discover', 'enrich', 'outreach', 'inbox', 'autoresearch',
    'social_post', 'social_research'
  ));

-- Un compte par marque et par réseau. Les comptes Meta sont créés par le
-- retour OAuth (/api/social/meta/callback) sans marque : c'est l'admin qui
-- rattache chaque Page et chaque compte Instagram découverts à une marque.
-- Les comptes Snapchat sont déclarés à la main (external_id null).
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null
    check (platform in ('instagram', 'facebook', 'snapchat')),
  brand text check (brand in ('ominin', 'shop', 'menu', 'collect')),
  external_id text,
  handle text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Contrainte pleine (et non index partiel) : le retour OAuth fait un
  -- upsert dessus. Les external_id null de Snapchat restent distincts.
  unique (platform, external_id)
);

create unique index social_accounts_brand_platform_key
  on public.social_accounts (brand, platform) where brand is not null;

-- Jetons de Page Meta, hors de portée du navigateur : aucune policy, seul le
-- service_role (retour OAuth côté Next, agent côté backend) les lit.
create table public.social_tokens (
  account_id uuid primary key
    references public.social_accounts (id) on delete cascade,
  access_token text not null,
  updated_at timestamptz not null default now()
);

-- Ligne éditoriale versionnée, par marque. L'agent inscrit sa ligne de départ
-- comme version 1 à la première publication. Chaque analyse qui change
-- quelque chose ajoute une version ; revenir en arrière en ajoute une aussi,
-- copie de l'ancienne — l'historique reste linéaire.
create table public.social_playbooks (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('ominin', 'shop', 'menu', 'collect')),
  version integer not null check (version > 0),
  guidelines text not null,
  change_summary text not null,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (brand, version)
);

-- Un contenu par marque et par jour, décliné ensuite sur chaque compte.
-- playbook_id : la version de la ligne éditoriale qui l'a produit.
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('ominin', 'shop', 'menu', 'collect')),
  post_date date not null,
  format text not null default 'carousel' check (format in ('carousel')),
  topic text not null,
  angle text not null,
  slides jsonb not null,
  captions jsonb not null,
  playbook_id uuid not null references public.social_playbooks (id),
  created_at timestamptz not null default now(),
  unique (brand, post_date)
);

-- 'published' / 'failed' : tentative par API. 'to_post' : préparé pour un
-- réseau sans API, en attente de l'admin ; 'posted' : l'admin l'a publié.
-- metrics_settled_at fige les chiffres une fois le post assez ancien : seuls
-- les posts figés nourrissent l'analyse.
create table public.social_publications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts (id) on delete cascade,
  account_id uuid not null
    references public.social_accounts (id) on delete cascade,
  status text not null
    check (status in ('published', 'failed', 'to_post', 'posted')),
  external_id text,
  permalink text,
  error text,
  published_at timestamptz,
  metrics jsonb,
  metrics_settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, account_id)
);

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

create trigger social_accounts_touch before update on public.social_accounts
  for each row execute function public.set_updated_at();
create trigger social_publications_touch
  before update on public.social_publications
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------

alter table public.social_accounts enable row level security;
alter table public.social_tokens enable row level security;
alter table public.social_playbooks enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_publications enable row level security;

-- L'admin rattache les comptes aux marques, les met en pause, déclare les
-- comptes Snapchat.
create policy "admin all" on public.social_accounts
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Lecture de l'historique, et retour à une version antérieure (insertion).
create policy "admin read" on public.social_playbooks
  for select to authenticated using ((select public.is_admin()));
create policy "admin insert" on public.social_playbooks
  for insert to authenticated with check ((select public.is_admin()));

create policy "admin read" on public.social_posts
  for select to authenticated using ((select public.is_admin()));

-- L'admin marque un contenu Snapchat comme posté et y reporte ses vues.
create policy "admin read" on public.social_publications
  for select to authenticated using ((select public.is_admin()));
create policy "admin update" on public.social_publications
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
