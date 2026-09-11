-- Trois réglages de boutique, tous facultatifs, sans effet tant qu'ils sont
-- vides.
--
--  1. shops.hero_image_url — la photo d'accueil. Le haut de page ne met plus
--     un produit en avant mais l'univers de la boutique : une image, la
--     signature, un bouton. Sans image, l'accueil garde son fond teinté.
--  2. shop_categories.image_url et is_highlighted — les collections mises en
--     avant sur l'accueil, en pastilles rondes sous le haut de page. La
--     gérante en choisit trois et leur donne chacune une photo.
--  3. shop_products.personalization_label — un produit qui le porte propose
--     un champ libre court (une lettre, un chiffre) à l'ajout au panier ; la
--     saisie rejoint les options figées de la ligne de commande, et suit donc
--     le bon de préparation et les e-mails sans autre plomberie.

alter table public.shops add column hero_image_url text;

alter table public.shop_categories
  add column image_url text,
  add column is_highlighted boolean not null default false;

alter table public.shop_products add column personalization_label text;
