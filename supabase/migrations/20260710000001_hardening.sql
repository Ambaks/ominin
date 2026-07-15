-- Durcissement : validation du slug à l'onboarding et création de groupe de
-- tables atomique (l'insertion du groupe et l'affectation des tables/commandes
-- se faisaient côté client en plusieurs requêtes — un échec laissait un groupe
-- orphelin et ouvrait une course entre deux membres regroupant la même table).

-- create_etablissement : refuse un slug hors du format attendu (la
-- slugification n'existait que côté client, un appel RPC direct pouvait poser
-- un slug vide ou arbitraire).
create or replace function public.create_etablissement(
  p_name text,
  p_slug text,
  p_offre public.offre,
  p_table_count int
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

  insert into etablissements (name, slug, offre)
  values (p_name, p_slug, p_offre)
  returning id into v_id;

  insert into memberships (user_id, etablissement_id, role, email)
  select auth.uid(), v_id, 'gerant', u.email
  from auth.users u where u.id = auth.uid();

  insert into tables (etablissement_id, number)
  select v_id, n from generate_series(1, p_table_count) as n;

  return v_id;
end;
$$;

revoke execute on function public.create_etablissement(text, text, public.offre, int) from public, anon;
grant execute on function public.create_etablissement(text, text, public.offre, int) to authenticated;

-- create_table_group : regroupe des tables (et, en option, leurs commandes en
-- cours) en une seule transaction. Verrouille les tables ciblées pour écarter
-- la course. Réservé aux gérants et serveurs de l'établissement concerné.
create or replace function public.create_table_group(
  p_table_ids uuid[],
  p_integrate_orders boolean
)
returns public.table_groups
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_count int;
  v_group public.table_groups;
begin
  if array_length(p_table_ids, 1) is null or array_length(p_table_ids, 1) < 2 then
    raise exception 'Un groupe doit contenir au moins deux tables.';
  end if;

  -- Verrou sur les tables ciblées : deux regroupements concurrents de la même
  -- table s'excluent au lieu de se recouvrir silencieusement.
  select count(*), min(etablissement_id)
    into v_count, v_etab
  from tables
  where id = any(p_table_ids)
  for update;

  if v_count is distinct from array_length(p_table_ids, 1) then
    raise exception 'Table introuvable.';
  end if;
  if exists (
    select 1 from tables
    where id = any(p_table_ids)
      and (etablissement_id is distinct from v_etab or group_id is not null)
  ) then
    raise exception 'Certaines tables sont déjà dans un groupe.';
  end if;

  if current_member_role(v_etab) not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;

  insert into table_groups (etablissement_id) values (v_etab)
  returning * into v_group;

  update tables set group_id = v_group.id where id = any(p_table_ids);

  if p_integrate_orders then
    update orders set group_id = v_group.id
    where table_id = any(p_table_ids)
      and status not in ('payee', 'annulee');
  end if;

  return v_group;
end;
$$;

revoke execute on function public.create_table_group(uuid[], boolean) from public, anon;
grant execute on function public.create_table_group(uuid[], boolean) to authenticated;
