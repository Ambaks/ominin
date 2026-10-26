-- Espace commercial, lot 1, première étape : relier chaque fiche de
-- prospection (crm_restaurants) au client qu'elle est devenue. Avant toute
-- invitation, l'admin rattache les clients en service et ceux du Projet :
-- sans ce lien, un commercial pourrait déclarer — et se voir attribuer — un
-- restaurant déjà client.
--
-- Une seule source de vérité : etablissement_id / shop_id / client_ended_at
-- de la fiche font foi pour « déjà client ». projet_clients.restaurant_id
-- relie le Projet à la fiche (choisi par l'admin dans le Projet).

alter table public.crm_restaurants
  add column etablissement_id uuid references public.etablissements (id) on delete set null,
  add column shop_id uuid references public.shops (id) on delete set null,
  -- Posé par l'admin quand le client quitte Ominin : la fiche redevient
  -- déclarable, le lien reste pour l'historique.
  add column client_ended_at timestamptz,
  -- Forçage de l'état « en discussion avec Ominin » ; null : calculé.
  add column in_talks_override boolean;

create unique index crm_restaurants_etablissement_key
  on public.crm_restaurants (etablissement_id)
  where etablissement_id is not null and deleted_at is null;
create unique index crm_restaurants_shop_key
  on public.crm_restaurants (shop_id)
  where shop_id is not null and deleted_at is null;

alter table public.projet_clients
  add column restaurant_id uuid references public.crm_restaurants (id) on delete set null;
create index projet_clients_restaurant_idx
  on public.projet_clients (restaurant_id) where restaurant_id is not null;

-- Téléphone ramené à ses chiffres, comme crm_restaurants.phone_normalized :
-- la comparaison avec etablissements.phone et shops.contact_phone se fait à
-- la volée, ces colonnes n'ayant pas de forme normalisée.
create function public.phone_digits(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
$$;

-- Slug d'une fiche créée hors Google, au format de discovery.py : le nom sans
-- accents, puis six caractères de l'identifiant pour l'unicité.
create function public.crm_restaurant_slug(p_name text, p_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
           nullif(trim(both '-' from regexp_replace(
             translate(lower(p_name),
               'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa'),
             '[^a-z0-9]+', '-', 'g')), ''),
           'restaurant')
         || '-' || right(replace(p_id::text, '-', ''), 6);
$$;

-- Un client n'a qu'une fiche : refus lisible plutôt que l'erreur d'index.
create function public.crm_assert_client_free(p_restaurant uuid, p_etablissement uuid, p_shop uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select name into v_name from public.crm_restaurants
  where deleted_at is null and id is distinct from p_restaurant
    and ((p_etablissement is not null and etablissement_id = p_etablissement)
         or (p_shop is not null and shop_id = p_shop));
  if v_name is not null then
    raise exception 'Ce client est déjà relié à la fiche « % ».', v_name;
  end if;
end;
$$;
revoke execute on function public.crm_assert_client_free(uuid, uuid, uuid) from public, anon, authenticated;

-- Relie une fiche à un établissement ou à une boutique (un seul des deux).
-- Sans fiche (p_restaurant null), en crée une à partir du client : chaque
-- client en service doit avoir la sienne pour être reconnu.
create function public.admin_link_client(
  p_restaurant uuid,
  p_etablissement uuid default null,
  p_shop uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_restaurant;
  v_name text;
  v_address text;
  v_phone text;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''admin.' using errcode = '42501';
  end if;
  if num_nonnulls(p_etablissement, p_shop) <> 1 then
    raise exception 'Choisir un établissement ou une boutique.';
  end if;

  if p_etablissement is not null then
    select name, address, phone into v_name, v_address, v_phone
    from public.etablissements where id = p_etablissement;
  else
    select name, null, contact_phone into v_name, v_address, v_phone
    from public.shops where id = p_shop;
  end if;
  if v_name is null then
    raise exception 'Client introuvable.';
  end if;

  perform public.crm_assert_client_free(v_id, p_etablissement, p_shop);
  if v_id is null then
    v_id := gen_random_uuid();
    insert into public.crm_restaurants (id, name, slug, address, phone, source)
    values (v_id, v_name, public.crm_restaurant_slug(v_name, v_id), v_address, v_phone, 'client');
  end if;

  update public.crm_restaurants
  set etablissement_id = p_etablissement,
      shop_id = p_shop,
      client_ended_at = null
  where id = v_id and deleted_at is null;
  if not found then
    raise exception 'Fiche introuvable.';
  end if;
  return v_id;
end;
$$;

-- Départ du client (date choisie par l'admin), ou retour (null).
create function public.admin_set_client_ended(p_restaurant uuid, p_ended_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''admin.' using errcode = '42501';
  end if;
  update public.crm_restaurants
  set client_ended_at = p_ended_at
  where id = p_restaurant
    and (etablissement_id is not null or shop_id is not null);
  if not found then
    raise exception 'Cette fiche n''est reliée à aucun client.';
  end if;
end;
$$;

revoke execute on function public.admin_link_client(uuid, uuid, uuid) from public, anon;
revoke execute on function public.admin_set_client_ended(uuid, timestamptz) from public, anon;
grant execute on function public.admin_link_client(uuid, uuid, uuid) to authenticated;
grant execute on function public.admin_set_client_ended(uuid, timestamptz) to authenticated;
