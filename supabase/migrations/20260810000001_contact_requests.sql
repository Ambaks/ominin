-- ---------------------------------------------------------------------------
-- Demandes « sur mesure » envoyées depuis le portail (ominin.com/sur-mesure).
--
-- Table volontairement sans policy : RLS est activée et aucune policy n'est
-- créée, donc ni la clé anon ni un utilisateur connecté ne peuvent la lire ou
-- y écrire. La seule voie d'insertion est la route /api/contact, qui utilise
-- la clé service_role (laquelle bypasse RLS). Conséquence voulue : impossible
-- de spammer la table en tapant directement l'API REST de Supabase, et aucune
-- demande n'est lisible depuis le navigateur.
--
-- Lecture : dashboard Supabase (Table editor). Une notification e-mail part en
-- parallèle à chaque demande — l'e-mail est le canal de travail, la table est
-- la trace durable si l'envoi échoue.

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (length(email) between 3 and 255 and position('@' in email) > 1),
  -- Nom du commerce : facultatif, on ne bloque pas un premier contact dessus.
  company text check (company is null or length(company) <= 160),
  message text not null check (length(trim(message)) between 10 and 4000),
  -- Langue du portail au moment de l'envoi : sert à répondre dans la bonne.
  locale text not null default 'fr' check (locale in ('fr', 'en'))
);

create index contact_requests_created_idx
  on public.contact_requests (created_at desc);

alter table public.contact_requests enable row level security;
