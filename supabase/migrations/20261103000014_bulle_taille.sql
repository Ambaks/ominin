-- Le gérant change le nombre de personnes d'une réservation de bulle, et une
-- bulle se réserve seul, payée comme à deux.
--
-- Minimum facturé (bulle_reglages.min_billed_places, figé sur la réservation) :
-- une réservation vaut max(taille, minimum facturé) × le prix de la place pour
-- cette taille. Au Boho, minimum 2 : seul, 2 × 14,90 € = 29,80 € ; de 2 à 1
-- le total ne change pas, de 1 à 3 il passe à 29,70 €.
--
-- Le prix d'une place suit la nouvelle taille (bulle_prix_place), comme pour
-- un groupe réservé à cette taille dès le départ, et ce qui est déjà payé se
-- déduit : le reste se compte en argent, plus en places. À 3, deux places
-- payées (19,80 €), puis 2 personnes : 29,80 € dus, reste 10,00 €. À 2, tout
-- payé (29,80 €), puis 3 personnes : 29,70 € dus, reste 0 € et 0,10 € de
-- trop-perçu, que le gérant voit ; rien n'est remboursé de lui-même.
--
-- paid_cents : ce qui a été réglé, tenu par un déclencheur à chaque part qui
-- passe payée ou cesse de l'être. Avant cette migration, une place payée
-- valait toujours place_cents : places_paid × place_cents en est le départ.
-- Le reste est le dû au tarif de la taille actuelle (places facturées ×
-- place_cents) moins paid_cents. Une réservation dont la taille ne change pas reste
-- exactement comme avant : paid_cents = places_paid × place_cents.
--
-- Le reste se paie par places (le lien de partage, la table, l'accueil) ; la
-- dernière s'arrête au reste. places_paid reste le nombre de places réglées,
-- jamais plus que le groupe : une part qui ne fait que compléter un montant
-- (après une baisse de taille) ne compte aucune place.

alter table public.bulle_parts
  drop constraint bulle_parts_places_check,
  add constraint bulle_parts_places_check check (places between 0 and 40);

alter table public.bulle_reglages
  add column min_billed_places smallint not null default 1,
  add constraint bulle_reglages_min_billed check (min_billed_places between 1 and max_party);

alter table public.bulle_reservations
  add column paid_cents int not null default 0,
  add column min_billed_places smallint not null default 1 check (min_billed_places between 1 and 40);

update public.bulle_reservations set paid_cents = places_paid * place_cents;

create function public.bulle_parts_paye()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' and old.status = 'payee' then
    update bulle_reservations set paid_cents = paid_cents - old.amount_cents
    where id = old.reservation_id;
  end if;
  if tg_op <> 'DELETE' and new.status = 'payee' then
    update bulle_reservations set paid_cents = paid_cents + new.amount_cents
    where id = new.reservation_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.bulle_parts_paye() from public, anon, authenticated;

create trigger bulle_parts_paye
  after insert or delete or update of status, amount_cents on public.bulle_parts
  for each row execute function public.bulle_parts_paye();

-- Les places que la réservation paie : le groupe, au moins le minimum facturé.
create function public.bulle_places_facturees(p_reservation public.bulle_reservations)
returns smallint
language sql
immutable
as $$
  select greatest(p_reservation.party_size, p_reservation.min_billed_places);
$$;

-- Ce qui reste à payer, en centimes.
create function public.bulle_reste_cents(p_reservation public.bulle_reservations)
returns int
language sql
immutable
as $$
  select greatest(bulle_places_facturees(p_reservation) * p_reservation.place_cents - p_reservation.paid_cents, 0);
$$;

-- Assez payé pour tenir la bulle : le seuil de places, au prix de la taille actuelle.
create function public.bulle_confirmable(p_reservation public.bulle_reservations, p_reglages public.bulle_reglages)
returns boolean
language sql
immutable
as $$
  select p_reservation.paid_cents
    >= bulle_places_confirmation(p_reglages, bulle_places_facturees(p_reservation)) * p_reservation.place_cents;
$$;

-- On commande depuis la bulle une fois tout payé et le créneau commencé.
create or replace function public.bulle_commande_ouverte(p_reservation public.bulle_reservations)
returns boolean
language sql
stable
as $$
  select p_reservation.id is not null
    and p_reservation.status in ('confirmee', 'arrivee')
    and bulle_reste_cents(p_reservation) = 0
    and p_reservation.starts_at <= now();
$$;

create or replace function public.bulle_table_payable(p_reservation public.bulle_reservations)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select bulle_table_proche(p_reservation)
    and bulle_reste_cents(p_reservation) > 0
    and not (p_reservation.status = 'en_attente' and p_reservation.places_paid = 0);
$$;

-- Un ami paie des places : autant qu'il en reste à payer, la dernière au plus
-- au reste. Une part qui dépasse les places du groupe n'en compte pas plus.
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
  v_reste int;
  v_left int;
  v_part bulle_parts;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
begin
  if p_hold_seconds is null or p_hold_seconds <= 0 then
    raise exception 'Délai de paiement invalide.';
  end if;
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

  update bulle_parts set status = 'annulee'
  where reservation_id = v_reservation.id
    and status = 'en_attente'
    and email = lower(btrim(p_email))
    and phone = btrim(p_phone);

  v_reste := bulle_reste_cents(v_reservation);
  v_left := ceil(v_reste::numeric / v_reservation.place_cents);
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
    least(p_places, v_reservation.party_size - v_reservation.places_paid),
    least(p_places * v_reservation.place_cents, v_reste), 'en_ligne', v_hold
  )
  returning * into v_part;

  return query select v_reservation.id, v_part.id, v_part.amount_cents, v_hold;
