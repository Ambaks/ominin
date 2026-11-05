-- Ominin Club, cahier des charges de L'Étoile (suite des types de
-- 20261105000001).
--
-- 1. Le client réserve une zone, jamais une table : sa réservation arrive
--    « à placer » (table_id null) et l'équipe l'installe sur la table de son
--    choix. Une zone se vend tant que ses réservations, placées ou non, sont
--    moins nombreuses que ses tables en vente.
-- 2. Quatre temps dans la soirée : réservée, arrivée, assise, partie. L'accueil
--    fait entrer sans que la table soit réglée ; le caissier encaisse le reste
--    et installe ; le chef de rang marque le départ, et la table se libère
--    pour une autre réservation du même soir.
-- 3. Chaque membre d'un club a un poste (accueil, caissier, chef de rang ; la
--    direction est le gérant), et le club règle ce que chaque poste peut faire.

-- ---------------------------------------------------------------------------
-- Réservations : une zone toujours, une table quand l'équipe l'a placée

alter table public.club_bookings
  -- Sans cascade, comme la table : une zone qui porte des réservations ne
  -- s'efface pas.
  add column zone_id uuid references public.club_zones (id),
  add column seated_at timestamptz,
  add column left_at timestamptz;

update public.club_bookings b
set zone_id = t.zone_id
from public.club_tables t
where t.id = b.table_id;

alter table public.club_bookings
  alter column zone_id set not null,
  alter column table_id drop not null;

-- Une table ne tient qu'une réservation à la fois ; partie, elle se reprend.
drop index public.club_bookings_table_active;
create unique index club_bookings_table_active
  on public.club_bookings (event_id, table_id)
  where table_id is not null and status in ('en_attente', 'payee', 'arrivee', 'assise');
create index club_bookings_zone_idx on public.club_bookings (event_id, zone_id);

create or replace function public.club_booking_holds(
  p_status public.club_booking_status,
  p_hold_expires_at timestamptz
)
returns boolean
language sql
stable
as $$
  select p_status in ('payee', 'arrivee', 'assise')
    or (p_status = 'en_attente'
      and (p_hold_expires_at is null or p_hold_expires_at > now()));
$$;

-- Les réservations qui occupent une zone ce soir : à placer, ou placées sur
-- une de ses tables en vente (une table gardée ne se vend pas, ce qu'on y a
-- placé ne prend pas la place d'une autre).
create function public.club_zone_prises(p_event uuid, p_zone uuid)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int
  from club_bookings b
  where b.event_id = p_event
    and b.zone_id = p_zone
    and club_booking_holds(b.status, b.hold_expires_at)
    and (b.table_id is null or not exists (
      select 1 from club_event_blocked_tables bt
      where bt.event_id = p_event and bt.table_id = b.table_id
    ));
$$;

revoke execute on function public.club_zone_prises(uuid, uuid) from public, anon, authenticated;

-- Les offres d'une soirée publiée : chaque zone en vente, son prix du soir,
-- si elle a encore de la place, et la plus grande tablée qu'elle accueille.
-- Jamais de stock : le client ne doit pas savoir combien de tables restent.
create or replace function public.club_offres(p_event uuid)
returns table (zone_id uuid, price_cents int, available boolean, max_party int)
language sql
stable
security definer
set search_path = public
as $$
  select
    z.id,
    coalesce(ez.price_cents, z.price_cents),
    count(*) filter (where not t.blocked) > club_zone_prises(e.id, z.id),
    coalesce(max(t.seats) filter (where not t.blocked), max(t.seats))::int
  from club_events e
  join club_event_zones ez on ez.event_id = e.id
  join club_zones z on z.id = ez.zone_id
  join lateral (
    select ct.seats, exists (
      select 1 from club_event_blocked_tables bt
      where bt.event_id = e.id and bt.table_id = ct.id
    ) as blocked
    from club_tables ct
    where ct.zone_id = z.id
  ) t on true
  where e.id = p_event and e.published
  group by e.id, z.id, ez.price_cents, z.price_cents;
$$;

-- ---------------------------------------------------------------------------
-- Postes et droits

-- Le poste d'un gérant ne compte pas : la direction peut tout.
alter table public.memberships add column club_role public.club_role;
alter table public.invitations add column club_role public.club_role;

-- Ce que chaque poste peut faire, réglé par la direction. Droits : reserver
-- (saisir, annuler), placer (attribuer, déplacer une table), arrivee, assise
-- (encaisser et installer), partie, acomptes (voir l'argent ; un affichage :
-- les montants restent lisibles par tout membre en base). La direction peut
-- tout. Les défauts suivent le cahier des charges de L'Étoile.
alter table public.etablissements
  add column club_droits jsonb not null default
    '{"accueil": ["arrivee"], "caissier": ["assise", "acomptes"], "chef_de_rang": ["partie"]}'::jsonb
    check (jsonb_typeof(club_droits) = 'object');

create function public.club_peut(p_etablissement uuid, p_droit text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select m.role = 'gerant' or coalesce((e.club_droits -> m.club_role::text) ? p_droit, false)
    from memberships m
    join etablissements e on e.id = m.etablissement_id
    where m.user_id = auth.uid() and m.etablissement_id = p_etablissement
  ), false);
