# Tâches manuelles

Étapes qu'un agent de code ne peut pas faire à ta place : elles se passent dans
des dashboards (Supabase, Vercel) ou sur ta machine. Tant qu'elles ne sont pas
faites, les fonctionnalités correspondantes restent inertes en production — le
code, lui, est en place.

## 1. Identité des boutiques : icône et aperçu de partage (2026-09-09)

Une seule migration, sans effet sur l'existant : elle ajoute une colonne
facultative. À appliquer avec les autres.

- [ ] **Supabase** : `supabase db push` — applique
      `20260909000001_shop_share_image.sql` (colonne `shops.share_image_url`).
- [ ] **Types** : l'entrée a été ajoutée à la main dans
      `frontend/lib/supabase/database.types.ts`, à régénérer avec le reste.
- [ ] **Image de partage de MyBox** : le seed pose `signature.webp`, qui est
      au format portrait. Une image paysage 1200 × 630 donnerait un plus bel
      aperçu — la gérante la pose elle-même dans Gestion → Boutique, champ
      « Image de partage ». Sans elle, le logo rond est utilisé.
- [ ] **Vérifier après déploiement** : ouvrir la boutique, l'onglet du
      navigateur doit porter son logo et non celui d'Ominin ; puis coller le
      lien de la boutique dans WhatsApp, ou le passer au validateur de partage
      de Facebook, pour voir apparaître le nom, la signature et l'image. Les
      réseaux gardent les aperçus en cache : forcer une relecture depuis le
      validateur si l'ancien vide persiste.

## 2. Service direct, badgeuse et planning, Google Analytics (2026-09-08)

Deux migrations, une variable d'environnement. **Ordre à respecter** : la
migration et le déploiement du front doivent tomber dans la même fenêtre —
`pay_order_items` change de signature (l'ancienne est supprimée pour ne pas
laisser deux surcharges à PostgREST), donc entre les deux l'encaissement est
en panne pour qui n'a pas encore le nouveau front.

- [ ] **Supabase** : `supabase db push` — applique
      `20260908000001_service_direct.sql` (clôture directe de la commande
      encaissée quand un boîtier Omilink vivant sort son ticket, encaissement
      à l'unité avec scission de ligne, fusion des triggers de tickets) et
      `20260908000002_temps_travail.sql` (tables `shifts` et `time_entries`,
      RLS, trigger de correction). Les 43 migrations ont été rejouées sur un
      Postgres 16 vierge et le flux testé par un scénario SQL de 15 étapes.
      Aucune donnée existante n'est réécrite : les commandes déjà `payee`
      restent à servir jusqu'à ce qu'on les serve.
- [ ] **Vercel** : poser `NEXT_PUBLIC_GA_ID` (identifiant de mesure GA4, de la
      forme `G-XXXXXXXXXX`, à créer dans Google Analytics → Admin → Flux de
      données → Web pour `ominin.com`). Sans elle, aucun script Google n'est
      chargé et le bandeau cookies ne s'affiche pas — c'est le comportement
      voulu en préproduction.
- [ ] **Types** : même remarque qu'au § 3 — les entrées `shifts`,
      `time_entries` et la nouvelle signature de `pay_order_items` ont été
      écrites à la main dans `frontend/lib/supabase/database.types.ts`.
- [ ] **Graphe de connaissance** : `graphify update .` puis commiter
      `graphify-out/` — graphify n'est pas installé sur la machine d'où ces
      changements ont été faits.
- [ ] **Demander à l'équipe de poser son nom** : sur l'onglet Badgeage, chacun
      renseigne son nom d'affichage (« Votre nom, visible par l'équipe »).
      Sans lui, l'équipe apparaît en adresses e-mail sur la badgeuse et le
      planning — et seul le membre peut poser le sien, pas le gérant.
- [ ] **Vérifier après déploiement** : une table réglée disparaît directement
      dans l'historique et son ticket sort en cuisine ; débrancher le boîtier
      fait réapparaître l'onglet « À servir » ; deux nems d'une même ligne se
      cochent séparément et peuvent partir l'un en espèces, l'autre en carte ;
      la page Paiements sépare Carte et En ligne ; sur Badgeage, une arrivée
      signée puis un départ signé donnent une durée juste, et le gérant les
      relit et les corrige depuis Équipe → Badgeages ; la bannière cookies
      apparaît sur `ominin.com` mais ni sur `/gestion` ni sur un menu QR.

## 3. Ominin Shop : mise en ligne des boutiques (2026-09-08)

Quatrième produit, servi sur `shop.ominin.com`. Rien n'est partagé avec les
restaurants : nouvelles tables `shop_*`, nouveau webhook Stripe, nouveau
sous-domaine. Tant que ces étapes ne sont pas faites, `shop.ominin.com`
répond 404 et aucune boutique n'existe. **Ordre à respecter** : migration,
puis variables d'environnement, puis déploiement, puis Stripe et Supabase Auth,
puis les données de la première boutique.

Le code est fusionné dans `main`. Rien n'a été modifié côté restaurants :
leurs fichiers sont identiques, la migration ne fait que des `create`, et le
webhook de la plateforme ne détourne que les événements portant
`metadata.shop_id`.

- [ ] **Supabase** : `supabase db push` — applique
      `20260907000003_shop.sql` (tables `shop_*`, RLS, fonctions
      `current_shop_role`, `create_shop`, `shop_decrement_stock`,
      `shop_increment_discount_uses`, `shop_sales_by_day`, bucket
      `shop-photos`). Sans effet sur les tables des restaurants : la migration
      ne fait que des `create`.