end;
$$;

-- Un paiement en ligne abouti. Il compte tant qu'il reste quelque chose à
-- payer, même pris au tarif d'avant un changement de taille : un trop-perçu
-- se voit en gestion. Ses places comptent dans la limite du groupe.
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
  v_places smallint;
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
    when v_part.status = 'annulee' then 'mismatch'
    when p_amount is distinct from v_part.amount_cents then 'mismatch'
    when bulle_reste_cents(v_reservation) = 0 then 'full'
  end;
  if v_reason is not null then
    update bulle_parts
    set status = 'remboursee', refunded_at = now(), square_payment_id = p_square_payment
    where id = p_part and status in ('en_attente', 'annulee');
    return jsonb_build_object('outcome', 'refund', 'reason', v_reason, 'confirmed', false, 'refunds', '[]'::jsonb);
  end if;

  v_places := least(v_part.places, v_reservation.party_size - v_reservation.places_paid);
  update bulle_parts
  set status = 'payee', paid_at = now(), hold_expires_at = null,
      square_payment_id = p_square_payment, places = v_places
  where id = p_part;
  update bulle_reservations
  set places_paid = places_paid + v_places
  where id = v_reservation.id
  returning * into v_reservation;

  select * into v_reglages from bulle_reglages where etablissement_id = v_reservation.etablissement_id;
  if v_reservation.status = 'en_attente' and bulle_confirmable(v_reservation, v_reglages) then
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

