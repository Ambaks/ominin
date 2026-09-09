-- L'équipe cesse d'être une liste de comptes. Chez BOHO, une seule adresse
-- ouvre l'espace et les tablettes de salle y sont connectées : les serveurs,
-- eux, n'ont pas de compte. Le gérant les crée, les nomme, leur pose un
-- planning ; ils badgent en se désignant sur la tablette et consultent leurs
-- créneaux par un lien qui leur est propre.
--
-- Les comptes ne disparaissent pas : une fiche peut en porter un (le gérant,
-- un serveur qui préfère son propre accès), et les membres actuels sont
-- repris tels quels. C'est la fiche, désormais, que le planning et les
-- badgeages désignent.

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  -- Nom posé par le gérant : plus besoin d'attendre que chacun renseigne le
  -- sien, ce que seul l'intéressé pouvait faire.
  name text not null check (length(trim(name)) > 0),
  role public.member_role not null default 'serveur',
  -- Compte associé, s'il en a un. Un membre n'a qu'une fiche.
  user_id uuid references auth.users (id) on delete set null,
  -- Lien de consultation du planning : vivant tant que la fiche l'est,
  -- révoqué avec elle. 24 octets : deviner l'adresse est hors de portée.
  planning_token text not null unique
    default encode(extensions.gen_random_bytes(24), 'hex'),
  -- Quitter l'équipe n'efface pas ce qu'on y a fait : la fiche est archivée.
  -- Elle sort de la badgeuse et du planning, son lien cesse de répondre, ses
  -- heures restent lisibles — le décompte du temps de travail se conserve.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (etablissement_id, user_id)
);

create index staff_etablissement_idx on public.staff (etablissement_id);

alter table public.staff enable row level security;

create policy "member read" on public.staff
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "gerant insert" on public.staff
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant update" on public.staff
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
create policy "gerant delete" on public.staff
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- Les membres actuels deviennent des fiches, avec le nom qu'ils portaient,
-- et tout membre invité par la suite en reçoit une : sans elle il n'existe
-- ni pour le planning ni pour la badgeuse. Le gérant la renomme ensuite.
create function public.staff_from_membership()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into staff (etablissement_id, name, role, user_id)
  values (
    new.etablissement_id,
    coalesce(nullif(trim(new.display_name), ''), new.email),
    new.role,
    new.user_id
  )
  on conflict (etablissement_id, user_id) do nothing;
  return new;
end;
$$;

create trigger memberships_staff
  after insert on public.memberships
  for each row execute function public.staff_from_membership();

insert into public.staff (etablissement_id, name, role, user_id)
select
  m.etablissement_id,
  coalesce(nullif(trim(m.display_name), ''), m.email),
  m.role,
  m.user_id
from public.memberships m;

-- ---------------------------------------------------------------------------
-- Planning et badgeages désignent une fiche, plus un compte.

alter table public.shifts
  add column staff_id uuid references public.staff (id) on delete cascade;
