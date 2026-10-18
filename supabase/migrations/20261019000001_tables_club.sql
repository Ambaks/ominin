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
-- La table peut aussi se partager : l'organisateur en paie une première
-- part avec les frais de service de toute la table, reçoit un lien, et ses
-- amis paient chacun la leur, sans frais — au plus une part par personne
-- attendue, jusqu'au début de la soirée. Ce qui reste se règle à l'entrée.
-- Chaque part est un paiement à part entière (club_payments), remboursable
-- seul.
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

-- Les conditions d'entrée du club, montrées avant le paiement et à accepter :
-- âge minimum, tenue, ce que la porte refuse. Réglées par le gérant.
alter table public.etablissements
  add column club_min_age smallint not null default 18
    check (club_min_age between 16 and 25),
  add column club_dress_code text
    check (club_dress_code is null or length(btrim(club_dress_code)) between 1 and 80),
  add column club_refused text
    check (club_refused is null or length(btrim(club_refused)) between 1 and 120);

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
  -- Sans cascade : une soirée ou une table qui porte des réservations ne
  -- s'efface pas (la suppression du club entier, elle, les emporte).
  event_id uuid not null references public.club_events (id),
  table_id uuid not null references public.club_tables (id),
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
  -- Table partagée entre amis : le lien de leurs parts.
  shared boolean not null default false,
  share_token text unique,
  -- Ce qui est réglé du prix de la table (parts en ligne et sur place) ;
  -- le reste se paie à l'entrée.
  paid_cents int not null default 0 check (paid_cents >= 0),
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
  ),
  constraint club_bookings_partage check (shared = (share_token is not null)),
  constraint club_bookings_regle check (paid_cents <= price_cents)
);

-- Une table ne se vend qu'une fois par soirée. Une attente expirée occupe
-- encore l'index : reserver_table l'annule avant d'insérer.
create unique index club_bookings_table_active
  on public.club_bookings (event_id, table_id)
  where status in ('en_attente', 'payee', 'arrivee');
create index club_bookings_event_idx on public.club_bookings (event_id);
create index club_bookings_etablissement_idx
  on public.club_bookings (etablissement_id, created_at desc);

-- Les paiements d'une table : la table entière, ou les parts d'une table
-- partagée, en ligne ; et ce que le club encaisse à l'entrée.
create type public.club_payment_status as enum ('en_attente', 'payee', 'remboursee', 'annulee');
create type public.club_payment_method as enum ('en_ligne', 'sur_place');

create table public.club_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.club_bookings (id),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or length(btrim(phone)) between 6 and 30),
  -- La part de l'organisateur, celle qui réserve la table.
  organiser boolean not null default false,
  amount_cents int not null check (amount_cents > 0),
  fee_cents int not null default 0 check (fee_cents >= 0),
  total_cents int not null check (total_cents = amount_cents + fee_cents),
  method public.club_payment_method not null,
  status public.club_payment_status not null default 'en_attente',
  stripe_payment_intent_id text unique,
  -- Une part en cours de paiement réserve son montant jusque-là.
  hold_expires_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint club_payments_sur_place check (
    method = 'en_ligne' or (fee_cents = 0 and hold_expires_at is null)
  )
);

create index club_payments_booking_idx on public.club_payments (booking_id);

-- ---------------------------------------------------------------------------
-- Liste d'invités

