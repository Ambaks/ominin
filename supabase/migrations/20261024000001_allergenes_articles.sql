-- Les allergènes d'un article, saisis par le gérant dans sa gestion : la
-- fiche d'un plat sur le menu (components/menu/dish-sheet.tsx) les montre un
-- par un. Les quatorze du règlement INCO (annexe II), sous les clés de
-- lib/menu-data.ts (Allergen).
--
-- NULL : pas renseigné — le menu invite le client à demander à l'équipe.
-- '{}' : renseigné, aucun des quatorze. Jamais deviné : seul le gérant écrit.
-- ---------------------------------------------------------------------------

create type public.allergen as enum (
  'gluten',
  'crustaces',
  'oeuf',
  'poisson',
  'arachides',
  'soja',
  'lait',
  'fruits-a-coque',
  'celeri',
  'moutarde',
  'sesame',
  'sulfites',
  'lupin',
  'mollusques'
);

alter table public.items add column allergens public.allergen[];