- [ ] **Types** : rien à faire dans l'immédiat — les entrées `shop_*` ont été
      insérées à la main dans `frontend/lib/supabase/database.types.ts`, le
      reste du fichier est intact. Si tu régénères un jour le fichier entier
      (`supabase gen types typescript --linked`), la CLI actuelle réécrit aussi
      les types des restaurants : elle déclare les arguments optionnels des
      fonctions sans `null`, ce qui casse trois appels d'encaissement
      (`lib/gestion/api.ts`, `lib/stripe/server.ts`, `lib/sumup/server.ts`) où
      il faudra omettre l'argument au lieu de passer `null`. Comportement
      identique en base, mais à faire en connaissance de cause.
- [ ] **Vercel — sous-domaine** : ajouter `shop.ominin.com` au projet (même
      déploiement, le proxy route sur le préfixe `/shop` comme pour collect et
      clip), puis créer le CNAME chez le registrar.
- [ ] **Vercel — variables** : `NEXT_PUBLIC_SHOP_HOST=shop.ominin.com`,
      `SHOP_MAIL_FROM` (expéditeur des e-mails aux clientes, un domaine vérifié
      chez Resend, par exemple `MyBox <bonjour@ominin.com>`) et
      `STRIPE_SHOP_WEBHOOK_SECRET` (voir l'étape suivante).
- [ ] **Stripe — webhook des boutiques** : créer un endpoint distinct de celui
      des restaurants, sur `https://shop.ominin.com/api/shop/webhook`, en
      **écoutant les événements des comptes connectés** — les ventes des
      boutiques arrivent sur le compte Stripe de la cliente, pas sur le nôtre,
      donc l'option « Connect » est indispensable. Six événements :
      `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
      `checkout.session.expired`, `checkout.session.async_payment_failed`,
      `charge.refunded` et `account.updated` (les deux derniers synchronisent
      les remboursements et l'état du compte Stripe de la boutique : sans eux,
      l'écran Boutique reste bloqué sur « Non connecté »). En une commande,
      depuis n'importe quel terminal, avec la clé secrète live :

      ```
      curl https://api.stripe.com/v1/webhook_endpoints \
        -u sk_live_XXX: \
        -d url="https://shop.ominin.com/api/shop/webhook" \
        -d connect=true \
        -d "enabled_events[]=checkout.session.completed" \
        -d "enabled_events[]=checkout.session.async_payment_succeeded" \
        -d "enabled_events[]=checkout.session.expired" \
        -d "enabled_events[]=checkout.session.async_payment_failed" \
        -d "enabled_events[]=charge.refunded" \
        -d "enabled_events[]=account.updated"
      ```

      La réponse contient `"secret": "whsec_…"`, visible une seule fois : c'est
      la valeur de `STRIPE_SHOP_WEBHOOK_SECRET` à mettre dans Vercel. Le webhook
      de la plateforme, lui, n'a rien à changer : il écoute déjà
      `checkout.session.completed`, `customer.subscription.updated` et
      `customer.subscription.deleted`, les trois événements dont les
      abonnements Shop ont besoin.
- [ ] **Stripe — Connect** : vérifier que les comptes **Express** sont activés
      dans les réglages Connect (les restaurants utilisent déjà Express) et que
      l'URL de retour d'onboarding accepte `shop.ominin.com`.
- [ ] **Supabase Auth** : ajouter `https://shop.ominin.com/**` aux *Redirect
      URLs* du projet — sans quoi les liens magiques envoyés aux clientes
      ramènent sur `ominin.com` au lieu de leur boutique.
- [ ] **Première boutique (MyBox)** : depuis `frontend/`, avec
      `SEED_SHOP_OWNER_PHONE` et `SEED_SHOP_OWNER_PASSWORD` renseignés dans
      `backend/.env`, lancer `npm run seed:shop` — crée la boutique `mybox`,
      ses 13 box, les 10 parfums, les modes de livraison, la FAQ et le compte
      de la gérante. Idempotent, relançable.
- [ ] **Textes légaux** : les CGV, mentions légales et politique de
      confidentialité de MyBox contiennent des `[À COMPLÉTER]` (SIRET, adresse,
      identité de l'éditeur). À remplir depuis `/gestion` → Contenu avant
      d'ouvrir la boutique au public : sans ces mentions, la vente en ligne
      n'est pas conforme.
- [ ] **Tarifs de l'offre** : `shopOffer` (`frontend/lib/shop-landing-data.ts`)
      est à `published: false`, prix à 0, la page de vente affiche « Sur
      devis ». Une fois les montants décidés, les renseigner, passer
      `published` à `true` et lancer `npm run setup:stripe` — il crée
      `shop_setup` (paiement unique) et `shop_monthly` (abonnement). Le script
      refuse un tarif à 0 €.
- [ ] **Graphe de connaissance** : `graphify update .` depuis la racine, puis
      commiter `graphify-out/` — graphify n'est pas installé sur la machine
      d'où ces changements ont été faits.
- [ ] **Vérifier après déploiement** : `shop.ominin.com` affiche la page de
      vente ; `shop.ominin.com/mybox` affiche la boutique à ses couleurs ;
      une commande test passe par Stripe et remonte dans `/gestion` ; le lien
      magique reçu par e-mail ouvre bien l'espace cliente de la boutique ;
      `shop.ominin.com/gestion` renvoie vers la connexion quand on est
      déconnecté. Rien de tout cela ne doit toucher `ominin.com` ni les
      restaurants : leurs pages et leur webhook Stripe sont inchangés.
