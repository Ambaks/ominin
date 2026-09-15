# Tâches manuelles

Étapes qu'un agent de code ne peut pas faire à ta place : elles se passent dans
des dashboards (Supabase, Vercel, Stripe) ou sur ta machine. Tant qu'elles ne
sont pas faites, les fonctionnalités correspondantes restent inertes en
production — le code, lui, est en place. Nettoyé le 2026-09-15 : tout ce qui
est fait ou redondant a été retiré.

## En deux gestes (2026-09-15)

Tout ce qui attend — menu QR (paiement en ligne, lot MenuBoho), portail et
landings ominin.com, boutique MyBox — est dans **`main`** depuis la fusion
d'`ominingeneral` le 2026-09-16. Il n'y a qu'un push de base et un push de
`main` à faire, **dans cet ordre** :

1. **`supabase db push`** (CLI liée au projet de production ; depuis
   `frontend/`, `npm run db:push`). La CLI applique ce qui manque dans
   l'ordre des noms et saute ce qui est déjà enregistré. État vérifié le
   2026-09-16 (`supabase migration list --linked`) :

   | Migration | Statut |
   |---|---|
   | `20260911000003_flux_commandes` | en prod |
   | `20260911000004_boho_reglages` | en prod |
   | `20260911000005_shop_accueil_personnalisation` | en prod |
   | `20260911000006_mybox_reglages` | en prod |
   | `20260912000001_renvoi_tickets` | en prod |
   | `20260912000002_appel_serveur` | en prod |
   | `20260912000003_paiement_mixte` | en prod |
   | `20260912000004_tarifs_planifies` | en prod |
   | `20260912000005_contact_requests_source` | en prod |
   | `20260913000001_ordre_articles` | en prod |
   | `20260913000002_nom_ticket` | en prod |
   | `20260913000003_codes_badgeage` | en prod |
   | `20260913000004_lien_planning` | en prod |
   | `20260913000005_correction_encaissement` | en prod |
   | `20260915000001_paiement_en_ligne_en_cours` | à pousser |
   | `20260915000002_shop_ordre_options` | à pousser |

   `npx supabase --workdir .. migration list --linked` (depuis `frontend/`)
   affiche la vérité côté prod. Toute la chaîne a été rejouée sur un
   Postgres 16 vierge avant d'être poussée sur la branche.
2. **Pousser `main`** (`git push origin main`) : la fusion d'`ominingeneral`
   dans `main` est faite en local le 2026-09-16, c'est le push qui fait
   déployer `main` par Vercel. **Après** le push de la base : le nouveau menu
   QR appelle `place_order` à quatre arguments, qui n'existe qu'une fois
   `20260915000001` passée ; sans elle, plus aucune commande ne part du menu.

Les sections suivantes sont ce qu'il reste à vérifier ou à décider une fois
ces deux gestes faits.

## Accès Supabase pour Marwan (2026-09-15)

- [ ] **Ambaka** : supabase.com → projet de production → **Project Settings →
      Team** → inviter l'adresse Supabase de Marwan (Developer suffit).
- [ ] **Marwan**, une fois invité, depuis `frontend/` : `npm install`,
      `npm run db:login` (navigateur, son propre compte — aucun jeton à
      partager), `npm run db:link -- --project-ref <ref>`, puis
      `npm run db:push`. `npm run db:types` après une migration.
      Un seul des deux pousse une migration donnée.

## A. Paiement en ligne du menu QR (2026-09-15)

- [ ] **Stripe — webhook connecté** : vérifier que
      `/api/stripe/webhook-connect` reçoit `checkout.session.expired` en
      plus de `checkout.session.completed`. C'est lui qui supprime une
      commande dont le client a fermé Stripe sans payer ni choisir le
      comptoir (31 min) : stock rendu, aucune trace. Sans lui, elle reste
      invisible en `en_attente` sans retour du stock.
- [ ] **Vérifier au BOHO**, depuis un téléphone sur le menu QR :
      1. « Payer au comptoir » → la commande apparaît aussitôt dans
         À encaisser, push « Nouvelle commande ».
      2. « Payer par carte maintenant » → rien dans À encaisser ni en push
         tant que Stripe est ouvert ; payer → ticket à l'imprimante, commande
         dans Historique (À servir si aucun boîtier joignable), push à ce
         moment-là.
      3. « Payer par carte » puis annuler chez Stripe → écran « Paiement
         annulé » ; « Payer au comptoir » la fait apparaître dans À encaisser
         avec le carillon ; « Réessayer par carte » relance Stripe.
- [ ] **Limite connue** : un client qui repasse au comptoir plus de 15 min
      après avoir commandé fait apparaître la commande (onglet, carillon)
      mais sans push (`NOUVELLE_COMMANDE_MAX_AGE_MS`). À élargir si ça se
      voit en salle.

