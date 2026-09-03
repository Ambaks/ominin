-- Omilink : pont d'impression sur site. Un Raspberry Pi (omilink_devices)
-- branché sur le réseau du restaurant interroge le backend toutes les
-- quelques secondes avec son jeton : il remonte son état et celui des
-- imprimantes qu'il dessert (printers, déclarées par le gérant dans l'onglet
-- Terminaux) et reçoit les tickets à sortir (print_jobs — un par commande et
-- par imprimante, créés par trigger, plus les tests lancés depuis l'onglet).

create type public.print_job_kind as enum ('order', 'test');
create type public.print_job_status as enum ('pending', 'printed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Appareils. Provisionnés par Ominin (omilink_provision_device) avant
-- l'installation ; l'équipe les voit, personne ne les modifie.

create table public.omilink_devices (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  name text not null,
  -- Remontés à chaque appel. Le nom d'hôte est celui de l'appareil sur le
  -- réseau Tailscale d'Ominin : l'adresse d'un futur accès SSH distant.
  hostname text,
  version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index omilink_devices_etablissement_idx
  on public.omilink_devices (etablissement_id);

alter table public.omilink_devices enable row level security;

create policy "member read" on public.omilink_devices
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);

-- Le jeton vit à part : la table des appareils est lisible par l'équipe,
-- son empreinte ne l'est que par le backend (aucune policy).
create table public.omilink_device_tokens (
  device_id uuid primary key references public.omilink_devices (id) on delete cascade,
  token_hash text not null unique
);

alter table public.omilink_device_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- Imprimantes ESC/POS, chacune desservie par un appareil du même
-- établissement. Le gérant les déclare (nom, adresse sur le réseau local).

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  -- restrict : remplacer un appareil se fait en lui réaffectant ses
  -- imprimantes, pas en perdant leur configuration.
  device_id uuid not null references public.omilink_devices (id) on delete restrict,
  name text not null,
  host text not null,
  -- 9100 : port raw ESC/POS standard.
  port int not null default 9100 check (port between 1 and 65535),
  -- Dernier contrôle de joignabilité par l'appareil, et son erreur le cas
  -- échéant (null = joignable).
  checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (device_id, host, port)
);

create index printers_etablissement_idx on public.printers (etablissement_id);

alter table public.printers enable row level security;

create policy "member read" on public.printers
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
-- L'appareil choisi doit être un des siens (la RLS de omilink_devices borne
-- déjà la sous-requête à ceux de l'établissement).
create policy "gerant insert" on public.printers
  for insert to authenticated
  with check (
    public.current_member_role(etablissement_id) = 'gerant'
    and device_id in (
      select id from public.omilink_devices
      where etablissement_id = printers.etablissement_id
    )
  );
create policy "gerant update" on public.printers
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (
    public.current_member_role(etablissement_id) = 'gerant'
    and device_id in (
      select id from public.omilink_devices
      where etablissement_id = printers.etablissement_id
    )
  );
create policy "gerant delete" on public.printers
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- ---------------------------------------------------------------------------
-- File d'impression.

create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references public.etablissements (id) on delete cascade,
  printer_id uuid not null references public.printers (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  kind public.print_job_kind not null,
  status public.print_job_status not null default 'pending',
  created_at timestamptz not null default now(),
  printed_at timestamptz,
  check ((kind = 'order') = (order_id is not null))
);

create index print_jobs_pending_idx on public.print_jobs (printer_id, created_at)
  where status = 'pending';
create index print_jobs_order_idx on public.print_jobs (order_id);

alter table public.print_jobs enable row level security;

create policy "member read" on public.print_jobs
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
-- Le gérant ne crée que des tests, sur une imprimante de l'établissement ;
-- les tickets de commande naissent par trigger.
create policy "gerant test" on public.print_jobs
  for insert to authenticated
  with check (
    kind = 'test'
    and status = 'pending'
    and public.current_member_role(etablissement_id) = 'gerant'
    and printer_id in (
      select id from public.printers
      where etablissement_id = print_jobs.etablissement_id
    )
  );

-- Un ticket par imprimante de l'établissement à chaque nouvelle commande.
create function public.enqueue_order_tickets()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into print_jobs (etablissement_id, printer_id, order_id, kind)
  select new.etablissement_id, id, new.id, 'order'
  from printers where etablissement_id = new.etablissement_id;
  return new;
end;
$$;

create trigger orders_enqueue_tickets
  after insert on public.orders
  for each row execute function public.enqueue_order_tickets();

-- Une commande qui quitte la cuisine (prête, annulée…) avant d'avoir été
-- imprimée — appareil hors ligne — n'a plus de ticket à sortir.
create function public.cancel_order_tickets()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status not in ('en_attente', 'en_preparation') then
    update print_jobs set status = 'cancelled'
    where order_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger orders_cancel_tickets
  after update of status on public.orders
  for each row execute function public.cancel_order_tickets();

-- ---------------------------------------------------------------------------
-- Appels du backend (service_role) pour le compte d'un appareil.

-- Synchronisation : signe de vie, état des imprimantes contrôlées depuis le
-- dernier appel ([{id, error}], error null = joignable), et en retour la
-- configuration de celles que l'appareil dessert.
create function public.omilink_sync(
  p_device_id uuid,
  p_hostname text,
  p_version text,
  p_printers jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  update omilink_devices
  set last_seen_at = now(), hostname = p_hostname, version = p_version
  where id = p_device_id;

  update printers p
  set checked_at = now(), last_error = s."error"
  from jsonb_to_recordset(p_printers) as s(id uuid, "error" text)
  where p.id = s.id and p.device_id = p_device_id;

  return coalesce(
    (select jsonb_agg(jsonb_build_object('id', id, 'host', host, 'port', port)
                      order by created_at)
     from printers where device_id = p_device_id),
    '[]'::jsonb
  );
end;
$$;

revoke execute on function public.omilink_sync(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.omilink_sync(uuid, text, text, jsonb)
  to service_role;

-- Provisionnement d'un appareil par Ominin (éditeur SQL, ou backend via la
-- clé service) : renvoie le jeton en clair, une seule fois — à copier dans
-- le .env du Raspberry Pi.
create function public.omilink_provision_device(p_etablissement_id uuid, p_name text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_device uuid;
begin
  insert into omilink_devices (etablissement_id, name)
  values (p_etablissement_id, p_name)
  returning id into v_device;
  insert into omilink_device_tokens (device_id, token_hash)
  values (v_device, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  return v_token;
end;
$$;

-- Jamais exposée aux utilisateurs : elle crée des jetons pour n'importe quel
-- établissement.
revoke execute on function public.omilink_provision_device(uuid, text)
  from public, anon, authenticated;
grant execute on function public.omilink_provision_device(uuid, text)
  to service_role;
