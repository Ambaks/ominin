-- Matrice de découverte : Places Text Search plafonne à ~60 résultats par
-- requête, la couverture vient donc de la variété des requêtes (terme ×
-- quartier × ville), pas de la pagination. Cette table porte l'état de
-- rotation : chaque run sert les requêtes les moins récemment jouées, et une
-- requête qui ne rapporte plus rien deux fois de suite est retirée.

create table public.outreach_discovery_queries (
  id uuid primary key default gen_random_uuid(),
  query text not null unique,
  city text not null,
  consecutive_empty int not null default 0,
  retired boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create index outreach_discovery_queries_rotation_idx
  on public.outreach_discovery_queries (retired, last_run_at);

alter table public.outreach_discovery_queries enable row level security;

create policy "admin read" on public.outreach_discovery_queries
  for select to authenticated using ((select public.is_admin()));
-- Écritures : service_role uniquement (agent Python).
