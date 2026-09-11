# Tâches manuelles

Étapes qu'un agent de code ne peut pas faire à ta place : elles se passent dans
des dashboards (Supabase, Vercel) ou sur ta machine. Tant qu'elles ne sont pas
faites, les fonctionnalités correspondantes restent inertes en production — le
code, lui, est en place.

## État vérifié le 2026-09-11

Ce qui a pu être contrôlé depuis l'extérieur, sans clé ni dashboard, et qui
a été **retiré** des sections ci-dessous parce que c'est fait :

- **Migrations jusqu'à `20260911000002_boho_cuisson.sql` : appliquées.** Le
  menu QR public du BOHO affiche les options de cuisson (Saignant, À point,
  Bien cuit) que cette migration pose ; `supabase db push` appliquant les
  fichiers dans l'ordre, tout ce qui la précède est en production : shop,
  share_image, staff, fee_lock, staff_delete, capacités, salle, Square,
  platform_fee, service direct, temps de travail, menu analytics.
- **Boutiques en ligne** : `shop.ominin.com` répond, MyBox est semée et
  s'affiche avec ses treize box, `/gestion` renvoie vers `/connexion` hors
  session, l'onglet porte le logo MyBox et le lien partagé porte
  `signature.webp`.
- **Renouvellement Square** : `square-refresh.yml` n'utilise que
  `CRON_SECRET` et `MENU_URL`, tous deux présents dans les secrets GitHub.
- **Graphe de connaissance** : graphify est installé sur la machine
  (`uv tool install graphifyy`, 0.9.58) et le graphe a été rafraîchi.

Ce qui reste **impossible à vérifier sans accès** (base avec la clé service,
Vercel, Stripe, Supabase Auth) est laissé coché vide avec la mention
*« non vérifié »*. Ce qui est **confirmé non fait** est marqué *« à faire »*.

## 0. Portail, landing Shop et landing Collect (2026-09-11, branche `ominingeneral`)

Une migration (une colonne avec défaut) et trois pages publiques. **Sans la
migration, les deux formulaires de contact (ominin.com/sur-mesure et
shop.ominin.com) répondent 500** : la route écrit désormais `source`.

- [ ] **Supabase** : `supabase db push` — applique
      `20260912000005_contact_requests_source.sql` (après les deux migrations
      MyBox encore en attente, § 1). À faire **avant** de déployer la branche.
- [ ] **Fusionner `ominingeneral` dans `main`** après relecture. La branche
      contient déjà `main` au 2026-09-11 (tarifs planifiés, paiement mixte)
      et tout `ShopMyBox`.
- [ ] **Vérifier ominin.com** : cinq cubes ; le troisième, « Ominin Shop »,
      ouvre shop.ominin.com ; le dernier, « Sur mesure », est à l'horizontale
      sur ordinateur.
- [ ] **Tester le formulaire de shop.ominin.com** depuis un téléphone :
      envoyer un message ; il doit arriver sur `CONTACT_NOTIFY_TO` avec le
      sujet « Ominin Shop — <nom> » et laisser une ligne dans
      `contact_requests` avec `source = 'shop'`. Refaire l'envoi depuis
      ominin.com/sur-mesure (sujet « Sur mesure — … », `source = 'sur-mesure'`).
- [ ] **Donner à la gérante de MyBox le lien à partager** :
      `https://shop.ominin.com` (pas `/mybox`, qui est sa boutique). Les
      demandes qu'elle amène se reconnaissent au sujet « Ominin Shop ».
- [ ] **Décider pour le click & collect interne** (Collect). La landing dit
      que l'équipe peut saisir une commande à emporter prise au comptoir ou
      au téléphone (nom, jour et heure de retrait). Ça n'existe pas encore
      dans l'espace de gestion : le « + » de Commandes crée une commande sur
      place. Soit on le construit avant de signer une boulangerie, soit on
      retire le volet interne de `frontend/lib/collect-landing-data.ts`
      (`modesSection.modes[1]`, la question de FAQ « Peut-on aussi noter… »
      et « ou par votre comptoir » dans le titre de la section).
- [ ] **Vérifier le retrait à une autre date** sur une page de commande
      réelle : « Un autre jour » + date + heure, payer, puis contrôler que la
      carte cuisine affiche « Retrait : 13 sept., 10:30 » (la date n'apparaît
      que si ce n'est pas aujourd'hui).
- [ ] **Facultatif** : liens WhatsApp et Instagram sur la landing Shop pour
      les questions rapides. Il faut un numéro et un compte, donc deux
      variables d'environnement à décider avant de coder.

## 1. MyBox : photos, accueil, personnalisation (2026-09-11, branche `ShopMyBox`)

