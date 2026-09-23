-- La journée de service ne s'arrête pas forcément à minuit. Un bar ouvert de
-- 17h à 3h fait une seule soirée : ce qui s'encaisse après minuit appartient
-- à la veille, pour le CA du jour comme pour l'historique des paiements.
--
-- day_end_hour est l'heure locale où la journée bascule. 0 (minuit) ne change
-- rien pour les restaurants qu'on n'a pas réglés.

alter table public.etablissement_settings
  add column day_end_hour smallint not null default 0
    check (day_end_hour between 0 and 23);

-- Le BOHO ferme à 3h. La bascule à 5h laisse de la marge à une addition
-- encaissée juste après la fermeture, sans jamais mordre sur l'ouverture.
update public.etablissement_settings
set day_end_hour = 5,
    updated_at = now()
where etablissement_id = (
  select id from public.etablissements where slug = 'boho'
);
