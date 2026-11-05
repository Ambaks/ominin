-- Ominin Club, cahier des charges de L'Étoile, étape 3 : la réservation
-- complète.
--
-- 1. Heure d'arrivée : une soirée peut proposer des créneaux d'arrivée, chacun
--    avec le nombre de réservations qu'il accepte. Le client en choisit un ;
--    l'équipe aussi, sans plafond (c'est le club qui décide).
-- 2. Modifier une réservation : nom, contact, personnes, heure, note.
-- 3. Acompte demandé : sur une réservation saisie par le club, la direction
--    demande un acompte ; le client le paie depuis sa page de réservation (le
--    lien reçu par e-mail), le temps du paiement comme une table en ligne.
-- 4. L'acompte en ligne (en %) se règle par le club, plus seulement par Ominin.
-- 5. Options du club : la table payée entière, le partage entre amis, la
--    liste d'invités, chacune désactivable.

-- ---------------------------------------------------------------------------
-- Options et acompte réglés par le club

alter table public.etablissements
  add column club_table_entiere boolean not null default true,
  add column club_partage boolean not null default true,
  add column club_liste_invites boolean not null default true;

-- L'acompte (table_deposit_percent) quitte la liste réservée à Ominin : le
-- club le fixe. Il couvre toujours les frais Ominin (reserver_table).
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
  if new.offre is distinct from old.offre then
    raise exception 'Le changement d''offre passe par Ominin.';
  end if;
  return new;
end;
$$;

comment on column public.etablissements.table_deposit_percent is
  'Acompte minimal d''une table réservée en ligne, en % du prix frais compris. Réglé par le club.';

-- Partage coupé : plus de part d'ami (la part de l'organisateur reste).
create function public.club_partage_ouvert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.organiser and new.method = 'en_ligne' and not (
    select club_partage from etablissements where id = new.etablissement_id
  ) then
    raise exception 'Le club ne propose pas le partage de table.';
  end if;
  return new;
end;
$$;

create trigger club_payments_partage
  before insert on public.club_payments
  for each row execute function public.club_partage_ouvert();

-- Liste d'invités coupée : plus d'inscription.
create function public.club_liste_ouverte()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not (select club_liste_invites from etablissements where id = new.etablissement_id) then
    raise exception 'La liste est fermée.';
  end if;
  return new;
end;
$$;

create trigger club_guests_liste
  before insert on public.club_guests
  for each row execute function public.club_liste_ouverte();

-- ---------------------------------------------------------------------------
-- Créneaux d'arrivée

create table public.club_event_creneaux (
  event_id uuid not null references public.club_events (id) on delete cascade,
  starts_at timestamptz not null,
  max_bookings smallint not null check (max_bookings between 1 and 500),
  primary key (event_id, starts_at)
);

alter table public.club_event_creneaux enable row level security;

create policy "public read" on public.club_event_creneaux
  for select to anon
  using (exists (select 1 from public.club_events e where e.id = event_id and e.published));
create policy "member read" on public.club_event_creneaux
  for select to authenticated
  using (
    exists (
      select 1 from public.club_events e
      where e.id = event_id
        and (e.published or public.current_member_role(e.etablissement_id) is not null)
    )
  );
create policy "gerant write" on public.club_event_creneaux
  for all to authenticated
  using (
    exists (
      select 1 from public.club_events e
      where e.id = event_id and public.current_member_role(e.etablissement_id) = 'gerant'
    )
  )
  with check (
    exists (
      select 1 from public.club_events e
      where e.id = event_id and public.current_member_role(e.etablissement_id) = 'gerant'
    )
  );

alter table public.club_bookings
  add column arrivee_prevue timestamptz,
  -- Acompte demandé par le club sur une réservation qu'il a saisie, à payer
  -- par le client depuis sa page ; effacé dès qu'un paiement en ligne aboutit.
  add column acompte_demande_cents int check (acompte_demande_cents is null or acompte_demande_cents > 0);