-- L'accueil encaisse le reste (carte ou espèces) : son montant exact, et les
-- places qui manquaient au groupe.
create or replace function public.bulle_marquer_arrivee(
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
  v_reste int;
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
  v_reste := bulle_reste_cents(v_reservation);
  if p_tender is not null and v_reste > 0 then
    insert into bulle_parts (
      reservation_id, etablissement_id, name, phone, organiser,
      places, amount_cents, method, tender, status, paid_at
    ) values (
      v_reservation.id, v_reservation.etablissement_id, v_reservation.name,
      v_reservation.phone, true, v_reservation.party_size - v_reservation.places_paid, v_reste,
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
    perform bulle_deloger(p_reservation);
  end if;
  update bulle_reservations
  set status = case when p_arrived then 'arrivee' else 'confirmee' end::bulle_reservation_status,
      arrived_at = case when p_arrived then coalesce(arrived_at, now()) end
  where id = p_reservation;
end;
$$;

-- Le nombre de personnes, changé par le gérant seul, tant que la réservation
-- vit et que son créneau n'est pas fini ; jamais sous les places déjà payées
-- (comptées au minimum facturé : seul au Boho, deux places payées suffisent).
-- Un groupe en attente qui se trouve assez payé prend sa bulle s'il en reste
-- une libre ; sinon il attend, comme avant.
create function public.bulle_changer_taille(p_reservation uuid, p_party smallint)
returns public.bulle_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation bulle_reservations;
  v_reglages bulle_reglages;
begin
  select * into v_reservation from bulle_reservations where id = p_reservation;
  if v_reservation.id is null
     or current_member_role(v_reservation.etablissement_id) is distinct from 'gerant' then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  perform bulle_verrou(v_reservation.etablissement_id, v_reservation.starts_at);
  select * into v_reservation from bulle_reservations where id = p_reservation for update;
  if v_reservation.status not in ('en_attente', 'confirmee', 'arrivee') then
    raise exception 'Cette réservation est close.';
  end if;
  if v_reservation.ends_at <= now() then
    raise exception 'Le créneau est terminé.';
  end if;
  select * into v_reglages from bulle_reglages where etablissement_id = v_reservation.etablissement_id;
  if p_party is null or p_party < v_reglages.min_party or p_party > v_reglages.max_party then
    raise exception 'Une bulle accueille de % à % personnes.', v_reglages.min_party, v_reglages.max_party;
  end if;
  if greatest(p_party, v_reservation.min_billed_places) < v_reservation.places_paid then
    raise exception '% places sont déjà payées : pas moins de % personnes.', v_reservation.places_paid, v_reservation.places_paid;
  end if;

  update bulle_reservations
  set party_size = p_party, place_cents = bulle_prix_place(v_reglages, p_party),
      places_paid = least(places_paid, p_party)
  where id = p_reservation
  returning * into v_reservation;

  if v_reservation.status = 'en_attente'
     and bulle_confirmable(v_reservation, v_reglages)
     and bulle_prendre(p_reservation) then
    perform bulle_deloger(p_reservation);
    select * into v_reservation from bulle_reservations where id = p_reservation;
  end if;
  return v_reservation;
end;
$$;

revoke execute on function public.bulle_changer_taille(uuid, smallint) from public, anon;
grant execute on function public.bulle_changer_taille(uuid, smallint) to authenticated;

-- Le menu QR de la table lit le reste en centimes.
drop function public.bulle_table_etat(text, int);

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
  reste_cents int,
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
    bulle_reste_cents(v_reservation),
    coalesce(bulle_table_payable(v_reservation), false);
end;
$$;

revoke execute on function public.bulle_table_etat(text, int) from public;
grant execute on function public.bulle_table_etat(text, int) to anon, authenticated;

-- Réserver en ligne : l'organisateur paie de 1 place à toutes les places
-- facturées (seul au Boho : les deux d'un coup, 29,80 €).
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
  v_billed smallint;
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
  v_soir := bulle_soir(v_bulle.etablissement_id, p_starts_at);
  if p_starts_at <= now()
     or v_soir is null
     or v_soir > (now() at time zone 'Europe/Paris')::date + v_reglages.booking_days then
    raise exception 'Ce créneau n''est pas ouvert.';
  end if;
  if p_party is null or p_party < v_reglages.min_party or p_party > v_reglages.max_party then
    raise exception 'Une bulle accueille de % à % personnes.', v_reglages.min_party, v_reglages.max_party;
  end if;
  v_billed := greatest(p_party, v_reglages.min_billed_places);
  if p_places is null or p_places < 1 or p_places > v_billed then
    raise exception 'Vous payez de 1 à % places.', v_billed;
  end if;
  v_ends := p_starts_at + make_interval(mins => v_reglages.duration_minutes);
  if not bulle_libre(p_bulle, p_starts_at, v_ends) then
    raise exception '% vient d''être réservée sur ce créneau.', v_bulle.name;
  end if;

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
    party_size, place_cents, min_billed_places, source
  ) values (
    v_bulle.etablissement_id, p_bulle, p_starts_at, v_ends, btrim(p_name),
    btrim(p_phone), lower(btrim(p_email)), p_party, bulle_prix_place(v_reglages, p_party),
    v_reglages.min_billed_places, 'en_ligne'
  )
  returning * into v_reservation;

  insert into bulle_parts (
    reservation_id, etablissement_id, name, email, phone, organiser,
    places, amount_cents, method, hold_expires_at
  ) values (
    v_reservation.id, v_reservation.etablissement_id, v_reservation.name,
    v_reservation.email, v_reservation.phone, true,
    least(p_places, p_party), p_places * v_reservation.place_cents, 'en_ligne', v_hold
  )
  returning * into v_part;

  return query select v_reservation.id, v_part.id, v_reservation.token, v_part.amount_cents, v_hold;
end;
$$;

-- Réservation prise en gestion : le même minimum facturé qu'en ligne.
create or replace function public.creer_reservation_bulle(
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
      place_cents, min_billed_places, places_paid, status, source, note, confirmed_at
    ) values (
      v_bulle.etablissement_id, p_bulle, p_starts_at,
      p_starts_at + make_interval(mins => v_reglages.duration_minutes),
      btrim(p_name), nullif(btrim(p_phone), ''), p_party, bulle_prix_place(v_reglages, p_party),
      v_reglages.min_billed_places,
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
      v_reservation.phone, true, p_party,
      bulle_places_facturees(v_reservation) * v_reservation.place_cents,
      'sur_place', p_tender, 'payee', now()
    );
    select * into v_reservation from bulle_reservations where id = v_reservation.id;
  end if;
  perform bulle_deloger(v_reservation.id);
  return v_reservation;
end;
$$;

-- Rendre une part en ligne d'une réservation fermée. Après une baisse de
-- taille, places_paid a pu compter moins que les parts : il ne passe pas sous 0.
create or replace function public.bulle_rembourser_part(p_part uuid)
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
    update bulle_reservations set places_paid = greatest(places_paid - v_part.places, 0)
    where id = v_part.reservation_id;
  end if;
  return v_part;
end;
$$;

-- Le Boho et sa démonstration : seul, on paie comme à deux.
update public.bulle_reglages
set min_party = 1, min_billed_places = 2
where etablissement_id in (select id from public.etablissements where slug in ('boho', 'boho-demo'));
