-- Appairage sans contact et découverte des imprimantes. Un boîtier neuf
-- génère lui-même son jeton, n'en envoie que l'empreinte, et s'annonce
-- (omilink_enrollments) tant que personne ne l'a rattaché. Le gérant voit
-- dans l'onglet Terminaux les boîtiers annoncés depuis la même adresse
-- publique que son navigateur — donc derrière la même box — et en rattache un
-- d'un geste (omilink_claim_device). Il peut aussi demander au boîtier de
-- balayer le réseau à la recherche d'imprimantes (scan_requested_at →
-- discovered_printers).

alter table public.omilink_devices
  add column serial text unique,
  add column scan_requested_at timestamptz,
  add column scanned_at timestamptz,
  add column discovered_printers text[] not null default '{}';

-- Le gérant ne modifie que le nom et la demande de balayage ; le reste est
-- écrit par le boîtier via le backend.
create policy "gerant update" on public.omilink_devices
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');
revoke update on public.omilink_devices from authenticated;
grant update (name, scan_requested_at) on public.omilink_devices to authenticated;

-- Le jeton n'est plus frappé côté serveur pour les gérants : le boîtier
-- apporte le sien. La fonction reste à Ominin (clé service, éditeur SQL).
revoke execute on function public.omilink_provision_device(uuid, text) from authenticated;

-- ---------------------------------------------------------------------------
-- Boîtiers annoncés, pas encore rattachés. Service_role uniquement.

create table public.omilink_enrollments (
  serial text primary key,
  token_hash text not null,
  hostname text,
  lan_ip text,
  -- Adresse publique vue par le backend : celle de la box du restaurant.
  public_ip text,
  version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.omilink_enrollments enable row level security;

-- Annonce d'un boîtier (backend). Vrai dès que son empreinte est rattachée ;
-- sinon l'annonce est (ré)inscrite et les annonces muettes depuis plus de
-- p_ttl_seconds sont purgées.
create function public.omilink_enroll(
  p_serial text,
  p_token_hash text,
  p_hostname text,
  p_lan_ip text,
  p_public_ip text,
  p_version text,
  p_ttl_seconds int
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if exists (select 1 from omilink_device_tokens where token_hash = p_token_hash) then
    delete from omilink_enrollments where serial = p_serial;
    return true;
  end if;
  delete from omilink_enrollments
  where last_seen_at < now() - make_interval(secs => p_ttl_seconds);
  insert into omilink_enrollments (serial, token_hash, hostname, lan_ip, public_ip, version)
  values (p_serial, p_token_hash, p_hostname, p_lan_ip, p_public_ip, p_version)
  on conflict (serial) do update
    set token_hash = excluded.token_hash,
        hostname = excluded.hostname,
        lan_ip = excluded.lan_ip,
        public_ip = excluded.public_ip,
        version = excluded.version,
        last_seen_at = now();
  return false;
end;
$$;

revoke execute on function public.omilink_enroll(text, text, text, text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.omilink_enroll(text, text, text, text, text, text, int)
  to service_role;

-- Rattachement par le gérant. Un boîtier reflashé (même numéro de série)
-- retrouve sa fiche et ses imprimantes ; un boîtier d'un autre établissement
-- doit d'abord y être retiré.
create function public.omilink_claim_device(p_serial text, p_etablissement_id uuid, p_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_enrollment omilink_enrollments%rowtype;
  v_device uuid;
  v_etablissement uuid;
begin
  if auth.role() = 'authenticated'
     and current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if length(trim(p_name)) = 0 then
    raise exception 'Le boîtier doit avoir un nom.';
  end if;
  select * into v_enrollment from omilink_enrollments where serial = p_serial;
  if not found then
    raise exception 'Boîtier introuvable : vérifiez qu''il est allumé et relié au réseau.';
  end if;
  select id, etablissement_id into v_device, v_etablissement
  from omilink_devices where serial = p_serial;
  if found and v_etablissement <> p_etablissement_id then
    raise exception 'Ce boîtier est rattaché à un autre établissement.';
  end if;
  if found then
    update omilink_devices
    set name = trim(p_name), hostname = v_enrollment.hostname
    where id = v_device;
  else
    insert into omilink_devices (etablissement_id, name, hostname, serial)
    values (p_etablissement_id, trim(p_name), v_enrollment.hostname, p_serial)
    returning id into v_device;
  end if;
  insert into omilink_device_tokens (device_id, token_hash)
  values (v_device, v_enrollment.token_hash)
  on conflict (device_id) do update set token_hash = excluded.token_hash;
  delete from omilink_enrollments where serial = p_serial;
  return v_device;
end;
$$;

revoke execute on function public.omilink_claim_device(text, uuid, text) from public, anon;
grant execute on function public.omilink_claim_device(text, uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Synchronisation : la signature change (résultat d'un balayage en entrée,
-- demande de balayage en sortie), l'ancienne est supprimée pour que
-- PostgREST n'ait qu'une candidate.

drop function public.omilink_sync(uuid, text, text, jsonb);

create function public.omilink_sync(
  p_device_id uuid,
  p_hostname text,
  p_version text,
  p_printers jsonb,
  p_discovered jsonb default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_has_results boolean := p_discovered is not null and jsonb_typeof(p_discovered) = 'array';
  v_scan boolean;
begin
  update omilink_devices
  set last_seen_at = now(),
      hostname = p_hostname,
      version = p_version,
      discovered_printers = case when v_has_results
        then array(select jsonb_array_elements_text(p_discovered))
        else discovered_printers end,
      scanned_at = case when v_has_results then now() else scanned_at end
  where id = p_device_id
  returning scan_requested_at is not null
        and (scanned_at is null or scanned_at < scan_requested_at)
  into v_scan;

  update printers p
  set checked_at = now(), last_error = s."error"
  from jsonb_to_recordset(p_printers) as s(id uuid, "error" text)
  where p.id = s.id and p.device_id = p_device_id;

  return jsonb_build_object(
    'printers', coalesce(
      (select jsonb_agg(jsonb_build_object('id', id, 'host', host, 'port', port)
                        order by created_at)
       from printers where device_id = p_device_id),
      '[]'::jsonb),
    'scan', coalesce(v_scan, false)
  );
end;
$$;

revoke execute on function public.omilink_sync(uuid, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.omilink_sync(uuid, text, text, jsonb, jsonb)
  to service_role;
