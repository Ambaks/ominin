-- Ce que la plateforme Supabase fournit avant la première migration : rôles,
-- schémas auth, extensions et storage, publication realtime. Juste assez pour
-- rejouer toutes les migrations sur un Postgres nu (image postgis/postgis:16).

-- L'image postgis installe ses extensions dans public : Supabase les met dans extensions.
drop extension if exists postgis_tiger_geocoder, postgis_topology, fuzzystrmatch, postgis cascade;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit login password 'authenticator';
grant anon, authenticated, service_role to authenticator;

create schema extensions;
create extension pgcrypto with schema extensions;
create extension pg_trgm with schema extensions;
create extension postgis with schema extensions;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb not null default '{}',
  raw_app_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  provider text,
  identity_data jsonb
);

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth, extensions to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to authenticated, service_role;

create publication supabase_realtime;
create schema realtime;
create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as $$ select $$;
grant usage on schema realtime to anon, authenticated, service_role;

-- Supabase accorde par défaut les tables et fonctions du schéma public aux
-- trois rôles d'API ; la RLS et les revoke des migrations font le reste.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- pg_cron n'existe pas dans l'image de test : run.sh retire son create extension.
create schema if not exists cron;
create function cron.schedule(text, text, text) returns bigint language sql as 'select 1::bigint';