create index club_bookings_arrivee_idx on public.club_bookings (event_id, arrivee_prevue);

-- Les créneaux d'une soirée publiée et ce qu'il leur reste, pour la page du
-- club. Les réservations tenues comptent (en cours de paiement comprises).
create function public.club_creneaux(p_event uuid)
returns table (starts_at timestamptz, restant int)
language sql
stable
security definer
set search_path = public
as $$
  select c.starts_at,
    greatest(c.max_bookings - (
      select count(*) from club_bookings b
      where b.event_id = c.event_id and b.arrivee_prevue = c.starts_at
        and club_booking_holds(b.status, b.hold_expires_at)
    ), 0)::int
  from club_event_creneaux c
  join club_events e on e.id = c.event_id
  where c.event_id = p_event and e.published
  order by c.starts_at;
$$;

revoke execute on function public.club_creneaux(uuid) from public;
grant execute on function public.club_creneaux(uuid) to anon, authenticated;

-- Une heure d'arrivée valable pour la soirée : un de ses créneaux, s'il y en
-- a (sans créneau, l'heure n'est pas demandée et reste vide).
create function public.club_creneau_valide(p_event uuid, p_arrivee timestamptz)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when not exists (select 1 from club_event_creneaux where event_id = p_event) then p_arrivee is null
    else exists (select 1 from club_event_creneaux where event_id = p_event and starts_at = p_arrivee)
  end;
$$;

