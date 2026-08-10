-- Click & collect autonome. Jusqu'ici tout établissement portait une offre
-- menu & salle ; le click & collect ne se vendait qu'en supplément. Un
-- restaurant peut désormais souscrire au click & collect seul : l'offre
-- devient facultative, et l'inscription depuis le sous-domaine collect ne
-- demande que le nom, l'adresse et le SIRET.

alter table public.etablissements
  add column siret text,
  alter column offre drop not null;

-- SIRET : 14 chiffres, normalisé (sans espaces) par le formulaire.
alter table public.etablissements
  add constraint etablissements_siret_format
    check (siret is null or siret ~ '^[0-9]{14}$');

-- ---------------------------------------------------------------------------
-- Slugs réservés : « connexion » et « inscription » sont désormais des routes
-- statiques du sous-domaine collect (collect.ominin.com/connexion), donc
-- prioritaires sur /collect/[slug] — un établissement portant ce slug
-- deviendrait inatteignable.

alter table public.etablissements
  drop constraint etablissements_slug_not_reserved,
  add constraint etablissements_slug_not_reserved
    check (slug not in ('demo', 'collect', 'connexion', 'inscription'));

-- ---------------------------------------------------------------------------
-- La commande à table reste une capacité des offres Smart et Connect. La
-- garde de place_order teste « v_offre not in ('smart','connect') », qui vaut
-- NULL — donc ne lève pas — pour un établissement sans offre. Plutôt que de
-- réécrire cette fonction longue, on ferme le trou sur la table elle-même :
-- le trigger couvre aussi toute autre voie d'insertion.

create or replace function public.check_sur_place_offre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offre public.offre;
begin
  if new.type <> 'sur_place' then
    return new;
  end if;
  select offre into v_offre from etablissements where id = new.etablissement_id;
  if v_offre is null or v_offre not in ('smart', 'connect') then
    raise exception 'La commande à table n''est pas activée pour cet établissement.';
  end if;
  return new;
end;
$$;

create trigger orders_sur_place_offre
  before insert on public.orders
  for each row execute function public.check_sur_place_offre();

-- ---------------------------------------------------------------------------
-- create_etablissement : l'offre et le nombre de tables deviennent
-- facultatifs (inscription click & collect), l'adresse et le SIRET sont
-- portés dès la création. L'ancienne signature est supprimée : la garder
-- rendrait l'appel à quatre arguments ambigu.

drop function if exists public.create_etablissement(text, text, public.offre, int);

create function public.create_etablissement(
  p_name text,
  p_slug text,
  p_offre public.offre default null,
  p_table_count int default 0,
  p_address text default '',
  p_siret text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;
  if p_table_count < 0 then
    raise exception 'Nombre de tables invalide.';
  end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Adresse de menu invalide.';
  end if;
  if p_slug in ('demo', 'collect', 'connexion', 'inscription') then
    raise exception 'Cette adresse est réservée.';
  end if;

  insert into etablissements (name, slug, offre, address, siret)
  values (
    p_name,
    p_slug,
    p_offre,
    coalesce(p_address, ''),
    nullif(p_siret, '')
  )
  returning id into v_id;

  insert into memberships (user_id, etablissement_id, role, email)
  select auth.uid(), v_id, 'gerant', u.email
  from auth.users u where u.id = auth.uid();

  insert into tables (etablissement_id, number)
  select v_id, n from generate_series(1, p_table_count) as n;

  return v_id;
end;
$$;

revoke execute on function public.create_etablissement(
  text, text, public.offre, int, text, text
) from public, anon;
grant execute on function public.create_etablissement(
  text, text, public.offre, int, text, text
) to authenticated;
