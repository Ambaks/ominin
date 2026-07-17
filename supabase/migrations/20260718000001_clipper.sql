-- Ominin Clip, générateur de clips : pipeline automatique VOD → clips
-- verticaux. Un job = un traitement lancé par un clipper (utilisateur clip)
-- sur une vidéo longue. Le worker local (clipper/) exécute les étapes du
-- pipeline et met à jour le statut via service_role ; le navigateur lit
-- sous RLS.

-- ---------------------------------------------------------------------------
-- Statuts d'un job de découpe automatique.

create type public.clipper_job_status as enum (
  'en_attente',
  'en_cours',
  'termine',
  'echec'
);

-- ---------------------------------------------------------------------------
-- Jobs : un job par vidéo soumise. Le champ config porte les paramètres
-- choisis par l'utilisateur (nombre de clips, etc.). current_stage et
-- stage_progress sont mis à jour par le worker pour le suivi temps réel.

create table public.clipper_jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  source_url       text not null,
  source_title     text,
  source_duration_s int,
  status           public.clipper_job_status not null default 'en_attente',
  current_stage    text,
  stage_progress   real not null default 0,
  error_message    text,
  clip_count       int not null default 0,
  config           jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index clipper_jobs_user_created_idx
  on public.clipper_jobs (user_id, created_at desc);

alter table public.clipper_jobs enable row level security;

create policy "owner read" on public.clipper_jobs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "owner insert" on public.clipper_jobs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Clips générés : une ligne par clip produit par le pipeline. Le champ
-- approved est null tant que l'utilisateur n'a pas revu le clip (true =
-- approuvé, false = rejeté). judge_scores et signal_summary portent la
-- traçabilité complète de la décision.

create table public.clipper_clips (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references public.clipper_jobs (id) on delete cascade,
  rank               int not null,
  title              text not null,
  title_alternatives text[] not null default '{}',
  clip_type          text,
  source_start_s     real not null,
  source_end_s       real not null,
  duration_s         real not null,
  storage_path       text,
  thumbnail_path     text,
  judge_scores       jsonb,
  judge_reasoning    text,
  signal_summary     jsonb,
  risk_flags         text[] not null default '{}',
  approved           boolean,
  created_at         timestamptz not null default now()
);

create index clipper_clips_job_rank_idx
  on public.clipper_clips (job_id, rank);

alter table public.clipper_clips enable row level security;

create policy "owner read" on public.clipper_clips
  for select to authenticated
  using (
    job_id in (
      select id from public.clipper_jobs
      where user_id = (select auth.uid())
    )
  );

create policy "owner update" on public.clipper_clips
  for update to authenticated
  using (
    job_id in (
      select id from public.clipper_jobs
      where user_id = (select auth.uid())
    )
  )
  with check (
    job_id in (
      select id from public.clipper_jobs
      where user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Bucket privé pour les clips générés par le pipeline. Plus gros que les
-- clips de publication (100 Mo) car les vidéos sont en 1080×1920 H.264.
-- Pas de policy storage : tout passe par des URL signées côté serveur.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clipper-output', 'clipper-output', false, 104857600,
  array['video/mp4', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;
