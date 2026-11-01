-- Les bulles du vrai Boho, aux réglages validés de sa démonstration : 9,90 € la
-- place, de 3 à 8 personnes, 2 h, réservable 14 jours à l'avance. Ceci ouvre la
-- réservation au public : si son paiement Square n'est pas prêt, la migration
-- échoue et rien ne s'applique.
--
-- Aucune table liée : une table liée à une bulle refuse les commandes tant que
-- la réservation n'est pas payée (orders_bulle_payee). Le gérant les lie dans
-- ses réglages, une fois choisies celles qui sont vraiment dans les bulles.
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
    raise exception 'Le paiement Square du Boho n''est pas prêt : réservation non ouverte.';
  end if;

  insert into bulle_reglages (etablissement_id, place_cents, min_party, max_party, duration_minutes, booking_days, vat_rate)
  values (v_boho, 990, 3, 8, 120, 14, 10)
  on conflict (etablissement_id) do nothing;

  if not exists (select 1 from bulles where etablissement_id = v_boho) then
    insert into bulles (etablissement_id, name, color, sort)
    values
      (v_boho, 'La Bleue', '#3e6b78', 1),
      (v_boho, 'La Rouge', '#b5443a', 2),
      (v_boho, 'La Grise', '#8a8580', 3),
      (v_boho, 'La Verte', '#6f7f4e', 4);
  end if;

  -- Des créneaux de 2 h dans ses horaires du soir (16 h – 2 h ; le samedi, il
  -- ouvre à 18 h), en minutes depuis minuit du jour.
  insert into bulle_creneaux (etablissement_id, weekday, start_minutes)
  select v_boho, d, m
  from generate_series(1, 7) as d
  cross join (values (960), (1080), (1200), (1320), (1440)) as starts (m)
  where not (d = 6 and m < 1080)
  on conflict (etablissement_id, weekday, start_minutes) do nothing;

  update etablissement_settings
  set features = coalesce(features, '{}'::jsonb) || '{"bulles": true}'::jsonb
  where etablissement_id = v_boho;
end;
$$;
