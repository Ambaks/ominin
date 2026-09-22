-- ---------------------------------------------------------------------------
-- Ominin Agents (agents.ominin.com) : le pipeline de prospection de Léa, offert
-- aux clients. Un client = un utilisateur auth.users (user_metadata.product =
-- 'agents') et un agent : il décrit son offre, ses cibles et sa zone, connecte
-- sa boîte Gmail, et l'agent Python (backend, service_role) découvre des
-- entreprises via Google Places, les qualifie, leur écrit en son nom et classe
-- leurs réponses.
--
-- Autorisation : le client lit tout ce qui est à lui et n'écrit que ses
-- réglages, ses validations d'e-mails et ses exclusions de prospects — des
-- grants par colonne bornent ce qu'il peut modifier. Le reste (activation par
-- Ominin, jetons Gmail, opposition, rotation des requêtes, budget Places) est
-- réservé au service_role : RLS activée sans policy.
-- ---------------------------------------------------------------------------

alter table public.outreach_runs drop constraint outreach_runs_job_check;
alter table public.outreach_runs add constraint outreach_runs_job_check
  check (job in (
    'discover', 'enrich', 'outreach', 'inbox', 'autoresearch',
    'social_post', 'social_research', 'agents_tick'
  ));

-- --------------------------------------------------------------------------
-- Réglages de l'agent. Créés vides à la première visite de l'espace ; l'agent
-- ne tourne qu'une fois activé par Ominin (activated_at), allumé (enabled),
-- complet et relié à une boîte mail. Mode 'approval' par défaut : rien ne part
-- sans validation tant que le client n'a pas choisi l'envoi automatique.
-- Heures en Europe/Paris, jours ISO (1 = lundi).
-- --------------------------------------------------------------------------

create table public.agents_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_name text not null default '',
  sender_name text not null default '',
  sender_role text not null default '',
  phone text not null default '',
  website text not null default '',
  -- Ce que l'entreprise propose : la matière des e-mails.
  offer text not null default '',
  strengths text not null default '',
  call_to_action text not null default '',
  -- Seules informations pratiques (tarifs indicatifs, délais…) que l'agent a
  -- le droit de donner dans ses brouillons de réponse.
  reply_notes text not null default '',
  -- Termes de recherche Google Places (« entreprise de rénovation »…).
  targets text[] not null default '{}',
  cities text[] not null default '{}',
  mode text not null default 'approval' check (mode in ('auto', 'approval')),
  enabled boolean not null default true,
  send_days smallint[] not null default '{1,2,3,4,5}'
    check (send_days <@ '{1,2,3,4,5,6,7}'::smallint[]),
  send_start_hour smallint not null default 9
    check (send_start_hour between 0 and 23),
  send_end_hour smallint not null default 18
    check (send_end_hour between 1 and 24),
  daily_limit smallint not null default 20
    check (daily_limit between 1 and 50),
  activated_at timestamptz,
  last_run_at timestamptz,
  last_run_stats jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (send_end_hour > send_start_hour)
);

-- --------------------------------------------------------------------------
-- Boîte Gmail connectée (OAuth, scopes gmail.send + gmail.readonly). Le jeton
-- vit à part, hors de portée du navigateur (même règle que social_tokens).
-- history_id : curseur de l'API History, pour ne lire que le courrier arrivé
-- depuis le dernier passage — la boîte d'une entreprise reçoit bien plus que
-- les réponses de l'agent.
-- --------------------------------------------------------------------------

create table public.agents_mailboxes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  history_id text,
  -- Renseigné quand Google refuse le jeton : le client doit reconnecter.
  error text,
  connected_at timestamptz not null default now()
);

