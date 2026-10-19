-- La photo par formule (20261019000004) cède la place aux affiches des
-- offres (20261020000002). Appliquée après le déploiement du code qui ne
-- l'écrit plus.

alter table public.formules drop column image;
