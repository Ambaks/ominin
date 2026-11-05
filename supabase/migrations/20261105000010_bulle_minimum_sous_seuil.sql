-- Le minimum facturé reste sous le seuil de groupe quand un tarif de petit
-- groupe existe : au seuil, un duo paierait plus de places au prix fort qu'un
-- groupe au tarif de groupe (à 3 au Boho : 44,70 € à deux, 29,70 € à trois).
alter table public.bulle_reglages
  add constraint bulle_reglages_min_billed_sous_seuil
  check (small_group_place_cents is null or min_billed_places < group_threshold);