create table public.agents_mailbox_tokens (
  user_id uuid primary key
    references public.agents_mailboxes (user_id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Prospects, par agent. Cycle : pending (découvert) → qualified | no_email |
-- disqualified → contacted (e-mail parti) → interested | not_interested.
-- no_email garde les entreprises sans adresse trouvée, téléphone compris :
-- le client peut encore les appeler.
-- --------------------------------------------------------------------------

create table public.agents_prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null,
  name text not null,
  -- La cible qui l'a fait découvrir.
  category text not null,
  address text,
  city text,
  phone text,
  website text,
  google_maps_url text,
  email text,
  status text not null default 'pending'
    check (status in ('pending', 'qualified', 'no_email', 'disqualified',
                      'contacted', 'interested', 'not_interested')),
  -- 'not_worth' | 'suppressed' | 'bounce' | 'excluded' | 'rejected' …
  disqualify_reason text,
  ai_notes text,
  enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index agents_prospects_status_idx
  on public.agents_prospects (user_id, status, created_at);

-- --------------------------------------------------------------------------
-- E-mails, même cycle de vie que outreach_emails (dont ils reprennent les
-- énums). Les e-mails à froid naissent 'approved' en mode auto et
-- 'pending_approval' en mode validation ; les réponses sont toujours
-- 'pending_approval'.
-- --------------------------------------------------------------------------

create table public.agents_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id uuid not null
    references public.agents_prospects (id) on delete cascade,
  direction public.outreach_email_direction not null,
  kind text not null default 'cold' check (kind in ('cold', 'reply')),
  status public.outreach_email_status not null,
  to_email text,
  from_email text,
  subject text,
  body_text text,
  gmail_message_id text,
  gmail_thread_id text,
  in_reply_to uuid references public.agents_emails (id) on delete set null,
  classification public.outreach_classification,
  error text,
  approved_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Les identifiants Gmail sont propres à chaque boîte.
create unique index agents_emails_gmail_message_key
  on public.agents_emails (user_id, gmail_message_id)
  where gmail_message_id is not null;
create index agents_emails_thread_idx
  on public.agents_emails (user_id, gmail_thread_id)
  where gmail_thread_id is not null;
create index agents_emails_user_idx
  on public.agents_emails (user_id, created_at desc);
create index agents_emails_status_idx
  on public.agents_emails (user_id, status);
-- Décompte du plafond quotidien.
create index agents_emails_sent_idx
  on public.agents_emails (user_id, sent_at) where direction = 'outbound';
create index agents_emails_prospect_idx on public.agents_emails (prospect_id);

-- Opposition par agent : se désinscrire des e-mails d'une entreprise ne vaut
-- pas pour les autres clients.
create table public.agents_suppressions (
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('opt_out', 'bounce', 'manual')),
  prospect_id uuid references public.agents_prospects (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, email)
);

-- Requêtes Places jouées par agent (« <cible> à <ville> »). Contrairement à
-- outreach_discovery_queries, une requête est retirée dès le premier passage
-- qui n'apporte rien : Places classe ses résultats de la même façon à chaque
-- appel, la rejouer ne ferait que refacturer ce qui est déjà connu.
create table public.agents_discovery_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  retired boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, query)
);

create index agents_discovery_queries_rotation_idx
  on public.agents_discovery_queries (user_id, retired, last_run_at);

-- Appels Google Places du mois, tous agents confondus : plafonnés sous la
-- gratuité mensuelle (agents_places_monthly_budget côté backend).
create table public.agents_places_usage (
  month date primary key,
  calls int not null default 0
);

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

create trigger agents_profiles_touch before update on public.agents_profiles
  for each row execute function public.set_updated_at();
create trigger agents_prospects_touch before update on public.agents_prospects
  for each row execute function public.set_updated_at();
create trigger agents_emails_touch before update on public.agents_emails
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------

alter table public.agents_profiles enable row level security;
alter table public.agents_mailboxes enable row level security;
alter table public.agents_mailbox_tokens enable row level security;
alter table public.agents_prospects enable row level security;
alter table public.agents_emails enable row level security;
alter table public.agents_suppressions enable row level security;
alter table public.agents_discovery_queries enable row level security;
alter table public.agents_places_usage enable row level security;

create policy "owner read" on public.agents_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner insert" on public.agents_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner update" on public.agents_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- L'activation et le compte rendu des passages restent à Ominin et à l'agent.
revoke insert, update on public.agents_profiles from authenticated;
grant insert (user_id) on public.agents_profiles to authenticated;
grant update (
  company_name, sender_name, sender_role, phone, website, offer, strengths,
  call_to_action, reply_notes, targets, cities, mode, enabled, send_days,
  send_start_hour, send_end_hour, daily_limit
) on public.agents_profiles to authenticated;

-- Connexion et déconnexion passent par les routes /api/agents/gmail
-- (service_role) : lecture seule ici.
create policy "owner read" on public.agents_mailboxes
  for select to authenticated using ((select auth.uid()) = user_id);

-- Exclure un prospect (bouton « Exclure », brouillon rejeté) est la seule
-- écriture permise, et seulement avant tout envoi.
create policy "owner read" on public.agents_prospects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner exclude" on public.agents_prospects
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('pending', 'qualified', 'no_email')
  )
  with check ((select auth.uid()) = user_id and status = 'disqualified');
revoke update on public.agents_prospects from authenticated;
grant update (status, disqualify_reason) on public.agents_prospects
  to authenticated;

-- Valider, corriger ou rejeter un brouillon ; rien d'autre.
create policy "owner read" on public.agents_emails
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner review" on public.agents_emails
  for update to authenticated
  using ((select auth.uid()) = user_id and status = 'pending_approval')
  with check (
    (select auth.uid()) = user_id
    and status in ('pending_approval', 'approved', 'cancelled')
  );
revoke update on public.agents_emails from authenticated;
grant update (subject, body_text, status, approved_at) on public.agents_emails
  to authenticated;

-- agents_mailbox_tokens, agents_suppressions, agents_discovery_queries,
-- agents_places_usage : aucune policy (service_role uniquement).
