-- L'habillage de saison du menu QR (feuilles d'automne, nuit d'Halloween) :
-- Ominin l'allume et l'éteint depuis l'admin, jamais le gérant — d'où
-- etablissement_settings, que seul l'admin écrit et que le menu public lit
-- déjà. saison_fin est le dernier jour de service où il s'affiche, à
-- l'heure de bascule de l'établissement (day_end_hour) : « jusqu'au 31 » au
-- BOHO couvre la soirée d'Halloween jusqu'à 5h. Sans date, jusqu'à ce qu'on
-- l'éteigne.

create type public.saison as enum ('automne', 'halloween');

alter table public.etablissement_settings
  add column saison public.saison,
  add column saison_fin date;
