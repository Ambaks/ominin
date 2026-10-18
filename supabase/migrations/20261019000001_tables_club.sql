-- Réservation de tables en club (Ominin Club), d'abord pour L'Étoile à
-- Toulouse, qui la faisait jusqu'ici sur Fourvenues.
--
-- Un club dessine sa salle une fois : des zones (Rooftop, VIP Balcon…) avec
-- leur plan et leurs tables numérotées, placées sur ce plan. Chaque soirée
-- ouvre ces zones à son prix — une table n'a pas le même prix un jeudi
-- étudiant et un soir de showcase — et peut en garder hors vente. Le client
-- choisit SA table sur le plan, règle en ligne le prix complet, frais de
-- service d'Ominin en sus, et la table est à lui : pas d'acompte, pas de
-- table « à confirmer ».
--
-- Une table se tient le temps du paiement (hold_expires_at, durée fixée par
-- l'application qui appelle reserver_table), puis se libère d'elle-même :
-- une réservation en attente dont le délai est passé ne compte plus, et la
-- suivante sur la même table l'annule au passage. Un paiement qui aboutit
-- après coup sur une table reprise est remboursé par l'application.
--
-- Le club saisit aussi les réservations prises au téléphone ou sur place
-- (sans paiement en ligne, sans frais Ominin) ; elles occupent la table sans
-- délai. Une liste d'invités gratuite, plafonnée par soirée, se remplit
-- depuis la page de la soirée ; l'équipe y coche les arrivées.

-- ---------------------------------------------------------------------------
-- Commission

alter table public.etablissements
  add column table_fee_percent numeric(5,2) not null default 0
    check (table_fee_percent between 0 and 100);

comment on column public.etablissements.table_fee_percent is
  'Frais de service Ominin sur une table réservée en ligne, en % du prix, '
  'ajoutés au total payé par le client. Réservé à Ominin.';

create or replace function public.enforce_etablissement_fee_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if new.platform_fee_percent is distinct from old.platform_fee_percent
     or new.collect_fee_percent is distinct from old.collect_fee_percent
     or new.collect_slot_minutes is distinct from old.collect_slot_minutes
     or new.table_fee_percent is distinct from old.table_fee_percent then
    raise exception 'La commission plateforme est réservée à Ominin.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Salle : zones et tables

create table public.club_zones (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  sort smallint not null default 0,
  -- Le dessin de la zone : { w, h, walls: [[x, y]…][], marks: [{ kind, x, y,
  -- w?, h?, label?, rotate? }] }, en unités du plan. Les tables s'y placent
  -- en x, y.
  layout jsonb not null default '{}'::jsonb,
  -- Prix d'une table de la zone quand la soirée n'en fixe pas d'autre.
  price_cents int not null check (price_cents > 0),
  -- Ce que comprend la table : « 2 bouteilles 70 cl », lu par le client.
  inclus text check (inclus is null or length(btrim(inclus)) between 1 and 120),
  created_at timestamptz not null default now()
);

create index club_zones_etablissement_idx on public.club_zones (etablissement_id);

create table public.club_tables (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.club_zones (id) on delete cascade,
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 8),
  seats smallint not null check (seats between 1 and 40),
  x real not null,
  y real not null,
  shape text not null default 'carre'
    constraint club_tables_forme check (shape in ('carre', 'rond')),
  constraint club_tables_label unique (zone_id, label)
);

create index club_tables_zone_idx on public.club_tables (zone_id);

-- ---------------------------------------------------------------------------
-- Soirées

