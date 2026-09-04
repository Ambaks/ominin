-- Lien « laisser un avis Google » de l'établissement, proposé en bas du menu
-- QR. Saisi par le gérant (page Établissement) : le lien de partage d'avis de
-- sa fiche Google Business. Public comme le reste de la vitrine (policy
-- « public read »), modifiable par le gérant (policy « gerant update »).

alter table public.etablissements add column google_review_url text;
