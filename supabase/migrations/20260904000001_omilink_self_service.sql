-- Le gérant déclare lui-même ses boîtiers Omilink depuis l'onglet Terminaux :
-- omilink_provision_device lui est ouverte, bornée à son établissement, et
-- renvoie le jeton une seule fois. Il peut aussi retirer un boîtier — après
-- ses imprimantes, printers.device_id étant en on delete restrict.

create or replace function public.omilink_provision_device(p_etablissement_id uuid, p_name text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_device uuid;
begin
  -- Depuis l'application, seul le gérant de l'établissement ; le backend
  -- (clé service) et l'éditeur SQL ne passent pas par cette vérification.
  if auth.role() = 'authenticated'
     and current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if length(trim(p_name)) = 0 then
    raise exception 'Le boîtier doit avoir un nom.';
  end if;
  insert into omilink_devices (etablissement_id, name)
  values (p_etablissement_id, trim(p_name))
  returning id into v_device;
  insert into omilink_device_tokens (device_id, token_hash)
  values (v_device, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  return v_token;
end;
$$;

grant execute on function public.omilink_provision_device(uuid, text) to authenticated;

create policy "gerant delete" on public.omilink_devices
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');
