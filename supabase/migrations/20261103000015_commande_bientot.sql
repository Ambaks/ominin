-- « Commande bientôt » : la carte se consulte sur le menu QR, mais on n'y
-- commande pas encore (le paiement en ligne se met en place). Chaque « + »
-- reste, grisé, avec « Bientôt » dessous. Ominin l'allume et l'éteint depuis
-- l'admin, d'où etablissement_settings, que seul l'admin écrit et que le menu
-- public lit déjà.

alter table public.etablissement_settings
  add column ordering_soon boolean not null default false;
