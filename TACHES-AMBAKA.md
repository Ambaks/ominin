# Tâches manuelles

Étapes qu'un agent de code ne peut pas faire à ta place : elles se passent dans
des dashboards (Supabase, Vercel) ou sur ta machine. Tant qu'elles ne sont pas
faites, les fonctionnalités correspondantes restent inertes en production — le
code, lui, est en place.

## 1. Flux « on encaisse d'abord », service par article, lien avis Google (2026-09-04)

Quatre migrations accompagnent la refonte de la salle : la commande sur place
naît « à encaisser », part en cuisine (ticket Omilink) et passe « à servir »
une fois réglée, se clôt quand chaque article est servi. Plus d'écran cuisine,
plus de groupes de tables ni d'affectation des serveurs ; page Tables réduite
aux tables en service, bouton + pour ouvrir une table (numéro connu ou nouveau).
Le menu QR gagne un lien « Laisser un avis Google ». **Ordre à respecter** :
migrations d'abord, déploiement du front ensuite — sans elles, l'encaissement,
le service (RPC `pay_order_items`, `serve_order_items`), le paiement en ligne
(`mark_order_paid_online`, appelée par les webhooks) et le lien d'avis renvoient
une erreur.

- [ ] **Supabase** : `supabase db push` — applique dans l'ordre
      `20260904000002_payment_mode_mixte.sql` (valeur d'enum `mixte`, fichier
      isolé volontairement), `20260904000003_item_payments.sql`
      (`order_items.paid_mode` / `paid_at`, RPC `pay_order_items`, backfill),
      `20260904000004_google_review_url.sql` et
      `20260904000005_service_flow.sql` (`order_items.served_at`, nouvelles
      transitions et droits, RPC `serve_order_items` et
      `mark_order_paid_online`, tickets à l'encaissement, suppression de
      `table_groups` et des colonnes `group_id` / `server_id`, remappage des
      commandes sur place ouvertes). Les 36 migrations ont été rejouées sur un
      Postgres 16 vierge et le flux testé par un scénario SQL de 15 étapes :
      ça passe. Attention : la migration supprime définitivement les groupes de
      tables existants et les affectations serveur.
- [ ] **Types** : régénérer après le push —
      `supabase gen types typescript --linked > frontend/lib/supabase/database.types.ts`
      (les nouvelles colonnes, la valeur `mixte` et les trois RPC ont été
      écrites à la main en attendant).
- [ ] **Graphe de connaissance** : `graphify update .` depuis la racine, puis
      commiter `graphify-out/` — graphify n'est pas installé sur la machine
      d'où ces changements ont été faits, le graphe n'a pas suivi.
- [ ] **Vérifier après déploiement** : une commande passée depuis le menu QR
      (« Payer au comptoir ») apparaît dans À encaisser sans ticket ; à
      l'encaissement complet, le ticket sort sur l'imprimante et la table passe
      dans À servir ; « Servie » ligne par ligne clôt la commande ; un paiement
      carte en ligne (Stripe ou SumUp) envoie directement la commande en
      cuisine et dans À servir ; le bouton + de la page Tables ouvre un numéro
      nouveau ; un compte cuisinier ne voit plus Commandes ni Tables ; après
      avoir renseigné « Avis Google » dans Établissement, le bas du menu QR
      affiche « Laisser un avis Google ».
