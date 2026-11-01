-- Les réglages du vrai Boho, validés sur sa démonstration, à la place de ceux
-- saisis pour essayer : 9,90 € la place, de 3 à 8 personnes, 2 h, réservable
-- 14 jours à l'avance. La migration échoue, sans rien changer, si son paiement
-- Square n'est pas prêt ou si une réservation payée reste à venir.
--
-- Une bulle qui a déjà une réservation se retire au lieu de s'effacer : ses
-- réservations restent. Aucune table liée : une table liée à une bulle refuse
-- les commandes tant que la réservation n'est pas payée (orders_bulle_payee).
do $$
declare
  v_boho uuid;
begin
  select id into v_boho from etablissements where slug = 'boho';
  if v_boho is null then
    return;
  end if;

  if not exists (
    select 1 from etablissements e
    join square_accounts a on a.etablissement_id = e.id
    where e.id = v_boho
      and e.payment_provider = 'square'
      and e.online_payment
      and e.square_location_id is not null
  ) then
    raise exception 'Le paiement Square du Boho n''est pas prêt : réglages inchangés.';
  end if;

  if exists (
    select 1 from bulle_reservations
    where etablissement_id = v_boho
      and starts_at > now()
      and (status in ('confirmee', 'arrivee') or (status = 'en_attente' and places_paid > 0))
  ) then
    raise exception 'Une réservation payée du Boho reste à venir : réglages inchangés.';
  end if;

  delete from bulle_creneaux where etablissement_id = v_boho;

  update bulles set active = false, table_id = null
  where etablissement_id = v_boho
    and exists (select 1 from bulle_reservations r where r.bulle_id = bulles.id);
  delete from bulles
  where etablissement_id = v_boho
    and not exists (select 1 from bulle_reservations r where r.bulle_id = bulles.id);

  insert into bulle_reglages (etablissement_id, place_cents, min_party, max_party, duration_minutes, booking_days, vat_rate)
  values (v_boho, 990, 3, 8, 120, 14, 10)
  on conflict (etablissement_id) do update set
    place_cents = excluded.place_cents,
    min_party = excluded.min_party,
    max_party = excluded.max_party,
    duration_minutes = excluded.duration_minutes,
    booking_days = excluded.booking_days,
    vat_rate = excluded.vat_rate;

  insert into bulles (etablissement_id, name, color, sort)
  values
    (v_boho, 'La Bleue', '#3e6b78', 1),
    (v_boho, 'La Rouge', '#b5443a', 2),
    (v_boho, 'La Grise', '#8a8580', 3),
    (v_boho, 'La Verte', '#6f7f4e', 4);

  -- Des créneaux de 2 h dans ses horaires du soir (16 h – 2 h ; le samedi, il
  -- ouvre à 18 h), en minutes depuis minuit du jour.
  insert into bulle_creneaux (etablissement_id, weekday, start_minutes)
  select v_boho, d, m
  from generate_series(1, 7) as d
  cross join (values (960), (1080), (1200), (1320), (1440)) as starts (m)
  where not (d = 6 and m < 1080);

  update etablissement_settings
  set features = coalesce(features, '{}'::jsonb) || '{"bulles": true}'::jsonb
  where etablissement_id = v_boho;
end;
$$;
