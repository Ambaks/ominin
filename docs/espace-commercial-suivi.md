# Espace commercial — suivi de réalisation (lots 1, 2 et 3)

Suivi ligne à ligne du cahier `docs/espace-commercial.md` (sections 4 à 10, et
13 qui fait foi). Branche `espace-commercial`, 26 octobre 2026. Rien n'a été
appliqué en production.

**États** : **fait** (code écrit et preuve citée), **partiel** (code écrit,
une partie non prouvée ou non faite — raison donnée), **non fait** (raison),
**à décider** (attend une décision des fondateurs), **écart** (choix différent
du cahier, expliqué).

**Preuves** :
- `SQL nn` : script `supabase/tests/commercial/nn_*.sql`, message d'assertion
  cité entre guillemets (chaque assertion échoue en `ÉCHEC : <message>`).
  Relance : `bash supabase/tests/commercial/run.sh` (README du dossier).
  Résultat au 26/10 : 143 migrations appliquées, 7 scripts et
  `concurrence.sh` passent, 228 assertions.
- `ÉCRAN` : parcours Playwright + Chrome, 390×844, contre la base locale
  (PostgREST + faux service d'authentification, recette « Real-backend UI »
  de la mémoire du projet ; scripts dans le dossier de travail de la session,
  non versionnés). 18 vérifications passent, listées en fin de document.
- `LÉA` : essai Python des fonctions de Léa contre la même base locale
  (Gmail, Claude et notifications remplacés), 7 vérifications, en fin de
  document.
- `BUILD` : `npx tsc --noEmit` (0 erreur), `npm run lint` (0 erreur, 38
  avertissements, tous du motif déjà présent `window.location.assign`),
  `npm run build` (succès).

## Fichiers principaux

| Rôle | Fichiers |
|---|---|
| Migrations | `supabase/migrations/20261026000001_commercial_liens.sql` (liens fiche ↔ client, rattachement), `…02_commercial_declarations.sql` (réglages, déclarations, gardes, reflet, e-mails, opposition, quotas, bucket), `…03_commercial_fonctions.sql` (fonctions commercial_*, admin_*, tâche quotidienne), `…04_commercial_inscription.sql` (lot 2), `…05_commercial_commissions.sql` (lot 3) |
| Tests SQL | `supabase/tests/stubs.sql`, `supabase/tests/commercial/*` |
| Espace commercial | `frontend/app/commercial/espace/**`, `frontend/components/commercial/space/*`, `frontend/components/commercial/contract.tsx`, `frontend/lib/commercial/*` |
| Admin | `frontend/app/admin/(shell)/commerciaux/page.tsx`, `frontend/components/admin/commerciaux/*`, `frontend/components/admin/lead/commercial-section.tsx`, `frontend/lib/admin/commerciaux.ts`, `lead-cache.ts`, `store.ts`, `projet.ts` |
| Routes | `frontend/app/api/commercial/{envois,cron,places,push,rappels,releves/[id]}`, `frontend/app/commercial/espace/kit/deck/route.ts`, `frontend/app/api/inscription/lien/route.ts`, `frontend/app/api/stripe/webhook/route.ts` |
| Léa | `backend/app/services/{outreach,emailing,inbox}.py` |
| Juridique | `frontend/lib/legal/constants.ts`, `frontend/lib/legal/documents/confidentialite.ts` (nouvelle version), `frontend/lib/legal/documents/commercial-v2.ts` (projet non publié) |
| Tâche | `.github/workflows/commercial-daily.yml` |

## Section 4 — Règles métier

