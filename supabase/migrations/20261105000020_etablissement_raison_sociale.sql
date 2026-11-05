-- Qui vend : la raison sociale de la société qui exploite l'établissement,
-- dite avec son SIRET au-dessus de chaque paiement en ligne et sur son site
-- (« Vendu par … »). Vide tant que le gérant ne l'a pas donnée : rien ne s'affiche.
alter table public.etablissements
  add column raison_sociale text check (raison_sociale is null or length(btrim(raison_sociale)) between 1 and 200);