Deux migrations. La première ajoute des colonnes facultatives, sans effet
tant qu'elles sont vides ; la seconde règle MyBox nommément (photo d'accueil,
trois collections mises en avant, personnalisation sur toutes les box sauf
le duo de diffuseurs, secondes photos, question de FAQ). Les photos, elles,
partent avec le déploiement du front : mêmes chemins qu'avant, rien à
téléverser. *À faire* : au 2026-09-11, la boutique en ligne montre encore
l'ancien accueil et aucune fiche ne propose le champ de personnalisation.

- [ ] **Fusionner `ShopMyBox` dans `main`** après relecture (déjà contenue
      dans `ominingeneral`, § 0).
- [ ] **Supabase** : `supabase db push` — applique
      `20260911000005_shop_accueil_personnalisation.sql` puis
      `20260911000006_mybox_reglages.sql`. L'ordre compte. La seconde est
      rejouable : elle vérifie chaque insertion avant d'écrire.
- [ ] **Vérifier l'accueil** sur `shop.ominin.com/mybox`, téléphone et
      ordinateur : grande photo avec « Petites attentions, grands bonheurs »
      et le bouton « Découvrir nos box » ; dessous, trois pastilles rondes
      L'Essentiel / L'Évasion / Petits plaisirs ; puis l'accroche en
      citation. Tant que la migration n'est pas passée, le haut de page
      reste un bloc rose sans photo ni pastilles : c'est attendu.