create table public.club_guests (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  event_id uuid not null references public.club_events (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  party_size smallint not null check (party_size between 1 and 20),
  phone text not null check (phone ~ '^\+?[0-9]{6,20}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  arrived_at timestamptz,
  created_at timestamptz not null default now()
);

create index club_guests_event_idx on public.club_guests (event_id);
-- Une inscription par téléphone et par soirée : la liste ne se remplit pas
-- de doublons, ni d'un robot qui la vide en un instant.
create unique index club_guests_phone_idx on public.club_guests (event_id, phone);

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
alter table public.club_payments enable row level security;

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
  with check (
    public.current_member_role(etablissement_id) = 'gerant'
    and exists (
      select 1 from public.club_zones z
      where z.id = zone_id and z.etablissement_id = club_tables.etablissement_id
    )
  );

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
create policy "member read" on public.club_payments
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
alter table public.club_payments replica identity full;
alter publication supabase_realtime add table public.club_bookings;
alter publication supabase_realtime add table public.club_payments;
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

-- Libère les attentes expirées d'une table avant d'y poser une réservation,
-- avec leurs paiements restés en cours.
create function public.club_liberer_attentes(p_event uuid, p_table uuid)
returns void
language sql
set search_path = public
as $$
  with liberees as (
    update club_bookings
    set status = 'annulee', cancelled_at = now()
    where event_id = p_event
      and table_id = p_table
      and status = 'en_attente'
      and hold_expires_at is not null
      and hold_expires_at <= now()
    returning id
  )
  update club_payments
  set status = 'annulee'
  where status = 'en_attente' and booking_id in (select id from liberees);
$$;

revoke execute on function public.club_liberer_attentes(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Réserver en ligne
--
-- Appelées par le serveur (service_role) avec le délai de paiement : prix,
-- parts et frais sont relus ou bornés ici, jamais repris du client.

-- Les frais de service d'Ominin sur un montant de table.
create function public.club_frais(p_etablissement uuid, p_amount int)
returns int
language sql
stable
set search_path = public
as $$
  select round(p_amount * coalesce(table_fee_percent, 0) / 100)::int
  from etablissements where id = p_etablissement;
$$;

revoke execute on function public.club_frais(uuid, int) from public, anon, authenticated;

create function public.reserver_table(
  p_event uuid,
  p_table uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_party smallint,
  p_hold_seconds int,
  -- Table partagée : la part de l'organisateur. Null : la table entière.
  p_share_cents int default null
)
returns table (booking_id uuid, payment_id uuid, token text, total_cents int, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_event club_events;
  v_seats smallint;
  v_price int;
  v_amount int;
  v_booking club_bookings;
  v_payment club_payments;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
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
    raise exception 'Cette table accueille % personnes au plus.', v_seats;
  end if;

  -- Partagée, l'organisateur paie au moins une part égale, au plus tout.
  v_amount := coalesce(p_share_cents, v_price);
  if p_share_cents is not null
     and (p_party < 2 or v_amount < ceil(v_price::numeric / p_party) or v_amount > v_price) then
    raise exception 'Votre part va de % à % €.',
      replace(to_char(ceil(v_price::numeric / greatest(p_party, 1)) / 100, 'FM999990.00'), '.', ','),
      replace(to_char(v_price / 100.0, 'FM999990.00'), '.', ',');
  end if;

  perform club_liberer_attentes(p_event, p_table);
  -- Un paiement en cours par personne et par soirée : choisir une autre
  -- table rend la précédente. La personne est reconnue à son e-mail ET à
  -- son téléphone : qui ne connaît que l'un des deux ne peut pas faire
  -- tomber la réservation d'un autre.
  with rendues as (
    update club_bookings
    set status = 'annulee', cancelled_at = now()
    where event_id = p_event
      and status = 'en_attente'
      and source = 'en_ligne'
      and email = lower(btrim(p_email))
      and phone = btrim(p_phone)
    returning id
  )
  update club_payments set status = 'annulee'
  where status = 'en_attente' and booking_id in (select id from rendues);

  begin
    insert into club_bookings (
      etablissement_id, event_id, table_id, name, phone, email, party_size,
      price_cents, fee_cents, total_cents, status, source, hold_expires_at,
      shared, share_token
    ) values (
      v_event.etablissement_id, p_event, p_table, btrim(p_name),
      btrim(p_phone), lower(btrim(p_email)), p_party,
      v_price, club_frais(v_event.etablissement_id, v_price),
      v_price + club_frais(v_event.etablissement_id, v_price),
      'en_attente', 'en_ligne', v_hold,
      p_share_cents is not null,
      case when p_share_cents is not null then encode(extensions.gen_random_bytes(12), 'hex') end
    )
    returning * into v_booking;
  exception when unique_violation then
    raise exception 'Cette table vient d''être réservée.';
  end;

  -- Les frais de service portent sur la table entière et se paient une
  -- fois, avec la part de l'organisateur : ses amis paient leur part sans
  -- frais.
  insert into club_payments (
    booking_id, etablissement_id, name, email, phone, organiser,
    amount_cents, fee_cents, total_cents, method, hold_expires_at
  ) values (
    v_booking.id, v_booking.etablissement_id, v_booking.name, v_booking.email,
    v_booking.phone, true, v_amount, v_booking.fee_cents,
    v_amount + v_booking.fee_cents, 'en_ligne', v_hold
  )
  returning * into v_payment;

  return query select v_booking.id, v_payment.id, v_booking.token, v_payment.total_cents, v_hold;
end;
$$;

revoke execute on function public.reserver_table(uuid, uuid, text, text, text, smallint, int, int)
  from public, anon, authenticated;
grant execute on function public.reserver_table(uuid, uuid, text, text, text, smallint, int, int)
  to service_role;

-- Où en est une table partagée : ce qui reste à payer, déduction faite des
-- parts payées et de celles en cours ; les places encore libres pour une
-- part ; et la plus petite part possible — celle qui laisse aux places
-- restantes de quoi tout régler à parts égales.
create function public.club_partage_etat(p_booking uuid)
returns table (remaining_cents int, seats_left int, minimum_cents int)
language sql
stable
set search_path = public
as $$
  with b as (select * from club_bookings where id = p_booking),
  parts as (
    select
      coalesce(sum(p.amount_cents) filter (where p.status = 'en_attente' and p.hold_expires_at > now()), 0) as pending,
      count(*) filter (
        where p.method = 'en_ligne'
          and (p.status = 'payee' or (p.status = 'en_attente' and p.hold_expires_at > now()))
      ) as payers
    from club_payments p where p.booking_id = p_booking
  )
  select
    greatest(b.price_cents - b.paid_cents - parts.pending, 0)::int,
    greatest(b.party_size - parts.payers, 0)::int,
    case when b.party_size - parts.payers > 0
      then ceil(greatest(b.price_cents - b.paid_cents - parts.pending, 0)::numeric
        / (b.party_size - parts.payers))::int
      else 0 end
  from b, parts;
$$;

revoke execute on function public.club_partage_etat(uuid) from public, anon, authenticated;
grant execute on function public.club_partage_etat(uuid) to service_role;

-- Un ami paie sa part d'une table partagée, par le lien de l'organisateur :
-- jusqu'au début de la soirée, une part par place, entre la part minimale
-- et ce qui reste. La part est tenue le temps du paiement.
create function public.contribuer_table(
  p_share_token text,
  p_name text,
  p_phone text,
  p_email text,
  p_amount int,
  p_hold_seconds int
)
returns table (booking_id uuid, payment_id uuid, total_cents int, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_booking club_bookings;
  v_event club_events;
  v_state record;
  v_payment club_payments;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
begin
  -- Une part à la fois par table : le reste se compte sans course.
  select * into v_booking from club_bookings where share_token = p_share_token for update;
  if v_booking.id is null then
    raise exception 'Lien de partage introuvable.';
  end if;
  select * into v_event from club_events where id = v_booking.event_id;
  if v_booking.status not in ('payee', 'arrivee') then
    raise exception 'Cette table n''est pas encore confirmée.';
  end if;
  if v_event.cancelled_at is not null then
    raise exception 'Cette soirée est annulée.';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'La soirée a commencé : le reste se règle à l''entrée.';
  end if;

  select * into v_state from club_partage_etat(v_booking.id);
  if v_state.remaining_cents <= 0 then
    raise exception 'La table est déjà entièrement payée.';
  end if;
  if v_state.seats_left <= 0 then
    raise exception 'Toutes les parts sont prises.';
  end if;
  if p_amount is null or p_amount < v_state.minimum_cents or p_amount > v_state.remaining_cents then
    raise exception 'Votre part va de % à % €.',
      replace(to_char(v_state.minimum_cents / 100.0, 'FM999990.00'), '.', ','),
      replace(to_char(v_state.remaining_cents / 100.0, 'FM999990.00'), '.', ',');
  end if;

  insert into club_payments (
    booking_id, etablissement_id, name, email, phone, organiser,
    amount_cents, fee_cents, total_cents, method, hold_expires_at
  ) values (
    v_booking.id, v_booking.etablissement_id, btrim(p_name), lower(btrim(p_email)),
    btrim(p_phone), false, p_amount, 0, p_amount, 'en_ligne', v_hold
  )
  returning * into v_payment;

  return query select v_booking.id, v_payment.id, v_payment.total_cents, v_hold;
end;
$$;

revoke execute on function public.contribuer_table(text, text, text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.contribuer_table(text, text, text, text, int, int)
  to service_role;

-- Un paiement en ligne abouti (Stripe ou démonstration) : la part est
-- comptée, et la première tient la table. Rend « refund » quand il ne peut
-- plus compter — réservation annulée ou rendue, soirée annulée, montant
-- différent, ou une part qui dépasserait le prix (deux amis qui ont payé le
-- même reste) : l'application rembourse alors ce paiement.
create function public.regler_paiement(p_payment uuid, p_intent text, p_total int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment club_payments;
  v_booking club_bookings;
  v_cancelled timestamptz;
begin
  select * into v_payment from club_payments where id = p_payment;
  if v_payment.id is null then
    return 'refund';
  end if;
  select * into v_booking from club_bookings where id = v_payment.booking_id for update;
  select * into v_payment from club_payments where id = p_payment;

  if v_payment.status = 'payee' then
    return case when v_payment.stripe_payment_intent_id is not distinct from p_intent
      then 'already_paid' else 'refund' end;
  end if;
  select cancelled_at into v_cancelled from club_events where id = v_booking.event_id;
  if v_payment.status <> 'en_attente'
     or v_booking.status not in ('en_attente', 'payee', 'arrivee')
     or v_cancelled is not null
     or p_total <> v_payment.total_cents
     or v_booking.paid_cents + v_payment.amount_cents > v_booking.price_cents then
    update club_payments set status = 'annulee'
    where id = p_payment and status = 'en_attente';
    return 'refund';
  end if;

  update club_payments
  set status = 'payee', paid_at = now(), hold_expires_at = null,
      stripe_payment_intent_id = p_intent
  where id = p_payment;
  -- Un délai passé ne suffit pas à perdre la table : tant qu'aucune autre
  -- réservation ne l'a annulée, le paiement de l'organisateur la tient.
  update club_bookings
  set paid_cents = paid_cents + v_payment.amount_cents,
      status = case when status = 'en_attente' then 'payee' else status end,
      paid_at = coalesce(paid_at, now()),
      hold_expires_at = null
  where id = v_booking.id;
  return 'paid';
end;
$$;

revoke execute on function public.regler_paiement(uuid, text, int) from public, anon, authenticated;
grant execute on function public.regler_paiement(uuid, text, int) to service_role;

-- Remboursement d'une part payée en ligne, marqué AVANT l'appel à Stripe
-- (le webhook charge.refunded la trouve déjà rendue) ; null si elle ne
-- l'était plus. club_retablir_paiement le défait si Stripe refuse.
create function public.club_rembourser_paiement(p_payment uuid)
returns public.club_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment club_payments;
begin
  update club_payments
  set status = 'remboursee', refunded_at = now()
  where id = p_payment and status = 'payee' and method = 'en_ligne'
  returning * into v_payment;
  if v_payment.id is not null then
    update club_bookings set paid_cents = paid_cents - v_payment.amount_cents
    where id = v_payment.booking_id;
  end if;
  return v_payment;
end;
$$;

-- Défait un remboursement que Stripe a refusé. Si la place rendue a été
-- reprise entre-temps (un ami a payé la part libérée), le paiement ne peut
-- plus compter : l'erreur remonte, le club doit rembourser à la main.
create function public.club_retablir_paiement(p_payment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment club_payments;
  v_booking club_bookings;
begin
  select * into v_payment from club_payments where id = p_payment;
  select * into v_booking from club_bookings where id = v_payment.booking_id for update;
  if v_payment.status <> 'remboursee' then
    return;
  end if;
  if v_booking.paid_cents + v_payment.amount_cents > v_booking.price_cents then
    raise exception 'Remboursement refusé par Stripe et part reprise entre-temps : à rembourser à la main.';
  end if;
  update club_payments set status = 'payee', refunded_at = null where id = p_payment;
  update club_bookings set paid_cents = paid_cents + v_payment.amount_cents
  where id = v_payment.booking_id;
end;
$$;

-- Ferme une table avant de la rendre : remboursée si quelqu'un a payé en
-- ligne, annulée sinon. Close d'abord, sous verrou, pour qu'aucune part ne
-- puisse plus compter pendant les remboursements (regler_paiement la
-- refuse). Rend le statut de la table, fermée ou déjà fermée.
create function public.club_clore_reservation(p_booking uuid)
returns public.club_booking_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
  v_online boolean;
begin
  select * into v_booking from club_bookings where id = p_booking for update;
  if v_booking.id is null then
    return null;
  end if;
  if v_booking.status in ('en_attente', 'payee', 'arrivee') then
    select exists (
      select 1 from club_payments
      where booking_id = p_booking and method = 'en_ligne' and status = 'payee'
    ) into v_online;
    update club_bookings
    set status = case when v_online then 'remboursee' else 'annulee' end::club_booking_status,
        refunded_at = case when v_online then now() end,
        cancelled_at = case when v_online then null else now() end
    where id = p_booking
    returning * into v_booking;
    update club_payments set status = 'annulee'
    where booking_id = p_booking and status = 'en_attente';
  end if;
  return v_booking.status;
end;
$$;

revoke execute on function public.club_rembourser_paiement(uuid) from public, anon, authenticated;
revoke execute on function public.club_retablir_paiement(uuid) from public, anon, authenticated;
revoke execute on function public.club_clore_reservation(uuid) from public, anon, authenticated;
grant execute on function public.club_rembourser_paiement(uuid) to service_role;
grant execute on function public.club_retablir_paiement(uuid) to service_role;
grant execute on function public.club_clore_reservation(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Côté club

-- Ce que le club encaisse à l'entrée : le reste d'une table, enregistré
-- comme un paiement sur place.
create function public.club_encaisser_reste(p_booking uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_booking club_bookings;
begin
  select * into v_booking from club_bookings where id = p_booking for update;
  if v_booking.price_cents - v_booking.paid_cents <= 0 then
    return;
  end if;
  insert into club_payments (
    booking_id, etablissement_id, name, email, phone, organiser,
    amount_cents, total_cents, method, status, paid_at
  ) values (
    v_booking.id, v_booking.etablissement_id, v_booking.name, v_booking.email,
    v_booking.phone, true, v_booking.price_cents - v_booking.paid_cents,
    v_booking.price_cents - v_booking.paid_cents, 'sur_place', 'payee', now()
  );
  update club_bookings
  set paid_cents = price_cents, paid_at = coalesce(paid_at, now())
  where id = p_booking;
end;
$$;

revoke execute on function public.club_encaisser_reste(uuid) from public, anon, authenticated;

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
  if v_event.cancelled_at is not null then
    raise exception 'Cette soirée est annulée.';
  end if;
  if v_event.ends_at <= now() then
    raise exception 'Cette soirée est terminée.';
  end if;

  select seats into v_seats from club_tables
  where id = p_table and etablissement_id = v_event.etablissement_id;
  if v_seats is null then
    raise exception 'Table introuvable.';
  end if;
  if p_party is null or p_party < 1 or p_party > v_seats then
    raise exception 'Cette table accueille % personnes au plus.', v_seats;
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
      price_cents, fee_cents, total_cents, status, source, note
    ) values (
      v_event.etablissement_id, p_event, p_table, btrim(p_name),
      nullif(btrim(p_phone), ''), p_party, v_price, 0, v_price,
      case when p_paid then 'payee' else 'en_attente' end::club_booking_status,
      p_source, nullif(btrim(p_note), '')
    )
    returning * into v_booking;
  exception when unique_violation then
    raise exception 'Cette table est déjà réservée.';
  end;
  if p_paid then
    perform club_encaisser_reste(v_booking.id);
    select * into v_booking from club_bookings where id = v_booking.id;
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.creer_reservation_club(
  uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
) from public, anon;
grant execute on function public.creer_reservation_club(
  uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
) to authenticated;

-- L'équipe coche une arrivée, ou la décoche après une erreur. p_paid : le
-- reste de la table (toute la table si rien n'est payé) est encaissé à cet
-- instant, à l'arrivée ou seul. Une table n'entre que réglée. Décocher une
-- arrivée ne touche pas au règlement.
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
  if p_paid then
    perform club_encaisser_reste(p_booking);
    select * into v_booking from club_bookings where id = p_booking;
  end if;
  if p_arrived and v_booking.paid_cents < v_booking.price_cents then
    raise exception 'Reste % € à encaisser avant l''arrivée.',
      replace(to_char((v_booking.price_cents - v_booking.paid_cents) / 100.0, 'FM999990.00'), '.', ',');
  end if;

  update club_bookings
  set status = case
        when p_arrived then 'arrivee'
        when paid_at is not null then 'payee'
        else 'en_attente'
      end::club_booking_status,
      arrived_at = case when p_arrived then coalesce(arrived_at, now()) end
  where id = p_booking;
end;
$$;

revoke execute on function public.club_marquer_arrivee(uuid, boolean, boolean) from public, anon;
grant execute on function public.club_marquer_arrivee(uuid, boolean, boolean) to authenticated;

-- Annule une réservation saisie par le club, ou réglée sur place. Une part
-- payée en ligne se rembourse (route serveur), elle ne s'annule pas ici :
-- l'argent doit suivre.
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
  if exists (
    select 1 from club_payments
    where booking_id = p_booking and method = 'en_ligne' and status = 'payee'
  ) then
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
  if nullif(btrim(p_email), '') is not null
     and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide.';
  end if;
  if v_event.guest_list_capacity is not null then
    select coalesce(sum(party_size), 0) into v_taken
    from club_guests where event_id = p_event;
    if v_taken + p_party > v_event.guest_list_capacity then
      raise exception 'La liste est complète.';
    end if;
  end if;

  begin
    insert into club_guests (etablissement_id, event_id, name, party_size, phone, email)
    values (
      v_event.etablissement_id, p_event, btrim(p_name), p_party,
      regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'),
      nullif(lower(btrim(p_email)), '')
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'Ce numéro est déjà sur la liste.';
    when check_violation then
      raise exception 'Numéro de téléphone invalide.';
  end;
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
