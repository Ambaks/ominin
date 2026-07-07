-- Fonctions et triggers : helpers de rôle pour RLS, invariants métier
-- (transitions de statut, droits par rôle — reflet de ROLE_ACTIONS et
-- ORDER_STATUS_FLOW dans frontend/lib/gestion/constants.ts), onboarding
-- et flow d'invitation 100 % Postgres.

-- Rôle du membre courant dans un établissement (null si non-membre).
-- SECURITY DEFINER : consultable depuis les policies sans récursion RLS.
create or replace function public.current_member_role(etab uuid)
returns public.member_role
language sql stable security definer
set search_path = public
as $$
  select role from public.memberships
  where user_id = auth.uid() and etablissement_id = etab;
$$;

revoke execute on function public.current_member_role(uuid) from public, anon;
grant execute on function public.current_member_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Onboarding : crée l'établissement, le membership gérant et les tables
-- numérotées en une transaction.

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

-- ---------------------------------------------------------------------------
-- Invitations. Deux chemins :
--  1. L'invité a déjà un compte → membership immédiat, l'invitation n'est
--     pas conservée (le trigger retourne null).
--  2. L'invité n'a pas de compte → l'invitation attend ; à la création de
--     l'utilisateur auth, elle est convertie en membership puis supprimée.

create or replace function public.handle_new_invitation()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where lower(email) = new.email;
  if v_user is not null then
    insert into memberships (user_id, etablissement_id, role, email)
    values (v_user, new.etablissement_id, new.role, new.email)
    on conflict (user_id, etablissement_id) do update set role = excluded.role;
    return null;
  end if;
  return new;
end;
$$;

create trigger invitations_convert_existing
  before insert on public.invitations
  for each row execute function public.handle_new_invitation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into memberships (user_id, etablissement_id, role, email)
  select new.id, i.etablissement_id, i.role, i.email
  from invitations i
  where i.email = lower(new.email)
  on conflict (user_id, etablissement_id) do nothing;

  delete from invitations where email = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Invariant : transitions de statut de commande (ORDER_STATUS_FLOW).
-- S'applique à tout appelant, y compris service_role.

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (case old.status
    when 'en_attente' then new.status in ('en_preparation', 'annulee')
    when 'en_preparation' then new.status in ('prete', 'annulee')
    when 'prete' then new.status in ('servie', 'annulee')
    when 'servie' then new.status = 'payee'
    else false
  end) then
    raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
  end if;
  return new;
end;
$$;

create trigger orders_enforce_transition
  before update of status on public.orders
  for each row execute function public.enforce_order_transition();

-- ---------------------------------------------------------------------------
-- Droits par rôle sur les UPDATE. RLS ne sait pas comparer OLD/NEW ni
-- restreindre des colonnes : ces triggers complètent les policies.
-- Ils ne s'appliquent qu'aux utilisateurs authentifiés (service_role passe).

create or replace function public.enforce_order_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  v_role := current_member_role(new.etablissement_id);
  if v_role = 'gerant' then
    return new;
  end if;
  if v_role = 'cuisinier' then
    if to_jsonb(new) - 'status' is distinct from to_jsonb(old) - 'status'
       or new.status = 'payee' then
      raise exception 'Le rôle cuisinier ne permet pas cette modification.';
    end if;
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'group_id'
         is distinct from to_jsonb(old) - 'status' - 'group_id'
       or (new.status <> old.status and new.status <> 'servie') then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;

create trigger orders_enforce_update_rights
  before update on public.orders
  for each row execute function public.enforce_order_update_rights();

create or replace function public.enforce_item_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if current_member_role(new.etablissement_id) = 'gerant' then
    return new;
  end if;
  -- Cuisinier : uniquement disponibilité et stock.
  if to_jsonb(new) - 'disponible' - 'stock'
       is distinct from to_jsonb(old) - 'disponible' - 'stock' then
    raise exception 'Seuls la disponibilité et le stock sont modifiables par ce rôle.';
  end if;
  return new;
end;
$$;

create trigger items_enforce_update_rights
  before update on public.items
  for each row execute function public.enforce_item_update_rights();

create or replace function public.enforce_table_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if current_member_role(new.etablissement_id) = 'gerant' then
    return new;
  end if;
  -- Serveur : uniquement l'affectation à un groupe.
  if to_jsonb(new) - 'group_id' is distinct from to_jsonb(old) - 'group_id' then
    raise exception 'Seul le groupement de tables est modifiable par ce rôle.';
  end if;
  return new;
end;
$$;

create trigger tables_enforce_update_rights
  before update on public.tables
  for each row execute function public.enforce_table_update_rights();
