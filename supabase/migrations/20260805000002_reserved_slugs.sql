-- Slugs réservés : « demo » est une route statique (app/collect/demo, la
-- démo publique de la landing) prioritaire sur /collect/[slug], et
-- « collect » entre en collision avec le préfixe du proxy sur le
-- sous-domaine. La contrainte ferme aussi le renommage direct via PostgREST
-- (la policy « gerant update » sur etablissements ne restreint pas les
-- colonnes) ; le RPC double la garde pour un message d'erreur propre.

alter table public.etablissements
  add constraint etablissements_slug_not_reserved
    check (slug not in ('demo', 'collect'));

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
  if p_slug in ('demo', 'collect') then
    raise exception 'Cette adresse est réservée.';
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