| Réf | Exigence | État | Fichiers | Preuve |
|---|---|---|---|---|
| 4.1 | Une fiche par restaurant ; création après contrôle des doublons (external_id, téléphone, e-mail, nom proche) et « Ce n'est aucun de ceux-là » | fait | `commercial_find_duplicates`, `commercial_create_restaurant` (…03, …04) ; `new-restaurant.tsx`, recherche Google dans `restaurants.tsx` | SQL 03 « doublon par nom proche… », « doublon par téléphone » ; SQL 06 « même identifiant Google : la fiche existante » ; ÉCRAN 11 |
| 4.1 | Liens `etablissement_id`, `shop_id`, `client_ended_at` ; `projet_clients.restaurant_id` | fait | …01 ; `commercial-section.tsx` (fiche admin), Projet `projet/[id]/page.tsx` | SQL 05 (toutes), SQL 02 « client parti redéclarable » |
| 4.1 | Rattachement initial par l'admin avant toute invitation (outil) | fait (outil) / **à faire par les fondateurs** (le rattachement lui-même) | `admin_link_client`, `admin_client_places`, onglet Réglages → « Rattachement des clients » | SQL 05 « outil de rattachement… », « fiche créée et reliée » |
| 4.1 | Déclaration active = pending ou confirmed | fait | index `commercial_declarations_active_key`, `commercial_status_at` | SQL 02, 04 |
| 4.2 | Déclaration : nom, adresse (fiche) et interlocuteur réduit à sa fonction dans `crm_contacts` (`first_name` facultatif + check) | fait | …02 (contrainte), `commercial_declare` | SQL 02 « interlocuteur réduit à sa fonction » |
| 4.2 | Offre visée dans `crm_leads.target_products` ; variante Shop des étapes | fait | `commercial_declare`, `commercial_restaurant` (steps) | SQL 03 « l'offre visée est écrite dans crm_leads » |
| 4.2 | Rien ne s'écrit sur une fiche sans déclaration ou passage | fait | toutes les écritures passent par `commercial_my_active` | SQL 03 « B n'écrit pas dans le journal de A », « plus d'écriture après l'abandon » |
| 4.2 | Refus d'office 1 à 6 (client par lien / téléphone, nom proche → alerte sans refus, déclaré, en discussion, opposition, plafond, carence), ligne `refused` au bon motif | fait | `commercial_refusal`, `commercial_declare` | SQL 02 « 4. client par le lien » … « 4. carence », « une ligne refusée par refus » |
| 4.2 | Alerte « déjà client ? » (nom proche) : reste en attente, push admin, compte à rebours | fait (code) / partiel (push non essayé : pas de clés VAPID en local) | `client_alert` (…03), `notifyNewDeclarations` (`outbox.ts`), onglet Déclarations | code ; écran Déclarations (ÉCRAN 12) |
| 4.2 | `confirm_deadline = declared_at + délai` ; admin confirme/refuse seulement avant l'échéance ; confirmée de droit après | fait | `admin_decide_declaration`, `commercial_confirm_due` | SQL 02 critères 1, 2, 5 |
| 4.2 | Lecture d'une attente échue comme confirmée ; `reserved_until` stocké | fait | `commercial_status_at`, `commercial_reserved_until` | SQL 02 « une attente échue se lit confirmée » |
| 4.2 | Concurrence : index unique + `unique_violation` → ligne refusée (déclaré), e-mail compris | fait (verrou de ligne en plus) | `commercial_declare` | `concurrence.sh` (deux sessions réelles : 1 en attente, 1 refusée) |
| 4.2 | Invariants en base (refus seulement depuis l'attente avant échéance, pas de retour depuis confirmée, fins terminales) | fait | trigger `commercial_declarations_guard` | SQL 02 critère 5 |
| 4.2 | E-mails exigés par le contrat via `commercial_emails` (file et preuve), envoyés par la route qui agit puis la tâche quotidienne | fait (file) / partiel (envoi Gmail non essayé : pas d'identifiants en local, production interdite) | …02, `outbox.ts`, `/api/commercial/envois`, `daily.ts` | SQL 02 « e-mail de confirmation en file », « e-mail de refus pour B », SQL 04, 06 |
| 4.2 | `commercial_settings` à une ligne, écrite par l'admin seul, lue par la base | fait | …02 | SQL 01 |
| 4.2 | Délais contractuels créés dans `constants.ts` et recopiés ; script d'égalité | fait | `lib/legal/constants.ts`, `run.sh` passe les constantes à psql | SQL 01 « commercial_settings recopie lib/legal/constants.ts » |
| 4.2 | Délais calculés gardés sur chaque ligne | fait | colonnes `confirm_deadline`, `reserved_until` | SQL 02 |
| 4.2 | Déclaration reçue par e-mail, avec sa date ; concurrente plus récente en attente refusée ; confirmée → conflit | fait | `admin_record_email_declaration` ; onglet Déclarations | SQL 04 « la concurrente plus récente est refusée », « …conflit » |
| 4.2 | Doublons confirmés pour deux commerciaux : décision motivée et tracée | fait (lot 2, fusion) | `admin_merge_restaurants` ; onglet Inscriptions | SQL 06 « la première confirmée l'emporte… », « l'autre commercial est informé » |
| 4.2 | Marquer signée avant le lot 2 (et relier l'établissement), e-mail | fait | `admin_mark_signed` (redéfinie au lot 2 avec le Client Apporté) | SQL 04 « admin_mark_signed → signed », « e-mail de signature » |
| 4.2 | Lot 2 : `commercial_clients` pour chaque déclaration déjà signée, `commission_from` = première acceptation postérieure | fait | …04 (insert initial) | migration appliquée (aucune ligne en test) ; règle testée SQL 07 « début : première acceptation… » |
| 4.2 | Opposition pendant une réservation, quel que soit le canal : abandon (opposition) + e-mail | fait (e-mail) / push : lot 2 non branché pour ce cas | trigger `commercial_on_opt_out` | SQL 04 critère 9 bis |
| 4.2 | Réattribution : seulement sur accord écrit joint, motif et trace | fait | `admin_reassign_declaration`, modale « Réattribuer » (dépôt du PDF) | SQL 04 « réattribution sans accord écrit refusée », « réattribuée, tracée, même fenêtre » |
| 4.2 bis | Passage sans suite : ligne `passage`, motif, fiche retenue ; pas de file, d'e-mail, de plafond ; historique ; refusé si réservé/client/opposition ; reflet `not_interested` | fait | `commercial_passage`, `PassageSheet` | SQL 03 bloc « Passage sans suite » |
| 4.3 | « En discussion » : réponse à Léa, fondateur qui travaille (hors reflet), client Projet ; forçage admin | fait | `commercial_in_talks`, `admin_set_in_talks` | SQL 02 « réponse à Léa », « activité d'un fondateur », « client Projet », « le reflet ne compte pas… » ; SQL 04 « l'admin force… » ; SQL 05 |
| 4.3 | Léa : garde du statut en base (drapeau `ominin.crm_reflect`) | fait | trigger `crm_leads_reflect_guard` | SQL 04 critère 9 ; LÉA « écriture : statut gardé » |
| 4.3 | Léa : sélection | **écart** + fait | `outreach._eligible` appelle `crm_is_reserved` (filtre dans la boucle, pas un `not exists` dans la requête PostgREST, qui ne l'exprime pas simplement) | SQL 04 « déclaré : écarté de la sélection » ; LÉA « sélection : … écarté » |
| 4.3 | Léa : file annulée à la déclaration, revérification à l'envoi, pas de brouillon en boîte de réception | fait | `commercial_declare`, `emailing._send_one`, `inbox._apply` | SQL 04 « brouillons… annulés » ; LÉA envoi et boîte de réception ; `uvx ruff check` : seules les 2 alertes S110 déjà présentes |
| 4.3 | Réponse tardive à Léa : le titulaire n'apprend que le sens | fait | trigger `commercial_on_lea_reply`, e-mail `lea_reply` | SQL 04 « le titulaire apprend que le restaurant a répondu » ; LÉA |
| 4.3 | Écran admin Restaurants : statut en lecture seule pour un restaurant déclaré | fait | `lead-panel.tsx` (badge non cliquable), garde en base | SQL 04 « l'écran admin ne change pas le statut… » |
| 4.3 | Reflet dans `crm_leads` (tableau), `metadata.reflect` posé | fait | `commercial_reflect`, `crm_log_status_change` | SQL 04 critère 8 |
| 4.4 | Assiette : Menu/Collect, Shop (même remboursé), Club (selon décision), factures Ominin éligibles, saisies hors Stripe ; hors démos et paiements simulés | fait | `commercial_base`, `commercial_month_lines` (…05) | SQL 07 « septembre recalculé à la main sur les cinq sources, au centime », « frais Club inclus… », « encaissement hors Stripe… » |
| 4.4 | Factures Ominin par `invoice.paid` (restaurants et boutiques), prix éligibles en configuration | partiel / **écart** | `lib/commercial/invoices.ts`, webhook : un seul `case "invoice.paid"` du switch principal couvre les deux (métadonnées `etablissement_id` ou `shop_id`), plutôt que deux branches | code ; non essayé contre Stripe |
| 4.4 | Ce que la base ne trace pas : régularisation saisie | fait | `admin_statement_adjust`, modale « Régularisation » | SQL 07 « relevé envoyé, figé, régularisation comprise » |
| 4.4 | Ce que la base trace après coup : régularisation automatique avec le mois d'origine | fait | `commercial_draft_statement` | SQL 07 « régularisation automatique… », « ne se répète pas » |
| 4.4 | Début : première acceptation des CGV postérieure à la déclaration | fait | `commercial_first_acceptance`, trigger de signature | SQL 06, 07 |
| 4.4 / 13.1 | Fin : `commission_from + 24 mois`, bornée par le départ du client | fait / **à décider** (la commission continue-t-elle après la fin du contrat du commercial ? le calcul suit 13.1 : non bornée par la fin du contrat ; la version 1 signée dit l'inverse, la v2 le règle) | `commercial_base` | SQL 07 « bornée par le départ du client », « commission pendant 24 mois… » |
| 4.4 | Nouvel établissement du même exploitant | fait | `admin_add_client`, bouton « + Établissement du même exploitant » | code (fonction appelée par l'onglet Déclarations) ; non couvert par un script |
| 4.4 | Relevé avant le 10, virement 30 j, détail trimestriel 15 j, contestation 3 mois, relevé final 30 j | fait / partiel (relevé final : les relevés mensuels continuent ; aucun rappel dédié aux 30 jours après la fin) | …05, `money.tsx`, `releves-tab.tsx` | SQL 07 « échéances : paiement 30 jours, détail 15 jours », « contestation sous 3 mois », « détail : une fois par trimestre » |
| 4.5 | Recherche limitée (`SEARCH_MAX_RESULTS`, `SEARCH_DAILY_QUOTA`), compteur jamais lisible par l'admin | fait | `commercial_search`, `commercial_quota_usage` (sans policy) | SQL 01 « l'admin ne lit pas les quotas » ; SQL 03 « au plus SEARCH_MAX_RESULTS », « quota du jour atteint » |
| 4.5 | Tableau de visibilité (fiche publique, statut sans nom, historique, précision, interlocuteurs, journal, Léa, encaissements) | fait | `commercial_restaurant`, `commercial_state` | SQL 03 critères 6 et 7 |
| 4.5 | Fiche retenue (listes fermées, précision limitée) portée par la déclaration | fait | `commercial_clean_retained`, `retained.tsx` | SQL 03 « n'accepte que la liste fermée », « précision limitée par le réglage » |
| 4.6 | `commerciaux` : option, préavis, fin, motif | fait | …02 ; onglet Commerciaux (« Lever l'option », « Fin de contrat ») ; `commercial_resign` | SQL 04 « terme atteint : fin de contrat écrite » |
| 4.6 | Préavis : réservations valides, peut déclarer, rappel à l'écran | fait (texte adapté : « un restaurant qui s'inscrit après cette date ne vous ouvre plus de commission », cohérent avec 13.1) | `shell.tsx` | code |
| 4.6 | À la fin : réservations libérées, accès réduit (Argent, relevés, contrat), brouillon et cache vidés | fait (code) | `commercial_release_ended`, `commercial_me`, `SpaceShell` + `clearDeviceData` | SQL 02 critère 10, SQL 04 13.2 n° 1 ; vidage de l'appareil non essayé |
| 4.6 | Rappel de l'option `OPTION_REMINDER_DAYS` avant l'échéance | fait (code) | `daily.ts` `remindOptions` (une fois, `option_reminded_at`) | code ; non exécuté |
| 4.7 | Aucun suivi d'assiduité ; pas d'écran du journal d'un commercial ; journal ouvert fiche par fiche en cas de litige | fait | `commercial-section.tsx` (fermé par défaut), aucun écran de journal par commercial | code |
| 4.7 | Store admin et push du soir filtrent `declaration_id is null` | fait | `lib/admin/store.ts`, `app/api/admin/push/evening/route.ts` | SQL 04 critère 9 ter (requêtes rejouées en SQL) |
| 4.8 | Listes fermées (refus, fins, fins système, types de journal) | fait | enums …02, `labels.ts` | SQL 02, 03 |

## Section 5 — Espace du commercial

| Réf | Exigence | État | Fichiers | Preuve |
|---|---|---|---|---|
| 5 | Téléphone d'abord, brouillon local de la note, barre du bas (Aujourd'hui · Restaurants · Kit · Clients · Argent), Compte sous l'avatar | fait | `shell.tsx`, `device.ts`, `work.tsx` | ÉCRAN 01, « journal : note enregistrée, brouillon vidé », ergonomie (champs 16 px, cibles ≥ 40 px) |
| 5 | Installable (manifeste propre) | fait | `app/manifest.webmanifest/route.ts` (variante commerciale), `app/commercial/layout.tsx` | build |
| 5.0 / 13.1 | Connexion par le lien reçu par e-mail, sans code | fait (existant d'Ambaka conservé) | `lib/commercial/access.ts` | — |
| 5.1 | Rendez-vous du jour + itinéraire ; relances dues (appeler, WhatsApp, faite, reporter) ; réservations qui expirent ; nouveautés depuis la dernière ouverture (date sur l'appareil) | fait | `commercial_today`, `today.tsx` | ÉCRAN 01, 14 ; SQL 06 « démo prête parmi les nouveautés » |
| 5.2 | Recherche (nom, rue, téléphone), statut de chacun | fait | `commercial_search`, `restaurants.tsx` | SQL 03 ; ÉCRAN 02 |
| 5.2 | Mes restaurants, par étape et relance | fait | `commercial_my_restaurants` | ÉCRAN 02 |
| 5.2 | Ajouter à la main (slug, position de l'appareil) | fait | `commercial_create_restaurant`, `new-restaurant.tsx` | SQL 03 « fiche créée avec slug et position » ; ÉCRAN 11 |
| 5.2 | Google Places côté serveur, quota par commercial | partiel | `/api/commercial/places`, `commercial_count_places` | SQL 06 quota ; appel Google non essayé (pas de clé) |
| 5.2 | Autour de moi (carte, couleurs de statut) | fait | `commercial_nearby`, `nearby.tsx` (carte MapLibre de l'admin) | SQL 06 « Autour de moi : dans le rayon seulement » ; écran non capturé (géolocalisation) |
| 5.3 | En-tête, étape la plus haute, fin de réservation | fait | `restaurant.tsx` | ÉCRAN 03, 06 |
| 5.3 | Les 5 étapes, cases libres, date par étape, textes `commercial_title/detail` | fait | …02, `Steps` | SQL 03 « étapes 1 à 5, textes du commercial pour 2 et 5 », SQL 04 « une date par étape cochée » ; ÉCRAN « étape 4 » |
| 5.3 | Fiche retenue, interlocuteurs, journal, relances, rendez-vous ; export `.ics` | fait | `work.tsx` | ÉCRAN 06 |
| 5.3 | Opposition (« ne veut plus être contacté ») : `outreach_opted_out_at`, `outreach_suppressions` pour chaque e-mail connu, abandon | fait | `commercial_opt_out`, `OptOutSheet` | SQL 04 « bouton opposition… », « chaque e-mail connu… » |
| 5.3 | Mention d'information en QR vers `/confidentialite` | fait | `PrivacyNotice` (sheets.tsx) | code (bouton visible ÉCRAN 06) |
| 5.4 / 13.2 n° 4 | Kit : deck (PDF déposé par l'admin, hors ligne), démos avec partage WhatsApp/SMS, offres et prix des pages publiques, simulateur | fait / partiel (cache hors ligne non essayé ; simulateur = lien vers le devis public `/devis`) | `kit/page.tsx`, `kit/deck/route.ts`, `public/commercial-sw.js`, démos réglées par l'admin (`kit_demo_slugs`) | ÉCRAN 07 |
| 5.4 | Demander une démo à ses couleurs avec photos ; file admin ; livraison → lien et étape 2 | fait | `commercial_request_demo`, `admin_deliver_demo`, `DemoCard`, onglet « Démos à faire » | SQL 06 « étape 2 cochée à la livraison », « commercial prévenu » |
| 5.5 | Lien d'inscription : jeton aléatoire, empreinte seule, `SIGNUP_LINK_DAYS`, `?c=` sur les trois tunnels, nom et adresse pré-remplis | fait / partiel (pré-remplissage et rattachement codés dans les trois tunnels, non parcourus au navigateur) | `commercial_signup_link`, `signup_link_info`, `signup_link_claim`, `lib/commercial/signup-link.tsx`, `/api/inscription/lien`, formulaires des trois tunnels | SQL 06 ; ÉCRAN « lien d'inscription créé » |
| 5.5 n° 1 | Rattachement du lien au compte (création ou ouverture connecté) | fait | `signup_link_claim` | SQL 06 « lien rattaché au compte », « un lien sert un seul compte » |
| 5.5 n° 2 | À l'acceptation des CGV (accept ou paiement) : signée, Client Apporté, fiche reliée, client Projet (étapes 1–6), e-mail, push | fait / partiel (push non essayé) | trigger `commercial_on_client_acceptance` (sur `legal_acceptances` : couvre les deux chemins), `acceptContract` envoie la file | SQL 06 « déclaration signée… », « client Projet créé… », « reflet signed sous drapeau » |
| 5.5 | Garde-fous : nom/téléphone trop différents → validation ; inscription sans lien proposée au rattachement | fait | `commercial_signup_alert`, `admin_signup_matches`, onglet Inscriptions | SQL 06 « … en attente de validation », « inscription sans lien proposée… » |
| 5.6 | Clients : date d'inscription, intégration (étapes 7–15), rapporté ce mois-ci (assiette), fin de période, alerte s'il décroche (règle de l'admin) | fait | `commercial_my_clients`, `clients/page.tsx` (règle `CHURN_*` de `lib/admin/constants.ts`) | SQL 07 « Clients : l'assiette du mois… » ; ÉCRAN 08 |
| 5.7 | Argent : estimation du mois, relevés (PDF, états), demander le détail, contester, déposer la facture | fait | `commercial_money`, `money.tsx`, `/api/commercial/releves/[id]` | SQL 07 ; ÉCRAN 09 ; PDF non ouvert en essai |
| 5.7 | Estimation « recalculée par la tâche quotidienne » | **écart** | calculée à la lecture (même fonction que le relevé) : toujours à jour, rien à stocker | SQL 07 « estimation du mois en cours » |
| 5.8 | Compte : identité, SIRET, contrat signé (PDF), nouvelle version (bandeau), résiliation avec préavis ; notifications ; pièces SIRENE/URSSAF avec rappel | fait | `compte/page.tsx`, `account.tsx`, `notifications.tsx`, `Documents` | ÉCRAN 10 ; SQL 07 URSSAF |

## Section 6 — Admin

| Réf | Exigence | État | Fichiers | Preuve |
|---|---|---|---|---|
| 6.1 | Commerciaux : inviter, renvoyer le lien, contrat, fin de contrat, option ; déclarations, inscriptions, commission du mois | fait | `commerciaux-tab.tsx` | code |
| 6.2 | Déclarations : file avec compte à rebours, confirmer/refuser, e-mail reçu, alerte, forcer « en discussion », réattribuer, marquer signée | fait | `declarations-tab.tsx`, fonctions admin_* | ÉCRAN 12, « admin : déclaration confirmée » ; SQL 02, 04 |
| 6.2 (lot 2) | Rattacher une inscription, valider une suspecte, fusionner deux fiches | fait | `inscriptions-tab.tsx` | SQL 06 |
| 6.3 | Démos à faire | fait | `demos-tab.tsx` | SQL 06 |
| 6.4 | Relevés : brouillon, régularisations, envoi PDF par e-mail, facture reçue, payé, contestations, demandes de détail, export CSV | fait | `releves-tab.tsx`, `statement.ts` | SQL 07 |
| 6 | Vue d'ensemble par Restaurants et Carte grâce au reflet | fait | reflet | SQL 04 |
| 13.2 n° 15 | Réglages : aucune valeur dans le code, vide = règle désactivée, signalement « à remplir avant la première invitation » | fait | `reglages-tab.tsx` | ÉCRAN 13 ; SQL 01, 02 « carence vide : désactivée », SQL 03 « sans nombre de résultats réglé… » |

## Section 7 — Données et technique

| Réf | Exigence | État | Fichiers | Preuve |
|---|---|---|---|---|
| 7.1 | Toutes les tables et colonnes du tableau (lots 1, 2, 3) | fait | migrations …01 à …05 | migrations appliquées |
| 7.1 | `crm_contacts` : types régénérés, affichage admin sans prénom | fait | `database.types.ts`, `contactName` (`lib/admin/format.ts`) | BUILD |
| 7.2 | Commercial actif ; nouvelle version en bandeau sans fermer l'espace ; nouvelles déclarations réservées à la version en vigueur ; après la fin : Argent, relevés, contrat | fait | `commercial_me`, `layout.tsx`, `shell.tsx` | SQL 02 « nouvelle version non signée : déclaration refusée », « l'espace reste ouvert » |
| 7.2 | Aucune lecture directe des tables `crm_*` ; fonctions security definer qui vérifient l'accès ; RLS « self » | fait | …03 à …05 | SQL 03 « aucune lecture directe… » ; SQL 06, 07 |
| 7.3 | `commercial_month_lines` ; relevé figé, correction au mois suivant | fait | …05 | SQL 07 |
| 7.4 | `commercial-daily.yml` → `/api/commercial/cron` (`X-Cron-Secret`) ; confirmations, expirations, fins de contrat, e-mails, rappels ; lot 3 : brouillons le 1er | fait (code) / **à décider** (heure : celle du point du matin, 06:30 UTC, reprise faute de décision) | `daily.ts`, workflow | fonctions SQL testées (SQL 02, 04, 07) ; route non appelée en essai |
| 7.4 | Rappels URSSAF | partiel | bandeau dans Argent et Compte (`commercial_urssaf_due`), pas d'e-mail | SQL 07 |
| 7.5 | Worker propre (cache du deck, push), distinct de `/sw.js` | fait (code) | `public/commercial-sw.js`, `lib/push/client.ts` (cible configurable) | non essayé hors ligne |

## Section 8 — Notifications

| Réf | Exigence | État | Preuve |
|---|---|---|---|
| 8 | E-mail obligatoire : décisions, relevés | fait (file) / partiel (Gmail non essayé) | SQL 02, 07 |
| 8 | Push : relance due, réservation qui expire (matin), démo prête, inscrit, relevé (avec l'e-mail) ; préférences | fait (code) / partiel (non essayé sans VAPID) | `daily.ts`, `outbox.ts`, `push.ts`, SQL 06 préférences |
| 8 | Push rendez-vous dans `APPOINTMENT_REMINDER_MINUTES` | partiel / **à décider** | route `/api/commercial/rappels` prête, une fois par rendez-vous ; il faut un déclencheur fréquent (GitHub Actions toutes les N minutes coûte des minutes : fréquence à décider), aucun workflow ajouté |

## Section 9 — Données personnelles

| Réf | Exigence | État | Preuve |
|---|---|---|---|
| 9 / 13.2 n° 14 | `/confidentialite` complétée (prospection par des commerciaux, sources, destinataires, opposition de vive voix), nouvelle version du document versionné | fait (texte, version `2026-10-26`, `reacceptance: false`) / **aux fondateurs** : relecture et `npm run legal:publish` | `confidentialite.ts` ; la page sert la nouvelle version dès le déploiement |
| 9 | Opposition en un clic ou de vive voix | fait | SQL 04 |
| 9 / 13.2 n° 9 | Purge à 3 ans | non fait (reportée par 13.2 n° 9) | — |
| 9 | Note vocale | hors périmètre (lot 4) | — |

## Section 10 — Acceptation du lot 1

| N° | Critère | État | Preuve |
|---|---|---|---|
| 1 | Déclarer avec interlocuteur réduit, confirmer, e-mail en file, `to_contact` | fait | SQL 02 « 1. … » |
| 2 | `commercial_confirm_due` : échue confirmée à `confirm_deadline`, l'autre intacte | fait | SQL 02 « 2. … » |
| 2 bis | A ne lit ni n'écrit les réglages ; aucun paramètre de règle en argument | fait | SQL 01 |
| 3 | B ne déclare pas le restaurant de A ; deux simultanées : une passe | fait | SQL 02 « 3. … » ; `concurrence.sh` |
| 4 | Chaque refus d'office au bon motif | fait | SQL 02 « 4. … » |
| 5 | Refus rejeté sur confirmée/échue ; pas de retour depuis confirmée | fait | SQL 02 « 5. … » |
| 6 | B lit statut et étape, rien d'autre, aucune colonne protégée | fait | SQL 03 « 6. … » |
| 7 | A abandonne : B voit fiche retenue et motif, déclare, voit les interlocuteurs pas le journal | fait | SQL 03 « 7. … » |
| 8 | Reflet, case décochée, expiration → lost | fait | SQL 04 « 8. … » |
| 9 | Léa sans drapeau sans effet ; confirm_due écrit ; sélection ; e-mails annulés | fait | SQL 04 « 9. … » ; LÉA |
| 9 bis | Opposition sur un restaurant réservé | fait | SQL 04 « 9 bis. … » |
| 9 ter | Store et push du soir sans `declaration_id` | fait | SQL 04 « 9 ter. … » (+ code) |
| 10 | Sans contrat ou contrat terminé : rien | fait | SQL 02 « 10. … » |
| 11 | iPhone Safari : connexion par lien, session conservée | **non fait** | essai manuel sur iPhone requis (non disponible ici) |
| 12 | Trouver et déclarer en moins de 30 s | partiel | ÉCRAN : parcours automatisé en 1,0 s (recherche, fiche, 3 gestes) ; le chronométrage humain reste à faire |
| 13 | Onglet Déclarations : confirmer, refuser, e-mail reçu, marquer signée ; e-mail réel reçu | partiel | ÉCRAN 12 (confirmer) ; refus, saisie par e-mail, marquer signée couverts en SQL ; e-mail réel : à essayer après déploiement |
| 14 | `/confidentialite` publiée avec la section prospection ; le QR y mène | partiel | texte prêt et servi ; publication en base aux fondateurs ; le QR pointe sur `/confidentialite` |
| 13.2 n° 1 | `commercial_release_ended` libère (contract_ended, lost) | fait | SQL 04 « 13.2 n° 1. … » |
| 13.2 n° 2 | Drapeau posé par chaque écriture du reflet | fait / partiel (deux chemins non isolés) | toute écriture passe par `commercial_reflect`, seule à poser le drapeau. Prouvé un par un (SQL 04, assertions « 13.2 n° 2 ») : fonctions du commercial, `admin_decide_declaration`, `admin_reassign_declaration`, `admin_mark_signed`, `commercial_confirm_due`, `commercial_expire_due`, `commercial_release_ended`, trigger d'opposition ; signature du lot 2 (SQL 06). Non isolés : `admin_record_email_declaration` (n'écrit le reflet que via la confirmation tacite de `commercial_settle`, même chemin que `commercial_confirm_due`) et `commercial_passage` (restaurant non déclaré : SQL 03 prouve le reflet, pas le drapeau) |

## Section 10 — Acceptation des lots 2 et 3

| Lot | Critère | État | Preuve |
|---|---|---|---|
| 2 | Inscription par le lien : apparaît, reliée, dans Projet et dans Clients | fait | SQL 06 ; SQL 07 (Clients) |
| 2 | Lien expiré ou consommé refusé | fait | SQL 06 « 10 (lot 2). … » |
| 2 | Nom trop différent : attend la validation | fait | SQL 06 |
| 2 | Inscription sans lien d'un restaurant réservé proposée au rattachement | fait | SQL 06 |
| 3 | Relevé d'un mois test recalculé à la main sur les cinq sources, au centime, matériel exclu | fait | SQL 07 (les lignes de matériel ne sont jamais dans `eligible_stripe_prices` ; le calcul ne lit que les frais et les prix éligibles) |
| 3 | S'envoie, se facture, se paie, se conteste | fait | SQL 07 |

## Section 13

| Réf | Exigence | État |
|---|---|---|
| 13.1 | Connexion par lien ; code d'Ambaka continué ; Léa gardée ; commission 24 mois par restaurant ; lots 1 à 3 ; simplicité | fait (voir lignes ci-dessus) |
| 13.2 n° 3 | Passage et déclaration refusés en discussion ; dernière activité hors reflet ; état affiché | fait (SQL 02, 03 « « en discussion » affiché dans la recherche ») |
| 13.2 n° 4 | Kit minimal dès le lot 1 | fait |
| 13.2 n° 5 | `admin_link_client`, `admin_set_client_ended`, fiche créée depuis l'établissement | fait (SQL 05) |
| 13.2 n° 6 | Une seule source de vérité ; `commercial_clients` sans `ended_at` | fait |
| 13.2 n° 7 | Relances sans `lead_id` | fait (SQL 04 « relance du commercial sans lead_id », « rien dans next_follow_up_at ») |
| 13.2 n° 8 | Léa : garde en base, sélection et envoi dans le code, essai | fait (SQL 04, LÉA) |
| 13.2 n° 10 | Réservation échue lue expirée | fait (SQL 04) |
| 13.2 n° 11 | Signature pendant l'attente : confirmée d'abord ; « déjà déclaré » ; `notes` jamais écrit | fait (SQL 04, 06, 02) |
| 13.2 n° 12 | Constantes du contrat (lot 3) dans `constants.ts`, recopiées avec 15 % et 24 mois | fait (SQL 01) |
| 13.2 n° 13 | `commercial_quota_usage` par jour, illisible par l'admin | fait (SQL 01) |
| 13.3 | Version 2 du contrat préparée sans publication | fait : `lib/legal/documents/commercial-v2.ts`, fonction `commercialV2("AAAA-MM-JJ")` non inscrite dans `documents/index.ts` ; points [À DÉCIDER] dans le texte |

## Écarts au cahier

1. **Sélection de Léa** : le refus du restaurant réservé se fait dans `_eligible` (même boucle que les autres refus), par `crm_is_reserved`, et non par un `not exists` dans la requête : PostgREST ne l'exprime pas simplement. Comportement prouvé par l'essai LÉA.
2. **Webhook** : `invoice.paid` est traité une fois, dans le switch principal, pour les restaurants et les boutiques (lus dans les métadonnées de l'abonnement), plutôt que dans deux branches.
3. **Estimation du mois** : calculée à la lecture, pas stockée par la tâche quotidienne.
4. **Simulateur** : lien vers le devis public (`lib/quote.ts`, page `/devis`, déjà au format téléphone), pas une copie dans le Kit.
5. **Statut RGPD, période de commission après la fin du contrat du commercial** : le code suit 13.1 (24 mois par restaurant, borné par le départ du client seulement) ; la version 1 signée borne par la fin du contrat. La version 2 le tranche (marqué [À DÉCIDER]).
6. **Démos du Kit** : en plus de la démo Ominin, les démos proposées sont choisies par l'admin dans les Réglages (`kit_demo_slugs`) plutôt qu'une liste écrite dans le code.
7. **URL de Google Places** : recopiée de `backend/app/clients/places.py` (même requête et même masque de champs) dans la route Next.
8. **Types** : `database.types.ts` régénéré depuis la base locale de test ; l'ordre des tables change (le fichier précédent n'était pas trié) ; les signatures des fonctions existantes et l'en-tête `graphql_public` de la version de production sont gardés.

## Ce qui reste aux fondateurs

- **Réglages** (onglet Commerciaux → Réglages) : à remplir avant la première invitation — nombre de résultats de recherche, validité des liens d'inscription, rayon d'« Autour de moi » ; à décider — plafond, carence, `IN_TALKS_DAYS`, quotas (recherche, Google), délais de rappel (expiration, option, rendez-vous), seuil de « nom proche », démos du Kit, **prix Stripe éligibles (décision n° 5)**, **frais Club (décision n° 2)**.
- **Deck** à déposer (onglet Réglages → Deck du Kit).
- **Rattachement** des clients en service et des clients du Projet (onglet Réglages → Rattachement) avant la première invitation.
- **Version 2 du contrat** : relecture par l'avocat de `commercial-v2.ts`, puis inscription dans `documents/index.ts` avec sa date et `npm run legal:publish`.
- **`/confidentialite`** : relecture, puis `npm run legal:publish` (la version `2026-10-26` est servie dès le déploiement).
- **Migrations** `20261026000001` à `20261026000005` à appliquer (`npm run db:push`).
- **Variables d'environnement** : `GOOGLE_PLACES_API_KEY` (nouvelle, serveur) ; déjà existantes et utilisées : `CRON_SECRET`, Gmail, VAPID, Stripe.
- **Stripe** : ajouter `invoice.paid`, `invoice.voided`, `invoice.marked_uncollectible` aux événements du webhook.
- **Tâches** : secret `CRON_SECRET` et `MENU_URL` déjà utilisés par `commercial-daily.yml` ; heure à confirmer ; déclencheur fréquent de `/api/commercial/rappels` à décider.
- **Essais manuels** : critères 11 (iPhone), 12 (chronomètre), 13 (e-mails réels), 14 (publication).

## Annexe — essais

ÉCRAN (Playwright, Chrome, 390×844, iPhone, base locale) :
Aujourd'hui : rendez-vous du jour · relance due · barre du bas · recherche « Libre » · trouver et déclarer en 1,0 s · fiche en attente · fiche confirmée : lien proposé · étape 4 suit le geste · note enregistrée, brouillon vidé · lien d'inscription créé · écrans Kit, Clients, Argent, Compte, Ajouter · admin : déclaration confirmée · Aujourd'hui : décision parmi les nouveautés · ergonomie de la fiche (champs 16 px, cibles ≥ 40 px). Un premier passage a relevé deux cibles de 20 px (lien retour, « + Ajouter »), agrandies depuis.

LÉA (essai Python, base locale, Gmail/Claude/notifications remplacés) :
`crm_is_reserved` distingue déclaré et libre · sélection : déclaré écarté · sélection : libre éligible · envoi : annulé `reserved_by_commercial`, rien envoyé · écriture : statut gardé malgré l'update de Léa · boîte de réception : aucune réponse préparée · le titulaire est prévenu du sens de la réponse.
