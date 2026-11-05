-- Ominin Club, cahier des charges de L'Étoile : une table se suit toute la
-- soirée en quatre temps — réservée, arrivée (l'accueil), assise (le
-- caissier, à l'encaissement), partie (le chef de rang, qui libère la table
-- pour une autre réservation). Et l'équipe d'un club a ses postes : accueil,
-- caissier, chef de rang, la direction étant le gérant.
--
-- Les valeurs d'un enum ne servent qu'une fois validées : elles naissent
-- ici, la migration suivante s'en sert.

alter type public.club_booking_status add value 'assise' after 'arrivee';
alter type public.club_booking_status add value 'partie' after 'assise';

create type public.club_role as enum ('accueil', 'caissier', 'chef_de_rang');
