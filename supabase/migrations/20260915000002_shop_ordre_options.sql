-- Ordre des listes d'options d'une boutique. Les valeurs d'une liste avaient
-- déjà le leur, les listes elles-mêmes sortaient par ordre alphabétique :
-- « Parfum » avant « Taille » quoi qu'en veuille la gérante. Même mécanisme
-- que les collections, les produits et la FAQ : un rang, le plus petit en
-- premier, réglé depuis la fiche de la liste.

alter table public.shop_option_groups
  add column sort_order int not null default 0;

create index shop_option_groups_shop_order_idx
  on public.shop_option_groups (shop_id, sort_order);
