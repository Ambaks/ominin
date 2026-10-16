-- Ominin Shop devient gratuite, rémunérée par une commission sur chaque
-- commande payée (CGV du 2026-10-16, Annexe 1). Une boutique ouverte à partir
-- d'aujourd'hui naît au taux annoncé — shopOffer.commissionPercent dans
-- lib/shop-landing-data.ts, à garder égal à cette valeur.
--
-- Les boutiques existantes gardent le taux de leur fiche : Ominin le fixe à
-- part (backend ou éditeur SQL, cf. 20260909000003_shop_fee_lock.sql).
alter table public.shops alter column platform_fee_percent set default 5;
