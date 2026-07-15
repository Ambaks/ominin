-- Ominin Clip, phase 2 : espace clipper. Un clipper = un utilisateur
-- auth.users (user_metadata.product = 'clip'), sans etablissement ni
-- membership. Les écritures qui touchent le prestataire de publication
-- passent par les route handlers /api/clip ; les lectures d'historique
-- passent par le client Supabase sous RLS.

-- ---------------------------------------------------------------------------
-- Profil clipper : lien vers le profil créé chez le prestataire de
-- publication. provider_username est notre identifiant chez lui (l'uuid du
-- user) — colonne explicite pour survivre à un changement de prestataire.
-- Écrit uniquement par la route /api/clip/link (service_role), d'où
-- l'absence de policy insert/update.

create table public.clip_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider_username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.clip_profiles enable row level security;

create policy "owner read" on public.clip_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Publications : une ligne par clip soumis au prestataire. captions fige les
-- titres/descriptions par plateforme au moment de la publication ; results
-- porte la réponse normalisée du prestataire par plateforme ; storage_path
-- passe à null une fois l'objet supprimé du bucket (après publication).

create type public.clip_post_status as enum
  ('en_cours', 'publie', 'partiel', 'echec');

create table public.clip_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  captions jsonb not null,
  platforms text[] not null check (array_length(platforms, 1) >= 1),
  status public.clip_post_status not null default 'en_cours',
  storage_path text,
  provider_request_id text,
  results jsonb,
  attempt int not null default 1,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index clip_posts_user_created_idx
  on public.clip_posts (user_id, created_at desc);

alter table public.clip_posts enable row level security;

-- L'historique se lit via le client Supabase ; l'insertion se fait dans la
-- route /api/clip/publish sous la session utilisateur (RLS vérifie user_id).
-- Les mises à jour de statut/retry passent par les routes également sous la
-- session utilisateur — pas de policy delete : rien ne supprime une ligne.
create policy "owner read" on public.clip_posts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "owner insert" on public.clip_posts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "owner update" on public.clip_posts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Bucket privé pour les clips en transit : uploadé par le navigateur via URL
-- signée (route /api/clip/upload-url), lu par le prestataire via URL signée,
-- supprimé après publication. Aucune policy storage : tout passe par des URL
-- signées émises côté serveur (convention du bucket photos). 50 Mo = plafond
-- fichier du palier gratuit Supabase.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clips', 'clips', false, 52428800,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;
