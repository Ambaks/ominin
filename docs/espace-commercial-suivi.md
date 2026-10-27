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
  Résultat au 27/10, après le troisième passage de vérification et la
  fusion de `main` : 145 migrations appliquées (celles de `main` comprises ;
  les cinq de l'espace renumérotées `20261028000001` à `…05`), 10 scripts et
  `concurrence.sh` (deux scénarios) passent, 333 assertions.
  `08_defauts.sql`, `09_defauts2.sql` et `10_defauts3.sql` rejouent les
  défauts des trois passages.
- `ÉCRAN` : parcours Playwright + Chrome, 390×844, contre la base locale
  (PostgREST + faux service d'authentification, recette « Real-backend UI »
  de la mémoire du projet ; scripts dans le dossier de travail de la session,
  non versionnés). 18 vérifications du parcours, plus 15 des corrections
  (fin de contrat, cibles, `.ics`, lien refusé), listées en fin de document.
- `LÉA` : essai Python des fonctions de Léa contre la même base locale
  (Gmail, Claude et notifications remplacés), 7 vérifications, en fin de
  document.
- `BUILD` : `npx tsc --noEmit` (0 erreur), `npm run lint` (0 erreur, 38
  avertissements, tous du motif déjà présent `window.location.assign`),
  `npm run build` (succès).

## Fichiers principaux

| Rôle | Fichiers |
|---|---|
| Migrations | `supabase/migrations/20261028000001_commercial_liens.sql` (liens fiche ↔ client, rattachement), `…02_commercial_declarations.sql` (réglages, déclarations, gardes, reflet, e-mails, opposition, quotas, bucket), `…03_commercial_fonctions.sql` (fonctions commercial_*, admin_*, tâche quotidienne), `…04_commercial_inscription.sql` (lot 2), `…05_commercial_commissions.sql` (lot 3) |
| Tests SQL | `supabase/tests/stubs.sql`, `supabase/tests/commercial/*` |
| Espace commercial | `frontend/app/commercial/espace/**`, `frontend/components/commercial/space/*`, `frontend/components/commercial/contract.tsx`, `frontend/lib/commercial/*` |
| Admin | `frontend/app/admin/(shell)/commerciaux/page.tsx`, `frontend/components/admin/commerciaux/*`, `frontend/components/admin/lead/commercial-section.tsx`, `frontend/lib/admin/commerciaux.ts`, `lead-cache.ts`, `store.ts`, `projet.ts` |
| Routes | `frontend/app/api/commercial/{envois,cron,places,push,rdv/[id],releves/[id]}`, `frontend/app/commercial/espace/kit/deck/route.ts`, `frontend/app/api/inscription/lien/route.ts`, `frontend/app/api/stripe/webhook/route.ts` |
| Serveur de l'espace | `frontend/lib/commercial/session.ts` (compte lu une fois, écrans de travail fermés après la fin), `frontend/lib/admin/churn.ts` (règle du décrochage, partagée) |
| Léa et backend | `backend/app/services/{outreach,emailing,inbox}.py` ; `backend/app/routers/places.py` (recherche Google de l'espace) et `backend/app/clients/places.py` (`address_component`, déplacé des deux `discovery.py` sans changement de comportement) |
| Juridique | `frontend/lib/legal/constants.ts`, `frontend/lib/legal/documents/confidentialite.ts` (nouvelle version), `frontend/lib/legal/documents/commercial-v2.ts` (projet non publié) |
| Tâche | `.github/workflows/commercial-daily.yml` |

## Section 4 — Règles métier

| Réf | Exigence | État | Fichiers | Preuve |
|---|---|---|---|---|
| 4.1 | Une fiche par restaurant ; création après contrôle des doublons (external_id, téléphone, e-mail, nom proche) et « Ce n'est aucun de ceux-là » | fait | `commercial_find_duplicates`, `commercial_create_restaurant` (…03, …04) ; `new-restaurant.tsx`, recherche Google dans `restaurants.tsx` | SQL 03 « doublon par nom proche… », « doublon par téléphone » ; SQL 06 « même identifiant Google : la fiche existante » ; ÉCRAN 11 |
| 4.1 | Liens `etablissement_id`, `shop_id`, `client_ended_at` ; `projet_clients.restaurant_id` | fait | …01 ; `commercial-section.tsx` (fiche admin), Projet `projet/[id]/page.tsx` | SQL 05 (toutes), SQL 02 « client parti redéclarable » |
| 4.1 / 4.4 | Client parti : redéclarable (son Projet ne le garde plus « en discussion ») ; revenu, il n'est plus apporté, sauf nouvelle déclaration signée, qui crée un nouveau Client Apporté | fait — **le suivi précédent le disait fait à tort** : effacer le départ rouvrait la commission de l'ancien commercial, le Projet bloquait la redéclaration, et une nouvelle signature laissait le client à l'ancien titulaire | `commercial_clients.ended_at` figé par le trigger `crm_restaurants_client_ended` (jamais rouvert), index uniques partiels (`ended_at is null`), `commercial_base` bornée par `ended_at`, `commercial_in_talks` (Projet d'un client parti ignoré), trigger de signature (départ antérieur à la déclaration pris en compte), `commercial_add_client` (refus si le client est encore apporté) | SQL 07 « un client revenu n'est plus apporté… » ; SQL 09 « N2. … » (8 assertions) |
| 4.1 | Rattachement initial par l'admin avant toute invitation (outil) | fait (outil) / **à faire par les fondateurs** (le rattachement lui-même) | `admin_link_client`, `admin_client_places`, onglet Réglages → « Rattachement des clients » | SQL 05 « outil de rattachement… », « fiche créée et reliée » |
| 4.1 | Déclaration active = pending ou confirmed | fait | index `commercial_declarations_active_key`, `commercial_status_at` | SQL 02, 04 |
| 4.2 | Déclaration : nom, adresse (fiche) et interlocuteur réduit à sa fonction dans `crm_contacts` (`first_name` facultatif + check) | fait | …02 (contrainte), `commercial_declare` | SQL 02 « interlocuteur réduit à sa fonction » |
| 4.2 | Offre visée dans `crm_leads.target_products` ; variante Shop des étapes | fait | `commercial_declare`, `commercial_restaurant` (steps) | SQL 03 « l'offre visée est écrite dans crm_leads » |
| 4.2 | Rien ne s'écrit sur une fiche sans déclaration ou passage | fait | toutes les écritures passent par `commercial_my_active` | SQL 03 « B n'écrit pas dans le journal de A », « plus d'écriture après l'abandon » |
| 4.2 | Refus d'office 1 à 6 (client par lien / téléphone, nom proche → alerte sans refus, déclaré, en discussion, opposition, plafond, carence), ligne `refused` au bon motif | fait | `commercial_refusal`, `commercial_declare` | SQL 02 « 4. client par le lien » … « 4. carence », « une ligne refusée par refus » |
| 4.2 / 13.2 n° 10 | Plafond sûr : compté sur l'état effectif (une réservation échue non écrite ne compte plus), sous verrou de la ligne du commercial (deux déclarations simultanées ne le dépassent pas) | fait (corrigé après la vérification : le plafond lisait le statut brut, sans verrou) | `commercial_refusal` (`commercial_status_at`), `commercial_declare` (`for update` sur `commerciaux`) | SQL 08 « §3-4. réservation échue hors plafond », « §3-4. … le plafond tient » ; `concurrence.sh` scénario plafond (« 1 1 ») ; `cap_race.sh` du vérificateur : « déclarations actives de A : 1 » |
| 4.2 | Alerte « déjà client ? » (nom proche) : reste en attente, push admin, compte à rebours | fait (code) / partiel (push non essayé : pas de clés VAPID en local) | `client_alert` (…03), `notifyNewDeclarations` (`outbox.ts`), onglet Déclarations | code ; écran Déclarations (ÉCRAN 12) |
| 4.2 | `confirm_deadline = declared_at + délai` ; admin confirme/refuse seulement avant l'échéance ; confirmée de droit après | fait | `admin_decide_declaration`, `commercial_confirm_due` | SQL 02 critères 1, 2, 5 |
| 4.2 | Lecture d'une attente échue comme confirmée ; `reserved_until` stocké | fait | `commercial_status_at`, `commercial_reserved_until` | SQL 02 « une attente échue se lit confirmée » |
| 4.2 | Concurrence : index unique + `unique_violation` → ligne refusée (déclaré), e-mail compris | fait (verrou de ligne en plus) | `commercial_declare` | `concurrence.sh` (deux sessions réelles : 1 en attente, 1 refusée) |
| 4.2 | Invariants en base (refus seulement depuis l'attente avant échéance, pas de retour depuis confirmée, fins terminales) | fait | trigger `commercial_declarations_guard` | SQL 02 critère 5 |
| 4.2 | E-mails exigés par le contrat via `commercial_emails` (file et preuve), envoyés par la route qui agit puis la tâche quotidienne | fait (file) / partiel (envoi Gmail non essayé : pas d'identifiants en local, production interdite) | …02, `outbox.ts`, `/api/commercial/envois`, `daily.ts` | SQL 02 « e-mail de confirmation en file », « e-mail de refus pour B », SQL 04, 06 |
| 4.2 | `commercial_settings` à une ligne, écrite par l'admin seul, lue par la base | fait | …02 | SQL 01 |
| 4.2 | Délais contractuels créés dans `constants.ts` et recopiés ; script d'égalité | fait | `lib/legal/constants.ts`, `run.sh` passe les constantes à psql | SQL 01 « commercial_settings recopie lib/legal/constants.ts » |
| 4.2 | Délais calculés gardés sur chaque ligne | fait | colonnes `confirm_deadline`, `reserved_until` | SQL 02 |
| 4.2 | Déclaration reçue par e-mail, avec sa date ; concurrente plus récente en attente refusée seulement si celle reçue passe ; confirmée → conflit ; déjà échue à la saisie ou pour un contrat terminé : refusée | fait (corrigé deux fois : la concurrente était refusée avant de savoir si l'e-mail passait, puis par un e-mail déjà échu ; un contrat terminé était accepté) | `admin_record_email_declaration` (refus d'office évalués d'abord, `p_ignore` de `commercial_refusal`) ; onglet Déclarations | SQL 04 « la concurrente plus récente est refusée », « …conflit » ; SQL 08 « §3-3. e-mail de A en carence : refusé d'office », « §3-3. … la déclaration de B reste en attente » ; SQL 09 « N3. e-mail daté de 8 mois… », « N8. déclaration par e-mail pour un contrat terminé refusée » |
| 4.2 | Doublons confirmés pour deux commerciaux : décision motivée et tracée ; la fusion garde tout ce que la fiche retirée savait | fait (lot 2, fusion) — **le suivi précédent la disait faite à tort** : la fiche retirée emportait son opposition, son client et son client Projet, et une fusion vers une fiche retirée passait | `admin_merge_restaurants` (client et départ, opposition la plus ancienne, forçage « en discussion », `projet_clients`, `outreach_emails`, `outreach_suppressions` reportés ; fiche retirée ou absente refusée ; deux fiches de clients différents refusées), `commercial_create_restaurant` (suit `merged_into`) ; onglet Inscriptions | SQL 06 « la première confirmée l'emporte… », « l'autre commercial est informé » ; SQL 09 « N1. … » (10 assertions) |
| 4.2 | Marquer signée avant le lot 2 (et relier l'établissement), e-mail | fait | `admin_mark_signed` (redéfinie au lot 2 avec le Client Apporté) | SQL 04 « admin_mark_signed → signed », « e-mail de signature » |
| 4.2 | Lot 2 : `commercial_clients` pour chaque déclaration déjà signée, `commission_from` = première acceptation postérieure | fait | …04 (insert initial) | migration appliquée (aucune ligne en test) ; règle testée SQL 07 « début : première acceptation… » |
| 4.2 | Opposition pendant une réservation, quel que soit le canal : abandon (opposition) + e-mail + push au titulaire | fait (e-mail) / partiel (push codé avec la préférence « opposition », non essayé : pas de clés VAPID en local) | trigger `commercial_on_opt_out`, `outbox.ts` (`push: "opposition"`), `push-labels.ts` | SQL 04 critère 9 bis ; ÉCRAN « préférence opposition proposée » |
| 4.2 | Réattribution : seulement sur accord écrit joint, motif et trace, vers un contrat signé en cours | fait (corrigé : un contrat terminé était accepté) | `admin_reassign_declaration`, modale « Réattribuer » (dépôt du PDF) | SQL 04 « réattribution sans accord écrit refusée », « réattribuée, tracée, même fenêtre » ; SQL 09 « N8. réattribution vers un contrat terminé refusée » |
| 4.2 bis | Passage sans suite : ligne `passage`, motif, fiche retenue ; pas de file, d'e-mail, de plafond ; historique ; refusé si réservé/client/opposition ; reflet `not_interested` | fait | `commercial_passage`, `PassageSheet` | SQL 03 bloc « Passage sans suite » |
| 4.3 | « En discussion » : réponse à Léa, fondateur qui travaille (hors reflet), client Projet ; forçage admin | fait | `commercial_in_talks`, `admin_set_in_talks` | SQL 02 « réponse à Léa », « activité d'un fondateur », « client Projet », « le reflet ne compte pas… » ; SQL 04 « l'admin force… » ; SQL 05 |
| 4.3 | Léa : garde du statut en base (drapeau `ominin.crm_reflect`) | fait | trigger `crm_leads_reflect_guard` | SQL 04 critère 9 ; LÉA « écriture : statut gardé » |
| 4.3 | Léa : sélection | **écart** + fait | `outreach._eligible` appelle `crm_is_reserved` (filtre dans la boucle, pas un `not exists` dans la requête PostgREST, qui ne l'exprime pas simplement) | SQL 04 « déclaré : écarté de la sélection » ; LÉA « sélection : … écarté » |
| 4.3 | Léa : file annulée à la déclaration, revérification à l'envoi, pas de brouillon en boîte de réception | fait | `commercial_declare`, `emailing._send_one`, `inbox._apply` | SQL 04 « brouillons… annulés » ; LÉA envoi et boîte de réception ; `uvx ruff check` : seules les 2 alertes S110 déjà présentes |
| 4.3 | Réponse tardive à Léa : le titulaire n'apprend que le sens | fait | trigger `commercial_on_lea_reply`, e-mail `lea_reply` | SQL 04 « le titulaire apprend que le restaurant a répondu » ; LÉA |
| 4.3 | Écran admin Restaurants : statut en lecture seule pour un restaurant déclaré | fait | `lead-panel.tsx` (badge non cliquable), garde en base | SQL 04 « l'écran admin ne change pas le statut… » |
| 4.3 | Reflet dans `crm_leads` (tableau), `metadata.reflect` posé | fait | `commercial_reflect`, `crm_log_status_change` | SQL 04 critère 8 |
| 4.4 | Assiette : Menu/Collect, Shop (même remboursé), Club (selon décision), factures Ominin éligibles, saisies hors Stripe ; hors démos et paiements simulés | fait | `commercial_base`, `commercial_month_lines` (…05) | SQL 07 « septembre recalculé à la main sur les cinq sources, au centime », « frais Club inclus… », « encaissement hors Stripe… » |
| 4.4 | Factures Ominin par `invoice.paid` (restaurants et boutiques), prix éligibles en configuration ; remises et crédits déduits ; avoirs retranchés | partiel / **écart** (corrigé : les remises n'étaient pas déduites et `invoice.voided` ne touche jamais une facture payée) | `lib/commercial/invoices.ts` (`recordInvoice` : ligne nette de `pretax_credit_amounts`, à défaut `discount_amounts`, et des taxes incluses ; avoirs `credit_note.*` → `credited_cents`, ligne d'avoir rattachée à sa ligne de facture, montant libre au prorata de la part éligible), webhook (`invoice.paid`, `credit_note.created/updated/voided`) | SQL 07 « un avoir ne dépasse pas la part éligible », « régularisation automatique du mois figé » (avoir sur toute la facture) ; **non essayé contre l'API Stripe** (pas de compte de test ici) |
| 4.4 | Ce que la base ne trace pas : régularisation saisie | fait | `admin_statement_adjust`, modale « Régularisation » | SQL 07 « relevé envoyé, figé, régularisation comprise » |
| 4.4 | Ce que la base trace après coup : régularisation automatique avec le mois d'origine | fait | `commercial_draft_statement` | SQL 07 « régularisation automatique… », « ne se répète pas » |
| 4.4 | Début : première acceptation des CGV postérieure à la déclaration ; un client déjà en service (conditions acceptées avant la déclaration) n'est jamais attribué ; relié à une autre fiche : en attente de l'admin | fait (corrigé : un client existant devenait Client Apporté validé en rouvrant un lien) | `commercial_first_acceptance`, trigger `commercial_on_client_acceptance`, `commercial_signup_alert` | SQL 06, 07 ; SQL 08 « §3-1. client déjà en service : pas de Client Apporté », « … reste confirmée, pas signée », « client relié à une autre fiche : en attente de l'admin, alerte » |
| 4.4 / 13.1 | Fin : `commission_from + 24 mois`, bornée par le départ du client (figé dans `commercial_clients.ended_at`) | fait / **à décider** (la commission continue-t-elle après la fin du contrat du commercial ? le calcul suit 13.1 : non bornée par la fin du contrat ; la version 1 signée dit l'inverse, la v2 le règle) | `commercial_base` | SQL 07 « bornée par le départ du client », « commission pendant 24 mois… » |
| 4.4 | Nouvel établissement du même exploitant | fait | `admin_add_client`, bouton « + Établissement du même exploitant » | code (fonction appelée par l'onglet Déclarations) ; non couvert par un script |
| 4.4 | Relevé avant le 10, virement 30 j, détail trimestriel 15 j, contestation 3 mois (une par relevé, sans changer son état, close par l'admin), relevé final 30 j | fait / partiel (aucun rappel « avant le 10 » : le brouillon est prêt le 1er, l'envoi reste un geste de l'admin) | …05 (`commercial_contest`, `admin_statement_resolve`, `commercial_final_statements`), `daily.ts` (rappel admin du relevé final, chaque jour jusqu'à l'envoi), `money.tsx`, `releves-tab.tsx` | SQL 07 « échéances… », « contestation sous 3 mois », « une contestation par relevé », « payé alors que contesté », « clôture réservée à l'admin », « une contestation se clôt une fois », « Argent : réponse à la contestation », « contester un relevé payé ne lui retire pas son paiement », « relevé final du mois de la fin, échéance à 30 jours », « relevé final recalculé, pas dédoublé » |
| 4.5 | Recherche limitée (`SEARCH_MAX_RESULTS`, `SEARCH_DAILY_QUOTA`), compteur jamais lisible par l'admin ; rendre une fiche Google existante compte une recherche | fait (corrigé : `commercial_create_restaurant` rendait la fiche sans compter) | `commercial_search`, `commercial_create_restaurant`, `commercial_quota_usage` (sans policy) | SQL 01 « l'admin ne lit pas les quotas » ; SQL 03 « au plus SEARCH_MAX_RESULTS », « quota du jour atteint » ; SQL 08 « §3-11. … et compte une recherche », « … dans la limite du quota » |
| 4.5 | Tableau de visibilité (fiche publique, statut sans nom, historique, précision, interlocuteurs, journal, Léa, encaissements) | fait | `commercial_restaurant`, `commercial_state` | SQL 03 critères 6 et 7 |
| 4.5 | Fiche retenue (listes fermées, précision limitée) portée par la déclaration | fait | `commercial_clean_retained`, `retained.tsx` | SQL 03 « n'accepte que la liste fermée », « précision limitée par le réglage » |
| 4.6 | `commerciaux` : option, préavis, fin, motif | fait | …02 ; onglet Commerciaux (« Lever l'option », « Fin de contrat ») ; `commercial_resign` | SQL 04 « terme atteint : fin de contrat écrite » |
| 4.6 | Préavis : réservations valides, peut déclarer, rappel à l'écran | fait (texte adapté : « un restaurant qui s'inscrit après cette date ne vous ouvre plus de commission », cohérent avec 13.1) | `shell.tsx` | code |
| 4.6 | À la fin : réservations libérées, accès réduit (Argent, relevés, contrat), brouillon et cache vidés | fait / partiel (vidage de l'appareil non essayé) — **le suivi précédent disait « fait (code) » : c'était faux**, `/espace` affichait une erreur, Kit, Clients et le deck restaient servis | `commercial_release_ended`, `commercial_me`, `requireRunningContract` (`lib/commercial/session.ts`, appelée par les 7 écrans de travail → Argent), `kit/deck/route.ts` et policy « kit read » (contrat en cours), `commercial_my_clients` en accès « travail », `SpaceShell` + `clearDeviceData` | SQL 02 critère 10, SQL 04 13.2 n° 1 ; SQL 08 « §3-5. contrat terminé : deck fermé », « … Clients fermé », « … Argent ouvert » ; ÉCRAN « fin de contrat : /espace… → /argent » (7 écrans), « deck refusé (403) », « Compte ouvert » |
| 4.6 | Rappel de l'option `OPTION_REMINDER_DAYS` avant l'échéance | fait (échéance calculée en base, plus en TypeScript) / partiel (push admin non essayé) | `commercial_option_reminders` (une fois, `option_reminded_at`), `daily.ts` | SQL 08 « §3-13. rappel de l'option calculé en base, contrats en cours seulement », « … une fois » |
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
| 5.2 | Google Places côté serveur, quota par commercial ; URL et masque de champs en un seul endroit | partiel (appel Google réel non essayé : pas de clé) | `/api/commercial/places` (compte le quota puis appelle le backend avec `X-Agent-Secret`), `backend/app/routers/places.py` (`POST /places/search`, client `app/clients/places.py` de Léa) | SQL 06 quota ; essai FastAPI (Google remplacé) : 401 sans secret, 200 et champs attendus, 422 requête vide |
| 5.2 | Autour de moi (carte, couleurs de statut) | fait | `commercial_nearby`, `nearby.tsx` (carte MapLibre de l'admin) | SQL 06 « Autour de moi : dans le rayon seulement » ; écran non capturé (géolocalisation) |
| 5.3 | En-tête, étape la plus haute, fin de réservation | fait | `restaurant.tsx` | ÉCRAN 03, 06 |
| 5.3 | Les 5 étapes, cases libres, date par étape, textes `commercial_title/detail` | fait | …02, `Steps` | SQL 03 « étapes 1 à 5, textes du commercial pour 2 et 5 », SQL 04 « une date par étape cochée » ; ÉCRAN « étape 4 » |
| 5.3 | Fiche retenue, interlocuteurs, journal, relances, rendez-vous ; export `.ics` servi par une route (Safari iOS n'ouvre pas un lien `data:`) ; cases d'étapes 44 px | fait | `work.tsx`, `/api/commercial/rdv/[id]` (`commercial_appointment`) | ÉCRAN 06 ; ÉCRAN « .ics servi par la route », « cases d'étapes ≥ 44 px » ; ouverture dans l'agenda d'un iPhone non essayée |
| 5.3 | Opposition (« ne veut plus être contacté ») : `outreach_opted_out_at`, `outreach_suppressions` pour chaque e-mail connu, abandon ; par le titulaire d'une déclaration active ou l'auteur d'un passage sur une fiche libre, jamais sur un client | fait (corrigé : n'importe quel commercial pouvait la poser, même sur un client) | `commercial_opt_out`, `OptOutSheet`, bouton montré aux seuls ayants droit (`restaurant.tsx`) | SQL 04 « bouton opposition… », « chaque e-mail connu… » ; SQL 08 « §3-6. sans déclaration ni passage : refusée », « sur un client : refusée », « sur le passage d'un autre : refusée », « auteur du passage et titulaire : opposition posée » |
| 5.3 | Mention d'information en QR vers `/confidentialite` | fait | `PrivacyNotice` (sheets.tsx) | code (bouton visible ÉCRAN 06) |
| 5.4 / 13.2 n° 4 | Kit : deck (PDF déposé par l'admin, hors ligne, du contrat signé à sa fin), démos avec partage WhatsApp/SMS, offres et prix des pages publiques, simulateur | fait / partiel (cache hors ligne non essayé ; simulateur = lien vers le devis public `/devis`) (corrigé : un invité non signé lisait le deck) | `kit/page.tsx`, `kit/deck/route.ts` (`signed` exigé), policy « kit read » (acceptation du contrat exigée), `public/commercial-sw.js`, démos réglées par l'admin (`kit_demo_slugs`) | ÉCRAN 07 ; SQL 09 « N5. invité non signé : pas de deck », « N5. contrat signé en cours : deck » |
| 5.4 | Demander une démo à ses couleurs avec photos ; file admin ; livraison → lien et étape 2 | fait (corrigé au troisième passage : depuis N9 la carte ne voyait plus la demande ni le lien livré) | `commercial_request_demo`, `commercial_demo_requests_of` (lecture par fonction), `admin_deliver_demo`, `DemoCard`, onglet « Démos à faire » | SQL 06 « étape 2 cochée à la livraison », « commercial prévenu » ; SQL 10 « B1 bis. … » ; ÉCRAN « démo : la demande envoyée s'affiche », « le lien livré s'affiche » |
| 5.5 | Lien d'inscription : jeton aléatoire, empreinte seule, `SIGNUP_LINK_DAYS`, `?c=` sur les trois tunnels, nom et adresse pré-remplis ; un nouveau lien garde le compte du gérant déjà rattaché | fait / partiel (pré-remplissage codé dans les trois tunnels, parcouru au navigateur seulement pour le refus) (corrigé : régénérer le lien effaçait le rattachement en silence) | `commercial_signup_link`, `signup_link_info`, `signup_link_claim`, `lib/commercial/signup-link.tsx`, `/api/inscription/lien`, formulaires des trois tunnels | SQL 06 ; ÉCRAN « lien d'inscription créé » ; SQL 09 « N4. le rattachement survit au nouveau lien », « … et l'inscription est attribuée » |
| 5.5 n° 1 | Rattachement du lien au compte (création ou ouverture connecté) ; jamais à un compte commercial ou admin ; refus affiché ; jeton porté par les métadonnées du compte créé par e-mail (confirmation ouverte dans un autre navigateur) | fait / partiel (confirmation dans un autre navigateur non essayée : pas de service d'e-mail en local) (corrigé : un commercial ou un admin connecté capturait le lien, le gérant recevait un 409 muet, le jeton ne vivait que dans le `localStorage`) | `signup_link_claim`, `auth-form.tsx` (`signup_link` dans les métadonnées), `useSignupLink` (jeton de l'appareil ou du compte), `SignupLinkError` | SQL 06 « lien rattaché au compte », « un lien sert un seul compte » ; SQL 08 « §3-7. le commercial ne capture pas son lien », « l'admin non plus », « lien toujours libre » ; ÉCRAN « lien ouvert par le commercial connecté : refus affiché dans le tunnel » |
| 5.5 n° 2 | À l'acceptation des CGV (accept ou paiement) : signée, Client Apporté, fiche reliée, client Projet (étapes 1–6), e-mail, push au commercial et aux admins | fait / partiel (pushs non essayés ; **le push aux admins manquait**, il est ajouté à l'envoi de l'e-mail « signé », `outbox.ts`) | trigger `commercial_on_client_acceptance` (sur `legal_acceptances` : couvre les deux chemins), `acceptContract` envoie la file | SQL 06 « déclaration signée… », « client Projet créé… », « reflet signed sous drapeau » |
| 5.5 | Garde-fous : nom/téléphone trop différents → validation ; inscription sans lien proposée au rattachement | fait | `commercial_signup_alert`, `admin_signup_matches`, onglet Inscriptions | SQL 06 « … en attente de validation », « inscription sans lien proposée… » |
| 5.6 | Clients : date d'inscription, intégration (étapes 7–15), rapporté ce mois-ci (assiette), fin de période, alerte s'il décroche (règle de l'admin) | fait | `commercial_my_clients`, `clients/page.tsx` ; la règle et sa période sont celles du point du matin de l'admin, désormais dans `lib/admin/churn.ts` (partagé par le point du matin, la Synthèse et Clients ; période `CLIENT_PERIOD_DAYS[1]` que le point du matin utilisait déjà, aucune valeur nouvelle) | SQL 07 « Clients : l'assiette du mois… » ; ÉCRAN 08 |
| 5.7 | Argent : estimation du mois, relevés (PDF, états, mois d'origine des régularisations), demander le détail, contester (et lire la réponse), déposer la facture | fait | `commercial_money`, `money.tsx`, `/api/commercial/releves/[id]`, `statement.ts` | SQL 07 ; ÉCRAN 09 ; PDF non ouvert en essai |
| 5.7 | Estimation « recalculée par la tâche quotidienne » | **écart** | calculée à la lecture (même fonction que le relevé) : toujours à jour, rien à stocker | SQL 07 « estimation du mois en cours » |
| 5.8 | Compte : identité, SIRET, contrat signé (PDF), nouvelle version (bandeau), résiliation avec préavis ; notifications ; pièces SIRENE/URSSAF avec rappel | fait | `compte/page.tsx`, `account.tsx`, `notifications.tsx`, `Documents` | ÉCRAN 10 ; SQL 07 URSSAF |

## Section 6 — Admin

| Réf | Exigence | État | Fichiers | Preuve |
|---|---|---|---|---|
| 6.1 | Commerciaux : inviter, renvoyer le lien, contrat, fin de contrat, option ; déclarations, inscriptions, commission du mois | fait | `commerciaux-tab.tsx` | code |
| 6.2 | Déclarations : file avec compte à rebours, confirmer/refuser, e-mail reçu, alerte, forcer « en discussion », réattribuer, marquer signée | fait | `declarations-tab.tsx`, fonctions admin_* | ÉCRAN 12, « admin : déclaration confirmée » ; SQL 02, 04 |
| 6.2 (lot 2) | Rattacher une inscription, valider une suspecte, fusionner deux fiches | fait (fusion corrigée, voir 4.2 « Doublons ») | `inscriptions-tab.tsx` | SQL 06, SQL 09 « N1. … » |
| 6.3 | Démos à faire | fait | `demos-tab.tsx` | SQL 06 |
| 6.4 | Relevés : brouillon, régularisations, envoi PDF par e-mail, facture reçue, payé, contestations et leur réponse, demandes de détail, export CSV, détail CSV d'un relevé | fait (corrigé : aucune clôture de contestation, contester un relevé payé effaçait « payé ») | `releves-tab.tsx` (« Répondre à la contestation », « Détail CSV »), `statement.ts`, `admin_statement_resolve` | SQL 07 |
| 6 | Vue d'ensemble par Restaurants et Carte grâce au reflet | fait | reflet | SQL 04 |
| 13.2 n° 15 | Réglages : aucune valeur dans le code, vide = règle désactivée, signalement « à remplir avant la première invitation » | fait | `reglages-tab.tsx` | ÉCRAN 13 ; SQL 01, 02 « carence vide : désactivée », SQL 03 « sans nombre de résultats réglé… » |

## Section 7 — Données et technique

| Réf | Exigence | État | Fichiers | Preuve |
|---|---|---|---|---|
| 7.1 | Toutes les tables et colonnes du tableau (lots 1, 2, 3) | fait | migrations …01 à …05 | migrations appliquées |
| 7.1 | `crm_contacts` : types régénérés, affichage admin sans prénom | fait | `database.types.ts`, `contactName` (`lib/admin/format.ts`) | BUILD |
| 7.2 | Commercial actif ; nouvelle version en bandeau sans fermer l'espace ; nouvelles déclarations réservées à la version en vigueur ; après la fin : Argent, relevés, contrat | fait | `commercial_me`, `layout.tsx`, `shell.tsx` | SQL 02 « nouvelle version non signée : déclaration refusée », « l'espace reste ouvert » |
| 7.2 | Aucune lecture directe des tables `crm_*` ; fonctions security definer qui vérifient l'accès ; RLS « self » pour les relevés et les pièces ; ni les déclarations ni les Clients Apportés ne se lisent en direct (l'alerte « déjà client ? » nomme un client d'Ominin) | fait (corrigé : le commercial lisait `client_alert` de ses déclarations par la RLS « self ») | …02 à …05 (policies « self read » de `commercial_declarations` et `commercial_clients` retirées) | SQL 03 « aucune lecture directe… » ; SQL 06 « le titulaire lit son Client Apporté par commercial_my_clients, aucune table en direct » ; SQL 09 « N9. … » |
| 7.2 | Pièces : un dépôt ne remplace jamais une facture ou une attestation reçue | fait (corrigé : la policy « self update » ajoutée au premier passage permettait de réécrire une pièce) | policy de mise à jour retirée, noms horodatés (`lib/commercial/api.ts`) | SQL 09 « N6. … mais ne la réécrit pas » (stockage simulé : non essayé contre Supabase Storage) |
| 5.7 / art. 5.4 | Demandes de détail successives sur un même relevé, chacune marquée envoyée | fait (corrigé) | `commercial_request_detail` remet `detail_sent_at` à vide | SQL 09 « N7. seconde demande de détail marquée envoyée » |
| 7.3 | `commercial_month_lines` ; relevé figé, correction au mois suivant | fait | …05 | SQL 07 |
| 7.4 | `commercial-daily.yml` → `/api/commercial/cron` (`X-Cron-Secret`) ; confirmations, expirations, fins de contrat, e-mails, rappels ; lot 3 : brouillons le 1er | fait (code) / **à décider** (heure : celle du point du matin, 06:30 UTC, reprise faute de décision) | `daily.ts`, workflow | fonctions SQL testées (SQL 02, 04, 07) ; route non appelée en essai |
| 7.4 | Rappels URSSAF | fait (file) / partiel (Gmail non essayé) — **le suivi précédent ne prévoyait pas d'e-mail** | bandeau dans Argent et Compte (`commercial_urssaf_due`) ; e-mail `urssaf` mis en file une fois par attestation attendue (`commercial_urssaf_reminders`, tâche quotidienne), composé dans `outbox.ts` | SQL 07 « rappel URSSAF par e-mail », « un seul rappel par attestation attendue », « rappel URSSAF dans la file d'envoi » |
| 7.4 | Échéances de la tâche calculées en base (rappel d'option, relances « du jour » jusqu'à minuit à Paris, réservations qui expirent) | fait (corrigé : fenêtre « maintenant + 24 h » et fin de contrat recalculées en TypeScript) | `commercial_option_reminders`, `commercial_morning`, `daily.ts` | SQL 08 « §3-12. relances du jour : jusqu'à minuit à Paris », « §3-13. … » |
| 7.5 | Worker propre (cache du deck, push), distinct de `/sw.js` | fait (code) | `public/commercial-sw.js`, `lib/push/client.ts` (cible configurable) | non essayé hors ligne |

## Section 8 — Notifications

| Réf | Exigence | État | Preuve |
|---|---|---|---|
| 8 | E-mail obligatoire : décisions, relevés | fait (file) / partiel (Gmail non essayé) | SQL 02, 07 |
| 8 | Push au commercial : relance due, réservation qui expire (matin), démo prête, inscrit, relevé (avec l'e-mail), opposition ; préférences | code écrit / **non essayé** (pas de clés VAPID en local ; le suivi précédent disait « fait (code) ») | `daily.ts`, `outbox.ts`, `push.ts`, SQL 06 préférences, SQL 08 relances du matin |
| 8 | Push aux admins : déclaration à trancher, inscription par lien, rappel d'option, relevé final à envoyer | code écrit / **non essayé** (même raison) ; l'inscription et le relevé final **manquaient** au premier rendu | `outbox.ts` (`notifyNewDeclarations`, e-mail « signé »), `daily.ts` |
| 8 / 13.1 | Rendez-vous (décision de Marwan du 27/10) : relances J+1, J+7, J+14 après chaque rendez-vous tenu, dans Aujourd'hui, comptées par le push du matin ; une fois chacune ; rien si la déclaration est close ou le contrat terminé. Le rappel « dans N minutes », sa route et `APPOINTMENT_REMINDER_MINUTES` sont retirés | fait (push non essayé) | `commercial_appointment_followups` (tâche quotidienne, avant le push du matin), réglage `followup_days` (Réglages : 1, 7, 14 saisis par l'admin), `crm_appointments.followups_done` | SQL 10 « J+n. … » (5 assertions) ; ÉCRAN « admin Réglages : relances après un rendez-vous » |
| 8 | Contrat terminé : plus de push sur ses appareils | fait (corrigé) | `commercial_release_ended` retire ses abonnements | SQL 09 « N10. abonnements push d'un contrat terminé retirés… » |

## Section 9 — Données personnelles

| Réf | Exigence | État | Preuve |
|---|---|---|---|
| 9 / 13.2 n° 14 | `/confidentialite` complétée (prospection par des commerciaux, sources, destinataires, opposition de vive voix), nouvelle version du document versionné | fait (texte, version `2026-10-26`, `reacceptance: false`) / **aux fondateurs** : relecture, inscription dans `documents/index.ts`, puis `npm run legal:publish` | `confidentialite.ts` ; **retirée de l'index** (troisième passage) : elle n'est pas servie au déploiement tant qu'elle n'est pas relue |
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
| 13.2 n° 2 | Drapeau posé par chaque écriture du reflet | fait | toute écriture passe par `commercial_reflect`, seule à poser le drapeau. Prouvé un par un (SQL 04, assertions « 13.2 n° 2 ») : fonctions du commercial, `admin_decide_declaration`, `admin_reassign_declaration`, `admin_mark_signed`, `commercial_confirm_due`, `commercial_expire_due`, `commercial_release_ended`, trigger d'opposition ; signature du lot 2 (SQL 06) ; passage sans suite et déclaration reçue par e-mail (SQL 08 « 13.2 n° 2. passage sans suite… », « déclaration reçue par e-mail : reflet to_contact sous drapeau ») |

## Section 10 — Acceptation des lots 2 et 3

| Lot | Critère | État | Preuve |
|---|---|---|---|
| 2 | Inscription par le lien : apparaît, reliée, dans Projet et dans Clients ; jamais un client déjà en service ; un client parti puis redéclaré, oui, pour le nouveau commercial | fait | SQL 06 ; SQL 07 (Clients) ; SQL 08 « §3-1. … » ; SQL 09 « N2. … » |
| 2 | Lien expiré ou consommé refusé | fait | SQL 06 « 10 (lot 2). … » |
| 2 | Nom trop différent : attend la validation | fait | SQL 06 |
| 2 | Inscription sans lien d'un restaurant réservé proposée au rattachement | fait | SQL 06 |
| 3 | Relevé d'un mois test recalculé à la main sur les cinq sources, au centime, matériel exclu | fait | SQL 07 (les lignes de matériel ne sont jamais dans `eligible_stripe_prices` ; le calcul ne lit que les frais et les prix éligibles) |
| 3 | S'envoie, se facture, se paie, se conteste (et la contestation se clôt) | fait | SQL 07 |

## Section 13

| Réf | Exigence | État |
|---|---|---|
| 13.1 | Connexion par lien ; code d'Ambaka continué ; Léa gardée ; commission 24 mois par restaurant ; lots 1 à 3 ; simplicité | fait (voir lignes ci-dessus) |
| 13.2 n° 3 | Passage et déclaration refusés en discussion ; dernière activité hors reflet ; état affiché | fait (SQL 02, 03 « « en discussion » affiché dans la recherche ») |
| 13.2 n° 4 | Kit minimal dès le lot 1 | fait |
| 13.2 n° 5 | `admin_link_client`, `admin_set_client_ended`, fiche créée depuis l'établissement | fait (SQL 05) |
| 13.2 n° 6 | Une seule source de vérité ; `commercial_clients` sans `ended_at` | **écart** décidé par Marwan (second passage) : `commercial_clients.ended_at` existe, écrit seulement par le départ posé sur la fiche, jamais rouvert ; la fiche reste la source de « déjà client » |
| 13.2 n° 7 | Relances sans `lead_id` | fait (SQL 04 « relance du commercial sans lead_id », « rien dans next_follow_up_at ») |
| 13.2 n° 8 | Léa : garde en base, sélection et envoi dans le code, essai | fait (SQL 04, LÉA) |
| 13.2 n° 10 | Réservation échue lue expirée | fait (SQL 04) |
| 13.2 n° 11 | Signature pendant l'attente : confirmée d'abord ; « déjà déclaré » ; `notes` jamais écrit | fait (SQL 04, 06, 02) |
| 13.2 n° 12 | Constantes du contrat (lot 3) dans `constants.ts`, recopiées avec 15 % et 24 mois | fait (SQL 01) |
| 13.2 n° 13 | `commercial_quota_usage` par jour, illisible par l'admin | fait (SQL 01) |
| 13.3 | Version 2 du contrat préparée sans publication | fait : `lib/legal/documents/commercial-v2.ts`, fonction `commercialV2("AAAA-MM-JJ")` non inscrite dans `documents/index.ts` ; points [À DÉCIDER] dans le texte |

## Corrections après la vérification indépendante

Rapport du vérificateur, §3, point par point (le détail et les preuves sont
dans les lignes ci-dessus, marquées « corrigé ») :

| § 3 | Défaut | Correction | Preuve |
|---|---|---|---|
| 1 | Client déjà en service attribué | pas d'attribution si des conditions ont été acceptées avant la déclaration ; relié à une autre fiche → validation de l'admin | SQL 08 §3-1 |
| 2 | Remises et avoirs Stripe | ligne nette de remises et crédits ; avoirs `credit_note.*` → `credited_cents` | SQL 07 ; Stripe non essayé |
| 3 | Concurrente refusée pour rien | refus d'office évalués avant de toucher la concurrente | SQL 08 §3-3 |
| 4 | Plafond contournable | verrou du commercial, état effectif | SQL 08 §3-4, `concurrence.sh` |
| 5 | Fin de contrat | écrans de travail → Argent, deck et policy fermés, Clients en accès « travail » | SQL 08 §3-5, ÉCRAN |
| 6 | Opposition par un tiers | titulaire ou auteur d'un passage, jamais sur un client | SQL 08 §3-6 |
| 7 | Lien capturé, 409 muet, jeton local | refus aux comptes commerciaux et admins, message affiché, jeton dans les métadonnées | SQL 08 §3-7, ÉCRAN |
| 8 | Redépôt refusé par le stockage | policy « self update » sur son dossier | migration 02 (stockage simulé en local : non essayé contre Supabase Storage) |
| 9 | Notifications | push admin à l'inscription, push opposition, e-mail URSSAF, relevé final ; rappel de rendez-vous **toujours sans déclencheur** | SQL 07, 08 ; pushs non essayés |
| 10 | Contestation | une par relevé, état inchangé, `admin_statement_resolve` | SQL 07 |
| 11 | Quota contourné | une recherche comptée | SQL 08 §3-11 |
| 12 | Constantes | relances jusqu'à minuit à Paris (en base), URL et masque Places dans le backend seul, décrochage par la règle existante du point du matin ; cron 06:30 UTC et options `curl` gardés (convention des autres workflows) | SQL 08 §3-12 |
| 13 | Code mort, doublons | `myClients` retiré ; détail CSV relié à l'admin ; `monthLabel`/`euros` dans `labels.ts` ; un seul `flushEmails` ; `displayName` ; fin de contrat et déclaration active lues en base (`admin_restaurant_declarations`, plus de « à trancher avant » une date passée) | tsc, lint, build |
| 14 | Petits défauts | double échappement retiré ; mois d'origine des régularisations dans le PDF ; `.ics` par une route ; cases et interrupteurs à 44 px ; champ de report en 16 px | ÉCRAN |

## Second passage de vérification

Rapport du second passage, §4 (N1 à N10), point par point :

| N | Défaut | Correction | Preuve |
|---|---|---|---|
| 1 | La fusion perdait opposition, client et Projet de la fiche retirée ; fusion vers une fiche retirée acceptée ; identifiant Google d'une fiche fusionnée inutilisable | tout est reporté sur la gardée ; fiches retirées, absentes ou de deux clients refusées ; `merged_into` suivi | SQL 09 « N1. … » |
| 2 | Client parti puis revenu : commission rouverte pour l'ancien, rien pour le nouveau | `commercial_clients.ended_at` figé au départ, index partiels, Projet d'un client parti ignoré, nouvelle ligne à la nouvelle signature (écart 9) | SQL 07, SQL 09 « N2. … » |
| 3 | E-mail déjà échu à la saisie refusant la concurrente | saisie refusée | SQL 09 « N3. … » |
| 4 | Lien régénéré : rattachement perdu | rattachement gardé | SQL 09 « N4. … » |
| 5 | Deck lisible avant la signature | signature exigée (policy et route) | SQL 09 « N5. … » |
| 6 | Pièce reçue réécrivable | pas de mise à jour, noms horodatés | SQL 09 « N6. … » |
| 7 | Seconde demande de détail impossible à marquer | `detail_sent_at` remis à vide | SQL 09 « N7. … » |
| 8 | E-mail et réattribution vers un contrat terminé | refusés | SQL 09 « N8. … » |
| 9 | `client_alert` lisible par le commercial | plus de lecture directe des déclarations ni des Clients Apportés | SQL 06, SQL 09 « N9. … » |
| 10 | Rappels sur déclarations closes, message Postgres brut, abonnements d'un contrat terminé | `commercial_appointment_reminders` (remplacé au troisième passage par les relances J+n), message lisible sur `/api/commercial/rdv`, abonnements retirés par `commercial_release_ended` ; `--max-time 60` dans `commercial-daily.yml` | SQL 09 « N10. … » |

Essais du vérificateur rejoués sur la base corrigée (`nouveaux.sql`) : 34 conformes sur 39. Les 5 écarts restants ne sont pas des défauts :
- C2 et C3 lisaient l'état des déclarations directement en tant que commercial, ce qui est désormais impossible (N9) ; `09_defauts2.sql` prouve la redéclaration par `commercial_restaurant` ;
- « Clients Apportés de etab3 : a » obtient « b,a » : la ligne de B reste, close à son départ (historique voulu, N2) ;
- C4 marque signé un client sur une seconde fiche alors qu'il est relié à la première : refusé par la règle « un client, une fiche » (la bonne voie est la fusion) ;
- K2 compte une mise à jour sans erreur comme « passe » ; elle ne modifie aucune ligne (`09_defauts2.sql` « N6 »).

## Troisième passage de vérification

| Réf | Défaut | Correction | Preuve |
|---|---|---|---|
| B1 | Même numéro de migration que `main` (`20261026000001`) ; conflit avec #479 (Léa sur Overture) | migrations renumérotées `20261028000001` à `…05` ; `main` fusionnée (`git merge`, pas de rebase) ; `discovery.py` pris de `main`, la garde des restaurants réservés (outreach, emailing, inbox) intacte ; types régénérés | `run.sh` : 145 migrations ; tsc, lint, build |
| B1 bis | La carte « Démo à ses couleurs » ne voyait plus la demande ni le lien (régression de N9) | `commercial_demo_requests_of`, fonction de lecture (non `stable` : elle verrouille la déclaration, PostgREST l'aurait lancée en lecture seule — trouvé au navigateur) | SQL 10 « B1 bis » ; ÉCRAN |
| B2 | Fiche réservée fusionnée dans une fiche en opposition : réservation gardée | `commercial_close_for_opposition`, commune au trigger et à la fusion (reflet, e-mail, push) | SQL 10 « B2 » |
| B3 | Inscription attribuée à un contrat terminé avant la tâche quotidienne | lien invalide dès la fin (`commercial_by_token`), trigger de signature sans effet pour un contrat terminé | SQL 10 « B3 » |
| B4 | Mois jamais relevés perdus | la tâche brouillonne tout mois non relevé porteur de commission depuis la première ; l'onglet Relevés choisit le mois à calculer | SQL 10 « B4 » ; ÉCRAN |
| B5 | Départ posé par erreur sans recours | correction de date suivie ; `admin_cancel_client_departure` rouvre le Client Apporté (bouton « Départ posé par erreur ») | SQL 10 « B5 » |
| B6 | Retour d'un client selon l'ordre des gestes de l'admin | effacer le départ d'un client redéclaré refusé (message) ; fin figée comptée comme départ ; sans nouvelles CGV, commission depuis le marquage | SQL 10 « B6 » |
| C2 | Seuil de nom vide : garde-fou désactivé | réglage requis ; sans lui, pas de lien d'inscription | SQL 10 « C2 » |
| C3 | Confirmation d'une déclaration d'un contrat terminé | refusée | SQL 10 « C3 » |
| C4 | Réservation fusionnée dans une fiche cliente | close (motif « client », sans toucher au reflet du client), titulaire prévenu, plus d'accès | SQL 10 « C4 » |
| C5 | Plafond et carence non affichés (v2, art. 4.3 bis) | affichés dans Compte | SQL 10 « C5 » ; ÉCRAN |
| C6 | Interlocuteurs d'Ominin réécrits par le commercial | `crm_contacts.created_by` ; seuls les siens, saisis pendant sa déclaration, se modifient | SQL 10 « C6 » ; `nouveaux3.sql` S9 conforme |
| Mineurs | `/confidentialite` servie avant relecture ; jeton gardé dans les métadonnées ; « Inscrit · » à la date de déclaration | retirée de l'index ; jeton effacé après rattachement ; historique « déclaré le … · inscrit le … » | code |
| Décision | Rendez-vous : J+1, J+7, J+14 | voir section 8 | SQL 10 « J+n » |

Essais du vérificateur rejoués (`nouveaux3.sql`) : 24 conformes sur 31 ; les 7 autres sont attendus : S1 lit la table en direct (lecture par fonction désormais), S3, S4 (×2) et S8 notent un état descriptif (« close ou signalée », « confirmed (puis libérée) », lien nul, aucun Client Apporté sans lien), S5 annule par `admin_set_client_ended(null)` alors que l'annulation est un geste dédié, S9 note « passe » pour l'appel refusé (l'interlocuteur reste intact, S9 suivant conforme).

## Écarts au cahier

1. **Sélection de Léa** : le refus du restaurant réservé se fait dans `_eligible` (même boucle que les autres refus), par `crm_is_reserved`, et non par un `not exists` dans la requête : PostgREST ne l'exprime pas simplement. Comportement prouvé par l'essai LÉA.
2. **Webhook** : `invoice.paid` et les avoirs (`credit_note.*`) sont traités une fois, dans le switch principal, pour les restaurants et les boutiques (lus dans les métadonnées de l'abonnement), plutôt que dans deux branches ; chaque événement recalcule la ligne de la facture en entier depuis Stripe.
3. **Estimation du mois** : calculée à la lecture, pas stockée par la tâche quotidienne.
4. **Simulateur** : lien vers le devis public (`lib/quote.ts`, page `/devis`, déjà au format téléphone), pas une copie dans le Kit.
5. **Statut RGPD, période de commission après la fin du contrat du commercial** : le code suit 13.1 (24 mois par restaurant, borné par le départ du client seulement) ; la version 1 signée borne par la fin du contrat. La version 2 le tranche (marqué [À DÉCIDER]).
6. **Démos du Kit** : en plus de la démo Ominin, les démos proposées sont choisies par l'admin dans les Réglages (`kit_demo_slugs`) plutôt qu'une liste écrite dans le code.
7. **Google Places** : la recherche de l'espace passe par le backend (`POST /places/search`), seul à tenir la clé, l'URL et le masque de champs (ceux de Léa). Conséquence : sur l'offre gratuite de Render, un backend endormi rend la première recherche lente (jusqu'à une minute, comme les jobs lancés depuis l'admin).
8. **Types** : `database.types.ts` régénéré depuis la base locale de test ; l'ordre des tables change (le fichier précédent n'était pas trié) ; les signatures des fonctions existantes et l'en-tête `graphql_public` de la version de production sont gardés.
9. **`commercial_clients.ended_at`** (contre 13.2 n° 6, décision de Marwan) : la fin d'un Client Apporté est figée au départ du client et ne se rouvre pas ; un client revenu n'est plus apporté, sauf nouvelle déclaration (4.4). Début de la commission d'un client parti puis redéclaré : la première acceptation des CGV postérieure à la nouvelle déclaration, comme pour tout client. C'est la seule preuve, compatible avec la règle « un client existant n'est pas attribué », qu'il revient par le commercial ; l'ouverture du lien seule ne suffit pas (on ne distingue pas un gérant qui revient d'un gérant qui consulte). Si le client revient sans accepter de nouvelles conditions, l'inscription n'est pas attribuée par le lien : l'admin la marque signée, et la commission démarre **à la date de ce marquage** (décision de Marwan, troisième passage). Effacer le départ d'un client redéclaré est refusé (son retour se constate par l'inscription) ; la fin figée d'un Client Apporté précédent compte aussi comme départ. Un départ posé par erreur s'annule (« Départ posé par erreur », `admin_cancel_client_departure`) ; corriger sa date déplace la fin du Client Apporté qu'il avait close.

## Ce qui reste aux fondateurs

- **Réglages** (onglet Commerciaux → Réglages) : à remplir avant la première invitation — nombre de résultats de recherche, validité des liens d'inscription, rayon d'« Autour de moi » ; à décider — plafond, carence, `IN_TALKS_DAYS`, quotas (recherche, Google), délais de rappel (expiration, option, rendez-vous), seuil de « nom proche », démos du Kit, **prix Stripe éligibles (décision n° 5)**, **frais Club (décision n° 2)**.
- **Deck** à déposer (onglet Réglages → Deck du Kit).
- **Rattachement** des clients en service et des clients du Projet (onglet Réglages → Rattachement) avant la première invitation.
- **Version 2 du contrat** : relecture par l'avocat de `commercial-v2.ts`, puis inscription dans `documents/index.ts` avec sa date et `npm run legal:publish`.
- **`/confidentialite`** : relecture, inscription de `confidentialite20261026` dans `documents/index.ts`, puis `npm run legal:publish` (non servie avant). Le QR de la fiche mène à la version en vigueur, qui ne parle pas encore de prospection.
- **Migrations** `20261028000001` à `20261028000005` à appliquer (`npm run db:push`).
- **Variables d'environnement** : aucune nouvelle. La recherche Google utilise `GOOGLE_PLACES_API_KEY` du backend (déjà là pour Léa) et, côté Vercel, `BACKEND_URL` et `AGENT_TRIGGER_SECRET` (déjà là pour l'agent social) ; déjà existantes et utilisées : `CRON_SECRET`, Gmail, VAPID, Stripe.
- **Backend** : déployer le nouveau routeur `/places` (Render) avec le front.
- **Stripe** : ajouter `invoice.paid`, `credit_note.created`, `credit_note.updated`, `credit_note.voided` aux événements du webhook ; vérifier sur une facture de test avec coupon et avoir que `ominin_invoice_payments` tombe juste (non essayé ici).
- **Tâches** : secret `CRON_SECRET` et `MENU_URL` déjà utilisés par `commercial-daily.yml` ; heure 06:30 UTC, celle du point du matin, gardée ; `--max-time 60` comme le workflow copié (`admin-digest.yml`) ; les relances après un rendez-vous passent par cette tâche (réglage `followup_days` à remplir : 1, 7, 14).
- **Non corrigé** : `admin_signup_matches` et la file d'e-mails ne sont pas paginées (volumes attendus faibles, à reprendre si la file grossit).
- **Essais manuels** : critères 11 (iPhone), 12 (chronomètre), 13 (e-mails réels), 14 (publication).

## Annexe — essais

ÉCRAN (Playwright, Chrome, 390×844, iPhone, base locale) :
Aujourd'hui : rendez-vous du jour · relance due · barre du bas · recherche « Libre » · trouver et déclarer en 5,2 s (serveur de développement) · fiche en attente · fiche confirmée : lien proposé · étape 4 suit le geste · note enregistrée, brouillon vidé · lien d'inscription créé · écrans Kit, Clients, Argent, Compte, Ajouter · admin : déclaration confirmée · Aujourd'hui : décision parmi les nouveautés · ergonomie de la fiche (champs 16 px, cibles ≥ 40 px). Un premier passage a relevé deux cibles de 20 px (lien retour, « + Ajouter »), agrandies depuis.

ÉCRAN, corrections de la vérification : cases d'étapes 44 × 44 px · `.ics` servi par la route (200, `text/calendar`) · interrupteurs : lignes de 44 px, touchables en entier · préférence « opposition » proposée · fin de contrat : `/espace`, `/restaurants`, une fiche, `/kit`, `/clients`, `/restaurants/nouveau`, `/restaurants/autour` → `/argent` · bandeau et Argent affichés · deck refusé (403) · Compte ouvert · lien d'inscription ouvert par le commercial connecté : refus affiché dans le tunnel, lien resté libre.

Essais du vérificateur rejoués sur la base corrigée (`verif_attaques.sql`, T9 adapté au refus par exception) : 47 conformes ; les 4 restants ne sont pas des défauts (T1 n° 15 et 16 : l'écriture directe est refusée par une erreur au lieu de n'écrire aucune ligne ; T12 n° 50 et T13 n° 51 décrivent l'état d'avant, « f » attendu tant que le défaut existait). `cap_race.sh` : « déclarations actives de A : 1 ».

LÉA (essai Python, base locale, Gmail/Claude/notifications remplacés) :
`crm_is_reserved` distingue déclaré et libre · sélection : déclaré écarté · sélection : libre éligible · envoi : annulé `reserved_by_commercial`, rien envoyé · écriture : statut gardé malgré l'update de Léa · boîte de réception : aucune réponse préparée · le titulaire est prévenu du sens de la réponse.