$$;

revoke execute on function public.club_peut(uuid, text) from public, anon;
grant execute on function public.club_peut(uuid, text) to authenticated;

-- L'invité reçoit le poste de son invitation.
create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations;
begin
  select * into v_invitation from public.invitations where token = p_token;
  if v_invitation.id is null or v_invitation.email is distinct from (
    select lower(email) from auth.users where id = auth.uid()
  ) then
    raise exception 'Invitation introuvable pour ce compte.' using errcode = 'P0002';
  end if;

  insert into public.memberships (user_id, etablissement_id, role, email, club_role)
  values (
    auth.uid(), v_invitation.etablissement_id, v_invitation.role, v_invitation.email,
    v_invitation.club_role
  )
  on conflict (user_id, etablissement_id)
    do update set role = excluded.role, club_role = excluded.club_role;
  delete from public.invitations where id = v_invitation.id;
  return v_invitation.etablissement_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Réserver en ligne : une zone, à placer

create or replace function public.reserver_table(
  p_event uuid,
  p_zone uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_party smallint,
  p_hold_seconds int,
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
  v_tables int;
  v_price int;
  v_fee int;
  v_total int;
  v_minimum int;
  v_deposit numeric;
  v_amount int;
  v_booking club_bookings;
  v_payment club_payments;
  v_hold timestamptz := now() + make_interval(secs => p_hold_seconds);
begin
  if p_hold_seconds is null or p_hold_seconds <= 0 then
    raise exception 'Délai de paiement invalide.';
  end if;

  -- Une réservation à la fois par soirée : les places d'une zone se comptent
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

  -- Le client voit la table frais compris : les frais de service d'Ominin
  -- portent sur toute la table et se prélèvent sur le premier paiement,
  -- celui de l'organisateur. Sans tout payer, il verse au moins l'acompte du
  -- club (à défaut, une part égale du total) — et toujours plus que les
  -- frais ; ses amis se partagent le reste, sans frais, ou il se règle à
  -- l'entrée.
  v_fee := club_frais(v_event.etablissement_id, v_price);
  v_total := v_price + v_fee;
  select table_deposit_percent into v_deposit
  from etablissements where id = v_event.etablissement_id;
  v_minimum := greatest(
    case when v_deposit is not null
      then ceil(v_total * v_deposit / 100)
      else ceil(v_total::numeric / greatest(p_party, 1)) end,
    v_fee + 1
  );
  if p_share_cents is not null
     and ((v_deposit is null and p_party < 2)
       or p_share_cents < v_minimum
       or p_share_cents > v_total) then
    raise exception 'Votre premier paiement va de % à % €.',
      replace(to_char(v_minimum / 100.0, 'FM999990.00'), '.', ','),
      replace(to_char(v_total / 100.0, 'FM999990.00'), '.', ',');
  end if;
  v_amount := coalesce(p_share_cents, v_total) - v_fee;

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

  insert into club_bookings (
    etablissement_id, event_id, zone_id, name, phone, email, party_size,
    price_cents, fee_cents, total_cents, status, source, hold_expires_at,
    shared, share_token
  ) values (
    v_event.etablissement_id, p_event, p_zone, btrim(p_name),
    btrim(p_phone), lower(btrim(p_email)), p_party,
    v_price, v_fee, v_total,
    'en_attente', 'en_ligne', v_hold,
    p_share_cents is not null,
    case when p_share_cents is not null then encode(extensions.gen_random_bytes(12), 'hex') end
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

-- Une table assise se règle encore (une part en vol au début de la soirée).
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
      hold_expires_at = null
  where id = v_booking.id;
  return 'paid';
end;
$$;

-- Une table assise se rembourse aussi entière (un client mécontent).
create or replace function public.club_clore_reservation(p_booking uuid)
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
  if v_booking.status in ('en_attente', 'payee', 'arrivee', 'assise') then
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

-- ---------------------------------------------------------------------------
-- Côté club

-- Réservation prise au téléphone ou à la porte : sans paiement en ligne ni
-- frais Ominin, réglée (p_paid) ou à régler sur place. Sur une table
-- (p_table, sa zone suit), ou à placer dans une zone. Une zone pleine se
-- réserve quand même : c'est le club qui décide.
drop function public.creer_reservation_club(
  uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
);

create function public.creer_reservation_club(
  p_event uuid,
  p_zone uuid,
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
      etablissement_id, event_id, zone_id, table_id, name, phone, party_size,
      price_cents, fee_cents, total_cents, status, source, note
    ) values (
      v_event.etablissement_id, p_event, v_zone, p_table, btrim(p_name),
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
  uuid, uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
) from public, anon;
grant execute on function public.creer_reservation_club(
  uuid, uuid, uuid, text, text, smallint, public.club_booking_source, boolean, text
) to authenticated;

-- Place une réservation sur une table libre de la soirée, ou la déplace. Sa
-- zone suit la table ; le prix payé ne change pas.
drop function public.club_deplacer_reservation(uuid, uuid);

create function public.club_placer_reservation(p_booking uuid, p_table uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
  v_table club_tables;
  v_event club_events;
begin
  select * into v_booking from club_bookings where id = p_booking for update;
  if v_booking.id is null or not club_peut(v_booking.etablissement_id, 'placer') then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if not club_booking_holds(v_booking.status, v_booking.hold_expires_at) then
    raise exception 'Cette réservation n''est plus active.';
  end if;
  select * into v_event from club_events where id = v_booking.event_id;
  if v_event.cancelled_at is not null or v_event.ends_at <= now() then
    raise exception 'Cette soirée est close.';
  end if;
  select * into v_table from club_tables
  where id = p_table and etablissement_id = v_booking.etablissement_id;
  if v_table.id is null then
    raise exception 'Table introuvable.';
  end if;
  if v_table.seats < v_booking.party_size then
    raise exception 'Cette table accueille % personnes au plus.', v_table.seats;
  end if;
  perform club_liberer_attentes(v_booking.event_id, p_table);
  begin
    update club_bookings set table_id = p_table, zone_id = v_table.zone_id where id = p_booking;
  exception when unique_violation then
    raise exception 'Cette table est déjà prise.';
  end;
end;
$$;

revoke execute on function public.club_placer_reservation(uuid, uuid) from public, anon;
grant execute on function public.club_placer_reservation(uuid, uuid) to authenticated;

-- Le suivi de la soirée : réservée → arrivée → assise → partie. Avancer
-- demande le droit du statut posé (on peut sauter une étape : installer une
-- table que l'accueil n'a pas pointée) ; revenir d'un cran, après une
-- erreur, celui du statut défait. « payee » ramène à réservée. Installer
-- demande une table et une table réglée : p_paid encaisse d'abord le reste.
-- Partie, la table se libère ; revenir dessus échoue si elle a été reprise.
drop function public.club_marquer_arrivee(uuid, boolean, boolean);

create function public.club_statut_reservation(
  p_booking uuid,
  p_status public.club_booking_status,
  p_paid boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
  v_from int;
  v_to int;
begin
  select * into v_booking from club_bookings where id = p_booking for update;
  if v_booking.id is null or current_member_role(v_booking.etablissement_id) is null then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_booking.status not in ('en_attente', 'payee', 'arrivee', 'assise', 'partie')
     or (v_booking.status = 'en_attente' and v_booking.hold_expires_at is not null) then
    raise exception 'Cette réservation n''est plus active.';
  end if;

  v_from := case v_booking.status
    when 'arrivee' then 1 when 'assise' then 2 when 'partie' then 3 else 0 end;
  v_to := case p_status
    when 'payee' then 0 when 'arrivee' then 1 when 'assise' then 2 when 'partie' then 3 end;
  if v_to is null then
    raise exception 'Statut invalide.';
  end if;
  if v_to = v_from and not p_paid then
    return;
  end if;
  if v_to < v_from - 1 then
    raise exception 'Revenez d''un statut à la fois.';
  end if;
  if not club_peut(
    v_booking.etablissement_id,
    case when v_to >= v_from then p_status::text else v_booking.status::text end
  ) then
    raise exception 'Votre poste ne permet pas ce geste.' using errcode = '42501';
  end if;
  if v_to = 3 and v_from = 0 then
    raise exception 'Ce client n''est pas encore arrivé.';
  end if;

  if v_to >= 2 then
    if v_booking.table_id is null then
      raise exception 'Placez d''abord la réservation sur une table.';
    end if;
    if p_paid then
      perform club_encaisser_reste(p_booking);
      select * into v_booking from club_bookings where id = p_booking;
    end if;
    if v_booking.paid_cents < v_booking.price_cents then
      raise exception 'Reste % € à encaisser avant d''installer la table.',
        replace(to_char((v_booking.price_cents - v_booking.paid_cents) / 100.0, 'FM999990.00'), '.', ',');
    end if;
  end if;

  begin
    update club_bookings
    set status = case
          when v_to = 3 then 'partie'
          when v_to = 2 then 'assise'
          when v_to = 1 then 'arrivee'
          when paid_at is not null then 'payee'
          else 'en_attente'
        end::club_booking_status,
        arrived_at = case when v_to >= 1 then coalesce(arrived_at, now()) end,
        seated_at = case when v_to >= 2 then coalesce(seated_at, now()) end,
        left_at = case when v_to = 3 then coalesce(left_at, now()) end
    where id = p_booking;
  exception when unique_violation then
    raise exception 'La table a été réattribuée entre-temps : placez la réservation sur une autre.';
  end;
end;
$$;

revoke execute on function public.club_statut_reservation(uuid, public.club_booking_status, boolean)
  from public, anon;
grant execute on function public.club_statut_reservation(uuid, public.club_booking_status, boolean)
  to authenticated;

-- Le caissier encaisse le reste d'une table sans changer son statut.
create function public.club_encaisser(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
begin
  select * into v_booking from club_bookings where id = p_booking;
  if v_booking.id is null or not club_peut(v_booking.etablissement_id, 'assise') then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_booking.status not in ('en_attente', 'payee', 'arrivee', 'assise', 'partie')
     or (v_booking.status = 'en_attente' and v_booking.hold_expires_at is not null) then
    raise exception 'Cette réservation n''est plus active.';
  end if;
  perform club_encaisser_reste(p_booking);
end;
$$;

revoke execute on function public.club_encaisser(uuid) from public, anon;
grant execute on function public.club_encaisser(uuid) to authenticated;

-- Annule une réservation saisie par le club, ou réglée sur place. Une part
-- payée en ligne se rembourse (route serveur), elle ne s'annule pas ici :
-- l'argent doit suivre.
create or replace function public.club_annuler_reservation(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking club_bookings;
begin
  select * into v_booking from club_bookings where id = p_booking for update;
  if v_booking.id is null or not club_peut(v_booking.etablissement_id, 'reserver') then
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
  where id = p_booking and status in ('en_attente', 'payee', 'arrivee', 'assise');
  update club_payments set status = 'annulee'
  where booking_id = p_booking and status = 'en_attente';
end;
$$;
