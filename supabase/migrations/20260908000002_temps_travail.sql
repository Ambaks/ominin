-- Temps de travail : le planning que le gérant pose, et les badgeages que
-- l'équipe signe en arrivant et en partant. La badgeuse est partagée — une
-- tablette posée au comptoir : n'importe quel membre connecté ouvre l'écran,
-- chacun s'y désigne et signe. C'est la signature, figée avec le nom, qui
-- fait la preuve ; la ligne garde aussi l'appareil (le compte) qui l'a saisie.

-- ---------------------------------------------------------------------------
-- Planning. Un créneau appartient à un membre et à une journée de service ;
-- seul le gérant l'écrit, toute l'équipe le lit (chacun a besoin de savoir
-- qui travaille quand).

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index shifts_etablissement_starts_idx
  on public.shifts (etablissement_id, starts_at);

alter table public.shifts enable row level security;

create policy "member read" on public.shifts
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "gerant insert" on public.shifts
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.shifts
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.shifts
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- ---------------------------------------------------------------------------
-- Badgeages. Une ligne par période travaillée : l'arrivée l'ouvre, le départ
-- la ferme. Le nom et les signatures sont figés — la preuve ne doit pas
-- bouger si le membre est renommé ou quitte l'équipe.

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_name text not null check (length(trim(member_name)) > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Signatures manuscrites (PNG en data URL), saisies au doigt sur la tablette.
  signature_in text not null,
  signature_out text,
  -- Compte depuis lequel le badgeage a été saisi : la badgeuse est partagée,
  -- ce n'est pas forcément celui du membre.
  created_by uuid references auth.users (id) on delete set null,
  -- Correction du gérant (départ oublié, horaire faux) : jamais silencieuse.
  edited_at timestamptz,
  edited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  check (signature_out is null or ended_at is not null)
);

create index time_entries_etablissement_started_idx
  on public.time_entries (etablissement_id, started_at desc);

-- Un membre n'est présent qu'une fois : un second « Arrivée » sans départ est
-- refusé par la base, pas seulement par l'écran.
create unique index time_entries_open_idx
  on public.time_entries (etablissement_id, user_id)
  where ended_at is null;

alter table public.time_entries enable row level security;

create policy "member read" on public.time_entries
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
-- Badger quelqu'un de l'équipe depuis la badgeuse partagée : le membre visé
-- doit appartenir à l'établissement.
create policy "member insert" on public.time_entries
  for insert to authenticated
  with check (
    public.current_member_role(etablissement_id) is not null
    and exists (
      select 1 from public.memberships m
      where m.user_id = time_entries.user_id
        and m.etablissement_id = time_entries.etablissement_id
    )
  );
create policy "member update" on public.time_entries
  for update to authenticated
  using (public.current_member_role(etablissement_id) is not null)
  with check (public.current_member_role(etablissement_id) is not null);
create policy "gerant delete" on public.time_entries
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- Hors gérant, un badgeage ne se referme qu'une fois : la badgeuse pose
-- l'heure de départ et sa signature, rien d'autre. Réécrire une arrivée ou
-- rouvrir une période close relève de la correction, donc du gérant.
-- L'heure de départ est celle du serveur : l'horloge d'une tablette de
-- comptoir peut être déréglée, celle qui compte ne doit pas l'être.
create function public.enforce_time_entry_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if current_member_role(new.etablissement_id) = 'gerant' then
    new.edited_at := now();
    new.edited_by := auth.uid();
    return new;
  end if;
  if old.ended_at is not null
     or new.ended_at is null
     or to_jsonb(new) - 'ended_at' - 'signature_out'
          is distinct from to_jsonb(old) - 'ended_at' - 'signature_out' then
    raise exception 'Seul le gérant peut corriger un badgeage.';
  end if;
  new.ended_at := greatest(now(), old.started_at);
  return new;
end;
$$;

create trigger time_entries_enforce_update_rights
  before update on public.time_entries
  for each row execute function public.enforce_time_entry_update_rights();
