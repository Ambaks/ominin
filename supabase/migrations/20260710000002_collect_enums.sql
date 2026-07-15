-- Click & collect : nouvelles valeurs d'enum, isolées dans leur propre
-- migration car une valeur ajoutée à un enum existant ne peut pas être
-- utilisée dans la transaction qui l'ajoute (contraintes et fonctions qui
-- s'en servent : migration suivante).

-- Statut terminal d'une commande à emporter remise au client.
alter type public.order_status add value 'retiree';
-- Paiement encaissé en ligne (Stripe) à la prise de commande.
alter type public.payment_mode add value 'en_ligne';

create type public.order_type as enum ('sur_place', 'collect');

-- Produits d'abonnement : 'offre' = la formule de menu (digital/smart/
-- connect, tarif retrouvé via etablissements.offre), 'collect' = le
-- click & collect, souscriptible seul ou en plus.
create type public.product as enum ('offre', 'collect');
