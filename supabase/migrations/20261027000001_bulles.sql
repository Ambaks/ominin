-- Réservation des bulles du Boho (Toulouse) : quatre bulles chauffées dans le
-- jardin, la Bleue, la Rouge, la Grise et la Verte, toutes de la même taille.
-- Reprend le mécanisme des tables de club (20261020000001) sans les soirées :
-- des créneaux fixes que le gérant règle par jour de la semaine, un prix par
-- place, un minimum de personnes.
--
-- Le client choisit le soir, le créneau et une bulle libre, dit combien ils
-- seront et paie une ou plusieurs places. Ses amis paient les leurs par un
-- lien de partage. La réservation est confirmée dès que le minimum de places
-- est payé (3 au Boho) ; seule une réservation confirmée tient sa bulle.
-- Plusieurs groupes peuvent donc viser la même bulle : le premier qui atteint
-- le minimum la prend, les autres passent sur une bulle encore libre du
-- créneau, et s'il n'en reste aucune, ce qu'ils ont payé est remboursé. Hors
-- de ce cas, rien ne s'annule ni ne se rembourse.
--
-- Arrivé dans la bulle, le groupe commande par le menu QR de sa table : la
-- commande n'y passe qu'une fois toutes les places du groupe payées, en ligne
-- ou à l'accueil.
--
-- Le paiement passe par la caisse du restaurant (Square au Boho), comme une
-- commande du menu, sans commission Ominin.
--
-- Rien n'est ouvert ici pour un établissement : les bulles le sont par ses
-- réglages (bulle_reglages) et la capacité « bulles ». Tant que le Boho ne les
-- a pas prises, elles vivent sur sa démonstration, boho-demo
-- (frontend/scripts/bulles-demo.ts) ; le vrai Boho n'en a rien.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Réglages, bulles, créneaux

-- Une ligne par établissement qui ouvre ses bulles à la réservation : sans
-- elle, rien n'est réservable.
create table public.bulle_reglages (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  place_cents int not null check (place_cents > 0),
  min_party smallint not null check (min_party between 1 and 40),
  max_party smallint not null check (max_party between 1 and 40),
  duration_minutes smallint not null check (duration_minutes between 15 and 720),
  -- Jusqu'à combien de jours à l'avance on réserve.
  booking_days smallint not null check (booking_days between 1 and 365),
  -- La TVA de la place, réglée comme celle d'un article de la carte (même
  -- défaut que items.vat_rate) : portée sur la vente envoyée en caisse.
  vat_rate numeric not null default 10 check (vat_rate >= 0 and vat_rate <= 100),
  constraint bulle_reglages_party check (min_party <= max_party)
);

create table public.bulles (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 30),
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  sort smallint not null default 0,
  -- Une bulle retirée ne se propose plus ; ses réservations restent.
  active boolean not null default true,
  -- La table du menu QR posée dans la bulle : on n'y commande qu'une fois
  -- toutes les places de la réservation payées (orders_bulle_payee).
  table_id uuid unique references public.tables (id) on delete set null,
  created_at timestamptz not null default now()
);

create index bulles_etablissement_idx on public.bulles (etablissement_id);

-- Un créneau : un jour de la semaine (ISO, 1 = lundi) et son heure de début
-- en minutes depuis minuit de ce jour. Au-delà de 24 h, il déborde sur la
-- nuit : 1440 est le minuit qui clôt la journée, 1560 deux heures du matin.
create table public.bulle_creneaux (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_minutes smallint not null check (start_minutes between 0 and 2879),
  constraint bulle_creneaux_unique unique (etablissement_id, weekday, start_minutes)
);

-- ---------------------------------------------------------------------------
-- Réservations et places payées

create type public.bulle_reservation_status as enum (
  'en_attente',
  'confirmee',
  'arrivee',
  'remboursee',
  'annulee'
);

create type public.bulle_reservation_source as enum ('en_ligne', 'telephone', 'sur_place');