## B. Portail, landing Shop et landing Collect (2026-09-11)

- [ ] **Vérifier ominin.com** : cinq cubes ; « Ominin Shop » ouvre
      shop.ominin.com ; « Sur mesure » à l'horizontale sur ordinateur.
- [ ] **Tester le formulaire de shop.ominin.com** depuis un téléphone : le
      message arrive sur `CONTACT_NOTIFY_TO` avec le sujet « Ominin Shop —
      <nom> » et une ligne `contact_requests.source = 'shop'`. Idem depuis
      ominin.com/sur-mesure (`source = 'sur-mesure'`).
- [ ] **Donner à la gérante de MyBox le lien à partager** :
      `https://shop.ominin.com` (pas `/mybox`).
- [ ] **Décider pour le click & collect interne** : la landing Collect dit
      que l'équipe peut saisir une commande à emporter (nom, jour, heure).
      Ça n'existe pas dans l'espace de gestion. Soit le construire avant de
      signer une boulangerie, soit retirer le volet de
      `frontend/lib/collect-landing-data.ts` (`modesSection.modes[1]`, la
      question de FAQ « Peut-on aussi noter… », « ou par votre comptoir »
      dans le titre).
- [ ] **Vérifier le retrait à une autre date** : « Un autre jour » + date +
      heure, payer, la carte cuisine affiche « Retrait : 13 sept., 10:30 ».
- [ ] **Facultatif** : liens WhatsApp et Instagram sur la landing Shop (un
      numéro, un compte, deux variables d'environnement à décider).

## C. MyBox : accueil, personnalisation, mobile (2026-09-11)

Les photos sont en ligne depuis le 2026-09-15 (vérifié) et les deux
migrations MyBox sont en production (2026-09-16).

- [ ] **Vérifier l'accueil** sur `shop.ominin.com/mybox` : grande photo,
      « Petites attentions, grands bonheurs », bouton « Découvrir nos box »,
      trois pastilles L'Essentiel / L'Évasion / Petits plaisirs, accroche.
- [ ] **Arbitrer les trois pastilles avec la gérante** (sa maquette disait
      Beauté / Bien-être / Surprises). Libellé et photo : Gestion → Produits
      → Collections → crayon ; photo d'accueil : Gestion → Boutique.
- [ ] **Vérifier la personnalisation** : sur une box, le champ « Lettre ou
      chiffre sur la box » (3 caractères) suit jusqu'au panier, à la
      commande, à l'e-mail et au bon de préparation. Réglable par produit
      (fiche → carte « Personnalisation », vide = pas de champ).
- [ ] **Vérifier sur un téléphone** : fiche produit sans débordement, trois
      étapes du tunnel dans la largeur ; espace de gestion (Produits,
      Commandes, fiche de commande) jamais audité sur mobile.

## D. Lot MenuBoho : codes, ordre, ticket, planning, encaissements (2026-09-13)

Les cinq migrations `20260913…` sont en production (vérifié le 2026-09-16) ;
le front qui les appelle (`reorder_items`, `create_staff`,
`update_order_payment`, `items.print_name` sur le ticket) part avec `main`.
Restent les gestes en gestion et les vérifications en salle.

- [ ] **Poser les codes des serveurs du BOHO** : Gestion → Équipe, chaque
      fiche « Sans code » reçoit un code à quatre chiffres. Sans code, la
      fiche badge comme avant ; une fiche créée désormais en a un d'office.
- [ ] **Vérifier au BOHO** : pas d'onglet Produits ; le lien de planning
      d'un serveur ne montre que ses créneaux, sans total d'heures ; la
      badgeuse demande le code avant la signature ; flèches ↑ ↓ sur les
      articles, les groupes d'options et les choix, et le menu QR suit cet
      ordre ; le « Nom sur le ticket » d'un article sort sur le ticket
      cuisine ; dans Paiements, « Modifier l'encaissement » s'ouvre sur une
      addition carte ou mixte et reste fermé sur un paiement en ligne ;
      « Masquer » retire un serveur de la badgeuse et du planning sans
      effacer ses heures.
- [ ] **Autres restaurants** : l'onglet Produits reste ouvert (capacité
      `produits`, cochée par toute offre). Pour afficher les heures sur le
      lien de planning, cocher `lien_heures` dans `admin.ominin.com/capacites`,
      sous la vue Badgeage.

## E. Square, deuxième encaisseur du menu QR (2026-09-09)

- [ ] **Square** : créer l'application, déclarer l'URL de redirection OAuth
      et le webhook.
- [ ] **Variables** (`.env.local` et Vercel) :
      `NEXT_PUBLIC_SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`,
      `SQUARE_WEBHOOK_SIGNATURE_KEY`, `CRON_SECRET`.
