# Tâches manuelles

Étapes qu'un agent de code ne peut pas faire à ta place : elles se passent dans
des dashboards (Supabase, Vercel) ou sur ta machine. Tant qu'elles ne sont pas
faites, les fonctionnalités correspondantes restent inertes en production — le
code, lui, est en place.

## 1. Capacités par restaurant et gestes de salle (2026-09-10)

Deux migrations, et rien d'autre : l'écran de réglage vit dans l'administration
Ominin, il n'y a aucune variable d'environnement à poser. Tant que la migration
n'est pas passée, l'espace de gestion charge quand même — les capacités
retombent simplement sur celles de l'offre.

- [ ] **Supabase** : `supabase db push` — applique
      `20260910000001_capabilites.sql` (table `etablissement_settings`,
      trigger qui donne sa ligne à chaque établissement, reprise des
      établissements existants, lecture anonyme des drapeaux pour le menu QR,
      lecture des abonnements par l'administration).
- [ ] **Supabase** : `supabase db push` — applique aussi
      `20260910000002_salle.sql` (affectation d'un serveur à une table,
      groupes de tables, pourboire attribué au serveur). Rien n'apparaît
      chez les clients tant que les cases correspondantes ne sont pas
      cochées : elles sont fermées par défaut, BOHO compris.
- [ ] **Vérifier après la migration** : `admin.ominin.com/clients` liste tous
      les établissements. Cocher et décocher une vue doit se voir aussitôt
      dans l'espace du restaurant, après un rechargement de sa page.

Aucun déploiement conjoint n'est nécessaire cette fois : le front sait vivre
sans la table (l'offre décide seule), et la table sans le front (personne ne
la lit). L'ordre n'a donc pas d'importance.

## 2. Square, deuxième encaisseur du menu QR (2026-09-09)

Repris du message du commit `81b7218` pour que rien ne se perde : ce lot est
d'Ambaka, ces étapes sont les siennes.

- [ ] **Supabase** : `supabase db push` — applique
      `20260910000003_square_provider.sql` (troisième valeur de
      `payment_provider`, isolée car `ALTER TYPE` ne se référence pas dans sa
      transaction), `20260910000004_square.sql` (`square_accounts`,
      `etablissements.square_location_id`, colonnes Square sur `orders`) et
      `20260910000005_platform_fee.sql` (séquestration plateforme à 1 % sur
      Stripe et Square).
- [ ] **Square** : créer l'application, déclarer l'URL de redirection OAuth et
      le webhook du produit.
- [ ] **Variables** (`.env.local` **et** Vercel) :
      `NEXT_PUBLIC_SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`,
      `SQUARE_WEBHOOK_SIGNATURE_KEY`, `CRON_SECRET`. Les mêmes en secrets
      GitHub, pour le renouvellement quotidien des jetons
      (`square-refresh.yml`).
- [ ] **Parcours complet en bac à sable** avant tout client. Test décisif chez
      un pilote réel : la caisse et le ticket imprimé. Si le personnel ne voit
      pas « Table 7 » du premier coup d'œil, le produit paraît cassé quelle que
      soit la qualité de l'intégration.

## 3. Commission des boutiques : poser le taux (2026-09-09)

La commission est codée de bout en bout, il ne manque que la valeur. Elle
n'est **pas** réglable depuis l'espace de la boutique (c'est le but), et il
n'existe pas d'écran Ominin pour la poser : elle se met à la main.

- [ ] **Supabase** : `supabase db push` — applique
      `20260909000003_shop_fee_lock.sql` (trigger réservant à Ominin le taux,
      le `slug` et `is_active`) et `20260909000004_staff_delete.sql`
      (suppression d'une fiche serveur sans perdre ses heures).
- [ ] **Poser le taux**, une fois le pourcentage décidé, depuis l'éditeur SQL
      de Supabase (la clé service passe outre le verrou) :

      ```sql
      update public.shops set platform_fee_percent = 2 where slug = 'mybox';
      ```

      Le taux s'applique aux commandes suivantes et reste figé sur celles
      déjà passées. À décider en connaissant les frais Stripe, que la
      boutique paie de son côté : la commission Ominin s'y ajoute, elle ne
      s'y substitue pas.

## 4. Tablette de salle et serveurs sans compte (2026-09-09)

Une migration, à appliquer avec les autres. Elle **transforme le planning et
les badgeages** : ils désignent désormais une fiche d'équipe et non plus un
compte. Les membres actuels sont repris automatiquement, rien n'est perdu.

- [ ] **Supabase** : `supabase db push` — applique
      `20260909000002_staff.sql` (table `staff`, reprise des membres, trigger
      qui donne sa fiche à tout membre invité, `shifts.staff_id` et
      `time_entries.staff_id`, fonction `staff_planning`, table `admin_pins`,
      colonne `etablissements.admin_pin_set`, fonctions `set_admin_pin` et
      `verify_admin_pin`). Les 45 migrations ont été rejouées sur un Postgres
      16 vierge et le tout testé par un scénario SQL de 11 étapes.
- [ ] **Types** : entrées `staff`, `admin_pins`, `staff_id` et les trois
      nouvelles fonctions ajoutées à la main dans
      `frontend/lib/supabase/database.types.ts`, à régénérer avec le reste.
- [ ] **Poser le code de la tablette de BOHO** : Gestion → Établissement →
      Tablette de salle, un code de 4 à 8 chiffres. Tant qu'aucun code n'est
      posé, rien ne change pour personne : l'espace s'ouvre comme avant.
      Une fois posé, chaque appareil démarre en vue salle et le bouton Admin
      de l'en-tête ouvre les écrans du gérant pour l'onglet en cours.
- [ ] **Créer les serveurs de BOHO** : Gestion → Équipe → Planning →
      « Ajouter un serveur ». Ils n'ont besoin d'aucune adresse e-mail. Le
      gérant copie ensuite le lien de planning depuis la fiche et l'envoie à
      chacun ; ce lien reste valable tant que la personne est dans l'équipe.
- [ ] **Vérifier après déploiement** : sur la tablette connectée au compte du
      restaurant, l'espace ouvre sur Commandes sans les onglets Paiements,
      Équipe ni Terminaux ; le bouton Admin les rend au bon code et les
      reprend au clic sur le cadenas ; la badgeuse propose les serveurs créés
      par le gérant ; le lien de planning s'ouvre sur un téléphone déconnecté
      et n'affiche que les créneaux de son destinataire ; retirer un serveur
      coupe son lien sans effacer ses heures dans Équipe → Badgeages.

## 5. Identité des boutiques : icône et aperçu de partage (2026-09-09)

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

## 6. Service direct, badgeuse et planning, Google Analytics (2026-09-08)

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
- [ ] **Types** : même remarque qu'au § 5 — les entrées `shifts`,
      `time_entries` et la nouvelle signature de `pay_order_items` ont été
      écrites à la main dans `frontend/lib/supabase/database.types.ts`.
- [ ] **Graphe de connaissance** : `graphify update .` puis commiter
      `graphify-out/` — graphify n'est pas installé sur la machine d'où ces
      changements ont été faits.
- [x] ~~Demander à l'équipe de poser son nom~~ — sans objet depuis le § 2 :
      c'est le gérant qui nomme les fiches, personne n'a plus à renseigner
      son nom pour figurer sur la badgeuse ou au planning.
- [ ] **Vérifier après déploiement** : une table réglée disparaît directement
      dans l'historique et son ticket sort en cuisine ; débrancher le boîtier
      fait réapparaître l'onglet « À servir » ; deux nems d'une même ligne se
      cochent séparément et peuvent partir l'un en espèces, l'autre en carte ;
      la page Paiements sépare Carte et En ligne ; sur Badgeage, une arrivée
      signée puis un départ signé donnent une durée juste, et le gérant les
      relit et les corrige depuis Équipe → Badgeages ; la bannière cookies
      apparaît sur `ominin.com` mais ni sur `/gestion` ni sur un menu QR.

## 7. Ominin Shop : mise en ligne des boutiques (2026-09-08)

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
      `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` (mêmes
      valeurs que le backend — OAuth2 du compte omininsupport@gmail.com),
      `GMAIL_SENDER_EMAIL=omininsupport@gmail.com` et
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
