-- ---------------------------------------------------------------------------
-- Prospection automatisée (« Léa ») : l'agent Python (backend FastAPI,
-- service_role) découvre des restaurants via Google Places, les qualifie,
-- envoie des e-mails à froid et classe les réponses. Les brouillons de
-- réponse attendent une approbation humaine dans /admin/emails.
--
-- Autorisation : mêmes règles que le CRM — le navigateur admin lit tout et
-- n'écrit que sur outreach_emails (approuver / éditer / rejeter un
-- brouillon) ; le reste est piloté par le service_role, qui bypasse RLS.
-- outreach_suppressions suit le pattern contact_requests : RLS activée sans
-- policy, donc service_role uniquement — la liste d'opposition ne doit être
-- modifiable par aucun client.
-- ---------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- Énums
-- --------------------------------------------------------------------------

create type public.outreach_email_direction as enum ('outbound', 'inbound');

-- Cycle de vie d'un e-mail sortant : draft → pending_approval (réponses
-- uniquement) → approved → sending → sent | failed | cancelled. Les entrants
-- sont figés à received. « sending » est une barrière at-most-once : posée
-- avant l'appel Gmail, jamais renvoyée automatiquement si le process meurt.
create type public.outreach_email_status as enum
  ('draft', 'pending_approval', 'approved', 'sending', 'sent',
   'received', 'failed', 'cancelled');

create type public.outreach_classification as enum
  ('interested', 'not_interested', 'meeting_request', 'question',
   'opt_out', 'bounce', 'other');

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

-- État agent 1:1 par restaurant — séparé de crm_restaurants pour ne pas
-- polluer la table humaine avec les internes de l'automate.
create table public.outreach_prospects (
  restaurant_id uuid primary key
    references public.crm_restaurants (id) on delete cascade,
  qualification text not null default 'pending'
    check (qualification in ('pending', 'qualified', 'disqualified')),
  -- 'has_digital_menu' | 'no_email' | 'suppressed' | 'not_worth' …
  disqualify_reason text,
  -- null = inconnu ; verdict heuristique (domaines fournisseurs) + Claude.
  has_digital_menu boolean,
  -- 'places' | 'website' | 'manual' : d'où vient l'adresse e-mail.
  email_source text,
  -- Notes de personnalisation rédigées par Claude (français) : cuisine,
  -- positionnement, accroche concrète pour l'e-mail à froid.
  ai_notes text,
  enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outreach_emails (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.crm_restaurants (id) on delete cascade,
  lead_id uuid references public.crm_leads (id) on delete set null,
  direction public.outreach_email_direction not null,
  -- 'cold' = premier contact (auto-approuvé), 'reply' = réponse dans un fil
  -- (toujours approbation humaine).
  kind text not null default 'cold' check (kind in ('cold', 'reply')),
  status public.outreach_email_status not null,
  to_email text,
  from_email text,
  subject text,
  -- Texte brut uniquement : délivrabilité + simplicité CNIL.
  body_text text,
  gmail_message_id text,
  gmail_thread_id text,
  -- Pour un brouillon de réponse : l'e-mail entrant auquel il répond.
  in_reply_to uuid references public.outreach_emails (id) on delete set null,
  -- Entrants uniquement.
  classification public.outreach_classification,
  error text,
  approved_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Liste d'opposition permanente, clef = adresse (minuscules) : survit à la
-- suppression douce du restaurant et à un éventuel ré-import.
create table public.outreach_suppressions (
  email text primary key,
  reason text not null check (reason in ('opt_out', 'bounce', 'manual')),
  restaurant_id uuid
    references public.crm_restaurants (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Journal des exécutions (discover / enrich / outreach / inbox).
create table public.outreach_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('discover', 'enrich', 'outreach', 'inbox')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'skipped')),
  -- Compteurs : {found, inserted, enriched, sent, classified, …}.
  stats jsonb not null default '{}',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Miroir d'affichage de l'opposition sur la fiche restaurant (visible du
-- store admin existant sans jointure).
alter table public.crm_restaurants add column outreach_opted_out_at timestamptz;

-- --------------------------------------------------------------------------
-- Index
-- --------------------------------------------------------------------------

-- Ingestion idempotente de la boîte de réception.
create unique index outreach_emails_gmail_message_key
  on public.outreach_emails (gmail_message_id) where gmail_message_id is not null;
create index outreach_emails_status_idx on public.outreach_emails (status);
create index outreach_emails_thread_idx
  on public.outreach_emails (gmail_thread_id) where gmail_thread_id is not null;
create index outreach_emails_restaurant_idx
  on public.outreach_emails (restaurant_id, created_at desc);
-- Décompte du plafond quotidien d'e-mails à froid.
create index outreach_emails_sent_idx
  on public.outreach_emails (sent_at) where direction = 'outbound';

create index outreach_prospects_qualification_idx
  on public.outreach_prospects (qualification, created_at);
create index outreach_runs_started_idx on public.outreach_runs (started_at desc);

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

create trigger outreach_prospects_touch before update on public.outreach_prospects
  for each row execute function public.set_updated_at();
create trigger outreach_emails_touch before update on public.outreach_emails
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------

alter table public.outreach_prospects enable row level security;
alter table public.outreach_emails enable row level security;
alter table public.outreach_suppressions enable row level security;
alter table public.outreach_runs enable row level security;

create policy "admin all" on public.outreach_emails
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin read" on public.outreach_prospects
  for select to authenticated using ((select public.is_admin()));
create policy "admin read" on public.outreach_runs
  for select to authenticated using ((select public.is_admin()));
-- outreach_suppressions : aucune policy (service_role uniquement).

-- Le service Python (service_role) déduplique entre sources via la RPC du
-- CSV ; elle n'était accordée qu'à authenticated.
grant execute on function
  public.crm_find_duplicates(text, text, text, text, double precision, double precision)
  to service_role;
