-- Les réservations du Boho, telles que son gérant les veut :
--
-- - Deux prix selon la taille du groupe. Sous le seuil (group_threshold), le
--   tarif du petit groupe (small_group_place_cents, nul = pas de tarif distinct)
--   et tout le groupe paie pour tenir la bulle ; à partir du seuil, le prix de
--   la place, et la bulle est tenue à ce nombre de places payées. Le prix se
--   calcule ici et reste figé sur la réservation. Sur la démonstration comme au
--   Boho : 14,90 € la place à 2, 9,90 € dès 3, de 2 à 8 personnes.
-- - Une réservation prise en gestion suit les mêmes bornes et les mêmes prix.
-- - La Rouge n'existe pas au Boho : retirée.
-- - Créneaux : 19 h, 21 h et 23 h tous les soirs, plus 1 h la nuit du samedi.
-- - Ce qui s'encaisse sur place dit son mode (carte sur le TPE du restaurant,
--   espèces) ; Ominin l'enregistre, sans appeler Square.
-- - Le QR de la bulle fait payer le reste, 0 place payée comprise, sans jamais
--   donner le lien de partage : sa page porte le nom de l'organisateur.

-- Avant toute écriture. Sur la démonstration, rien n'est vraiment payé : sa
-- Rouge se retire simplement, ses réservations restent.
do $$
begin
  if exists (
    select 1 from bulle_reservations r
    join bulles b on b.id = r.bulle_id
    join etablissements e on e.id = b.etablissement_id
    where e.slug = 'boho'
      and b.name = 'La Rouge'
      and r.ends_at > now()
      and (r.status in ('confirmee', 'arrivee') or (r.status = 'en_attente' and r.places_paid > 0))
  ) then
    raise exception 'La Rouge du Boho a une réservation payée à venir : rien n''est changé.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Réglages et mode d'encaissement

alter table public.bulle_reglages
  add column small_group_place_cents int check (small_group_place_cents > 0),
  add column group_threshold smallint;

update public.bulle_reglages set group_threshold = min_party;

alter table public.bulle_reglages
  alter column group_threshold set not null,
  add constraint bulle_reglages_group_threshold
    check (group_threshold >= 1 and group_threshold <= max_party);

create type public.bulle_part_tender as enum ('carte', 'especes');

alter table public.bulle_parts
  add column tender public.bulle_part_tender,
  add constraint bulle_parts_tender check (method = 'sur_place' or tender is null);

-- Le prix d'une place pour un groupe de cette taille.
create function public.bulle_prix_place(p_reglages public.bulle_reglages, p_party smallint)
returns int
language sql
immutable
as $$
  select case when p_party < (p_reglages).group_threshold
    then coalesce((p_reglages).small_group_place_cents, (p_reglages).place_cents)
    else (p_reglages).place_cents
  end;
$$;

-- Les places payées qui confirment un groupe de cette taille.
create function public.bulle_places_confirmation(p_reglages public.bulle_reglages, p_party smallint)
returns smallint
language sql
immutable
as $$
  select least(p_party, (p_reglages).group_threshold);
$$;

revoke execute on function public.bulle_prix_place(public.bulle_reglages, smallint)
  from public, anon, authenticated;
revoke execute on function public.bulle_places_confirmation(public.bulle_reglages, smallint)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Réserver en ligne

