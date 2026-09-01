-- AutoResearch : optimisation automatique des e-mails de Léa par variantes
-- de prompt et priorisation des prospects (inspiré du Karpathy Loop).
--
-- Le job hebdomadaire autoresearch compare les e-mails envoyés aux réponses
-- obtenues, identifie les patterns qui fonctionnent, propose de nouvelles
-- variantes de prompt (soumises à approbation humaine dans /admin/lea) et
-- score les prospects en attente pour contacter les plus prometteurs en
-- priorité.
-- ---------------------------------------------------------------------------

-- Nouveau type de run.
alter table public.outreach_runs drop constraint outreach_runs_job_check;
alter table public.outreach_runs add constraint outreach_runs_job_check
  check (job in ('discover', 'enrich', 'outreach', 'inbox', 'autoresearch'));

-- Variantes de prompt : chaque ligne remplace intégralement COLD_EMAIL_RULES.
-- 'candidate' = proposée par autoresearch, en attente d'approbation ;
-- 'active' = en rotation aux côtés de la référence ; 'baseline' = variante
-- promue référence (sinon la référence est le texte codé en dur, sans ligne
-- ici) ; 'retired' = sortie de rotation.
create table public.outreach_variants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text not null,
  prompt_rules text not null,
  status text not null default 'candidate'
    check (status in ('baseline', 'active', 'candidate', 'retired')),
  parent_variant_id uuid references public.outreach_variants (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Score 0-100 attribué par autoresearch selon la ressemblance avec les
-- restaurants qui ont répondu ; la composition sert les scores les plus
-- hauts d'abord (desc nulls last), les non scorés ensuite.
alter table public.outreach_prospects add column priority_score real;

-- Extrait du site web conservé à la qualification, pour qu'autoresearch
-- relise le contexte exact dont Léa disposait en rédigeant.
alter table public.outreach_prospects add column site_excerpt text;

-- --------------------------------------------------------------------------
-- Index
-- --------------------------------------------------------------------------

create index outreach_prospects_priority_idx
  on public.outreach_prospects (priority_score desc nulls last, created_at)
  where qualification = 'qualified';

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

create trigger outreach_variants_touch before update on public.outreach_variants
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------

alter table public.outreach_variants enable row level security;

-- L'admin approuve, promeut et retire les variantes depuis le navigateur.
create policy "admin all" on public.outreach_variants
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