create table public.bulle_reservations (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  bulle_id uuid not null references public.bulles (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- La page de réservation de l'organisateur, et le lien de ses amis.
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  share_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  name text not null check (length(btrim(name)) between 1 and 80),
  phone text check (phone is null or length(btrim(phone)) between 6 and 30),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  party_size smallint not null check (party_size between 1 and 40),
  -- Prix d'une place au moment de réserver.
  place_cents int not null check (place_cents > 0),
  -- Places réglées, en ligne ou sur place.
  places_paid smallint not null default 0,
  status public.bulle_reservation_status not null default 'en_attente',
  source public.bulle_reservation_source not null,
  note text check (note is null or length(note) <= 300),
  confirmed_at timestamptz,
  arrived_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bulle_reservations_creneau check (ends_at > starts_at),
  constraint bulle_reservations_contact check (
    source <> 'en_ligne' or (email is not null and phone is not null)
  ),
  constraint bulle_reservations_places check (places_paid between 0 and party_size),
  -- Une bulle n'est tenue que par une réservation confirmée, et par une
  -- seule à la fois.
  constraint bulle_reservations_occupee exclude using gist (
    bulle_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('confirmee', 'arrivee'))
);

create index bulle_reservations_etablissement_idx
  on public.bulle_reservations (etablissement_id, starts_at);
create index bulle_reservations_bulle_idx
  on public.bulle_reservations (bulle_id, starts_at);

create type public.bulle_part_status as enum ('en_attente', 'payee', 'remboursee', 'annulee');
create type public.bulle_part_method as enum ('en_ligne', 'sur_place');

-- Ce que chacun paie : une ou plusieurs places, en ligne, ou le reste réglé
-- sur place.
create table public.bulle_parts (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.bulle_reservations (id),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or length(btrim(phone)) between 6 and 30),
  organiser boolean not null default false,
  places smallint not null check (places between 1 and 40),
  amount_cents int not null check (amount_cents > 0),
  method public.bulle_part_method not null,
  status public.bulle_part_status not null default 'en_attente',
  -- Square : la commande et le paiement chez le restaurant, et la clé
  -- d'idempotence posée avant de débiter.
  square_order_id text unique,
  square_payment_id text unique,
  square_idempotency_key uuid,
  -- Posé quand Square a accepté le remboursement : une part « remboursee »
  -- payée en ligne sans lui reste à rembourser (passage périodique).
  square_refund_id text,
  -- Une part en cours de paiement réserve ses places jusque-là.
  hold_expires_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bulle_parts_sur_place check (method = 'en_ligne' or hold_expires_at is null)
);

create index bulle_parts_reservation_idx on public.bulle_parts (reservation_id);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Réglages, bulles et créneaux sont publics : la page de réservation les lit
-- sans session. Réservations et parts portent des coordonnées : l'équipe
-- seule les lit, le client passe par le serveur.

alter table public.bulle_reglages enable row level security;
alter table public.bulles enable row level security;
alter table public.bulle_creneaux enable row level security;
alter table public.bulle_reservations enable row level security;
alter table public.bulle_parts enable row level security;

create policy "public read" on public.bulle_reglages
  for select to anon, authenticated using (true);
create policy "gerant write" on public.bulle_reglages
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

create policy "public read" on public.bulles
  for select to anon, authenticated using (true);
create policy "gerant write" on public.bulles
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (
    public.current_member_role(etablissement_id) = 'gerant'
    and (table_id is null or exists (
      select 1 from public.tables t
      where t.id = table_id and t.etablissement_id = bulles.etablissement_id
    ))
  );

create policy "public read" on public.bulle_creneaux
  for select to anon, authenticated using (true);
create policy "gerant write" on public.bulle_creneaux
  for all to authenticated
  using (public.current_member_role(etablissement_id) = 'gerant')
  with check (public.current_member_role(etablissement_id) = 'gerant');

create policy "member read" on public.bulle_reservations
  for select to authenticated
  using (etablissement_id in (select public.member_etablissements()));
create policy "member read" on public.bulle_parts
  for select to authenticated
  using (etablissement_id in (select public.member_etablissements()));

alter table public.bulle_reservations replica identity full;
alter table public.bulle_parts replica identity full;
alter publication supabase_realtime add table public.bulle_reservations;
alter publication supabase_realtime add table public.bulle_parts;

-- ---------------------------------------------------------------------------
-- Créneaux et disponibilité

-- Début d'un créneau un soir donné, à l'heure de Paris.
create function public.bulle_debut(p_date date, p_start_minutes smallint)
returns timestamptz
language sql
stable
as $$
  select (p_date + make_interval(mins => p_start_minutes)) at time zone 'Europe/Paris';
$$;

-- Le soir dont p_starts_at est un début de créneau de l'établissement (un
-- créneau d'après minuit appartient à la veille) ; null s'il n'en est pas un.
create function public.bulle_soir(p_etab uuid, p_starts_at timestamptz)
returns date
language sql
stable
set search_path = public
as $$
  select ((p_starts_at at time zone 'Europe/Paris') - make_interval(mins => c.start_minutes))::date
  from bulle_creneaux c
  where c.etablissement_id = p_etab
    and extract(isodow from ((p_starts_at at time zone 'Europe/Paris')
      - make_interval(mins => c.start_minutes))::date) = c.weekday
    and bulle_debut(
      ((p_starts_at at time zone 'Europe/Paris') - make_interval(mins => c.start_minutes))::date,
      c.start_minutes
    ) = p_starts_at
  limit 1;
$$;

-- Un verrou par créneau d'un établissement, pris avant toute ligne : deux
-- groupes qui confirment ou délogent sur le même créneau passent l'un après
-- l'autre, sans interblocage.
create function public.bulle_verrou(p_etab uuid, p_starts_at timestamptz)
returns void
language sql
as $$
  select pg_advisory_xact_lock(hashtextextended(p_etab::text || '/' || p_starts_at::text, 0));
$$;