- [ ] **Arbitrer les trois pastilles avec la gérante.** Sa maquette disait
      *Beauté / Bien-être / Surprises* ; les collections existantes s'en
      rapprochent au mieux. Pour changer un libellé ou une photo :
      Gestion → Produits → Collections → crayon (champ « Photo (URL) »,
      case « Mise en avant sur l'accueil »). La photo d'accueil se change
      dans Gestion → Boutique → « Photo d'accueil (URL) ».
- [ ] **Vérifier la personnalisation** : sur une fiche de box, le champ
      « Lettre ou chiffre sur la box » (3 caractères, mis en capitales)
      doit suivre jusqu'au panier, à la commande, dans l'e-mail de
      confirmation et sur le bon de préparation, sur la ligne de l'article.
      Le libellé se règle par produit dans Gestion → Produits → fiche →
      carte « Personnalisation » (vide = pas de champ).
- [ ] **Vérifier sur un téléphone** que la fiche produit ne déborde plus
      sur la droite et que les trois étapes du tunnel de commande tiennent
      dans la largeur.
- [ ] **Espace de gestion sur téléphone** : non audité (connexion requise
      depuis l'outil de capture). À parcourir une fois : Produits,
      Commandes, fiche de commande.

## 2. Étapes du service et équipe sans comptes (2026-09-10)

Deux migrations, et rien à cocher : les réglages du BOHO sont posés par la
seconde, qui le nomme. Les autres restaurants ne bougent pas — ils gardent
leur service en entier et leurs invitations par email. *Non vérifié* : ces
deux fichiers sont postérieurs à la dernière migration dont l'effet est
visible depuis l'extérieur.

- [ ] **Supabase** : `supabase db push` — applique
      `20260911000003_flux_commandes.sql` (type `order_tab`, colonne
      `etablissement_settings.order_tabs`) puis
      `20260911000004_boho_reglages.sql` (défaut aux trois étapes, et les
      réglages du BOHO : pas d'onglet « À servir », équipe au prénom).
      L'ordre compte, la seconde s'appuie sur la première.
- [ ] **Vérifier côté BOHO**, après la migration et un rechargement de la
      page :
      - dans **Commandes**, deux onglets seulement — « À encaisser » et
        « Historique ». Si un boîtier Omilink tombe, « À servir » reparaît le
        temps de la panne : c'est le filet, il est voulu, ne le retirez pas.
      - dans **Équipe → Membres**, la liste de l'équipe a remplacé le
        formulaire d'invitation : un bouton « + Ajouter un serveur » (un
        prénom suffit), les heures badgées de la semaine sur chaque ligne, et
        un bouton qui copie le lien de planning personnel.
- [ ] **Vérifier qu'un autre restaurant n'a rien vu passer** : il doit garder
      ses trois étapes dans Commandes et son formulaire d'invitation.

Pour régler un autre client plus tard, tout se fait sans SQL depuis
`admin.ominin.com/capacites` : la carte « Étapes de l'onglet Commandes » y
retire, rajoute et déplace les étapes, et les capacités se cochent au-dessus.

## 3. Capacités par restaurant et gestes de salle (2026-09-10)

Migrations `20260910000001_capabilites.sql` et `20260910000002_salle.sql`
appliquées. Les gestes de salle restent fermés par défaut, BOHO compris :
rien n'apparaît chez les clients tant que les cases ne sont pas cochées.

- [ ] **Vérifier** : `admin.ominin.com/clients` liste tous les
      établissements. Cocher et décocher une vue doit se voir aussitôt dans
      l'espace du restaurant, après un rechargement de sa page.

## 4. Square, deuxième encaisseur du menu QR (2026-09-09)

Repris du message du commit `81b7218` pour que rien ne se perde : ce lot est
d'Ambaka, ces étapes sont les siennes. Migrations `20260910000003` à
`20260910000005` appliquées ; secrets GitHub du renouvellement quotidien
posés. *À faire* : aucune variable Square dans `frontend/.env.local`.

- [ ] **Square** : créer l'application, déclarer l'URL de redirection OAuth et
      le webhook du produit.
- [ ] **Variables** (`.env.local` **et** Vercel, *non vérifié côté Vercel*) :
      `NEXT_PUBLIC_SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`,
      `SQUARE_WEBHOOK_SIGNATURE_KEY`, `CRON_SECRET`.
- [ ] **Parcours complet en bac à sable** avant tout client. Test décisif chez
      un pilote réel : la caisse et le ticket imprimé. Si le personnel ne voit
      pas « Table 7 » du premier coup d'œil, le produit paraît cassé quelle que
      soit la qualité de l'intégration.

## 5. Analytique du menu QR et tableau de bord client (2026-09-11)

Repris du message du commit `ed3200f`, comme ci-dessus : ce lot est d'Ambaka.
Migrations `20260911000001_menu_analytics.sql` et
`20260911000002_boho_cuisson.sql` appliquées.

- [ ] **Vérifier le battement** : ouvrir un menu QR, puis DevTools →
      Application → Session Storage. La session doit s'y écrire et se
      rafraîchir toutes les 45 s. Rien ne doit atterrir dans les cookies :
      c'est ce qui rend la mesure conforme sans bandeau.
- [ ] **Vérifier le tableau de bord** : `admin.ominin.com/clients` doit se
      rafraîchir tout seul, et l'entonnoir se remplir après quelques visites.
- [ ] **À finir** (noté par Ambaka lui-même) : les vues `activity.tsx` et
      `reglages.tsx` de la fiche client. La seconde n'affiche pour l'instant
      qu'un récapitulatif en lecture seule — offre, encaisseur, commission.
      Les capacités à cocher, elles, vivent dans l'onglet **Capacités** de la
      section Clients.

## 6. Commission des boutiques : poser le taux (2026-09-09)

La commission est codée de bout en bout (migration `shop_fee_lock`
appliquée), il ne manque que la valeur. Elle n'est **pas** réglable depuis
l'espace de la boutique (c'est le but), et il n'existe pas d'écran Ominin
pour la poser : elle se met à la main. *Non vérifié* : la valeur actuelle en
base n'est pas lisible sans la clé service.

- [ ] **Poser le taux**, une fois le pourcentage décidé, depuis l'éditeur SQL
      de Supabase (la clé service passe outre le verrou) :

      ```sql
      update public.shops set platform_fee_percent = 2 where slug = 'mybox';
      ```

      Le taux s'applique aux commandes suivantes et reste figé sur celles
      déjà passées. À décider en connaissant les frais Stripe, que la
      boutique paie de son côté : la commission Ominin s'y ajoute, elle ne
      s'y substitue pas.

## 7. Tablette de salle et serveurs sans compte (2026-09-09)

Migration `20260909000002_staff.sql` appliquée : planning et badgeages
désignent une fiche d'équipe, les membres existants ont été repris. Les
réglages du BOHO, eux, se font dans son espace de gestion (*non vérifié*).

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

## 8. Identité des boutiques : image de partage (2026-09-09)

Migration appliquée, icône d'onglet et balise de partage en place sur
`shop.ominin.com/mybox`. Il reste le choix d'une meilleure image.

- [ ] **Image de partage de MyBox** : le seed pose `signature.webp`, qui est
      au format portrait. Une image paysage 1200 × 630 donnerait un plus bel
      aperçu — la gérante la pose elle-même dans Gestion → Boutique, champ
      « Image de partage ». Sans elle, le logo rond est utilisé.
- [ ] **Contrôler l'aperçu réel** en collant le lien de la boutique dans
      WhatsApp, ou en le passant au validateur de partage de Facebook. Les
      réseaux gardent les aperçus en cache : forcer une relecture depuis le
      validateur si l'ancien vide persiste.

## 9. Service direct, badgeuse et planning, Google Analytics (2026-09-08)

Migrations `20260908000001_service_direct.sql` et
`20260908000002_temps_travail.sql` appliquées. *Non vérifié* : la variable
GA sur Vercel — la page d'accueil de ominin.com ne laisse voir ni identifiant
de mesure ni bandeau cookies depuis l'extérieur, ce qui ressemble à une
variable absente, sans certitude.

- [ ] **Vercel** : poser `NEXT_PUBLIC_GA_ID` (identifiant de mesure GA4, de la
      forme `G-XXXXXXXXXX`, à créer dans Google Analytics → Admin → Flux de
      données → Web pour `ominin.com`). Sans elle, aucun script Google n'est
      chargé et le bandeau cookies ne s'affiche pas — c'est le comportement
      voulu en préproduction.
- [ ] **Vérifier après déploiement** : une table réglée disparaît directement
      dans l'historique et son ticket sort en cuisine ; débrancher le boîtier
      fait réapparaître l'onglet « À servir » ; deux nems d'une même ligne se
      cochent séparément et peuvent partir l'un en espèces, l'autre en carte ;
      la page Paiements sépare Carte et En ligne ; sur Badgeage, une arrivée
      signée puis un départ signé donnent une durée juste, et le gérant les
      relit et les corrige depuis Équipe → Badgeages ; la bannière cookies
      apparaît sur `ominin.com` mais ni sur `/gestion` ni sur un menu QR.

## 10. Ominin Shop : mise en ligne des boutiques (2026-09-08)

Quatrième produit, servi sur `shop.ominin.com`. Migration appliquée,
sous-domaine et `NEXT_PUBLIC_SHOP_HOST` en place, MyBox semée. Restent les
branchements Stripe et Auth (*non vérifiés*) et deux points *à faire*
confirmés : les textes légaux et les tarifs de l'offre.

- [ ] **Vercel — variables** (*non vérifié*) : `GMAIL_CLIENT_ID`,
      `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` (mêmes valeurs que le
      backend — OAuth2 du compte omininsupport@gmail.com),
      `GMAIL_SENDER_EMAIL=omininsupport@gmail.com` et
      `STRIPE_SHOP_WEBHOOK_SECRET` (voir l'étape suivante).
- [ ] **Stripe — webhook des boutiques** (*non vérifié*) : créer un endpoint
      distinct de celui des restaurants, sur
      `https://shop.ominin.com/api/shop/webhook`, en **écoutant les
      événements des comptes connectés** — les ventes des boutiques arrivent
      sur le compte Stripe de la cliente, pas sur le nôtre, donc l'option
      « Connect » est indispensable. Six événements :
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
- [ ] **Stripe — Connect** (*non vérifié*) : vérifier que les comptes
      **Express** sont activés dans les réglages Connect (les restaurants
      utilisent déjà Express) et que l'URL de retour d'onboarding accepte
      `shop.ominin.com`.
- [ ] **Supabase Auth** (*non vérifié*) : ajouter `https://shop.ominin.com/**`
      aux *Redirect URLs* du projet — sans quoi les liens magiques envoyés aux
      clientes ramènent sur `ominin.com` au lieu de leur boutique.
- [ ] **Textes légaux** (*à faire* : six `[À COMPLÉTER]` visibles sur les
      pages CGV et Mentions légales de MyBox) : SIRET, adresse, identité de
      l'éditeur, médiateur. À remplir depuis `/gestion` → Boutique et
      Contenu avant d'ouvrir la boutique au public : sans ces mentions, la
      vente en ligne n'est pas conforme.
- [ ] **Tarifs de l'offre** (*à faire* : la page de vente affiche « Sur
      devis ») : `shopOffer` (`frontend/lib/shop-landing-data.ts`) est à
      `published: false`, prix à 0. Une fois les montants décidés, les
      renseigner, passer `published` à `true` et lancer `npm run setup:stripe`
      — il crée `shop_setup` (paiement unique) et `shop_monthly`
      (abonnement). Le script refuse un tarif à 0 €.
- [ ] **Vérifier de bout en bout** : une commande test passe par Stripe et
      remonte dans `/gestion` ; le lien magique reçu par e-mail ouvre bien
      l'espace cliente de la boutique. Rien de tout cela ne doit toucher
      `ominin.com` ni les restaurants : leurs pages et leur webhook Stripe
      sont inchangés.

## 11. Types Supabase à régénérer (toutes sections)

Les entrées `staff`, `admin_pins`, `staff_id`, `shifts`, `time_entries`,
`share_image_url`, `hero_image_url`, `image_url`/`is_highlighted` des
collections, `personalization_label`, `contact_requests.source`, la nouvelle
signature de `pay_order_items` et toutes les tables `shop_*` ont été écrites
à la main dans `frontend/lib/supabase/database.types.ts`. Elles fonctionnent
telles quelles.

- [ ] **Régénérer un jour le fichier entier** (`supabase gen types typescript
      --linked`), en connaissance de cause : la CLI actuelle réécrit aussi les
      types des restaurants et déclare les arguments optionnels des fonctions
      sans `null`, ce qui casse trois appels d'encaissement
      (`lib/gestion/api.ts`, `lib/stripe/server.ts`, `lib/sumup/server.ts`)
      où il faudra omettre l'argument au lieu de passer `null`. Comportement
      identique en base.
