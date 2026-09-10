-- « Appeler un serveur » devient une capacité comme les autres. Le bouton du
-- menu QR sonne sur les téléphones de l'équipe ; c'est un service qui suppose
-- une salle qui répond. Un restaurant qui n'en veut pas le disait jusqu'ici en
-- coupant les notifications, membre par membre : le bouton restait, et le
-- client attendait quelqu'un que personne n'avait prévenu.
--
-- Rien à créer côté base : la clé rejoint `features`, comme le permet le jsonb
-- (voir 20260910000001_capabilites.sql). Le défaut de l'offre — ouvert avec
-- Smart et Connect — se lit dans OFFRE_FEATURES, côté code.
--
-- Le BOHO, lui, n'en veut pas : ses serveurs passent aux tables, et une
-- sonnerie de plus sur le téléphone du gérant n'aide personne. `||` plutôt
-- qu'une affectation : ses autres réglages restent en place.

update public.etablissement_settings
set features = features || '{"appel_serveur": false}'::jsonb,
    updated_at = now()
where etablissement_id = (
  select id from public.etablissements where slug = 'boho'
);