- [ ] **Parcours complet en bac à sable** avant tout client ; test décisif :
      la caisse et le ticket imprimé montrent « Table 7 » du premier coup
      d'œil.

## F. Tableau de bord client (2026-09-11)

- [ ] **À finir** : les vues `activity.tsx` et `reglages.tsx` de la fiche
      client sur `admin.ominin.com` (la seconde n'est qu'un récapitulatif en
      lecture seule).

## G. Boutiques : décisions et branchements (2026-09-08 → 09-09)

- [ ] **Commission** : une fois le pourcentage décidé, depuis l'éditeur SQL
      de Supabase :
      `update public.shops set platform_fee_percent = 2 where slug = 'mybox';`
      S'applique aux commandes suivantes ; s'ajoute aux frais Stripe que la
      boutique paie de son côté.
- [ ] **Textes légaux** : six `[À COMPLÉTER]` sur les pages CGV et Mentions
      légales de MyBox (SIRET, adresse, éditeur, médiateur), depuis
      `/gestion` → Boutique et Contenu. Sans eux, la vente n'est pas
      conforme.
- [ ] **Tarifs de l'offre** : la page de vente affiche « Sur devis ».
      Renseigner `shopOffer` (`frontend/lib/shop-landing-data.ts`), passer
      `published` à `true`, lancer `npm run setup:stripe`.
- [ ] **Image de partage de MyBox** : `signature.webp` est en portrait ; une
      image paysage 1200 × 630 (Gestion → Boutique → « Image de partage »)
      donnerait un meilleur aperçu. Contrôler en collant le lien dans
      WhatsApp ou le validateur Facebook.
- [ ] **Vercel — variables** (*non vérifié*) : `GMAIL_CLIENT_ID`,
      `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`,
      `GMAIL_SENDER_EMAIL=omininsupport@gmail.com`,
      `STRIPE_SHOP_WEBHOOK_SECRET`.
- [ ] **Stripe — webhook des boutiques** (*non vérifié*) : endpoint
      `https://shop.ominin.com/api/shop/webhook` en mode **Connect**, six
      événements : `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`, `checkout.session.expired`,
      `checkout.session.async_payment_failed`, `charge.refunded`,
      `account.updated`. Le `whsec_…` renvoyé est
      `STRIPE_SHOP_WEBHOOK_SECRET`.
- [ ] **Stripe — Connect** (*non vérifié*) : comptes Express activés, URL de
      retour d'onboarding acceptant `shop.ominin.com`.
- [ ] **Supabase Auth** (*non vérifié*) : `https://shop.ominin.com/**` dans
      les *Redirect URLs*, sinon les liens magiques ramènent sur ominin.com.
- [ ] **Vérifier de bout en bout** : une commande test passe par Stripe et
      remonte dans `/gestion` ; le lien magique ouvre l'espace cliente.

## H. Restaurants : réglages et vérifications (2026-09-08 → 09-10)

- [ ] **Tablette du BOHO** : Gestion → Établissement → Tablette de salle,
      code de 4 à 8 chiffres. Chaque appareil démarre alors en vue salle, le
      bouton Admin déverrouille les écrans du gérant.
- [ ] **Serveurs du BOHO** : Gestion → Équipe → « Ajouter un serveur » (un
      prénom suffit), puis copier à chacun son lien de planning.
- [ ] **Vercel** : `NEXT_PUBLIC_GA_ID` (GA4, `G-XXXXXXXXXX`) pour
      `ominin.com`. Sans elle, ni script Google ni bandeau cookies.
- [ ] **Vérifier après déploiement** : une table réglée part directement
      dans l'historique et son ticket sort ; débrancher le boîtier fait
      réapparaître « À servir » ; deux nems d'une même ligne se règlent
      séparément ; Paiements sépare Carte et En ligne ; Badgeage donne une
      durée juste et le gérant corrige depuis Équipe → Badgeages ; la
      bannière cookies apparaît sur `ominin.com` mais ni sur `/gestion` ni
      sur un menu QR ; `admin.ominin.com/clients` liste tous les
      établissements et cocher une vue se voit aussitôt chez le restaurant.

## I. Types Supabase

Toutes les entrées récentes de `frontend/lib/supabase/database.types.ts`
sont écrites à la main et fonctionnent.

- [ ] **Régénérer un jour le fichier entier** (`npm run db:types`), en
      sachant que la CLI déclare les arguments optionnels des fonctions sans
      `null`, ce qui casse trois appels d'encaissement (`lib/gestion/api.ts`,
      `lib/stripe/server.ts`, `lib/sumup/server.ts`) : à corriger dans la
      foulée.