update public.shifts s
set staff_id = st.id
from public.staff st
where st.etablissement_id = s.etablissement_id and st.user_id = s.user_id;
-- Un créneau posé pour quelqu'un qui n'est plus de l'équipe ne veut plus rien
-- dire (en pratique : aucune ligne, le planning n'a pas encore servi).
delete from public.shifts where staff_id is null;
alter table public.shifts
  alter column staff_id set not null,
  drop column user_id;

-- La policy d'insertion nomme user_id : elle tombe avant la colonne, et
-- renaît plus bas sur la fiche.
drop policy "member insert" on public.time_entries;

-- restrict, et non cascade : supprimer une fiche ne doit jamais emporter le
-- décompte des heures de quelqu'un. Une fiche qui a badgé s'archive.
alter table public.time_entries
  add column staff_id uuid references public.staff (id) on delete restrict;
update public.time_entries t
set staff_id = st.id
from public.staff st
where st.etablissement_id = t.etablissement_id and st.user_id = t.user_id;
delete from public.time_entries where staff_id is null;
alter table public.time_entries
  alter column staff_id set not null,
  drop column user_id;

-- L'index d'unicité nommait user_id : il est parti avec la colonne.
drop index if exists public.time_entries_open_idx;
-- Une fiche n'appartient qu'à un établissement : elle suffit à la clé.
create unique index time_entries_open_idx
  on public.time_entries (staff_id)
  where ended_at is null;

create policy "member insert" on public.time_entries
  for insert to authenticated
  with check (
    public.current_member_role(etablissement_id) is not null
    and exists (
      select 1 from public.staff s
      where s.id = time_entries.staff_id
        and s.etablissement_id = time_entries.etablissement_id
    )
  );

-- ---------------------------------------------------------------------------
-- Planning d'un serveur sans compte, par son lien. Lecture seule et bornée à
-- une semaine : le badgeage, lui, reste sur la tablette du restaurant, où la
-- signature fait la preuve.

create function public.staff_planning(
  p_token text,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_etablissement text;
begin
  select * into v_staff from staff
  where planning_token = p_token and archived_at is null;
  if not found then
    return null;
  end if;
  select name into v_etablissement
  from etablissements where id = v_staff.etablissement_id;

  return jsonb_build_object(
    'name', v_staff.name,
    'etablissement', v_etablissement,
    'shifts', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'starts_at', starts_at, 'ends_at', ends_at, 'note', note)
        order by starts_at
      )
      from shifts
      where staff_id = v_staff.id and starts_at >= p_from and starts_at < p_to
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'started_at', started_at, 'ended_at', ended_at)
        order by started_at
      )
      from time_entries
      where staff_id = v_staff.id and started_at >= p_from and started_at < p_to
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.staff_planning(text, timestamptz, timestamptz)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Code d'accès de la tablette. La tablette du restaurant est connectée au
-- compte de l'établissement : l'application y démarre en vue salle et le code
-- ouvre les écrans du gérant. C'est un verrou d'interface, pas une barrière
-- de droits — la session détient bien ceux du gérant, comme la caisse d'un
-- restaurant que déverrouille un code. Le code lui-même ne se lit jamais :
-- sa table n'a aucune policy, seules les fonctions ci-dessous y touchent.

create table public.admin_pins (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_pins enable row level security;

-- Drapeau public : l'écran doit savoir s'il faut se verrouiller, sans rien
-- apprendre du code. Sans code posé, rien ne change pour l'établissement.
alter table public.etablissements
  add column admin_pin_set boolean not null default false;

create function public.set_admin_pin(p_etablissement_id uuid, p_code text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    delete from admin_pins where etablissement_id = p_etablissement_id;
    update etablissements set admin_pin_set = false where id = p_etablissement_id;
    return;
  end if;
  if p_code !~ '^[0-9]{4,8}$' then
    raise exception 'Le code doit compter de 4 à 8 chiffres.';
  end if;
  insert into admin_pins (etablissement_id, pin_hash)
  values (p_etablissement_id, extensions.crypt(p_code, extensions.gen_salt('bf')))
  on conflict (etablissement_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  update etablissements set admin_pin_set = true where id = p_etablissement_id;
end;
$$;

revoke execute on function public.set_admin_pin(uuid, text) from public, anon;
grant execute on function public.set_admin_pin(uuid, text) to authenticated;

create function public.verify_admin_pin(p_etablissement_id uuid, p_code text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if current_member_role(p_etablissement_id) is null then
    return false;
  end if;
  select pin_hash into v_hash
  from admin_pins where etablissement_id = p_etablissement_id;
  if v_hash is null then
    return false;
  end if;
  return extensions.crypt(p_code, v_hash) = v_hash;
end;
$$;

revoke execute on function public.verify_admin_pin(uuid, text) from public, anon;
grant execute on function public.verify_admin_pin(uuid, text) to authenticated;
