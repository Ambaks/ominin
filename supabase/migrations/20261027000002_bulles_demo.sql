-- La démonstration des bulles du Boho, montrée à son gérant avant la vente,
-- servie sous menu.ominin.com/demo/boho (frontend/lib/bulles/demo.ts) : un
-- établissement à part, boho-demo, jamais le vrai Boho. Sa carte est recopiée
-- de celle du Boho (lecture seule), ses quatre bulles posées sur ses tables 9
-- à 12, ses créneaux dans les horaires du soir ; le paiement est celui de
-- démonstration (aucun débit).
--
-- Sa gestion des bulles s'ouvre sans compte (/demo/boho/gestion) : le serveur
-- y agit avec la clé de service, et les gestes de l'accueil (arrivée,
-- encaissement, réservation au téléphone, annulation) l'acceptent pour un
-- établissement de démonstration seulement (bulle_demo_service).

-- Le serveur d'Ominin, sur un établissement de démonstration.
create function public.bulle_demo_service(p_etab uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role() = 'service_role', false)
    and exists (select 1 from etablissements where id = p_etab and demo);
$$;

revoke execute on function public.bulle_demo_service(uuid) from public, anon, authenticated;

-- Les gestes de l'accueil, ouverts au serveur sur une démonstration.

-- Réservation prise au téléphone ou sur place : confirmée d'emblée, réglée
-- sur place. Comme une confirmation en ligne, elle déloge les groupes en
-- attente qui visaient la bulle ; ceux qui n'ont plus de bulle sont fermés
-- et remboursés par le passage périodique.
create or replace function public.creer_reservation_bulle(
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
     or (current_member_role(v_bulle.etablissement_id) is distinct from 'gerant'
         and not bulle_demo_service(v_bulle.etablissement_id)) then
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


-- L'équipe coche une arrivée, ou la décoche. p_paid : les places restantes
-- sont encaissées sur place à cet instant. Un groupe encore en attente qui
-- règle tout à l'accueil est confirmé du même geste, si sa bulle (ou une
-- autre du créneau) est libre.
create or replace function public.bulle_marquer_arrivee(p_reservation uuid, p_arrived boolean, p_paid boolean default false)
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


-- Annule une réservation prise au téléphone ou sur place. Une réservation
-- payée en ligne ne s'annule pas.
create or replace function public.bulle_annuler_reservation(p_reservation uuid)
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
     or (current_member_role(v_reservation.etablissement_id) is distinct from 'gerant'
         and not bulle_demo_service(v_reservation.etablissement_id)) then
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

grant execute on function public.creer_reservation_bulle(
  uuid, timestamptz, text, text, smallint, public.bulle_reservation_source, text
) to service_role;
grant execute on function public.bulle_marquer_arrivee(uuid, boolean, boolean) to service_role;
grant execute on function public.bulle_annuler_reservation(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- L'établissement de démonstration, créé une fois, s'il y a un Boho à recopier.

do $$
declare
  v_boho uuid;
  v_demo uuid;
  v_category categories;
  v_new_category uuid;
begin
  select id into v_boho from etablissements where slug = 'boho';
  if v_boho is null or exists (select 1 from etablissements where slug = 'boho-demo') then
    return;
  end if;

  insert into etablissements (slug, name, tagline, address, phone, hours, offre, payment_provider, online_payment, demo)
  select 'boho-demo', name, tagline, address, phone, hours, 'smart', 'demo', true, true
  from etablissements where id = v_boho
  returning id into v_demo;

  update etablissement_settings set features = '{"bulles": true}'::jsonb where etablissement_id = v_demo;
  -- Utilisable sans passer par Stripe, comme les autres démos.
  insert into subscriptions (etablissement_id, product, status) values (v_demo, 'offre', 'active');

  for v_category in select * from categories where etablissement_id = v_boho order by position loop
    insert into categories (etablissement_id, name, tagline, position)
    values (v_demo, v_category.name, v_category.tagline, v_category.position)
    returning id into v_new_category;
    insert into items (
      etablissement_id, category_id, name, description, price, image, badges, pairing, detail,
      disponible, stock, options, vat_rate, position, print_name, notice_hours, allergens
    )
    select v_demo, v_new_category, name, description, price, image, badges, pairing, detail,
      disponible, stock, options, vat_rate, position, print_name, notice_hours, allergens
    from items where category_id = v_category.id;
  end loop;
  insert into affiches (etablissement_id, image, offres)
  select v_demo, image, offres from affiches where etablissement_id = v_boho;

  insert into tables (etablissement_id, number) select v_demo, n from generate_series(1, 12) n;

  -- Les réglages validés pour le Boho : 9,90 € la place, de 3 à 8 personnes,
  -- 2 h, réservable 14 jours à l'avance, TVA d'un article de la carte.
  insert into bulle_reglages (etablissement_id, place_cents, min_party, max_party, duration_minutes, booking_days, vat_rate)
  values (v_demo, 990, 3, 8, 120, 14, 10);

  insert into bulles (etablissement_id, name, color, sort, table_id)
  select v_demo, b.name, b.color, b.sort,
    (select id from tables where etablissement_id = v_demo and number = b.sort + 8)
  from (values
    ('La Bleue', '#3e6b78', 1),
    ('La Rouge', '#b5443a', 2),
    ('La Grise', '#8a8580', 3),
    ('La Verte', '#6f7f4e', 4)
  ) as b (name, color, sort);

  -- Des créneaux de 2 h dans ses horaires du soir (16 h – 2 h ; le samedi,
  -- il ouvre à 18 h), en minutes depuis minuit du jour.
  insert into bulle_creneaux (etablissement_id, weekday, start_minutes)
  select v_demo, d, m
  from generate_series(1, 7) as d
  cross join (values (960), (1080), (1200), (1320), (1440)) as starts (m)
  where not (d = 6 and m < 1080);
end;
$$;