revoke execute on function public.club_creneau_valide(uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Réserver en ligne : une zone, une heure d'arrivée, à placer

drop function public.reserver_table(uuid, uuid, text, text, text, smallint, int, int);

create function public.reserver_table(
  p_event uuid,
  p_zone uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_party smallint,
  p_hold_seconds int,
  p_share_cents int default null,
  p_arrivee timestamptz default null
)
returns table (booking_id uuid, payment_id uuid, token text, total_cents int, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_event club_events;
  v_etab etablissements;
  v_seats smallint;
  v_tables int;
  v_price int;
  v_fee int;
  v_total int;
  v_minimum int;
  v_amount int;
  v_max int;
  v_shared boolean;
  v_booking club_bookings;
  v_payment club_payments;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
begin
  if p_hold_seconds is null or p_hold_seconds <= 0 then
    raise exception 'Délai de paiement invalide.';
  end if;

  -- Une réservation à la fois par soirée : places et créneaux se comptent
  -- sans course.
  select * into v_event from club_events where id = p_event for update;
  if v_event.id is null or not v_event.published then
    raise exception 'Soirée introuvable.';
  end if;
  if v_event.cancelled_at is not null then
    raise exception 'Cette soirée est annulée.';
  end if;
  if v_event.ends_at <= now() then
    raise exception 'Cette soirée est terminée.';
  end if;
  select * into v_etab from etablissements where id = v_event.etablissement_id;

  select coalesce(ez.price_cents, z.price_cents), max(t.seats), count(t.id)
  into v_price, v_seats, v_tables
  from club_event_zones ez
  join club_zones z on z.id = ez.zone_id and z.etablissement_id = v_event.etablissement_id
  join club_tables t on t.zone_id = z.id
  where ez.event_id = p_event and ez.zone_id = p_zone
    and not exists (
      select 1 from club_event_blocked_tables bt
      where bt.event_id = p_event and bt.table_id = t.id
    )
  group by ez.price_cents, z.price_cents;
  if v_price is null then
    raise exception 'Cette offre n''est pas en vente ce soir.';
  end if;
  if p_party is null or p_party < 1 or p_party > v_seats then
    raise exception 'Cette offre accueille % personnes au plus.', v_seats;
  end if;
  if not club_creneau_valide(p_event, p_arrivee) then
    raise exception 'Choisissez une heure d''arrivée proposée.';
  end if;

  -- Le client voit la table frais compris : les frais de service d'Ominin
  -- portent sur toute la table et se prélèvent sur le premier paiement,
  -- celui de l'organisateur. Sans tout payer, il verse au moins l'acompte du
  -- club (à défaut, une part égale du total) — et toujours plus que les
  -- frais ; ses amis se partagent le reste, sans frais, ou il se règle à
  -- l'entrée. Le club peut exiger un acompte (pas de table payée entière),
  -- et couper le partage : le premier paiement est alors l'acompte, exact.
  v_fee := club_frais(v_event.etablissement_id, v_price);
  v_total := v_price + v_fee;
  v_minimum := greatest(
    case when v_etab.table_deposit_percent is not null
      then ceil(v_total * v_etab.table_deposit_percent / 100)
      else ceil(v_total::numeric / greatest(p_party, 1)) end,
    v_fee + 1
  );
  v_max := case when v_etab.club_partage then v_total else v_minimum end;
  if p_share_cents is null and not v_etab.club_table_entiere then
    raise exception 'Le club demande un acompte : la table ne se paie pas entière en ligne.';
  end if;
  if p_share_cents is not null
     and ((v_etab.table_deposit_percent is null and (p_party < 2 or not v_etab.club_partage))
       or p_share_cents < v_minimum
       or p_share_cents > v_max) then
    raise exception 'Votre premier paiement va de % à % €.',
      replace(to_char(v_minimum / 100.0, 'FM999990.00'), '.', ','),
      replace(to_char(v_max / 100.0, 'FM999990.00'), '.', ',');
  end if;
  v_amount := coalesce(p_share_cents, v_total) - v_fee;
  v_shared := p_share_cents is not null and v_etab.club_partage;

  -- Les attentes de paiement expirées de la soirée tombent : leur place se
  -- reprend, et un paiement qui aboutirait après coup est remboursé
  -- (regler_paiement). Et un paiement en cours par personne : réserver à
  -- nouveau rend le précédent. La personne est reconnue à son e-mail ET à son
  -- téléphone : qui ne connaît que l'un des deux ne peut pas faire tomber la
  -- réservation d'un autre.
  with rendues as (
    update club_bookings
    set status = 'annulee', cancelled_at = now()
    where event_id = p_event
      and status = 'en_attente'
      and source = 'en_ligne'
      and (hold_expires_at <= now()
        or (email = lower(btrim(p_email)) and phone = btrim(p_phone)))
    returning id
  )
  update club_payments set status = 'annulee'
  where status = 'en_attente' and booking_id in (select id from rendues);

  if club_zone_prises(p_event, p_zone) >= v_tables then
    raise exception 'Cette offre est complète ce soir.';
  end if;
  if p_arrivee is not null and (
    select restant from club_creneaux(p_event) where starts_at = p_arrivee
  ) <= 0 then
    raise exception 'Cette heure d''arrivée est complète : choisissez-en une autre.';
  end if;

  insert into club_bookings (
    etablissement_id, event_id, zone_id, name, phone, email, party_size,
    price_cents, fee_cents, total_cents, status, source, hold_expires_at,
    shared, share_token, arrivee_prevue
  ) values (
    v_event.etablissement_id, p_event, p_zone, btrim(p_name),
    btrim(p_phone), lower(btrim(p_email)), p_party,
    v_price, v_fee, v_total,
    'en_attente', 'en_ligne', v_hold,
    v_shared,
    case when v_shared then encode(extensions.gen_random_bytes(12), 'hex') end,
    p_arrivee
  )
  returning * into v_booking;

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

revoke execute on function public.reserver_table(uuid, uuid, text, text, text, smallint, int, int, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reserver_table(uuid, uuid, text, text, text, smallint, int, int, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Côté club : saisir avec e-mail et heure, modifier

drop function public.creer_reservation_club(
  uuid, uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
);

create function public.creer_reservation_club(
  p_event uuid,
  p_zone uuid,
  p_table uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_party smallint,
  p_source public.club_booking_source,
  p_paid boolean,
  p_note text,
  p_arrivee timestamptz
)
returns public.club_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event club_events;
  v_zone uuid;
  v_seats smallint;
  v_price int;
  v_booking club_bookings;
begin
  if p_source = 'en_ligne' then
    raise exception 'Source invalide.';
  end if;
  select * into v_event from club_events where id = p_event;
  if v_event.id is null or not club_peut(v_event.etablissement_id, 'reserver') then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_event.cancelled_at is not null then
    raise exception 'Cette soirée est annulée.';
  end if;
  if v_event.ends_at <= now() then
    raise exception 'Cette soirée est terminée.';
  end if;
  if p_arrivee is not null and not club_creneau_valide(p_event, p_arrivee) then
    raise exception 'Choisissez une heure d''arrivée proposée.';
  end if;

  if p_table is not null then
    -- Une table gardée ou d'une zone fermée reste réservable par le club : il
    -- la garde justement pour ça. Son prix est alors celui de la zone.
    select t.zone_id, t.seats, coalesce(club_prix_table(p_event, t.id), z.price_cents)
    into v_zone, v_seats, v_price
    from club_tables t join club_zones z on z.id = t.zone_id
    where t.id = p_table and t.etablissement_id = v_event.etablissement_id;
  else
    select z.id, (select max(t.seats) from club_tables t where t.zone_id = z.id),
      coalesce(ez.price_cents, z.price_cents)
    into v_zone, v_seats, v_price
    from club_zones z
    left join club_event_zones ez on ez.event_id = p_event and ez.zone_id = z.id
    where z.id = p_zone and z.etablissement_id = v_event.etablissement_id;
  end if;
  if v_zone is null or v_seats is null then
    raise exception 'Table introuvable.';
  end if;
  if p_party is null or p_party < 1 or p_party > v_seats then
    raise exception 'Cette table accueille % personnes au plus.', v_seats;
  end if;

  if p_table is not null then
    perform club_liberer_attentes(p_event, p_table);
  end if;

  begin
    insert into club_bookings (
      etablissement_id, event_id, zone_id, table_id, name, phone, email, party_size,
      price_cents, fee_cents, total_cents, status, source, note, arrivee_prevue
    ) values (
      v_event.etablissement_id, p_event, v_zone, p_table, btrim(p_name),
      nullif(btrim(p_phone), ''), nullif(lower(btrim(p_email)), ''), p_party, v_price, 0, v_price,
      case when p_paid then 'payee' else 'en_attente' end::club_booking_status,
      p_source, nullif(btrim(p_note), ''), p_arrivee
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
  uuid, uuid, uuid, text, text, text, smallint, public.club_booking_source, boolean, text, timestamptz
) from public, anon;
grant execute on function public.creer_reservation_club(
  uuid, uuid, uuid, text, text, text, smallint, public.club_booking_source, boolean, text, timestamptz
) to authenticated;

-- Modifier une réservation : ce qui ne touche pas à l'argent. Le prix ne
-- change pas ; le groupe doit tenir à sa table (ou dans sa zone, à placer).
-- Une réservation en ligne garde un e-mail et un téléphone.
create function public.club_modifier_reservation(
  p_booking uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_party smallint,
  p_note text,
  p_arrivee timestamptz
)
returns public.club_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
  v_seats smallint;
begin
  select * into v_booking from club_bookings where id = p_booking for update;
  if v_booking.id is null or not club_peut(v_booking.etablissement_id, 'reserver') then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_booking.status not in ('en_attente', 'payee', 'arrivee', 'assise') then
    raise exception 'Cette réservation n''est plus active.';
  end if;
  if v_booking.table_id is not null then
    select seats into v_seats from club_tables where id = v_booking.table_id;
  else
    select max(seats) into v_seats from club_tables where zone_id = v_booking.zone_id;
  end if;
  if p_party is null or p_party < 1 or p_party > v_seats then
    raise exception 'Cette table accueille % personnes au plus.', v_seats;
  end if;
  if p_arrivee is distinct from v_booking.arrivee_prevue
     and p_arrivee is not null and not club_creneau_valide(v_booking.event_id, p_arrivee) then
    raise exception 'Choisissez une heure d''arrivée proposée.';
  end if;

  update club_bookings
  set name = btrim(p_name),
      phone = nullif(btrim(p_phone), ''),
      email = nullif(lower(btrim(p_email)), ''),
      party_size = p_party,
      note = nullif(btrim(p_note), ''),
      arrivee_prevue = p_arrivee
  where id = p_booking
  returning * into v_booking;
  return v_booking;
end;
$$;

revoke execute on function public.club_modifier_reservation(uuid, text, text, text, smallint, text, timestamptz)
  from public, anon;
grant execute on function public.club_modifier_reservation(uuid, text, text, text, smallint, text, timestamptz)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Acompte demandé, payé par le client depuis sa page

-- Le club demande un acompte sur une réservation qu'il a saisie, encore à
-- régler : au plus ce qu'il en reste. Le serveur envoie ensuite le lien.
create function public.club_demander_acompte(p_booking uuid, p_amount int)
returns public.club_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
  v_event club_events;
begin
  select * into v_booking from club_bookings where id = p_booking for update;
  if v_booking.id is null or not club_peut(v_booking.etablissement_id, 'reserver') then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_booking.source = 'en_ligne' or v_booking.status not in ('en_attente', 'payee') then
    raise exception 'Un acompte se demande sur une réservation saisie par le club, avant l''arrivée.';
  end if;
  if v_booking.email is null then
    raise exception 'Ajoutez l''e-mail du client pour lui envoyer le lien.';
  end if;
  select * into v_event from club_events where id = v_booking.event_id;
  if v_event.cancelled_at is not null or v_event.ends_at <= now() then
    raise exception 'Cette soirée est close.';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > v_booking.price_cents - v_booking.paid_cents then
    raise exception 'L''acompte va de 0,01 à % €.',
      replace(to_char((v_booking.price_cents - v_booking.paid_cents) / 100.0, 'FM999990.00'), '.', ',');
  end if;
  update club_bookings set acompte_demande_cents = p_amount where id = p_booking
  returning * into v_booking;
  return v_booking;
end;
$$;

revoke execute on function public.club_demander_acompte(uuid, int) from public, anon;
grant execute on function public.club_demander_acompte(uuid, int) to authenticated;

-- Le client paie l'acompte demandé depuis sa page (la clé de son lien) :
-- un paiement en ligne tenu le temps de payer, sans frais Ominin.
create function public.payer_acompte_demande(p_token text, p_hold_seconds int)
returns table (payment_id uuid, total_cents int, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_booking club_bookings;
  v_event club_events;
  v_payment club_payments;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
begin
  if p_hold_seconds is null or p_hold_seconds <= 0 then
    raise exception 'Délai de paiement invalide.';
  end if;
  select * into v_booking from club_bookings where token = p_token for update;
  if v_booking.id is null or v_booking.acompte_demande_cents is null
     or v_booking.status not in ('en_attente', 'payee') then
    raise exception 'Aucun acompte n''est demandé sur cette réservation.';
  end if;
  select * into v_event from club_events where id = v_booking.event_id;
  if v_event.cancelled_at is not null or v_event.ends_at <= now() then
    raise exception 'Cette soirée est close.';
  end if;
  update club_payments set status = 'annulee'
  where booking_id = v_booking.id and status = 'en_attente';
  insert into club_payments (
    booking_id, etablissement_id, name, email, phone, organiser,
    amount_cents, fee_cents, total_cents, method, hold_expires_at
  ) values (
    v_booking.id, v_booking.etablissement_id, v_booking.name, v_booking.email, v_booking.phone, true,
    least(v_booking.acompte_demande_cents, v_booking.price_cents - v_booking.paid_cents), 0,
    least(v_booking.acompte_demande_cents, v_booking.price_cents - v_booking.paid_cents), 'en_ligne', v_hold
  )
  returning * into v_payment;
  return query select v_payment.id, v_payment.total_cents, v_hold;
end;
$$;

revoke execute on function public.payer_acompte_demande(text, int) from public, anon, authenticated;
grant execute on function public.payer_acompte_demande(text, int) to service_role;

-- Un paiement en ligne abouti efface l'acompte demandé (il est réglé).
create or replace function public.regler_paiement(p_payment uuid, p_intent text, p_total int)
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
     or v_booking.status not in ('en_attente', 'payee', 'arrivee', 'assise')
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
  -- Un délai passé ne suffit pas à perdre la place : tant qu'aucune autre
  -- réservation ne l'a annulée, le paiement de l'organisateur la tient.
  update club_bookings
  set paid_cents = paid_cents + v_payment.amount_cents,
      status = case when status = 'en_attente' then 'payee' else status end,
      paid_at = coalesce(paid_at, now()),
      hold_expires_at = null,
      acompte_demande_cents = null
  where id = v_booking.id;
  return 'paid';
end;
$$;

-- Le rapport compte l'acompte demandé et pas encore payé dans « en attente »
-- (le plus grand de la demande et du paiement en cours : jamais deux fois).
create or replace function public.club_rapport_lignes(p_event uuid)
returns table (
  booking_id uuid,
  name text,
  zone_id uuid,
  zone_name text,
  table_label text,
  source public.club_booking_source,
  status public.club_booking_status,
  etat text,
  party_size int,
  price_cents int,
  en_ligne_cents int,
  rembourse_cents int,
  en_attente_cents int,
  sur_place_cents int,
  frais_cents int,
  reste_cents int,
  created_at timestamptz,
  arrived_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    b.id, b.name, b.zone_id, z.name, t.label, b.source, b.status,
    case
      when b.status = 'en_attente' and b.hold_expires_at is not null then 'en_cours'
      when b.status in ('arrivee', 'assise', 'partie') then 'honoree'
      when b.status in ('payee', 'en_attente') then 'confirmee'
      when b.status = 'remboursee' then 'remboursee'
      else 'annulee'
    end,
    b.party_size, b.price_cents,
    coalesce(sum(p.amount_cents) filter (where p.method = 'en_ligne' and p.status in ('payee', 'remboursee')), 0)::int,
    coalesce(sum(p.amount_cents) filter (where p.method = 'en_ligne' and p.status = 'remboursee'), 0)::int,
    greatest(
      coalesce(sum(p.amount_cents) filter (
        where p.method = 'en_ligne' and p.status = 'en_attente' and p.hold_expires_at > now()
      ), 0),
      case when b.status in ('en_attente', 'payee') then coalesce(b.acompte_demande_cents, 0) else 0 end
    )::int,
    coalesce(sum(p.amount_cents) filter (where p.method = 'sur_place' and p.status = 'payee'), 0)::int,
    coalesce(sum(p.fee_cents) filter (where p.method = 'en_ligne' and p.status = 'payee'), 0)::int,
    case when b.status in ('payee', 'en_attente', 'arrivee', 'assise', 'partie')
      and not (b.status = 'en_attente' and b.hold_expires_at is not null)
      then greatest(b.price_cents - b.paid_cents, 0) else 0 end,
    b.created_at, b.arrived_at
  from club_bookings b
  join club_zones z on z.id = b.zone_id
  left join club_tables t on t.id = b.table_id
  left join club_payments p on p.booking_id = b.id
  where b.event_id = p_event
    and not (
      b.source = 'en_ligne' and b.paid_at is null
      and not (b.status = 'en_attente' and b.hold_expires_at > now())
    )
  group by b.id, z.name, t.label;
$$;