-- Vrai si la bulle est libre sur [p_starts_at, p_ends_at) : aucune
-- réservation confirmée ne la tient.
create function public.bulle_libre(p_bulle uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns boolean
language sql
stable
set search_path = public
as $$
  select not exists (
    select 1 from bulle_reservations r
    where r.bulle_id = p_bulle
      and r.status in ('confirmee', 'arrivee')
      and tstzrange(r.starts_at, r.ends_at) && tstzrange(p_starts_at, p_ends_at)
  );
$$;

revoke execute on function public.bulle_soir(uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.bulle_verrou(uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.bulle_libre(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;

-- Les créneaux d'un soir, bulle par bulle, pour la page publique : ceux qui
-- ne sont pas commencés, dans la fenêtre de réservation.
create function public.bulles_planning(p_etab uuid, p_date date)
returns table (starts_at timestamptz, ends_at timestamptz, bulle_id uuid, libre boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    bulle_debut(p_date, c.start_minutes),
    bulle_debut(p_date, c.start_minutes) + make_interval(mins => g.duration_minutes),
    b.id,
    bulle_libre(
      b.id,
      bulle_debut(p_date, c.start_minutes),
      bulle_debut(p_date, c.start_minutes) + make_interval(mins => g.duration_minutes)
    )
  from bulle_reglages g
  join bulle_creneaux c on c.etablissement_id = g.etablissement_id
  join bulles b on b.etablissement_id = g.etablissement_id and b.active
  where g.etablissement_id = p_etab
    and c.weekday = extract(isodow from p_date)
    and bulle_debut(p_date, c.start_minutes) > now()
    and p_date <= (now() at time zone 'Europe/Paris')::date + g.booking_days
  order by c.start_minutes, b.sort, b.name;
$$;

revoke execute on function public.bulles_planning(uuid, date) from public;
grant execute on function public.bulles_planning(uuid, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Réserver et payer en ligne
--
-- Appelées par le serveur (service_role) avec le délai de paiement : prix et
-- places sont relus ou bornés ici, jamais repris du client.

create function public.reserver_bulle(
  p_bulle uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text,
  p_party smallint,
  p_places smallint,
  p_hold_seconds int
)
returns table (reservation_id uuid, part_id uuid, token text, amount_cents int, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_bulle bulles;
  v_reglages bulle_reglages;
  v_soir date;
  v_ends timestamptz;
  v_reservation bulle_reservations;
  v_part bulle_parts;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
begin
  if p_hold_seconds is null or p_hold_seconds <= 0 then
    raise exception 'Délai de paiement invalide.';
  end if;
  select * into v_bulle from bulles where id = p_bulle;
  select * into v_reglages from bulle_reglages where etablissement_id = v_bulle.etablissement_id;
  if v_bulle.id is null or not v_bulle.active or v_reglages.etablissement_id is null then
    raise exception 'Bulle introuvable.';
  end if;
  -- La même fenêtre que bulles_planning : le soir du créneau, pas sa date
  -- civile (un créneau de minuit est celui de la veille).
  v_soir := bulle_soir(v_bulle.etablissement_id, p_starts_at);
  if p_starts_at <= now()
     or v_soir is null
     or v_soir > (now() at time zone 'Europe/Paris')::date + v_reglages.booking_days then
    raise exception 'Ce créneau n''est pas ouvert.';
  end if;
  if p_party is null or p_party < v_reglages.min_party or p_party > v_reglages.max_party then
    raise exception 'Une bulle accueille de % à % personnes.', v_reglages.min_party, v_reglages.max_party;
  end if;
  if p_places is null or p_places < 1 or p_places > p_party then
    raise exception 'Vous payez de 1 à % places.', p_party;
  end if;
  v_ends := p_starts_at + make_interval(mins => v_reglages.duration_minutes);
  if not bulle_libre(p_bulle, p_starts_at, v_ends) then
    raise exception '% vient d''être réservée sur ce créneau.', v_bulle.name;
  end if;

  -- Réserver à nouveau rend la réservation restée sans paiement sur le même
  -- créneau. La personne est reconnue à son e-mail ET à son téléphone : qui
  -- ne connaît que l'un des deux ne peut pas faire tomber celle d'un autre.
  with rendues as (
    update bulle_reservations
    set status = 'annulee', closed_at = now()
    where etablissement_id = v_bulle.etablissement_id
      and starts_at = p_starts_at
      and status = 'en_attente'
      and source = 'en_ligne'
      and places_paid = 0
      and email = lower(btrim(p_email))
      and phone = btrim(p_phone)
    returning id
  )
  update bulle_parts set status = 'annulee'
  where status = 'en_attente' and reservation_id in (select id from rendues);

  insert into bulle_reservations (
    etablissement_id, bulle_id, starts_at, ends_at, name, phone, email,
    party_size, place_cents, source
  ) values (
    v_bulle.etablissement_id, p_bulle, p_starts_at, v_ends, btrim(p_name),
    btrim(p_phone), lower(btrim(p_email)), p_party, v_reglages.place_cents, 'en_ligne'
  )
  returning * into v_reservation;

  insert into bulle_parts (
    reservation_id, etablissement_id, name, email, phone, organiser,
    places, amount_cents, method, hold_expires_at
  ) values (
    v_reservation.id, v_reservation.etablissement_id, v_reservation.name,
    v_reservation.email, v_reservation.phone, true,
    p_places, p_places * v_reservation.place_cents, 'en_ligne', v_hold
  )
  returning * into v_part;

  return query select v_reservation.id, v_part.id, v_reservation.token, v_part.amount_cents, v_hold;
end;
$$;

revoke execute on function public.reserver_bulle(uuid, timestamptz, text, text, text, smallint, smallint, int)
  from public, anon, authenticated;
grant execute on function public.reserver_bulle(uuid, timestamptz, text, text, text, smallint, smallint, int)
  to service_role;

-- Un ami paie une ou plusieurs places par le lien de l'organisateur, une fois
-- la première part payée et jusqu'à la fin du créneau : arrivé dans la
-- bulle, le groupe paie ce qui manque pour pouvoir commander.
create function public.contribuer_bulle(
  p_share_token text,
  p_name text,
  p_phone text,
  p_email text,
  p_places smallint,
  p_hold_seconds int
)
returns table (reservation_id uuid, part_id uuid, amount_cents int, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_reservation bulle_reservations;
  v_left int;
  v_part bulle_parts;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
begin
  if p_hold_seconds is null or p_hold_seconds <= 0 then
    raise exception 'Délai de paiement invalide.';
  end if;
  -- Une part à la fois par réservation : les places se comptent sans course.
  select * into v_reservation from bulle_reservations
  where share_token = p_share_token for update;
  if v_reservation.id is null then
    raise exception 'Lien de partage introuvable.';
  end if;
  if v_reservation.status not in ('en_attente', 'confirmee', 'arrivee') then
    raise exception 'Cette réservation est close.';
  end if;
  if v_reservation.places_paid = 0 then
    raise exception 'L''organisateur n''a pas encore payé sa place.';
  end if;
  if v_reservation.ends_at <= now() then
    raise exception 'Le créneau est terminé.';
  end if;

  -- Une part en cours par personne : recommencer rend la précédente.
  update bulle_parts set status = 'annulee'
  where reservation_id = v_reservation.id
    and status = 'en_attente'
    and email = lower(btrim(p_email))
    and phone = btrim(p_phone);

  -- Seules les places payées comptent : une part en cours ne retient rien,
  -- sans quoi des parts ouvertes à la chaîne bloqueraient le groupe. Deux
  -- amis qui paient la dernière place au même instant : le second est
  -- remboursé (regler_part_bulle).
  v_left := v_reservation.party_size - v_reservation.places_paid;
  if v_left <= 0 then
    raise exception 'Toutes les places sont prises.';
  end if;
  if p_places is null or p_places < 1 or p_places > v_left then
    raise exception 'Vous payez de 1 à % places.', v_left;
  end if;

  insert into bulle_parts (
    reservation_id, etablissement_id, name, email, phone, organiser,
    places, amount_cents, method, hold_expires_at
  ) values (
    v_reservation.id, v_reservation.etablissement_id, btrim(p_name),
    lower(btrim(p_email)), btrim(p_phone), false,
    p_places, p_places * v_reservation.place_cents, 'en_ligne', v_hold
  )
  returning * into v_part;

  return query select v_reservation.id, v_part.id, v_part.amount_cents, v_hold;
end;
$$;

revoke execute on function public.contribuer_bulle(text, text, text, text, smallint, int)
  from public, anon, authenticated;
grant execute on function public.contribuer_bulle(text, text, text, text, smallint, int)
  to service_role;

-- La commande Square de la part et la clé d'idempotence du paiement, posées
-- avant de débiter : une relance réseau réutilise la clé et ne débite pas
-- deux fois. Renouvelée à chaque essai du client, qui revient avec un jeton
-- carte neuf. La même écriture revendique la part : fermée entre-temps, elle
-- n'est pas débitée.
create function public.commencer_part_square(p_part uuid, p_key uuid, p_square_order text)
returns boolean
language sql
security definer
set search_path = public
as $$
  update bulle_parts
  set square_idempotency_key = p_key,
      square_order_id = coalesce(square_order_id, p_square_order)
  where id = p_part and status = 'en_attente' and method = 'en_ligne'
  returning true;
$$;

revoke execute on function public.commencer_part_square(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.commencer_part_square(uuid, uuid, text) to service_role;

-- Ferme une réservation qui ne tiendra pas : remboursée si quelqu'un a payé
-- en ligne, annulée sinon. Rend ses parts payées en ligne, à rembourser.
create function public.bulle_fermer(p_reservation uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parts uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_parts
  from bulle_parts
  where reservation_id = p_reservation and method = 'en_ligne' and status = 'payee';
  update bulle_reservations
  set status = case when cardinality(v_parts) > 0 then 'remboursee' else 'annulee' end::bulle_reservation_status,
      closed_at = now()
  where id = p_reservation and status in ('en_attente', 'confirmee', 'arrivee');
  update bulle_parts set status = 'annulee'
  where reservation_id = p_reservation and status = 'en_attente';
  return v_parts;
end;
$$;

revoke execute on function public.bulle_fermer(uuid) from public, anon, authenticated;

-- Une réservation en attente, dont la bulle vient d'être prise, passe sur
-- une autre bulle libre du créneau. Rend faux s'il n'en reste aucune.
create function public.bulle_replacer(p_reservation uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation bulle_reservations;
  v_bulle uuid;
begin
  select * into v_reservation from bulle_reservations where id = p_reservation;
  select b.id into v_bulle
  from bulles b
  where b.etablissement_id = v_reservation.etablissement_id
    and b.active
    and b.id <> v_reservation.bulle_id
    and bulle_libre(b.id, v_reservation.starts_at, v_reservation.ends_at)
  -- La bulle que le moins de groupes visent : moins de chances d'être
  -- délogé une seconde fois.
  order by (
    select count(*) from bulle_reservations o
    where o.bulle_id = b.id and o.status = 'en_attente'
      and o.starts_at = v_reservation.starts_at
  ), b.sort, b.name
  limit 1;
  if v_bulle is null then
    return false;
  end if;
  update bulle_reservations set bulle_id = v_bulle where id = p_reservation;
  return true;
end;
$$;

revoke execute on function public.bulle_replacer(uuid) from public, anon, authenticated;

-- Confirme une réservation en attente sur sa bulle, ou sur une autre libre
-- du créneau si la sienne a été prise ou retirée. Faux s'il n'en reste
-- aucune. L'appelant tient le verrou du créneau (bulle_verrou) ; la
-- contrainte d'exclusion reste le dernier mot si un créneau voisin
-- chevauche celui-ci.
create function public.bulle_prendre(p_reservation uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation bulle_reservations;
  v_tries int;
begin
  select * into v_reservation from bulle_reservations where id = p_reservation;
  select count(*) into v_tries from bulles where etablissement_id = v_reservation.etablissement_id;
  loop
    if v_tries <= 0
       or (not (
             bulle_libre(v_reservation.bulle_id, v_reservation.starts_at, v_reservation.ends_at)
             and exists (select 1 from bulles where id = v_reservation.bulle_id and active)
           )
         and not bulle_replacer(p_reservation)) then
      return false;
    end if;
    begin
      update bulle_reservations
      set status = 'confirmee', confirmed_at = now()
      where id = p_reservation;
      return true;
    exception when exclusion_violation then
      v_tries := v_tries - 1;
      select * into v_reservation from bulle_reservations where id = p_reservation;
    end;
  end loop;
end;
$$;

-- Une réservation vient de tenir sa bulle : les groupes en attente qui la
-- visaient sur le même créneau passent sur une autre bulle libre, ou sont
-- fermés s'il n'en reste plus. Rend leurs parts payées, à rembourser
-- (l'appelant qui ne peut pas rembourser les laisse au passage périodique).
create function public.bulle_deloger(p_reservation uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation bulle_reservations;
  v_other uuid;
  v_refunds uuid[] := '{}';
begin
  select * into v_reservation from bulle_reservations where id = p_reservation;
  for v_other in
    select o.id from bulle_reservations o
    where o.bulle_id = v_reservation.bulle_id
      and o.id <> p_reservation
      and o.status = 'en_attente'
      and tstzrange(o.starts_at, o.ends_at) && tstzrange(v_reservation.starts_at, v_reservation.ends_at)
    for update
  loop
    if not bulle_replacer(v_other) then
      v_refunds := v_refunds || bulle_fermer(v_other);
    end if;
  end loop;
  return v_refunds;
end;
$$;

-- Confirme une réservation qui atteint le minimum de places payées et
-- déloge les groupes qui visaient sa bulle ; sans bulle libre, elle est
-- fermée. Rend les parts à rembourser (les siennes, ou celles des groupes
-- fermés).
create function public.bulle_confirmer(p_reservation uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
begin
  if not bulle_prendre(p_reservation) then
    return bulle_fermer(p_reservation);
  end if;
  return bulle_deloger(p_reservation);
end;
$$;

revoke execute on function public.bulle_prendre(uuid) from public, anon, authenticated;
revoke execute on function public.bulle_deloger(uuid) from public, anon, authenticated;
revoke execute on function public.bulle_confirmer(uuid) from public, anon, authenticated;

-- Un paiement en ligne abouti (Square ou démonstration), p_amount étant ce
-- que Square a réellement encaissé. La part est comptée ; au minimum de
-- places, la réservation se confirme. Rend { outcome, confirmed, reason,
-- refunds } : outcome « refund » quand la part ne peut plus compter — reason
-- « closed » (réservation close, plus de bulle), « full » (places déjà toutes
-- payées), « mismatch » (montant ou paiement différent) ; l'application la
-- rembourse, ainsi que chaque part de refunds.
create function public.regler_part_bulle(p_part uuid, p_square_payment text, p_amount int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part bulle_parts;
  v_reservation bulle_reservations;
  v_min smallint;
  v_reason text;
  v_refunds uuid[] := '{}';
begin
  select * into v_part from bulle_parts where id = p_part;
  if v_part.id is null then
    return jsonb_build_object('outcome', 'refund', 'reason', 'mismatch', 'confirmed', false, 'refunds', '[]'::jsonb);
  end if;
  select * into v_reservation from bulle_reservations where id = v_part.reservation_id;
  perform bulle_verrou(v_reservation.etablissement_id, v_reservation.starts_at);
  select * into v_reservation from bulle_reservations where id = v_part.reservation_id for update;
  select * into v_part from bulle_parts where id = p_part;

  if v_part.status = 'payee' then
    return jsonb_build_object(
      'outcome', case when v_part.square_payment_id is not distinct from p_square_payment
        then 'already_paid' else 'refund' end,
      'reason', 'mismatch',
      'confirmed', v_reservation.status in ('confirmee', 'arrivee'),
      'refunds', '[]'::jsonb
    );
  end if;
  v_reason := case
    when v_part.status not in ('en_attente', 'annulee')
      or v_reservation.status not in ('en_attente', 'confirmee', 'arrivee') then 'closed'
    -- Une part abandonnée (le client a recommencé) dont le débit arrive
    -- quand même : elle ne compte plus.
    when v_part.status = 'annulee' then 'mismatch'
    when p_amount is distinct from v_part.amount_cents then 'mismatch'
    when v_reservation.places_paid + v_part.places > v_reservation.party_size then 'full'
  end;
  if v_reason is not null then
    -- Marquée rendue avant que l'application ne rembourse le paiement ; le
    -- passage périodique rejoue tout remboursement sans réponse de Square.
    update bulle_parts
    set status = 'remboursee', refunded_at = now(), square_payment_id = p_square_payment
    where id = p_part and status in ('en_attente', 'annulee');
    return jsonb_build_object('outcome', 'refund', 'reason', v_reason, 'confirmed', false, 'refunds', '[]'::jsonb);
  end if;

  update bulle_parts
  set status = 'payee', paid_at = now(), hold_expires_at = null,
      square_payment_id = p_square_payment
  where id = p_part;
  update bulle_reservations
  set places_paid = places_paid + v_part.places
  where id = v_reservation.id
  returning * into v_reservation;

  select min_party into v_min from bulle_reglages where etablissement_id = v_reservation.etablissement_id;
  if v_reservation.status = 'en_attente' and v_reservation.places_paid >= v_min then
    v_refunds := bulle_confirmer(v_reservation.id);
    select * into v_reservation from bulle_reservations where id = v_reservation.id;
  end if;

  return jsonb_build_object(
    'outcome', 'paid',
    'reason', case when v_reservation.status = 'remboursee' then 'closed' end,
    'confirmed', v_reservation.status in ('confirmee', 'arrivee'),
    'refunds', to_jsonb(v_refunds)
  );
end;
$$;

revoke execute on function public.regler_part_bulle(uuid, text, int) from public, anon, authenticated;
grant execute on function public.regler_part_bulle(uuid, text, int) to service_role;

-- Remboursement d'une part payée en ligne, marqué AVANT l'appel à Square ;
-- null si elle ne l'était plus. Seule une part d'une réservation fermée se
-- rend : rien d'autre ne se rembourse. Le remboursement n'est acquis qu'avec
-- square_refund_id : jusque-là, le passage périodique le rejoue (même clé
-- d'idempotence chez Square, jamais deux remboursements).
create function public.bulle_rembourser_part(p_part uuid)
returns public.bulle_parts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part bulle_parts;
begin
  update bulle_parts p
  set status = 'remboursee', refunded_at = now()
  where p.id = p_part and p.status = 'payee' and p.method = 'en_ligne'
    and exists (
      select 1 from bulle_reservations r
      where r.id = p.reservation_id and r.status in ('remboursee', 'annulee')
    )
  returning * into v_part;
  if v_part.id is not null then
    update bulle_reservations set places_paid = places_paid - v_part.places
    where id = v_part.reservation_id;
  end if;
  return v_part;
end;
$$;

revoke execute on function public.bulle_rembourser_part(uuid) from public, anon, authenticated;
grant execute on function public.bulle_rembourser_part(uuid) to service_role;

-- Passage périodique (route /api/bulles/expire) : une réservation en ligne
-- restée sans aucun paiement, toutes ses parts expirées, est annulée — elle
-- n'encombre plus le planning de l'accueil. Rend le nombre d'annulées. Une
-- réservation qui a des places payées reste ouverte : le groupe paie le reste
-- dans la bulle, rien ne lui est rendu.
create function public.bulles_expirer()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation uuid;
  v_count int := 0;
begin
  for v_reservation in
    select r.id from bulle_reservations r
    where r.status = 'en_attente'
      and r.source = 'en_ligne'
      and r.places_paid = 0
      and not exists (
        select 1 from bulle_parts p
        where p.reservation_id = r.id
          and p.status = 'en_attente'
          and (p.hold_expires_at > now() or p.square_idempotency_key is not null)
      )
    for update skip locked
  loop
    perform bulle_fermer(v_reservation);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.bulles_expirer() from public, anon, authenticated;
grant execute on function public.bulles_expirer() to service_role;

-- ---------------------------------------------------------------------------
-- Commander depuis la bulle

-- La réservation qui occupe la bulle maintenant ou au prochain créneau du
-- soir : confirmée d'abord, sinon la seule en attente qui la vise.
create function public.bulle_reservation_courante(p_bulle uuid)
returns public.bulle_reservations
language sql
stable
security definer
set search_path = public
as $$
  select r.* from bulle_reservations r
  where r.bulle_id = p_bulle
    and r.status in ('en_attente', 'confirmee', 'arrivee')
    and r.ends_at > now()
    and (r.status <> 'en_attente' or (
      select count(*) from bulle_reservations o
      where o.bulle_id = p_bulle and o.status = 'en_attente'
        and o.starts_at = r.starts_at
    ) = 1)
  order by r.starts_at, r.status = 'en_attente'
  limit 1;
$$;

revoke execute on function public.bulle_reservation_courante(uuid) from public, anon, authenticated;

-- On commande depuis la bulle une fois toutes les places payées et le
-- créneau commencé. Avant, la table reste fermée au client ; l'équipe peut
-- toujours commander pour elle.
create function public.bulle_commande_ouverte(p_reservation public.bulle_reservations)
returns boolean
language sql
stable
as $$
  select p_reservation.id is not null
    and p_reservation.status in ('confirmee', 'arrivee')
    and p_reservation.places_paid >= p_reservation.party_size
    and p_reservation.starts_at <= now();
$$;

-- Ce que le menu QR de la table montre : rien si la table n'est pas une
-- bulle ; sinon la bulle, la réservation en cours et ce qui manque pour
-- commander. Le lien de partage n'est donné qu'à qui est assis dans la bulle
-- pendant le créneau (ou une fois l'arrivée cochée) : c'est par lui que le
-- groupe paie ses dernières places. Avant, un numéro de table tapé au hasard
-- ne l'ouvre pas.
create function public.bulle_table_etat(p_slug text, p_table int)
returns table (
  bulle_name text,
  bulle_color text,
  ordering boolean,
  reservation_status public.bulle_reservation_status,
  starts_at timestamptz,
  ends_at timestamptz,
  party_size smallint,
  places_paid smallint,
  share_token text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bulle bulles;
  v_reservation bulle_reservations;
begin
  select b.* into v_bulle
  from bulles b
  join tables t on t.id = b.table_id
  join etablissements e on e.id = t.etablissement_id
  where e.slug = p_slug and t.number = p_table;
  if v_bulle.id is null then
    return;
  end if;
  v_reservation := bulle_reservation_courante(v_bulle.id);
  return query select
    v_bulle.name,
    v_bulle.color,
    bulle_commande_ouverte(v_reservation),
    v_reservation.status,
    v_reservation.starts_at,
    v_reservation.ends_at,
    v_reservation.party_size,
    v_reservation.places_paid,
    case when v_reservation.starts_at <= now() or v_reservation.status = 'arrivee'
      then v_reservation.share_token end;
end;
$$;

revoke execute on function public.bulle_table_etat(text, int) from public;
grant execute on function public.bulle_table_etat(text, int) to anon, authenticated;

-- Le verrou du menu QR, en base : une commande de client sur la table d'une
-- bulle n'est acceptée qu'une fois toutes les places payées. L'équipe, elle,
-- commande pour la table quand elle veut.
create function public.orders_bulle_payee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bulle uuid;
begin
  select id into v_bulle from bulles where table_id = new.table_id;
  if v_bulle is null or current_member_role(new.etablissement_id) is not null then
    return new;
  end if;
  if not bulle_commande_ouverte(bulle_reservation_courante(v_bulle)) then
    raise exception 'Pour commander depuis la bulle, toutes les places du groupe doivent être payées.';
  end if;
  return new;
end;
$$;

create trigger orders_bulle_payee
  before insert on public.orders
  for each row
  when (new.table_id is not null)
  execute function public.orders_bulle_payee();

-- ---------------------------------------------------------------------------
-- Côté restaurant

-- Réservation prise au téléphone ou sur place : confirmée d'emblée, réglée
-- sur place. Comme une confirmation en ligne, elle déloge les groupes en
-- attente qui visaient la bulle ; ceux qui n'ont plus de bulle sont fermés
-- et remboursés par le passage périodique.
create function public.creer_reservation_bulle(
  p_bulle uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_party smallint,
  p_source public.bulle_reservation_source,
  p_note text
)
returns public.bulle_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bulle bulles;
  v_reglages bulle_reglages;
  v_reservation bulle_reservations;
begin
  if p_source = 'en_ligne' then
    raise exception 'Source invalide.';
  end if;
  select * into v_bulle from bulles where id = p_bulle;
  if v_bulle.id is null
     or current_member_role(v_bulle.etablissement_id) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  select * into v_reglages from bulle_reglages where etablissement_id = v_bulle.etablissement_id;
  if v_reglages.etablissement_id is null then
    raise exception 'Les bulles ne sont pas ouvertes.';
  end if;
  if p_party is null or p_party < 1 or p_party > v_reglages.max_party then
    raise exception 'Une bulle accueille % personnes au plus.', v_reglages.max_party;
  end if;
  perform bulle_verrou(v_bulle.etablissement_id, p_starts_at);
  begin
    insert into bulle_reservations (
      etablissement_id, bulle_id, starts_at, ends_at, name, phone, party_size,
      place_cents, status, source, note, confirmed_at
    ) values (
      v_bulle.etablissement_id, p_bulle, p_starts_at,
      p_starts_at + make_interval(mins => v_reglages.duration_minutes),
      btrim(p_name), nullif(btrim(p_phone), ''), p_party, v_reglages.place_cents,
      'confirmee', p_source, nullif(btrim(p_note), ''), now()
    )
    returning * into v_reservation;
  exception when exclusion_violation then
    raise exception '% est déjà réservée sur ce créneau.', v_bulle.name;
  end;
  perform bulle_deloger(v_reservation.id);
  return v_reservation;
end;
$$;

revoke execute on function public.creer_reservation_bulle(
  uuid, timestamptz, text, text, smallint, public.bulle_reservation_source, text
) from public, anon;
grant execute on function public.creer_reservation_bulle(
  uuid, timestamptz, text, text, smallint, public.bulle_reservation_source, text
) to authenticated;

-- L'équipe coche une arrivée, ou la décoche. p_paid : les places restantes
-- sont encaissées sur place à cet instant. Un groupe encore en attente qui
-- règle tout à l'accueil est confirmé du même geste, si sa bulle (ou une
-- autre du créneau) est libre.
create function public.bulle_marquer_arrivee(p_reservation uuid, p_arrived boolean, p_paid boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation bulle_reservations;
  v_left int;
begin
  select * into v_reservation from bulle_reservations where id = p_reservation;
  if v_reservation.id is null
     or current_member_role(v_reservation.etablissement_id) is null then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  perform bulle_verrou(v_reservation.etablissement_id, v_reservation.starts_at);
  select * into v_reservation from bulle_reservations where id = p_reservation for update;
  if v_reservation.status = 'en_attente' and not p_paid then
    raise exception 'Pas encore confirmée : encaissez les places restantes.';
  end if;
  if v_reservation.status not in ('en_attente', 'confirmee', 'arrivee') then
    raise exception 'Cette réservation est close.';
  end if;
  v_left := v_reservation.party_size - v_reservation.places_paid;
  if p_paid and v_left > 0 then
    insert into bulle_parts (
      reservation_id, etablissement_id, name, phone, organiser,
      places, amount_cents, method, status, paid_at
    ) values (
      v_reservation.id, v_reservation.etablissement_id, v_reservation.name,
      v_reservation.phone, true, v_left, v_left * v_reservation.place_cents,
      'sur_place', 'payee', now()
    );
  end if;
  update bulle_reservations
  set places_paid = case when p_paid then party_size else places_paid end
  where id = p_reservation;
  if v_reservation.status = 'en_attente' then
    if not bulle_prendre(p_reservation) then
      raise exception 'Plus aucune bulle libre sur ce créneau.';
    end if;
    -- Les groupes délogés sans bulle sont remboursés par le passage périodique.
    perform bulle_deloger(p_reservation);
  end if;
  update bulle_reservations
  set status = case when p_arrived then 'arrivee' else 'confirmee' end::bulle_reservation_status,
      arrived_at = case when p_arrived then coalesce(arrived_at, now()) end
  where id = p_reservation;
end;
$$;

revoke execute on function public.bulle_marquer_arrivee(uuid, boolean, boolean) from public, anon;
grant execute on function public.bulle_marquer_arrivee(uuid, boolean, boolean) to authenticated;

-- Annule une réservation prise au téléphone ou sur place. Une réservation
-- payée en ligne ne s'annule pas.
create function public.bulle_annuler_reservation(p_reservation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation bulle_reservations;
begin
  select * into v_reservation from bulle_reservations where id = p_reservation for update;
  if v_reservation.id is null
     or current_member_role(v_reservation.etablissement_id) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if exists (
    select 1 from bulle_parts
    where reservation_id = p_reservation and method = 'en_ligne' and status = 'payee'
  ) then
    raise exception 'Payée en ligne : elle ne s''annule pas.';
  end if;
  update bulle_reservations
  set status = 'annulee', closed_at = now()
  where id = p_reservation and status in ('en_attente', 'confirmee', 'arrivee');
  update bulle_parts set status = 'annulee'
  where reservation_id = p_reservation and status = 'en_attente';
end;
$$;

revoke execute on function public.bulle_annuler_reservation(uuid) from public, anon;
grant execute on function public.bulle_annuler_reservation(uuid) to authenticated;
