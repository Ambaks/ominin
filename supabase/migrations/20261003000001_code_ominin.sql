-- Code Ominin. Le gérant change son code d'accès quand il veut ; l'équipe
-- Ominin garde le sien, valable sur la tablette de chaque établissement, pour
-- ouvrir les écrans du gérant sans avoir à lui demander le code du moment.
-- Le code du gérant ne change pas de rôle : les deux ouvrent, l'un n'efface
-- pas l'autre.
--
-- Une seule ligne, hachée comme les autres codes, sans aucune policy. Le
-- code ne vit pas dans le dépôt : il se pose directement en base, par
-- set_ominin_admin_pin, que seul le propriétaire des fonctions peut appeler.

create table public.ominin_admin_pin (
  singleton boolean primary key default true check (singleton),
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.ominin_admin_pin enable row level security;

create function public.is_ominin_admin_pin(p_code text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from ominin_admin_pin
    where p_code is not null
      and extensions.crypt(p_code, pin_hash) = pin_hash
  );
$$;

revoke execute on function public.is_ominin_admin_pin(text)
  from public, anon, authenticated, service_role;

-- Le code Ominin ne doit jamais être celui que toute une salle connaît.
create function public.set_ominin_admin_pin(p_code text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_code is null or p_code !~ '^[0-9]{4,8}$' then
    raise exception 'Le code doit compter de 4 à 8 chiffres.';
  end if;
  if exists (
    select 1 from payment_pins
    where extensions.crypt(p_code, pin_hash) = pin_hash
  ) then
    raise exception 'Ce code est le code d''encaissement d''un établissement.';
  end if;
  insert into ominin_admin_pin (pin_hash)
  values (extensions.crypt(p_code, extensions.gen_salt('bf')))
  on conflict (singleton) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
end;
$$;

revoke execute on function public.set_ominin_admin_pin(text)
  from public, anon, authenticated, service_role;

create or replace function public.verify_admin_pin(
  p_etablissement_id uuid,
  p_code text
)
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
  if is_ominin_admin_pin(p_code) then
    return true;
  end if;
  select pin_hash into v_hash
  from admin_pins where etablissement_id = p_etablissement_id;
  if v_hash is null then
    return false;
  end if;
  return extensions.crypt(p_code, v_hash) = v_hash;
end;
$$;

create or replace function public.set_payment_pin(
  p_etablissement_id uuid,
  p_code text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_admin_hash text;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_code is null or p_code !~ '^[0-9]{4}$' then
    raise exception 'Le code d''encaissement doit compter exactement 4 chiffres.';
  end if;
  select pin_hash into v_admin_hash
  from admin_pins
  where etablissement_id = p_etablissement_id;
  if v_admin_hash is not null
     and extensions.crypt(p_code, v_admin_hash) = v_admin_hash then
    raise exception 'Le code d''encaissement doit être différent du code Admin.';
  end if;
  if is_ominin_admin_pin(p_code) then
    raise exception 'Ce code est réservé. Choisissez-en un autre.';
  end if;
  insert into payment_pins (etablissement_id, pin_hash)
  values (
    p_etablissement_id,
    extensions.crypt(p_code, extensions.gen_salt('bf'))
  )
  on conflict (etablissement_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  update etablissements
  set payment_pin_set = true
  where id = p_etablissement_id;
end;
$$;