create or replace function public.reserver_bulle(
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
    btrim(p_phone), lower(btrim(p_email)), p_party, bulle_prix_place(v_reglages, p_party), 'en_ligne'
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

-- Comme avant, à une différence près : une réservation prise en gestion est
-- confirmée sans place payée, le groupe peut donc payer dès la première place.
-- Seul un groupe en ligne dont l'organisateur n'a pas payé reste fermé.
create or replace function public.contribuer_bulle(
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
  if v_reservation.status = 'en_attente' and v_reservation.places_paid = 0 then
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

-- Le seuil de confirmation suit la taille du groupe.
create or replace function public.regler_part_bulle(p_part uuid, p_square_payment text, p_amount int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part bulle_parts;
  v_reservation bulle_reservations;
  v_reglages bulle_reglages;
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

  select * into v_reglages from bulle_reglages where etablissement_id = v_reservation.etablissement_id;
  if v_reservation.status = 'en_attente'
     and v_reservation.places_paid >= bulle_places_confirmation(v_reglages, v_reservation.party_size) then
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

-- ---------------------------------------------------------------------------
-- Côté restaurant

drop function public.creer_reservation_bulle(
  uuid, timestamptz, text, text, smallint, public.bulle_reservation_source, text
);

-- Réservation prise au téléphone ou sur place : confirmée d'emblée, aux mêmes
-- bornes et aux mêmes prix qu'en ligne. p_tender : le groupe règle tout de
-- suite, sinon il paiera plus tard. Comme une confirmation en ligne, elle
-- déloge les groupes en attente qui visaient la bulle ; ceux qui n'ont plus de
-- bulle sont fermés et remboursés par le passage périodique.
create function public.creer_reservation_bulle(
  p_bulle uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_party smallint,
  p_source public.bulle_reservation_source,
  p_note text,
  p_tender public.bulle_part_tender default null
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
     or (current_member_role(v_bulle.etablissement_id) is distinct from 'gerant'
         and not bulle_demo_service(v_bulle.etablissement_id)) then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  select * into v_reglages from bulle_reglages where etablissement_id = v_bulle.etablissement_id;
  if v_reglages.etablissement_id is null then
    raise exception 'Les bulles ne sont pas ouvertes.';
  end if;
  if p_party is null or p_party < v_reglages.min_party or p_party > v_reglages.max_party then
    raise exception 'Une bulle accueille de % à % personnes.', v_reglages.min_party, v_reglages.max_party;
  end if;
  perform bulle_verrou(v_bulle.etablissement_id, p_starts_at);
  begin
    insert into bulle_reservations (
      etablissement_id, bulle_id, starts_at, ends_at, name, phone, party_size,
      place_cents, places_paid, status, source, note, confirmed_at
    ) values (
      v_bulle.etablissement_id, p_bulle, p_starts_at,
      p_starts_at + make_interval(mins => v_reglages.duration_minutes),
      btrim(p_name), nullif(btrim(p_phone), ''), p_party, bulle_prix_place(v_reglages, p_party),
      case when p_tender is null then 0 else p_party end,
      'confirmee', p_source, nullif(btrim(p_note), ''), now()
    )
    returning * into v_reservation;
  exception when exclusion_violation then
    raise exception '% est déjà réservée sur ce créneau.', v_bulle.name;
  end;
  if p_tender is not null then
    insert into bulle_parts (
      reservation_id, etablissement_id, name, phone, organiser,
      places, amount_cents, method, tender, status, paid_at
    ) values (
      v_reservation.id, v_reservation.etablissement_id, v_reservation.name,
      v_reservation.phone, true, p_party, p_party * v_reservation.place_cents,
      'sur_place', p_tender, 'payee', now()
    );
  end if;
  perform bulle_deloger(v_reservation.id);
  return v_reservation;
end;
$$;

revoke execute on function public.creer_reservation_bulle(
  uuid, timestamptz, text, text, smallint, public.bulle_reservation_source, text, public.bulle_part_tender
) from public, anon;
grant execute on function public.creer_reservation_bulle(
  uuid, timestamptz, text, text, smallint, public.bulle_reservation_source, text, public.bulle_part_tender
) to authenticated, service_role;

drop function public.bulle_marquer_arrivee(uuid, boolean, boolean);

-- L'équipe coche une arrivée, ou la décoche. p_tender : les places restantes
-- sont encaissées sur place à cet instant, de cette façon. Un groupe encore en
-- attente qui règle tout à l'accueil est confirmé du même geste, si sa bulle
-- (ou une autre du créneau) est libre.
create function public.bulle_marquer_arrivee(
  p_reservation uuid,
  p_arrived boolean,
  p_tender public.bulle_part_tender default null
)
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
     or (current_member_role(v_reservation.etablissement_id) is null
         and not bulle_demo_service(v_reservation.etablissement_id)) then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  perform bulle_verrou(v_reservation.etablissement_id, v_reservation.starts_at);
  select * into v_reservation from bulle_reservations where id = p_reservation for update;
  if v_reservation.status = 'en_attente' and p_tender is null then
    raise exception 'Pas encore confirmée : encaissez les places restantes.';
  end if;
  if v_reservation.status not in ('en_attente', 'confirmee', 'arrivee') then
    raise exception 'Cette réservation est close.';
  end if;
  v_left := v_reservation.party_size - v_reservation.places_paid;
  if p_tender is not null and v_left > 0 then
    insert into bulle_parts (
      reservation_id, etablissement_id, name, phone, organiser,
      places, amount_cents, method, tender, status, paid_at
    ) values (
      v_reservation.id, v_reservation.etablissement_id, v_reservation.name,
      v_reservation.phone, true, v_left, v_left * v_reservation.place_cents,
      'sur_place', p_tender, 'payee', now()
    );
  end if;
  update bulle_reservations
  set places_paid = case when p_tender is not null then party_size else places_paid end
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

revoke execute on function public.bulle_marquer_arrivee(uuid, boolean, public.bulle_part_tender)
  from public, anon;
grant execute on function public.bulle_marquer_arrivee(uuid, boolean, public.bulle_part_tender)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Le QR de la table d'une bulle

-- La réservation concerne-t-elle ceux qui sont à la table ? Le groupe est
-- arrivé, ou son créneau commence dans moins d'un créneau. Plus loin, la bulle
-- n'est pas la leur : personne ne doit payer une réservation d'un autre soir.
create function public.bulle_table_proche(p_reservation public.bulle_reservations)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_reservation.id is not null and (
    p_reservation.status = 'arrivee'
    or p_reservation.starts_at <= now() + (
      select make_interval(mins => g.duration_minutes) from bulle_reglages g
      where g.etablissement_id = p_reservation.etablissement_id
    )
  );
$$;

-- Le reste peut-il se payer depuis la table ? Pas quand un organisateur en
-- ligne n'a encore rien payé : sa réservation peut s'évaporer.
create function public.bulle_table_payable(p_reservation public.bulle_reservations)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select bulle_table_proche(p_reservation)
    and p_reservation.places_paid < p_reservation.party_size
    and not (p_reservation.status = 'en_attente' and p_reservation.places_paid = 0);
$$;

-- La bulle posée sur une table.
create function public.bulle_de_table(p_slug text, p_table int)
returns public.bulles
language sql
stable
security definer
set search_path = public
as $$
  select b.* from bulles b
  join tables t on t.id = b.table_id
  join etablissements e on e.id = t.etablissement_id
  where e.slug = p_slug and t.number = p_table;
$$;

revoke execute on function public.bulle_table_proche(public.bulle_reservations)
  from public, anon, authenticated;
revoke execute on function public.bulle_table_payable(public.bulle_reservations)
  from public, anon, authenticated;
revoke execute on function public.bulle_de_table(text, int)
  from public, anon, authenticated;

drop function public.bulle_table_etat(text, int);

-- Ce que le menu QR de la table montre : rien si la table n'est pas une bulle ;
-- sinon la bulle, la réservation qui concerne la table et ce qu'il y reste à
-- payer. Ni nom, ni téléphone, ni lien de partage : cette lecture est publique.
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
  place_cents int,
  can_pay boolean
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
  v_bulle := bulle_de_table(p_slug, p_table);
  if v_bulle.id is null then
    return;
  end if;
  v_reservation := bulle_reservation_courante(v_bulle.id);
  if not bulle_table_proche(v_reservation) then
    v_reservation := null;
  end if;
  return query select
    v_bulle.name,
    v_bulle.color,
    bulle_commande_ouverte(v_reservation),
    v_reservation.status,
    v_reservation.starts_at,
    v_reservation.ends_at,
    v_reservation.party_size,
    v_reservation.places_paid,
    v_reservation.place_cents,
    coalesce(bulle_table_payable(v_reservation), false);
end;
$$;

revoke execute on function public.bulle_table_etat(text, int) from public;
grant execute on function public.bulle_table_etat(text, int) to anon, authenticated;

-- La clé de paiement de la réservation d'une table, pour le serveur seul : elle
-- ne part jamais au navigateur. Null si le reste ne se paie pas depuis la table.
create function public.bulle_table_partage(p_slug text, p_table int)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bulle bulles;
  v_reservation bulle_reservations;
begin
  v_bulle := bulle_de_table(p_slug, p_table);
  if v_bulle.id is null then
    return null;
  end if;
  v_reservation := bulle_reservation_courante(v_bulle.id);
  return case when bulle_table_payable(v_reservation) then v_reservation.share_token end;
end;
$$;

revoke execute on function public.bulle_table_partage(text, int) from public, anon, authenticated;
grant execute on function public.bulle_table_partage(text, int) to service_role;

-- ---------------------------------------------------------------------------
-- Le Boho et sa démonstration. Les réservations existantes ne bougent pas : le
-- tableau montre aussi celles prises hors créneau, et chacune garde son prix.

do $$
declare
  v_etab uuid;
begin
  for v_etab in select id from etablissements where slug in ('boho', 'boho-demo') loop
    update bulles set active = false, table_id = null
    where etablissement_id = v_etab
      and name = 'La Rouge'
      and exists (select 1 from bulle_reservations r where r.bulle_id = bulles.id);
    delete from bulles
    where etablissement_id = v_etab
      and name = 'La Rouge'
      and not exists (select 1 from bulle_reservations r where r.bulle_id = bulles.id);

    update bulle_reglages
    set place_cents = 990,
        small_group_place_cents = 1490,
        group_threshold = 3,
        min_party = 2
    where etablissement_id = v_etab;

    delete from bulle_creneaux where etablissement_id = v_etab;
    insert into bulle_creneaux (etablissement_id, weekday, start_minutes)
    select v_etab, d, m
    from generate_series(1, 7) as d
    cross join (values (1140), (1260), (1380)) as starts (m);
    insert into bulle_creneaux (etablissement_id, weekday, start_minutes)
    values (v_etab, 6, 1500);
  end loop;

  -- Le soir de la démonstration bascule comme celui du Boho : sinon son créneau
  -- de 1 h tomberait sur le tableau du dimanche.
  update etablissement_settings set day_end_hour = 5
  where etablissement_id = (select id from etablissements where slug = 'boho-demo');
end;
$$;
