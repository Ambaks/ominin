-- Section Projet : le journal de l'équipe. Une entrée par /push, écrite par
-- le script `npm run journal` (clé service) avec le résumé de ce qui vient
-- d'être poussé. Lu par les seuls admins ; aucune écriture depuis l'admin.

create table public.projet_journal (
  id uuid primary key default gen_random_uuid(),
  owner text not null check (owner in ('marwan', 'ambaka')),
  title text not null check (title <> ''),
  summary text not null default '',
  branch text not null,
  commit_sha text not null,
  created_at timestamptz not null default now()
);
create index projet_journal_created_idx on public.projet_journal (created_at desc);

alter table public.projet_journal enable row level security;

create policy "admin" on public.projet_journal for select to authenticated
  using ((select public.is_admin()));