create table public.club_events (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- « Five Stars », « Étudiants » : l'étiquette de la soirée.
  tag text check (tag is null or length(btrim(tag)) between 1 and 30),
  description text check (description is null or length(description) <= 2000),
  -- Affiche, envoyée comme les photos de la carte (bucket photos).
  poster_url text check (poster_url is null or poster_url ~ '^https?://'),
  -- Les billets restent chez Shotgun : la page y renvoie.
  ticket_url text check (ticket_url is null or ticket_url ~ '^https://'),
  published boolean not null default false,
  cancelled_at timestamptz,
  guest_list_open boolean not null default false,
  guest_list_capacity int check (guest_list_capacity is null or guest_list_capacity > 0),
  guest_list_max_party smallint not null default 4
    check (guest_list_max_party between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_events_horaire check (ends_at > starts_at),
  constraint club_events_slug unique (etablissement_id, slug)
);

create index club_events_etablissement_idx
  on public.club_events (etablissement_id, starts_at);

create trigger club_events_updated_at
  before update on public.club_events
  for each row execute function public.set_updated_at();

-- Les zones ouvertes à la vente pour une soirée, et leur prix ce soir-là
-- (null : celui de la zone). Une zone absente n'est pas en vente.
create table public.club_event_zones (
  event_id uuid not null references public.club_events (id) on delete cascade,
  zone_id uuid not null references public.club_zones (id) on delete cascade,
  price_cents int check (price_cents is null or price_cents > 0),
  primary key (event_id, zone_id)
);

-- Tables gardées hors vente ce soir-là (artiste, habitués).
create table public.club_event_blocked_tables (
  event_id uuid not null references public.club_events (id) on delete cascade,
  table_id uuid not null references public.club_tables (id) on delete cascade,
  primary key (event_id, table_id)
);

-- ---------------------------------------------------------------------------
-- Réservations

create type public.club_booking_status as enum (
  'en_attente',  -- paiement en ligne en cours (hold), ou à régler sur place
  'payee',
  'arrivee',
  'annulee',
  'remboursee'
);

create type public.club_booking_source as enum ('en_ligne', 'telephone', 'sur_place');

create table public.club_bookings (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  event_id uuid not null references public.club_events (id) on delete cascade,
  table_id uuid not null references public.club_tables (id) on delete restrict,
  -- La clé de la page de réservation du client, envoyée par e-mail.
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  name text not null check (length(btrim(name)) between 1 and 80),
  phone text check (phone is null or length(btrim(phone)) between 6 and 30),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  party_size smallint not null check (party_size between 1 and 40),
  price_cents int not null check (price_cents >= 0),
  fee_cents int not null default 0 check (fee_cents >= 0),
  total_cents int not null check (total_cents = price_cents + fee_cents),
  status public.club_booking_status not null default 'en_attente',
  source public.club_booking_source not null,
  -- Délai de paiement d'une réservation en ligne ; null : la table est tenue
  -- sans délai (réservation saisie par le club).
  hold_expires_at timestamptz,
  stripe_payment_intent_id text unique,
  note text check (note is null or length(note) <= 300),
  paid_at timestamptz,
  arrived_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint club_bookings_hold check (
    hold_expires_at is null or source = 'en_ligne'
  ),
  constraint club_bookings_contact check (
    source <> 'en_ligne' or (email is not null and phone is not null)
  )
);

-- Une table ne se vend qu'une fois par soirée. Une attente expirée occupe
-- encore l'index : reserver_table l'annule avant d'insérer.
create unique index club_bookings_table_active
  on public.club_bookings (event_id, table_id)
  where status in ('en_attente', 'payee', 'arrivee');
create index club_bookings_event_idx on public.club_bookings (event_id);
create index club_bookings_etablissement_idx
  on public.club_bookings (etablissement_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Liste d'invités

create table public.club_guests (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  event_id uuid not null references public.club_events (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  party_size smallint not null check (party_size between 1 and 20),
  phone text check (phone is null or length(btrim(phone)) between 6 and 30),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  arrived_at timestamptz,
  created_at timestamptz not null default now()
);

create index club_guests_event_idx on public.club_guests (event_id);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Le plan, les soirées publiées et leurs prix sont publics (la page du club
-- les lit sans session). Réservations et invités portent des coordonnées :
-- l'équipe seule les lit ; le client n'y touche que par les fonctions
-- ci-dessous et par le serveur (page de réservation, paiement).

alter table public.club_zones enable row level security;
alter table public.club_tables enable row level security;
alter table public.club_events enable row level security;
alter table public.club_event_zones enable row level security;
alter table public.club_event_blocked_tables enable row level security;
alter table public.club_bookings enable row level security;
alter table public.club_guests enable row level security;

create policy "public read" on public.club_zones
  for select to anon, authenticated using (true);
create policy "gerant write" on public.club_zones
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

create policy "public read" on public.club_tables
  for select to anon, authenticated using (true);
create policy "gerant write" on public.club_tables
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

-- anon n'a pas le droit d'exécuter current_member_role : sa policy ne
-- l'appelle pas, sans quoi même une soirée publiée lui serait refusée.
create policy "public read" on public.club_events
  for select to anon using (published);
create policy "member read" on public.club_events
  for select to authenticated
  using (published or public.current_member_role(etablissement_id) is not null);
create policy "gerant write" on public.club_events
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

create policy "public read" on public.club_event_zones
  for select to anon
  using (exists (select 1 from public.club_events e where e.id = event_id and e.published));
create policy "member read" on public.club_event_zones
  for select to authenticated
  using (
    exists (
      select 1 from public.club_events e
      where e.id = event_id
        and (e.published or public.current_member_role(e.etablissement_id) is not null)
    )
  );
create policy "gerant write" on public.club_event_zones
  for all to authenticated
  using (
    exists (
      select 1 from public.club_events e
      where e.id = event_id
        and public.current_member_role(e.etablissement_id) = 'gerant'
    )
  )
  with check (
    exists (
      select 1 from public.club_events e
      join public.club_zones z on z.id = zone_id
      where e.id = event_id
        and z.etablissement_id = e.etablissement_id
        and public.current_member_role(e.etablissement_id) = 'gerant'
    )
  );

create policy "public read" on public.club_event_blocked_tables
  for select to anon
  using (exists (select 1 from public.club_events e where e.id = event_id and e.published));
create policy "member read" on public.club_event_blocked_tables
  for select to authenticated
  using (
    exists (
      select 1 from public.club_events e
      where e.id = event_id
        and (e.published or public.current_member_role(e.etablissement_id) is not null)
    )
  );
create policy "gerant write" on public.club_event_blocked_tables
  for all to authenticated
  using (
    exists (
      select 1 from public.club_events e
      where e.id = event_id
        and public.current_member_role(e.etablissement_id) = 'gerant'
    )
  )
  with check (
    exists (
      select 1 from public.club_events e
      join public.club_tables t on t.id = table_id
      where e.id = event_id
        and t.etablissement_id = e.etablissement_id
        and public.current_member_role(e.etablissement_id) = 'gerant'
    )
  );

-- Écritures par les fonctions (montants, unicité, arrivées) : lecture seule.
create policy "member read" on public.club_bookings
  for select to authenticated
  using (etablissement_id in (select public.member_etablissements()));
create policy "member read" on public.club_guests
  for select to authenticated
  using (etablissement_id in (select public.member_etablissements()));
create policy "gerant delete" on public.club_guests
  for delete to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant');

-- Le plan du soir bouge en direct sur les écrans de l'équipe.
alter table public.club_bookings replica identity full;
alter table public.club_guests replica identity full;
alter table public.club_events replica identity full;
alter publication supabase_realtime add table public.club_bookings;
alter publication supabase_realtime add table public.club_guests;
alter publication supabase_realtime add table public.club_events;

-- ---------------------------------------------------------------------------
-- Disponibilité

-- Une réservation tient sa table : réglée, arrivée, à régler sur place, ou
-- en cours de paiement dans son délai.
create function public.club_booking_holds(
  p_status public.club_booking_status,
  p_hold_expires_at timestamptz
)
returns boolean
language sql
stable
as $$
  select p_status in ('payee', 'arrivee')
    or (p_status = 'en_attente'
      and (p_hold_expires_at is null or p_hold_expires_at > now()));
$$;

-- Les tables prises d'une soirée publiée, pour le plan du client : des
-- identifiants seulement, aucune coordonnée.
create function public.club_tables_prises(p_event uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.table_id
  from club_bookings b
  join club_events e on e.id = b.event_id and e.published
  where b.event_id = p_event
    and club_booking_holds(b.status, b.hold_expires_at);
$$;

revoke execute on function public.club_booking_holds(public.club_booking_status, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.club_tables_prises(uuid) from public;
grant execute on function public.club_tables_prises(uuid) to anon, authenticated;

-- Le prix d'une table pour une soirée, ou null si elle n'y est pas en vente
-- (zone fermée ce soir-là, table gardée).
create function public.club_prix_table(p_event uuid, p_table uuid)
returns int
language sql
stable
set search_path = public
as $$
  select coalesce(ez.price_cents, z.price_cents)
  from club_events e
  join club_tables t on t.id = p_table and t.etablissement_id = e.etablissement_id
  join club_zones z on z.id = t.zone_id
  join club_event_zones ez on ez.event_id = e.id and ez.zone_id = z.id
  where e.id = p_event
    and not exists (
      select 1 from club_event_blocked_tables bt
      where bt.event_id = e.id and bt.table_id = t.id
    );
$$;

revoke execute on function public.club_prix_table(uuid, uuid)
  from public, anon, authenticated;

-- Libère les attentes expirées d'une table avant d'y poser une réservation.
create function public.club_liberer_attentes(p_event uuid, p_table uuid)
returns void
language sql
set search_path = public
as $$
  update club_bookings
  set status = 'annulee', cancelled_at = now()
  where event_id = p_event
    and table_id = p_table
    and status = 'en_attente'
    and hold_expires_at is not null
    and hold_expires_at <= now();
$$;

revoke execute on function public.club_liberer_attentes(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Réserver en ligne
--
-- Appelée par le serveur (service_role) avec le délai de paiement : le prix
-- et les frais sont relus ici, jamais fournis par le client.

create function public.reserver_table(
  p_event uuid,
  p_table uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_party smallint,
  p_hold_seconds int
)
returns public.club_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event club_events;
  v_seats smallint;
  v_price int;
  v_fee int;
  v_percent numeric;
  v_booking club_bookings;
begin
  if p_hold_seconds is null or p_hold_seconds <= 0 then
    raise exception 'Délai de paiement invalide.';
  end if;

  select * into v_event from club_events where id = p_event;
  if v_event.id is null or not v_event.published then
    raise exception 'Soirée introuvable.';
  end if;
  if v_event.cancelled_at is not null then
    raise exception 'Cette soirée est annulée.';
  end if;
  if v_event.ends_at <= now() then
    raise exception 'Cette soirée est terminée.';
  end if;

  select seats into v_seats from club_tables
  where id = p_table and etablissement_id = v_event.etablissement_id;
  v_price := club_prix_table(p_event, p_table);
  if v_seats is null or v_price is null then
    raise exception 'Cette table n''est pas en vente ce soir.';
  end if;
  if p_party is null or p_party < 1 or p_party > v_seats then
    raise exception 'Cette table accueille % personnes au plus.', v_seats
     ;
  end if;

  select table_fee_percent into v_percent
  from etablissements where id = v_event.etablissement_id;
  v_fee := round(v_price * coalesce(v_percent, 0) / 100);

  perform club_liberer_attentes(p_event, p_table);

  begin
    insert into club_bookings (
      etablissement_id, event_id, table_id, name, phone, email, party_size,
      price_cents, fee_cents, total_cents, status, source, hold_expires_at
    ) values (
      v_event.etablissement_id, p_event, p_table, btrim(p_name),
      btrim(p_phone), lower(btrim(p_email)), p_party,
      v_price, v_fee, v_price + v_fee, 'en_attente', 'en_ligne',
      now() + make_interval(secs => p_hold_seconds)
    )
    returning * into v_booking;
  exception when unique_violation then
    raise exception 'Cette table vient d''être réservée.';
  end;

  return v_booking;
end;
$$;

revoke execute on function public.reserver_table(uuid, uuid, text, text, text, smallint, int)
  from public, anon, authenticated;
grant execute on function public.reserver_table(uuid, uuid, text, text, text, smallint, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- Côté club

-- Réservation prise au téléphone ou à la porte : sans paiement en ligne ni
-- frais Ominin. Réglée (p_paid) ou à régler sur place.
create function public.creer_reservation_club(
  p_event uuid,
  p_table uuid,
  p_name text,
  p_phone text,
  p_party smallint,
  p_source public.club_booking_source,
  p_paid boolean,
  p_note text
)
returns public.club_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event club_events;
  v_seats smallint;
  v_price int;
  v_booking club_bookings;
begin
  if p_source = 'en_ligne' then
    raise exception 'Source invalide.';
  end if;
  select * into v_event from club_events where id = p_event;
  if v_event.id is null
     or current_member_role(v_event.etablissement_id) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;

  select seats into v_seats from club_tables
  where id = p_table and etablissement_id = v_event.etablissement_id;
  if v_seats is null then
    raise exception 'Table introuvable.';
  end if;
  if p_party is null or p_party < 1 or p_party > v_seats then
    raise exception 'Cette table accueille % personnes au plus.', v_seats
     ;
  end if;
  -- Une table gardée ou d'une zone fermée reste réservable par le club : il
  -- la garde justement pour ça. Son prix est alors celui de la zone.
  select coalesce(club_prix_table(p_event, p_table), z.price_cents) into v_price
  from club_tables t join club_zones z on z.id = t.zone_id
  where t.id = p_table;

  perform club_liberer_attentes(p_event, p_table);

  begin
    insert into club_bookings (
      etablissement_id, event_id, table_id, name, phone, party_size,
      price_cents, fee_cents, total_cents, status, source, note, paid_at
    ) values (
      v_event.etablissement_id, p_event, p_table, btrim(p_name),
      nullif(btrim(p_phone), ''), p_party, v_price, 0, v_price,
      case when p_paid then 'payee' else 'en_attente' end::club_booking_status,
      p_source, nullif(btrim(p_note), ''),
      case when p_paid then now() end
    )
    returning * into v_booking;
  exception when unique_violation then
    raise exception 'Cette table est déjà réservée.';
  end;

  return v_booking;
end;
$$;

revoke execute on function public.creer_reservation_club(
  uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
) from public, anon;
grant execute on function public.creer_reservation_club(
  uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
) to authenticated;

-- L'équipe coche une arrivée (ou la décoche après une erreur). Une table à
-- régler sur place est réglée à l'arrivée (p_paid).
create function public.club_marquer_arrivee(
  p_booking uuid,
  p_arrived boolean,
  p_paid boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
begin
  select * into v_booking from club_bookings where id = p_booking;
  if v_booking.id is null
     or current_member_role(v_booking.etablissement_id) is null then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_booking.status not in ('en_attente', 'payee', 'arrivee')
     or (v_booking.status = 'en_attente' and v_booking.hold_expires_at is not null) then
    raise exception 'Cette réservation n''est plus active.';
  end if;
  if p_arrived and v_booking.status = 'en_attente' and not p_paid then
    raise exception 'Table à régler avant l''arrivée.';
  end if;

  update club_bookings
  set status = case when p_arrived then 'arrivee' else 'payee' end::club_booking_status,
      arrived_at = case when p_arrived then now() end,
      paid_at = coalesce(paid_at, now())
  where id = p_booking;
end;
$$;

revoke execute on function public.club_marquer_arrivee(uuid, boolean, boolean) from public, anon;
grant execute on function public.club_marquer_arrivee(uuid, boolean, boolean) to authenticated;

-- Annule une réservation saisie par le club, ou réglée sur place. Une
-- réservation payée en ligne se rembourse (route serveur), elle ne s'annule
-- pas ici : l'argent doit suivre.
create function public.club_annuler_reservation(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
begin
  select * into v_booking from club_bookings where id = p_booking;
  if v_booking.id is null
     or current_member_role(v_booking.etablissement_id) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_booking.stripe_payment_intent_id is not null
     and v_booking.status in ('payee', 'arrivee') then
    raise exception 'Payée en ligne : à rembourser.';
  end if;
  update club_bookings
  set status = 'annulee', cancelled_at = now()
  where id = p_booking and status in ('en_attente', 'payee', 'arrivee');
end;
$$;

revoke execute on function public.club_annuler_reservation(uuid) from public, anon;
grant execute on function public.club_annuler_reservation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Liste d'invités

create function public.inscrire_guest_list(
  p_event uuid,
  p_name text,
  p_party smallint,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event club_events;
  v_taken int;
  v_id uuid;
begin
  -- Une inscription à la fois par soirée : le plafond se compte sans course.
  select * into v_event from club_events where id = p_event for update;
  if v_event.id is null or not v_event.published then
    raise exception 'Soirée introuvable.';
  end if;
  if not v_event.guest_list_open or v_event.cancelled_at is not null
     or v_event.ends_at <= now() then
    raise exception 'La liste est fermée.';
  end if;
  if p_party is null or p_party < 1 or p_party > v_event.guest_list_max_party then
    raise exception 'Jusqu''à % personnes par inscription.', v_event.guest_list_max_party
     ;
  end if;
  if v_event.guest_list_capacity is not null then
    select coalesce(sum(party_size), 0) into v_taken
    from club_guests where event_id = p_event;
    if v_taken + p_party > v_event.guest_list_capacity then
      raise exception 'La liste est complète.';
    end if;
  end if;

  insert into club_guests (etablissement_id, event_id, name, party_size, phone, email)
  values (
    v_event.etablissement_id, p_event, btrim(p_name), p_party,
    nullif(btrim(p_phone), ''), nullif(lower(btrim(p_email)), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.inscrire_guest_list(uuid, text, smallint, text, text)
  from public;
grant execute on function public.inscrire_guest_list(uuid, text, smallint, text, text)
  to anon, authenticated;

-- Places restantes sur la liste, pour la page publique.
create function public.club_guest_list_restant(p_event uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when e.guest_list_capacity is null then null
    else greatest(e.guest_list_capacity - coalesce(
      (select sum(g.party_size) from club_guests g where g.event_id = e.id), 0), 0)::int
  end
  from club_events e
  where e.id = p_event and e.published;
$$;

revoke execute on function public.club_guest_list_restant(uuid) from public;
grant execute on function public.club_guest_list_restant(uuid) to anon, authenticated;

create function public.club_marquer_invite(p_guest uuid, p_arrived boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etab uuid;
begin
  select etablissement_id into v_etab from club_guests where id = p_guest;
  if v_etab is null or current_member_role(v_etab) is null then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  update club_guests
  set arrived_at = case when p_arrived then now() end
  where id = p_guest;
end;
$$;

revoke execute on function public.club_marquer_invite(uuid, boolean) from public, anon;
grant execute on function public.club_marquer_invite(uuid, boolean) to authenticated;
