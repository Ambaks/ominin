-- Ominin Club : plus d'étape « Arrivée ». Le suivi d'une table devient
-- réservée → assise → partie : le caissier installe une réservation placée
-- (en encaissant le reste), le chef de rang marque le départ. Revenir sur
-- une installation ramène donc la réservation à « réservée ».
-- Le statut « arrivee » reste lisible pour les réservations qui l'ont déjà.

create or replace function public.club_statut_reservation(
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
  -- Une installation se défait jusqu'à « réservée » (il n'y a plus d'arrivée).
  if v_to < v_from - 1 and not (v_from = 2 and v_to = 0) then
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
