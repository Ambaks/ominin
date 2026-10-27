# Espace commercial Ominin — cahier des charges

Version 7 — 26 octobre 2026. Pour Marwan Al Masri et Ambaka Le Grégam.
Les renvois au code visent `main` au commit `42d4938c`.

> **En bref.**
> - **Le principe** : une base de restaurants commune. Chaque commercial **déclare** (réserve 6 mois) les restaurants qu'il travaille, coche les 5 étapes de prospection de Projet, note ce qu'il a retenu, et voit ce que les autres ont retenu des restaurants libérés. Le restaurant s'inscrit par un lien propre au commercial ; il touche 15 % de ce qu'Ominin encaisse.
> - **Le lot 1** (cœur, utilisable seul) : base commune, déclarations avec confirmation admin, fiche, étapes, journal, relances, écran Aujourd'hui, e-mails exigés par le contrat, Léa tenue à l'écart, connexion par code sur iPhone.
> - **Ensuite** : kit et inscription par lien (lot 2), commissions et relevés (lot 3), confort (lot 4), couche jeu (lot 5).
> - **À décider avant de coder** (section 12) : la période de commission (le contrat dit autre chose que « 24 mois par restaurant »), une version 2 du contrat, le plafond de déclarations, quelques paramètres.
> - **Risques** : requalification du commercial en salarié (d'où aucun suivi d'assiduité), conflits d'attribution (d'où des règles écrites et testées), aspiration de la base (d'où des quotas).

## 1. Pourquoi

Ominin vend par des commerciaux indépendants, apporteurs d'affaires payés à la commission.
Aujourd'hui un commercial a un contrat signé en ligne et rien d'autre : il prospecte avec ses
notes et sa mémoire, et Ominin ne sait ni qui il a vu, ni ce qui s'est dit, ni à qui revient un
restaurant signé.

L'espace commercial devient **l'outil de travail quotidien** du commercial : il y trouve ses
restaurants, note chaque passage, montre les démos, envoie le lien d'inscription au restaurant et
voit son argent. Pour Ominin, c'est la seule source de vérité sur l'attribution et les commissions.

Indicateurs produit, agrégés sur tous les commerciaux, jamais par personne (4.7) :
- inscriptions rattachées à un commercial **après coup** (doit tendre vers zéro) ;
- part des déclarations qui atteignent l'inscription ;
- temps d'admin pour produire les relevés du mois.

Hors périmètre : la couche jeu (section 11, dernier lot) ; les commerciaux salariés ; un espace
pour les restaurants.

## 2. Ce qui existe et qu'on réutilise

| Brique | Où (sur `main`) | Usage ici |
|---|---|---|
| Espace commercial d'Ambaka (#477) : invitation, lien de connexion par e-mail (`generateLink`), identité, contrat versionné signé par case à cocher, PDF aux deux parties | `app/commercial/`, `lib/commercial/`, table `commerciaux`, `legal_acceptances` portée `commercial` | Porte d'entrée gardée ; deux modifications : accès (7.2) et code de connexion (5.0). |
| Contrat d'apport d'affaires | `lib/legal/documents/commercial.ts` ; 15 %, 24 mois, option 3 ans dans `lib/legal/constants.ts` | Fait foi. Une version 2 est nécessaire (12, n° 2). |
| CRM : `crm_restaurants`, `crm_leads` (`status`, `lost_reason`, `target_products` ; `assigned_to` existe mais n'est lu ni écrit par aucun code), `crm_contacts`, `crm_activities` (types `crm_activity_type`), `crm_tasks` (`due_at`), `crm_appointments` | `20260810000003_crm.sql`, `20261005000002` | Base commune réutilisée (section 7). |
| `crm_find_duplicates` (téléphone, e-mail, nom proche ; `security invoker` ; sans identifiant Google) | même migration | Appelée par une fonction du commercial, complétée par `(source, external_id)`. |
| Opposition : `crm_restaurants.outreach_opted_out_at` ; `outreach_suppressions` (clé : e-mail ; motifs `opt_out`, `bounce`, `manual`) | `20260819000002_outreach.sql` | « Ne plus contacter ». |
| Léa : crons `agent-discovery`, `agent-enrich`, `agent-outreach`, `agent-inbox` ; réponses classées (`outreach_emails.classification`) ; Léa écrit `crm_leads.status` (`enrichment.py`, `inbox.py`, `emailing.py`, `outreach.py`) ; le trigger `crm_log_status_change` journalise tout changement de statut avec `created_by = auth.uid()` | `backend/app/services/`, `.github/workflows/agent-*.yml`, `20260810000003_crm.sql` | Doit sauter les restaurants déclarés, en lecture **et** en écriture, garanti en base (4.3). |
| Projet : `projet_step_templates` (Prospection 1–5, Intégration 6–12, Suivi 13–15 ; descriptions propres à Shop), `projet_add_client(p_name, p_product, p_etablissement, p_shop)` ; 10 clients aujourd'hui | `20261014000001`, `20261015000001` | Étapes du commercial ; client créé à l'inscription. |
| Tâche quotidienne de l'admin : `admin-digest.yml` → `/api/admin/push/digest` avec `X-Cron-Secret` | `.github/workflows/admin-digest.yml` | Modèle de la tâche quotidienne (7.4). |
| Acceptation des CGV : `acceptContract` | `lib/legal/server.ts` | Point où l'inscription devient « signée » (5.5). |
| Devis (`lib/quote.ts`) ; liste des caisses (partenaires et `otherTills` de `lib/landing-data.ts`) | — | Simulateur du kit ; valeurs de « caisse ». |
| Démos `/menu/demo/<slug>` ; carte admin `app/admin/(shell)/carte`, index `crm_restaurants_geo_idx` | — | Kit ; « Autour de moi ». |
| Push admin : `public/sw.js` (push seul), `admin_push_subscriptions` (marwan / ambaka) | `20261015000001` | Modèle ; l'espace commercial a son worker et sa table. |
| `etablissements.demo`, `shops.demo` | `20261022000001` | Exclus de toute assiette. |

Aucun outil de test automatisé dans le dépôt. Le lot 1 ajoute des scripts SQL d'assertions lancés
par `psql -v ON_ERROR_STOP=1` sur un Postgres local en Docker avec toutes les migrations.

Hôte : `commercial.ominin.com` quand `NEXT_PUBLIC_COMMERCIAL_HOST` est posé, sinon
`ominin.com/commercial` (`lib/site.ts`).

## 3. Les personnes

- **Commercial** : entrepreneur individuel, sur le terrain, téléphone en main. Aucun pouvoir de
  négocier ni de signer pour Ominin (art. 2.2) : il présente les offres publiées, met en relation,
  et le restaurant s'inscrit **lui-même**.
- **Admin** (Marwan, Ambaka) : invite, confirme, tranche, reprend l'intégration, émet les relevés.
- **Restaurant** : ne voit jamais l'espace. Il reçoit une démo, puis un lien d'inscription.

## 4. Règles métier

### 4.1 Un restaurant, une fiche

Une fiche par restaurant (`crm_restaurants`). Le commercial cherche avant de créer ; la création
montre les doublons probables (même `external_id`, même téléphone normalisé, même e-mail, nom proche
dans la même ville) et ne crée qu'après « Ce n'est aucun de ceux-là ». Une fiche venue de Google
porte `source = 'google_places'` et son `external_id` (l'index unique `(source, external_id)` bloque
le doublon exact). C'est une détection, pas une garantie.

**Lien fiche ↔ client** : `crm_restaurants.etablissement_id` et `shop_id` (posés à l'inscription
par lien, ou par l'admin) ; `projet_clients.restaurant_id` (choisi par l'admin quand il crée un
client dans Projet) ; `crm_restaurants.client_ended_at` (posé par l'admin quand le client part).
Première étape du lot 1, avant toute ouverture aux commerciaux : migration, puis l'admin relie les
10 clients Projet et les établissements en service. Pour les inscriptions spontanées à venir, voir
4.2, refus n° 1.

**Déclaration active** : une déclaration `pending` ou `confirmed`. Le terme a ce sens partout
(plafond, refus, fonctions d'écriture, Léa).

### 4.2 La déclaration (réservation)

Traduction de l'art. 4.3. Une déclaration contient, comme l'exige le contrat, le **nom**,
l'**adresse** (ceux de la fiche) et un **interlocuteur** : au minimum sa fonction (gérant, associé,
responsable de salle, autre), son nom s'il est connu ; il est enregistré dans `crm_contacts`
(dont `first_name` devient facultatif, avec `check (first_name is not null or role is not null)`).
L'offre visée est écrite dans `crm_leads.target_products` ; les étapes prennent la variante Shop
quand Shop est la seule offre visée.
Déclarer est un seul écran ; rien d'autre ne s'écrit sur une fiche (journal, relances) sans
déclaration ou sans « passage sans suite » (4.2 bis).

**Refus d'office** (ligne `refused` écrite, motif en liste fermée) :
1. **Déjà client** : fiche reliée à un établissement ou une boutique sans `client_ended_at` (un
   client parti peut être redéclaré), **ou** établissement
   (`etablissements.phone`) ou boutique (`shops.contact_phone`) au même téléphone, normalisé à la
   volée de la même façon que `crm_restaurants.phone_normalized`. Un **nom proche** (sans critère
   de ville : `etablissements` n'a pas de colonne ville) ne refuse pas : la déclaration reste en
   attente avec une alerte admin ;
2. **Déjà déclaré** : déclaration `pending` ou `confirmed` d'un autre ;
3. **En discussion avec Ominin** (4.3) ;
4. **Opposition** du restaurant (art. 4.7 : Ominin refuse le Prospect) ;
5. **Plafond** de déclarations actives atteint et 6. **carence** après abandon ou expiration par le
   même commercial — motifs créés par la version 2 du contrat (publiée avant toute invitation, donc
   applicables à tous).

Sinon : **en attente**. À l'écriture, la ligne reçoit `confirm_deadline = declared_at + délai de
confirmation`. Un admin confirme ou refuse avec motif, **uniquement tant que
`now() < confirm_deadline`**. Passé ce délai, la déclaration est confirmée de droit (art. 4.3) :
toute lecture traite une déclaration `pending` échue comme confirmée, et `commercial_confirm_due()`
(appelée par la tâche quotidienne) l'écrit avec `confirmed_at = confirm_deadline`. À la
confirmation, `reserved_until = confirmed_at + fenêtre de signature` est stocké.

**Concurrence** : deux déclarations simultanées sur le même restaurant butent sur l'index unique ;
`commercial_declare` attrape `unique_violation` et écrit pour la seconde une ligne `refused`
(motif `declared`), e-mail compris. Une confirmation, même tacite, crée le droit : plus de refus
ensuite. Une déclaration en attente avec alerte « déjà client ? » déclenche un push admin et
affiche son compte à rebours, pour être tranchée avant d'être confirmée tacitement.

**Invariants en base** (trigger sur `commercial_declarations`) : refus seulement depuis `pending`
et avant l'échéance ; aucun retour vers `pending` ou `refused` depuis `confirmed` ; `signed`,
`abandoned`, `expired`, `refused`, `passage` sont terminaux.

**E-mails exigés par le contrat** (décisions, art. 4.3 ; signature, art. 6.2 ; abandon pour
opposition), par notre Gmail (`lib/gmail.ts`), via une table `commercial_emails`
(`declaration_id`, `kind`, `created_at`, `sent_at`, `gmail_message_id`) qui est à la fois la file
d'envoi et la preuve : chaque événement y insère une ligne dans la même transaction ; la route
serveur qui vient d'agir puis, en filet, la tâche quotidienne envoient les lignes sans `sent_at` et
les renseignent. Confirmée, la déclaration **réserve** le restaurant jusqu'à `reserved_until`.

**Paramètres appliqués par la base** (délais contractuels, plafond, carence, `IN_TALKS_DAYS`,
quotas) : une table `commercial_settings` à une ligne, écrite par l'admin seul, lue par les
fonctions et les triggers. Aucun de ces paramètres n'est un argument d'une fonction appelable par
le commercial (il pourrait l'appeler directement par l'API avec d'autres valeurs). Les deux délais
contractuels y sont recopiés de `lib/legal/constants.ts` ; un script d'assertion vérifie l'égalité.
Les délais déjà calculés (`confirm_deadline`, `reserved_until`) restent sur chaque ligne : une
future version du contrat aux délais différents ne touche pas les déclarations en cours. Fins : **signée**, **abandonnée** (motif en liste fermée), **expirée**,
**refusée**.

**Déclaration reçue par e-mail** (art. 4.3) : saisie par l'admin avec sa date d'origine
(`admin_record_email_declaration`). Si une déclaration concurrente plus récente est encore en
attente, la fonction la refuse d'abord (motif `declared`), dans la même transaction, puis écrit
celle reçue par e-mail. Si la concurrente est déjà confirmée, la plus ancienne ne peut plus
l'emporter : conflit tranché par l'admin (ci-dessous).

**Doublons de fiche confirmés pour deux commerciaux** (fiches fusionnées après coup) : décision de
l'admin, motivée et tracée ; la version 2 du contrat écrit la règle (« la première déclaration
confirmée l'emporte ; l'autre commercial est informé »).

Délais contractuels, **à créer** dans `lib/legal/constants.ts` (le contrat actuel écrit « sept
(7) jours » et « six (6) mois » en dur) : `COMMERCIAL_CONFIRM_DAYS` (7) et
`COMMERCIAL_SIGN_WINDOW_MONTHS` (6). La version 2 du contrat les lit de là ; la base les reçoit en
recopie dans `commercial_settings`.

**Inscription avant le lot 2** : tant que le lien d'inscription n'existe pas, l'admin peut
**marquer signée** une déclaration (onglet Déclarations, lot 1) et la relier à l'établissement,
pour qu'aucune réservation n'expire alors que le restaurant s'est inscrit. Le commercial en est
informé par e-mail (art. 6.2), par `commercial_emails`. La migration du lot 2 crée une ligne
`commercial_clients` pour chaque déclaration déjà `signed`, avec `commission_from` égal à la
première acceptation des CGV postérieure à la déclaration.

**Opposition pendant une réservation** : quel que soit le canal (`/api/desinscription`, réponse
`opt_out` à Léa, bouton du commercial), un trigger sur `crm_restaurants.outreach_opted_out_at`
abandonne la déclaration active (motif opposition) et prévient le titulaire par e-mail (et push au
lot 2) : il arrête de démarcher (RGPD art. 21, contrat art. 6.1).

**Réattribution** : impossible pendant une réservation, sauf abandon ou accord écrit du titulaire
(pièce jointe par l'admin). Motif et trace obligatoires.

### 4.2 bis Passage sans suite

Pour noter « vu, pas intéressé » sans réserver : bouton « Passage sans suite » qui écrit
directement une ligne `status = 'passage'` avec sa fiche retenue et son motif. Ni file admin, ni
e-mail, ni plafond, ni carence, aucun droit à commission. Elle apparaît dans l'historique visible
de tous (4.5). Refusé sur un restaurant réservé par un autre, client ou en opposition. Il passe
`crm_leads.status` à `not_interested` par le reflet, ce qui sort le restaurant des envois de Léa.

### 4.3 « En discussion avec Ominin », Léa et `crm_leads`

**État calculé**, vrai si l'une des conditions est remplie :
- réponse à Léa (`outreach_emails` entrant classé `interested`, `meeting_request` ou `question`)
  depuis moins de `IN_TALKS_DAYS` ;
- **un fondateur le travaille** : une activité (`crm_activities`, dont les `status_change` que le
  trigger `crm_log_status_change` signe de l'auteur) ou un rendez-vous (`crm_appointments`) créé
  par un admin (`created_by` dans `admin_users`) depuis moins de `IN_TALKS_DAYS`, sur un restaurant
  dont `crm_leads.status` n'est ni `lost`, ni `not_interested`. (`assigned_to` n'étant rempli par
  personne, il n'entre pas dans la règle.) ;
- relié à un client Projet (`projet_clients.restaurant_id`).

L'admin peut forcer l'état (`crm_restaurants.in_talks_override`, null par défaut). Un e-mail de Léa
sans réponse ne bloque rien.

**Léa** ignore tout restaurant qui a une déclaration `pending` ou `confirmed`, garanti en base :
- **statut** : un trigger `BEFORE UPDATE` sur `crm_leads` garde l'ancien statut d'un restaurant
  déclaré, **sauf** quand la transaction porte le drapeau `set_config('ominin.crm_reflect', 'on',
  true)`, que posent seules les fonctions du reflet (fonctions du commercial,
  `admin_decide_declaration`, `admin_mark_signed`, `commercial_confirm_due`,
  `commercial_expire_due`, et la signature du lot 2). On ne se fie pas à `auth.uid()` : les routes
  Next appellent aussi la base en `service_role`. Toute autre écriture (les quatre fichiers de Léa,
  y compris la remise à `new`, et l'écran admin Restaurants) est sans effet sur le statut ;
- **sélection** : la requête des restaurants à contacter (`outreach.py`) ajoute `not exists` sur
  ces déclarations ;
- **file d'envoi** : `commercial_declare` passe en `cancelled` les `outreach_emails` sortants
  `draft`, `pending_approval` et `approved` du restaurant ; l'envoi (`_send_one` dans
  `emailing.py`) revérifie qu'aucune déclaration n'est active ; `inbox.py` ne prépare plus de
  réponse pour un restaurant réservé.

Une réponse tardive d'un restaurant réservé à un ancien e-mail de Léa est traitée par l'admin ; le
titulaire reçoit seulement « le restaurant a répondu à Ominin (intéressé / question / …) », sans le
contenu.

**L'écran admin Restaurants** affiche en lecture seule le statut d'un restaurant déclaré (le
reflet vient du commercial).

**Reflet dans `crm_leads`** (pour que les écrans Restaurants et Carte de l'admin montrent le
travail des commerciaux) — écrit par les seules fonctions portant le drapeau ci-dessus ; le trigger
`crm_log_status_change` signe la ligne `status_change` de l'appelant (le commercial, l'admin qui
confirme, ou personne pour la tâche quotidienne). La règle « un fondateur le travaille » ne compte
donc pas les `status_change` du reflet : elle exclut ceux écrits dans une transaction de reflet
(`metadata.reflect = true`, posé par le trigger quand le drapeau est présent).

| Événement | `crm_leads.status` |
|---|---|
| confirmation, étapes 1 ou 2 (plus haute cochée) | `to_contact` |
| étape 3 | `contacted` |
| étape 4 | `visited` |
| étape 5 | `negotiation` |
| inscription (5.5) | `signed` |
| passage sans suite | `not_interested` |
| abandon, expiration, fin de contrat | `lost`, `lost_reason` = motif |
| case décochée | recalculé depuis la plus haute restante |

### 4.4 Commission

- **15 % du chiffre d'affaires net encaissé HT par Ominin** sur chaque Client Apporté (art. 4.1).
- **Assiette**, hors établissements et boutiques `demo = true` et hors établissements dont
  `payment_provider = 'demo'` (paiements simulés), chaque montant imputé au mois de son
  encaissement :
  - Menu et Collect (`orders.type` `sur_place` **et** `collect`) : `orders.platform_fee_cents` des
    commandes `paid_online = true` non `annulee`, au mois de `created_at` ;
  - Shop : `shop_orders.platform_fee_cents` des commandes payées (`paid_at` renseigné), au mois de
    `paid_at`, **quel que soit le remboursement** : le remboursement Shop
    (`app/api/shop/gestion/orders/route.ts`) ne rend pas les frais d'application, Ominin les garde,
    ils restent dans l'assiette (art. 4.5 ne déduit que ce qu'Ominin rend). Si un jour le
    remboursement rend les frais, la règle devient celle de Menu ;
  - Club : `club_payments.fee_cents` avec `status = 'payee'` et `refunded_at` nul, au mois de
    `paid_at` (ces frais étant payés par les clients du club, leur inclusion est à confirmer dans la
    version 2, décision n° 2) ;
  - factures Ominin : nouvelle table `ominin_invoice_payments` alimentée par `invoice.paid` dans
    les deux branches du webhook Stripe (restaurants et `handleShopSubscriptionEvent`). Seules
    comptent les lignes dont le prix est un **prix d'abonnement ou de commission facturée**
    (liste des identifiants de prix Stripe concernés, en configuration ; le prix de mise en place
    Shop `shop_setup`, à 0 € aujourd'hui, y est classé par la décision n° 5) : la commande de
    démarrage (Cachets, Omilink, livraison), facturée dans la même première facture, est du
    matériel exclu (art. 4.5) ;
  - commission « facturée mensuellement » hors Stripe (CGV, par exemple encaissement SumUp sans
    frais d'application) : ligne saisie par l'admin.
- **Ce que la base ne trace pas** (remboursement d'une commande Menu, qui rend les frais ; impayé ;
  contestation de paiement) : régularisation saisie par l'admin sur le relevé du mois où
  l'événement a lieu (art. 4.6).
- **Ce que la base trace après coup** (un paiement Club d'un mois déjà relevé passé en remboursé,
  une facture annulée) : à la génération de chaque relevé, les mois déjà figés du commercial sont recalculés
  et l'écart est ajouté en **régularisation automatique**, avec le mois d'origine.
- **Début** : première acceptation des CGV de l'établissement ou de la boutique **postérieure à la
  déclaration** (`legal_acceptances.accepted_at`, portée `etablissement` ou `shop`).
- **Fin** : selon la décision n° 1, bornée par le départ du client (`commercial_clients.ended_at`
  et `crm_restaurants.client_ended_at`, posés par l'admin). Un client revenu après départ n'est plus
  apporté, sauf nouvelle déclaration (possible puisque `client_ended_at` est posé).
- **Nouvel établissement du même exploitant** (art. 4.4) : ligne `commercial_clients` créée par
  l'admin sur la même déclaration. Critère : même SIREN, lu dans `etablissements.siret` ou
  `shops.legal_siret` quand ils sont remplis (`siret` n'est demandé que par Collect) ; sinon l'admin
  juge sur pièces.
- **Relevé** avant le 10 ; facture du commercial ; virement sous 30 jours après
  `invoice_received_at` ; détail sur demande une fois par trimestre, rendu sous 15 jours ;
  contestation sous 3 mois ; relevé final sous 30 jours après la fin (art. 5 et 8.1).

**Décision bloquante (n° 1)** : le contrat actuel fait courir la commission **tant que court le
contrat du commercial** (24 mois après sa signature, + 3 ans si Ominin lève l'option). Marwan a dit
« 15 % pendant 24 mois », en pensant **24 mois après l'inscription de chaque restaurant**. Avec le
texte actuel, un restaurant inscrit au 20e mois rapporte 4 mois. Le calcul prend une fin par Client
Apporté dérivée de la règle retenue. `commercial_declarations.contract_version_id` garde la version
en vigueur à la déclaration, pour preuve ; aucune règle n'en dépend tant qu'une seule version a été
signée.

### 4.5 Ce que voit chacun

**Lecture retenue de « chaque commercial ne voit que ses prospects »** : il ne voit en détail que
ses déclarations ; de toute la base, il ne voit que la fiche publique et le statut, sans quoi il ne
saurait pas qu'un autre est déjà passé. Contre l'aspiration de la base : recherche limitée à
`SEARCH_MAX_RESULTS` résultats et à `SEARCH_DAILY_QUOTA` recherches par jour (un compteur du jour,
remis à zéro chaque jour, jamais lisible par l'admin), et confidentialité de l'art. 6.4.

**Fiche publique** (colonnes exactes de `crm_restaurants`) : `name`, `category`, `cuisine`,
`address`, `city`, `postal_code`, `latitude`, `longitude`, `phone`, `website`, `menu_url`,
`google_maps_url`, `instagram_url`. Servies au seul titulaire, comme un interlocuteur :
`owner_name`, `owner_phone`, `owner_email`, `email` (ce sont souvent les mêmes informations que
`crm_contacts`). Jamais servies aux commerciaux : `important_notes`, `description` (notes de
l'admin).

| Ce qui est vu | Titulaire d'une déclaration active | Autre commercial | Admin |
|---|---|---|---|
| Fiche publique | oui | oui | oui |
| Statut : libre, réservé (étape la plus haute, depuis quand, sans le nom), client, opposition | oui | oui | oui |
| Historique : déclarations passées et passages sans suite (dates, étape atteinte, motif de fin, champs fermés de la **fiche retenue**) | oui | oui | oui |
| Précision libre de la fiche retenue | la sienne | non | oui |
| Interlocuteurs du restaurant (`crm_contacts` : nom, rôle, téléphone, e-mail, décideur ; tous, y compris ceux saisis avant lui ; jamais le champ `notes`) | oui | non | oui |
| Journal, relances, rendez-vous **de sa déclaration** | oui | non | oui |
| Journal, relances, rendez-vous des déclarations précédentes | non | non | oui |
| Échanges avec Léa : date et classification, pas le contenu | oui | non | oui |
| Encaissements | son assiette | non | oui |

Les interlocuteurs sont des coordonnées professionnelles dont Ominin est responsable : le titulaire
du moment les voit tous, pour ne pas les redemander. Les notes de travail restent à leur auteur.

La **fiche retenue** est portée **par la déclaration** (`commercial_declarations.retained`), écrite
par son seul titulaire, jamais écrasée par un autre ; c'est l'historique visible de tous. Champs :
- **caisse** : liste des caisses de `lib/landing-data.ts` (partenaires et `otherTills`), « aucune »,
  « autre » ;
- **TPE** : liste fermée (SumUp, Stripe, Square, banque, autre, aucun) ;
- **solution concurrente** (oui / non, nom en liste ouverte courte) ;
- **nombre de tables** (nombre) ;
- **objections** (plusieurs) : prix ou commission, déjà équipé, contrat en cours ailleurs, pas le
  décideur, pas le temps, clientèle peu à l'aise avec le QR, peur de perdre le service en salle,
  autre ; plus une précision courte (`RETAINED_NOTE_MAX_CHARS`), visible du seul titulaire et des
  admins ;
- **intérêt** : froid, tiède, chaud ;
- **meilleur moment pour passer** : matin, après le service du midi, après-midi, soir.

### 4.6 Fin du contrat du commercial

Données sur `commerciaux` : `option_exercised_at`, `notice_given_at`, `ended_at`, `end_reason`
(`term` échéance, `resignation` art. 7.2, `breach` art. 7.3, `immediate` art. 7.4, `mutual`
art. 7.1).
- Préavis (art. 7.2) : les réservations restent valides ; il peut encore déclarer, l'écran
  rappelant que la commission s'arrête à la fin du contrat.
- À `ended_at` : réservations libérées (motif « fin de contrat »), accès réduit à Argent, relevés et
  contrat ; interlocuteurs et journal ne lui sont plus servis, et le brouillon et le cache de
  l'appareil sont vidés à la connexion suivante (art. 6.5 et 8.3).
- Rappel à l'admin `OPTION_REMINDER_DAYS` avant l'échéance (option à lever au plus tard un mois
  avant, art. 3.3).

### 4.7 Indépendance du commercial

L'art. 2.3 interdit objectifs imposés et directives : aucun objectif fixé par Ominin, aucune
relance de l'admin fondée sur l'assiduité, aucune série de jours enregistrée côté serveur, et
`auth.users.last_sign_in_at` (tenue par Supabase) n'est affichée nulle part. L'admin voit des
**résultats** (déclarations, inscriptions, commissions) ; il n'a **aucun écran du journal d'un
commercial** : il ne consulte le journal d'une fiche qu'en cas de litige, d'opposition ou de
conflit d'attribution. La couche jeu suit la même règle (section 11).

Les écrans admin existants qui lisent toutes les relances et tous les rendez-vous filtrent
`declaration_id is null` : le chargement de l'admin (`lib/admin/store.ts`) et le push du soir
(`app/api/admin/push/evening/route.ts`, rendez-vous du lendemain). Sans ce filtre, l'admin verrait
l'agenda des commerciaux et en recevrait les rappels.

### 4.8 Listes fermées

- Motifs de refus : `client`, `declared`, `in_talks`, `opted_out`, `cap`, `cooldown`,
  `admin` (refus manuel, avec texte).
- Motifs de fin (abandon, passage sans suite) : pas intéressé, déjà équipé, contrat en cours
  ailleurs, fermé ou cédé, injoignable, relève d'un siège ou d'un réseau, opposition, autre.
- Fins système (`end_reason` d'une déclaration close par le système ; l'expiration est le statut
  `expired`, sans motif) : `contract_ended`, `merged`, `reassigned`.
- Types de journal : ceux de `crm_activity_type` (`note`, `call`, `email`, `visit`, `whatsapp`,
  `appointment`, `demo`, `follow_up`), `status_change` réservé au système.

## 5. L'espace du commercial

Téléphone d'abord : une main, dehors, réseau moyen. Une note en cours est gardée en brouillon
local si le réseau tombe. Barre du bas : **Aujourd'hui · Restaurants · Kit · Clients · Argent** ;
**Compte** sous l'avatar. Installable (manifeste propre à l'espace).

### 5.0 Connexion
Décision du 26 octobre : connexion **par le lien reçu par e-mail**, comme aujourd'hui
(`lib/commercial/access.ts`), sans code. La session suit les réglages Supabase du projet. Limite
connue : sur iPhone, une application ajoutée à l'écran d'accueil ne partage pas la session ouverte
dans Safari ; le commercial utilise donc l'espace dans le navigateur (le manifeste reste utile sur
Android).

### 5.1 Aujourd'hui (lot 1)
- rendez-vous du jour (`crm_appointments`), bouton itinéraire ;
- relances dues ou dépassées (`crm_tasks`) : appeler, WhatsApp, faite, reporter, en un geste ;
- réservations qui expirent dans `EXPIRY_WARNING_DAYS` ;
- nouveautés depuis la dernière ouverture (date gardée sur l'appareil, rien côté serveur) :
  décisions sur ses déclarations ; à partir des lots concernés, démo prête, restaurant inscrit,
  relevé disponible.

### 5.2 Restaurants
- **Recherche** (nom, rue, téléphone), au plus `SEARCH_MAX_RESULTS` résultats, statut de chacun.
- **Mes restaurants** : déclarations actives, par étape et par prochaine relance.
- **Ajouter à la main** (lot 1 ; `slug` généré par la fonction, comme `discovery.py` ; position
  de l'appareil proposée pour `latitude` / `longitude`, sinon la fiche n'apparaît pas dans « Autour
  de moi »), puis contrôle de doublons ; **par Google Places** (lot 2, côté
  serveur, clé jamais exposée, quota `PLACES_DAILY_QUOTA` par commercial).
- **Autour de moi** (lot 2) : carte, mêmes couleurs de statut.

### 5.3 Fiche restaurant
- En-tête : fiche publique, statut, étape affichée = **la plus haute cochée**, fin de réservation.
- **Les 5 étapes**, des cases (on peut cocher la 3 avant la 2), une date par étape
  (`step_done_at jsonb`). Titres et descriptions lus de `projet_step_templates` (positions 1–5,
  variante Shop si l'offre visée est Shop), avec deux colonnes ajoutées `commercial_title` et
  `commercial_detail` qui, quand elles sont remplies, remplacent le texte des fondateurs. Elles le
  sont pour l'étape 2 (« Démo montrée sur sa carte ou une démo proche ») et l'étape 5 (« Le
  restaurant a choisi une offre publiée et veut s'inscrire », conforme à l'art. 2.2 : la date de
  mise en service se fixe avec l'admin).
- **Fiche retenue** (4.5), **interlocuteurs**, **journal**, **relances**, **rendez-vous** (export
  `.ics` en lot 2).
- **Opposition** : « Le restaurant ne veut plus être contacté » (art. 6.1) → `outreach_opted_out_at`
  posé, et `outreach_suppressions` (motif `manual`) pour chaque e-mail connu du restaurant ;
  déclaration abandonnée, motif opposition.
- **Mention d'information** (dès le lot 1) : QR à montrer ou à laisser, vers `/confidentialite`
  (RGPD art. 13 pour les interlocuteurs rencontrés en personne).

### 5.4 Kit (lot 2)
- **Deck commercial** unique, hors ligne (cache du worker) ; le deck général issu des decks du
  22 octobre remplace `Ominin_Playbook_Commercial_v3.pdf`.
- **Démos**, avec partage du lien au gérant par WhatsApp ou SMS.
- **Offres et prix en vigueur**, lus des mêmes sources que les pages publiques (art. 2.2).
- **Simulateur** : le devis (`lib/quote.ts`) au format téléphone.
- **Demander une démo à ses couleurs**, avec photos de la carte prises sur place : file admin
  « Démos à faire » ; à la livraison, lien sur la fiche et étape 2 cochée.

### 5.5 Faire inscrire le restaurant (lot 2)
Dès la déclaration confirmée, le commercial génère un **lien d'inscription** : jeton aléatoire
(hachage seul stocké), valable `SIGNUP_LINK_DAYS`, dans un paramètre dédié `?c=` ajouté aux trois
tunnels (`/menu/inscription`, `/collect/inscription`, `/shop/inscription`), nom et adresse
pré-remplis.
1. **À la création du compte** dans le tunnel, ou **à l'ouverture du lien** si le gérant est déjà
   connecté à un compte Ominin, le serveur vérifie le jeton et le lie à ce compte
   (`commercial_declarations.signup_user_id`). L'URL n'a plus à survivre ensuite.
2. **À l'acceptation des CGV** (`acceptContract`, que ce soit par `/api/legal/accept` ou par le
   paiement de démarrage), si le compte qui accepte est le `signup_user_id` d'une déclaration
   confirmée : le jeton est consommé, et
   - déclaration `signed`, ligne `commercial_clients` (non validée si l'alerte ci-dessous se
     déclenche), `crm_leads.status = signed` ;
   - `crm_restaurants.etablissement_id` / `shop_id` posés ;
   - client Projet créé : `projet_add_client` étendu de `p_restaurant` et `p_declaration`, produit =
     celui du tunnel utilisé, étapes 1–6 faites (la 6 est l'inscription) ;
   - push et e-mail au commercial, push aux admins.

La page du lien rappelle que l'inscription et les CGV sont faites par le gérant lui-même.
Garde-fous : nom ou téléphone trop différents de la fiche → alerte admin, la ligne ne compte dans
aucun relevé avant validation. Restaurant réservé qui s'inscrit **sans** le lien : repéré par
téléphone ou e-mail à la création de l'établissement et proposé à l'admin pour rattachement.

Pourquoi le client n'entre dans Projet qu'à l'inscription : Projet est la liste des clients à
intégrer ; y verser chaque déclaration la noierait. Le commercial coche les mêmes étapes, issues du
même modèle ; à l'inscription, les étapes 1–6 sont marquées faites dans Projet, et leurs dates
restent lisibles sur la déclaration (`projet_clients.declaration_id`), `projet_steps` n'ayant pas
de date par étape.

### 5.6 Clients (lot 2)
Par Client Apporté : date d'inscription, intégration (étapes 7–15 de Projet, en lecture), **ce
qu'il a rapporté à Ominin ce mois-ci** (l'assiette, jamais son chiffre d'affaires), fin de période,
alerte s'il décroche (règle de l'admin).

### 5.7 Argent (lot 3)
- **Ce mois-ci** : commission estimée par client, recalculée par la tâche quotidienne.
- **Relevés** : détail par client et régularisations, PDF ; états envoyé, facture reçue, payé,
  contesté ; « Demander le détail » (une fois par trimestre, échéance de 15 jours suivie) ;
  « Contester » (3 mois).
- **Facture** : dépôt du PDF (bucket privé `commercial-docs`, lecture titulaire et admins).

### 5.8 Compte
Lot 1 : identité et SIRET, contrat signé (PDF), nouvelle version à signer (bandeau), résiliation
avec préavis. Lot 2 : préférences de notification. Lot 3 : pièces SIRENE et URSSAF (dès 5 000 € HT
puis tous les six mois, art. 2.5) dans `commercial-docs`, avec rappel.

## 6. Côté admin

Sous Marketing → Commerciaux (écran existant), onglets :
1. **Commerciaux** (lot 1) : inviter, renvoyer le lien, contrat et version signée, fin de contrat
   (4.6), option ; par commercial : déclarations, inscriptions, commission du mois.
2. **Déclarations** (lot 1) : file à confirmer avec compte à rebours ; confirmer / refuser (en
   attente et avant échéance seulement) ; saisir une déclaration reçue par e-mail ; alertes « déjà
   client ? » ; forcer « en discussion » ; réattribuer (4.2) ; marquer signée et relier
   l'établissement (4.2). Écritures par des fonctions admin : `admin_decide_declaration(id,
   decision, reason)`, `admin_record_email_declaration(...)`, `admin_reassign_declaration(...)`,
   `admin_mark_signed(id, etablissement_id | shop_id)`, `admin_set_in_talks(restaurant_id, value)`.
   Lot 2 : rattacher une inscription, valider une
   inscription suspecte, fusionner deux fiches (la perdante reçoit `deleted_at` et `merged_into` ;
   déclarations, contacts et journal suivent ; `crm_leads` et `outreach_prospects`, uniques par
   restaurant, gardent la ligne la plus avancée).
3. **Démos à faire** (lot 2), traitées avec `/new-restaurant`.
4. **Relevés** (lot 3) : brouillon du mois, régularisations, envoi PDF par e-mail, facture reçue,
   payé, contestations, demandes de détail, export CSV.

Vue d'ensemble des prospects : les écrans Restaurants et Carte existants, grâce au reflet dans
`crm_leads` (4.3). Pas d'écran Pipeline en plus.

## 7. Données et technique

### 7.1 Tables

| Table | Changement | Lot |
|---|---|---|
| `crm_restaurants` | + `etablissement_id`, `shop_id`, `client_ended_at`, `in_talks_override`, `merged_into` | 1 (`merged_into` : 2) |
| `commercial_settings` (nouvelle, une ligne) | délais contractuels recopiés, plafond, carence, `IN_TALKS_DAYS`, quotas ; écrite par l'admin seul | 1 |
| `commercial_emails` (nouvelle) | `declaration_id`, `kind`, `created_at`, `sent_at`, `gmail_message_id` : file et preuve des e-mails contractuels | 1 |
| `projet_clients` | + `restaurant_id`, `declaration_id` | 1 |
| `projet_step_templates` | + `commercial_title`, `commercial_detail` | 1 |
| `commerciaux` | + `option_exercised_at`, `notice_given_at`, `ended_at`, `end_reason` | 1 |
| `commercial_declarations` (nouvelle) | `restaurant_id`, `commercial_id`, `contract_version_id`, `status` (pending, confirmed, refused, abandoned, expired, signed, passage), `declared_at`, `confirm_deadline`, `confirmed_at`, `confirmed_by` (null = automatique), `reserved_until`, `refusal_reason`, `end_reason`, `step_done_at jsonb`, `retained jsonb`, `retained_updated_at`, `signup_token_hash`, `signup_token_expires_at`, `signup_user_id`. Index unique partiel : une seule `pending` ou `confirmed` par restaurant. | 1 (jeton : 2) |
| `crm_activities`, `crm_tasks`, `crm_appointments` | + `declaration_id` (visibilité : titulaire de cette déclaration) | 1 |
| `crm_contacts` | `first_name` facultatif, `check (first_name is not null or role is not null)` ; types régénérés et affichage admin des contacts sans prénom vérifié | 1 |
| `crm_leads` | trigger `BEFORE UPDATE` de garde (drapeau `ominin.crm_reflect`, 4.3) ; `crm_log_status_change` modifié pour poser `metadata.reflect = true` quand le drapeau est présent | 1 |
| `crm_restaurants` (trigger) | sur `outreach_opted_out_at` : abandon de la déclaration active et e-mail au titulaire (4.2) | 1 |
| `commercial_clients` (nouvelle) | `declaration_id`, `etablissement_id` ou `shop_id`, `commission_from`, `ended_at`, `validated_at` | 2 |
| `commercial_demo_requests` (nouvelle) | `declaration_id`, `status`, `demo_url` | 2 |
| `commercial_push_subscriptions` (nouvelle) | modèle `admin_push_subscriptions` | 2 |
| `ominin_invoice_payments` (nouvelle) | `etablissement_id` ou `shop_id`, `stripe_invoice_id` unique, `eligible_ht_cents` (lignes d'abonnement et de commission seulement), `paid_at` | 3 |
| `commercial_statements` (nouvelle) | `commercial_id`, `month`, `lines jsonb` (figées à l'envoi), `adjustments jsonb`, `total_cents`, `status`, `invoice_path`, `invoice_received_at`, `detail_requested_at`, `contested_at`, `paid_at` | 3 |

La fin de période de commission n'est pas stockée : elle se calcule (4.4).

### 7.2 Accès

**Commercial actif** : compte marqué `app_metadata.commercial`, rattaché à une fiche `commerciaux`,
ayant signé **au moins une version** du contrat, sans `ended_at` passé. Une nouvelle version
s'affiche en bandeau sans fermer l'espace (`app/commercial/espace/page.tsx` montre aujourd'hui le
formulaire dès que la version signée n'est plus celle en vigueur : à changer). **Nouvelles
déclarations** : réservées à qui a signé la version en vigueur. Après `ended_at` : Argent, relevés
et contrat seulement.

Un commercial ne lit **aucune** table `crm_*` en direct. Fonctions `security definer`, qui
vérifient d'abord qu'il est actif :
- lecture (lot 1) : `commercial_search(q)`, `commercial_restaurant(id)` (tableau 4.5 et modèles
  d'étapes), `commercial_find_duplicates(...)`, `commercial_today()` ;
- écriture (lot 1) : `commercial_create_restaurant(...)`, `commercial_declare(restaurant_id,
  products, contact)`, `commercial_passage(restaurant_id, retained, reason)`,
  `commercial_abandon(id, reason)`, `commercial_set_step(id, position, done)`,
  `commercial_save_retained(id, retained)`, `commercial_opt_out(restaurant_id)`,
  `commercial_log(id, type, text)`, `commercial_contact_upsert`, `commercial_task_upsert`,
  `commercial_appointment_upsert` (refusées si la déclaration n'est pas la sienne ou n'est plus
  active) ;
- lot 2 : `commercial_signup_link(id)` ; lot 3 : `commercial_month_estimate()`.

Lecture directe (RLS « self ») : ses `commercial_declarations`, `commercial_clients`,
`commercial_statements`, `commercial_demo_requests`. Les admins gardent `is_admin()` (Ominin est
responsable du traitement), mais l'interface ne leur présente le journal que fiche par fiche (4.7).

### 7.3 Calcul des commissions (lot 3)

`commercial_month_lines(commercial_id, month)` : pour chaque ligne validée de `commercial_clients`,
somme de l'assiette 4.4 imputée au mois, entre `commission_from` et la fin calculée, bornée par
`ended_at`. Le relevé fige le résultat à l'envoi ; toute correction ultérieure est une
régularisation du mois suivant.

### 7.4 Tâche quotidienne (lot 1, complétée au lot 3)

`commercial-daily.yml`, copie de `admin-digest.yml`, appelle la route Next `/api/commercial/cron`
avec `X-Cron-Secret` (`CRON_SECRET`). Côté Next parce que les e-mails (`lib/gmail.ts`) et les
constantes du contrat y vivent. La logique de base est en SQL, appelée par la route, ce qui la rend
testable par les scripts d'assertions : `commercial_confirm_due()` et `commercial_expire_due()`,
sans paramètre (elles lisent `confirm_deadline` et `reserved_until`). Idempotente : confirmation tacite, expiration, envoi des
e-mails en attente (4.2), rappels d'expiration et d'option, effacement des données arrivées à
échéance (9) ; lot 3 :
estimation des commissions, rappels URSSAF, brouillons de relevés le 1er du mois.

### 7.5 Hors ligne et push

Worker propre à l'espace commercial (cache du deck et de la coque, push), distinct de
`public/sw.js`.

## 8. Notifications

**E-mail obligatoire** (preuve contractuelle) : décision sur une déclaration, envoi des relevés.
**Push** (lot 2, si accepté) : relance due (dont les relances J+1, J+7 et J+14 qui suivent un
rendez-vous, 13.1), démo prête, restaurant inscrit, réservation qui expire, relevé disponible.

## 9. Données personnelles

- **Responsable de traitement** de la base de prospection : Ominin ; le commercial y accède pour
  exécuter le contrat (art. 6.5). À faire valider par l'avocat avec la version 2 du contrat.
- **Lot 1** : `/confidentialite` est complétée (prospection par des commerciaux indépendants,
  destinataires, durée, droits) et la mention en QR est disponible sur la fiche (5.3).
  Interlocuteur contacté par écrit : mention dans le message (art. 14). Opposition en un clic
  (`/api/desinscription`) ou de vive voix (`commercial_opt_out`).
- Le téléphone d'un restaurant tenu par un entrepreneur individuel est une donnée personnelle : la
  fiche publique se limite aux coordonnées que le restaurant publie lui-même.
- **Conservation** : interlocuteurs, journal, relances et précisions libres des fiches retenues
  effacés 3 ans après le **dernier contact venu du prospect** (réponse, rendez-vous honoré, appel
  entrant), comme le dit déjà `/confidentialite` ; un passage du commercial ne repousse pas
  l'échéance. Les champs fermés des fiches retenues restent.
- **Note vocale** (lot 4) : moteur de transcription à choisir (décision n° 6) ; envoi hors UE à
  mentionner dans `/confidentialite` ; rien n'est enregistré sans validation du commercial.

## 10. Lots

| Lot | Contenu | Acceptation |
|---|---|---|
| 0 | Décisions de la section 12 ; contrat version 2 rédigé, relu, publié **avant la première invitation** ; e-mail d'invitation (`lib/commercial/mail.ts`) et « L'essentiel » du contrat alignés sur la décision n° 1 | décisions écrites ici ; aucune `legal_acceptances` de portée `commercial` en production au moment de publier la version 2 (sinon : re-signature par le bandeau) |
| 1 | **D'abord** : migration des liens (4.1), puis rattachement par l'admin des 10 clients Projet et des établissements en service, **avant** toute invitation ; ensuite les éléments marqués lot 1 en 5, 6 et 7 ; code de connexion ; coque mobile et PWA ; filtres et gardes de Léa ; reflet `crm_leads` ; `/confidentialite` ; scripts d'assertions | liste ci-dessous |
| 2 | Google Places ; Autour de moi ; push ; Kit ; démos ; lien d'inscription et client Projet ; Clients ; rattachement, validation, fusion | un restaurant s'inscrit par le lien et apparaît, relié, dans Projet et dans « Clients » ; un lien expiré ou consommé est refusé ; une inscription au nom trop différent attend la validation ; une inscription sans lien d'un restaurant réservé est proposée au rattachement |
| 3 | `ominin_invoice_payments` ; calcul 7.3 ; Argent ; Relevés ; pièces ; export | le relevé d'un mois test, recalculé à la main sur les cinq sources, tombe au centime, matériel exclu ; il s'envoie, se facture, se paie, se conteste |
| 4 | Note vocale ; autofacturation (accord écrit du commercial) | — |
| 5 | Couche jeu | — |

**Acceptation du lot 1.** Points 1 à 10 : scripts SQL d'assertions sur Postgres local, en appelant
les fonctions sous le rôle d'un commercial A, puis B, puis du `service_role`. Points 11 à 14 : essai
manuel (iPhone, écran admin, e-mail réel).
1. A déclare un restaurant libre avec un interlocuteur réduit à sa fonction : `pending`,
   `confirm_deadline` posé ; `admin_decide_declaration` confirme ; une ligne `commercial_emails`
   non envoyée existe ; `crm_leads.status = to_contact`.
2. `commercial_confirm_due` confirme une déclaration échue avec `confirmed_at = confirm_deadline`,
   et ne touche pas une déclaration non échue.
2 bis. A ne peut pas lire ni écrire `commercial_settings`, et aucune fonction qu'il peut appeler ne
   prend de plafond, de délai ou de quota en argument.
3. B ne peut pas déclarer le restaurant de A ; deux déclarations simultanées : une seule passe.
4. Chaque refus d'office écrit une ligne `refused` au bon motif : client (lien et téléphone),
   déclaré, réponse à Léa, activité d'un fondateur, client Projet, opposition, plafond, carence.
5. Un refus est rejeté sur une déclaration confirmée ou échue ; aucun retour depuis `confirmed`.
6. B lit le statut et l'étape de A, ni ses interlocuteurs, ni son journal, ni ses relances, ni sa
   fiche retenue en cours ; aucune colonne `owner_*`, `email`, `important_notes`, `description`.
7. A abandonne : B voit la fiche retenue et le motif de A, déclare, et voit alors les
   interlocuteurs mais pas le journal de A.
8. Le reflet suit le tableau de 4.3, y compris une case décochée ; une expiration donne `lost`.
9. Sous le `service_role` sans drapeau, un `update crm_leads set status = 'new'` sur un restaurant
   déclaré laisse le statut inchangé ; avec `commercial_confirm_due` (même rôle, drapeau posé), le
   reflet `to_contact` est bien écrit ; la sélection de Léa ne renvoie pas le restaurant ; ses
   e-mails `approved` passent en `cancelled` à la déclaration.
9 bis. Poser `outreach_opted_out_at` sur un restaurant réservé abandonne la déclaration (motif
   opposition) et insère une ligne `commercial_emails` pour le titulaire.
9 ter. Les requêtes de `lib/admin/store.ts` et du push du soir ne renvoient aucune relance ni aucun
   rendez-vous portant un `declaration_id`.
10. Un compte sans contrat signé, ou avec `ended_at` passé, n'obtient rien des fonctions de travail.
11. Sur iPhone (Safari), connexion par le lien reçu par e-mail, puis session conservée.
12. Trouver un restaurant et le déclarer prend moins de 30 secondes.
13. Onglet admin Déclarations : confirmer, refuser, saisir une déclaration par e-mail, marquer
    signée ; chaque décision produit un e-mail réel reçu par le commercial.
14. `/confidentialite` publiée avec la section prospection ; le QR de la fiche y mène.

## 11. Couche jeu (dernier lot)

Points aux étapes franchies et aux inscriptions, paliers et badges, célébration à chaque
inscription. Calculée à partir des données existantes. Règles : ne récompenser que ce qui se
vérifie (étape, inscription), jamais le volume de notes ; objectifs choisis par le commercial ;
classement facultatif, sans effet sur la commission ni sur la relation avec Ominin ; séries de jours
calculées sur l'appareil, jamais montrées à l'admin (4.7).

## 12. Décisions des fondateurs

1. **Période de commission** : 24 mois après l'inscription de chaque restaurant, ou durée du
   contrat du commercial (texte actuel) ? (4.4)
2. **Version 2 du contrat**, relue par l'avocat, publiée avant toute invitation : période (n° 1) ;
   refus pour plafond et carence ; règle des doublons confirmés (4.2) ; passage sans suite sans
   droit à commission ; libellé de l'étape 5 ; délais lus des constantes ; assiette alignée sur 4.4 (l'art. 4.5 cite des « frais de mise en service » :
   seul le prix Shop `shop_setup` en tient lieu, à 0 € aujourd'hui ; la livraison de la commande de
   démarrage est-elle un frais de tiers refacturé ?) ; inclusion ou non des frais Club, payés par les clients du club ; statut RGPD du
   commercial (responsable distinct, texte actuel de l'art. 6.5, ou sous-traitant au sens de
   l'art. 28).
3. **Plafond** de déclarations actives et **délai de carence** : valeurs ?
4. **Confirmation** : un admin à chaque fois (avec confirmation tacite à 7 jours), ou automatique
   immédiate quand aucun refus d'office ne s'applique (plus aucun refus possible ensuite) ?
5. **Factures Stripe** : liste des prix d'abonnement et de commission éligibles (dont `shop_setup`) ;
   y a-t-il des encaissements hors Stripe (saisie admin) ?
6. **Note vocale** : moteur de transcription et coût (lot 4).
6 bis. **Projet** : avant l'inscription, l'admin voit le travail des commerciaux par le statut
   `crm_leads` (écrans Restaurants et Carte), pas étape par étape dans Projet, pour ne pas noyer
   Projet sous les déclarations (5.5). À valider.
7. **Google Places** : quota par commercial et par jour, dans la limite gratuite.
8. **Paramètres** — valeur et emplacement (config, `.env` ou constante ; ceux que la base applique
   — plafond, carence, `IN_TALKS_DAYS`, quotas — vont forcément dans `commercial_settings`) : `IN_TALKS_DAYS`,
   `EXPIRY_WARNING_DAYS`, `SIGNUP_LINK_DAYS`, jours des relances après un rendez-vous (13.1),
   `OPTION_REMINDER_DAYS`, `PLACES_DAILY_QUOTA`, `SEARCH_MAX_RESULTS`, `SEARCH_DAILY_QUOTA`
   (recherches par commercial et par jour, contre l'aspiration de la base), `RETAINED_NOTE_MAX_CHARS`,
   heure de la tâche, rayon de « Autour de moi », seuil de « nom proche » (alerte « déjà client ? »
   à la déclaration et alerte d'inscription).

## 13. Arbitrages du 26 octobre (font foi sur tout ce qui précède)

### 13.1 Décisions de Marwan

- **Connexion** : invitation et connexion par le lien reçu par e-mail (base d'Ambaka, #477), sans code.
- **Base** : on continue le code d'Ambaka (`app/commercial`, `lib/commercial`, `commerciaux`), on ne le refait pas.
- **Léa** est gardée : elle continue de tourner, tenue à l'écart des restaurants déclarés (4.3).
- **Commission** (décision n° 1) : **15 % pendant 24 mois à partir de l'inscription de chaque
  restaurant** (première acceptation des CGV postérieure à la déclaration). Fin de commission d'un
  Client Apporté = `commission_from + COMMERCIAL_TERM_MONTHS`, bornée par le départ du client.
  Le contrat doit être aligné : version 2 (voir 13.3).
- **Périmètre de ce chantier : lots 1, 2 et 3.** Hors périmètre : note vocale et autofacturation
  (lot 4), couche jeu (lot 5).
- **Objectif** : une plateforme **simple d'utilisation** et vraiment utile. Chaque écran a une
  action principale évidente ; pas d'écran qui n'aide pas le commercial à vendre.
- **Rendez-vous** (27 octobre) : pas de rappel push « dans N minutes ». Sur la fiche, chaque
  rendez-vous se note « fait », « manqué », « annulé » ou se reporte. Après un rendez-vous noté
  fait, la tâche quotidienne crée une relance J+1, J+7 et J+14 dans Aujourd'hui, le jour de chaque
  échéance (le push du matin la compte ; une échéance passée ne se rattrape pas), une seule fois
  chacune ; elles disparaissent si le rendez-vous passe ensuite en manqué, annulé ou reporté ; rien
  si la déclaration n'est plus active ou le contrat terminé. Les jours sont un réglage
  (`commercial_settings.followup_days`, 1, 7, 14 saisis par l'admin ; vide : pas de relance).
- **Client parti puis revenu** (27 octobre) : `commercial_clients.ended_at` (contre 13.2 n° 6)
  fige la fin d'un Client Apporté au départ posé par l'admin ; effacer le départ (client revenu)
  ne rouvre pas la commission ; un départ posé par erreur s'annule par un geste admin dédié. Un
  client parti, redéclaré puis inscrit, devient le Client Apporté du nouveau commercial : début à
  la première acceptation des CGV postérieure à la nouvelle déclaration, ou, sans nouvelle
  acceptation, à la date où l'admin marque la déclaration signée — seulement pour un client parti
  avant la déclaration : un client resté en service n'est jamais attribué.

### 13.2 Corrections finales

1. **Fin de contrat du commercial** : `commercial_release_ended()` dans la tâche quotidienne libère
   les déclarations actives des commerciaux dont `ended_at` est passé (`abandoned`, motif
   `contract_ended`, reflet `lost`). Critère d'acceptation ajouté.
2. **Drapeau `ominin.crm_reflect`** : posé par **toute** écriture du reflet, liste exhaustive :
   fonctions du commercial, `admin_decide_declaration`, `admin_record_email_declaration`,
   `admin_reassign_declaration`, `admin_mark_signed`, `commercial_confirm_due`,
   `commercial_expire_due`, `commercial_release_ended`, le trigger d'opposition, la signature du
   lot 2. Un script d'assertion vérifie chacune.
3. **« En discussion »** : le passage sans suite **et** la déclaration sont refusés sur un restaurant
   en discussion. La règle « un fondateur le travaille » lit la dernière activité ou le dernier
   `status_change` **hors reflet** (`metadata.reflect` absent), pas le statut courant.
   L'état « en discussion avec Ominin » est **affiché** dans la recherche et sur la fiche (sans
   détail), pour que le commercial ne se déplace pas pour rien.
4. **Kit minimal dès le lot 1** (art. 6.2 : supports, tarifs, accès démo dès la signature) : le deck
   (PDF déposé par l'admin dans le stockage, aucun fichier en dur), les liens des démos
   `/menu/demo/<slug>` et des pages de prix publiques. Le reste du Kit au lot 2.
5. **Rattachement initial** : `admin_link_client(restaurant_id, etablissement_id | shop_id)` et
   `admin_set_client_ended(restaurant_id, date)`, depuis la fiche de l'écran admin Restaurants ;
   un établissement sans fiche CRM en reçoit une créée à partir de l'établissement.
6. **Une seule source de vérité** : `crm_restaurants.etablissement_id` / `shop_id` /
   `client_ended_at` font foi. `commercial_clients` n'a pas de colonne `ended_at` : la fin se
   calcule. `projet_clients.restaurant_id` relie Projet à la fiche.
7. **Relances du commercial** : `crm_tasks` du commercial avec `lead_id = null` (elles ne remontent
   pas dans `crm_leads.next_follow_up_at`, donc ni dans la Carte ni dans le Pipeline de l'admin).
   Les compteurs agrégés de l'Aperçu admin (`fetchWeeklyActivityCounts`) peuvent compter ses
   activités : agrégé, accepté.
8. **Léa** : la garde du statut est en base (trigger) ; la sélection et l'envoi sont garantis dans le
   code de Léa (`outreach.py`, `emailing.py`, `inbox.py`) et vérifiés par un essai : le critère 9
   porte sur le comportement.
9. **Purge à 3 ans** : reportée (aucune donnée n'aura 3 ans avant 2029) ; la date pivot sera définie
   avant. Rien à coder dans ce chantier.
10. **Réservation échue** : une déclaration `confirmed` dont `reserved_until` est passée est lue comme
    expirée, sans attendre la tâche.
11. **Cas limites** : inscription pendant une déclaration `pending` → la signature confirme d'abord
    la déclaration ; un commercial qui redéclare son propre restaurant reçoit « vous l'avez déjà
    déclaré » ; le champ `crm_contacts.notes` n'est jamais écrit par les fonctions du commercial.
12. **Constantes du contrat (lot 3)** : relevé avant le 10, paiement à 30 jours, détail une fois par
    trimestre et réponse sous 15 jours, contestation sous 3 mois, seuil URSSAF 5 000 € puis tous les
    6 mois : ajoutées à `lib/legal/constants.ts` (valeurs du contrat signé), recopiées dans
    `commercial_settings` avec le taux de 15 % et la durée de 24 mois.
13. **Quotas** : `commercial_quota_usage(commercial_id, day, searches, places)`, une ligne par jour,
    jamais lisible par l'admin.
14. **`/confidentialite`** : nouvelle version du document légal versionné
    (`lib/legal/documents/confidentialite.ts`), publiée par le circuit légal habituel.
15. **Paramètres non contractuels** (plafond, carence, `IN_TALKS_DAYS`, quotas, délais de rappel,
    prix Stripe éligibles…) : **aucune valeur inventée dans le code**. Ils vivent dans
    `commercial_settings`, saisis par l'admin dans un écran « Réglages » de l'onglet Commerciaux ;
    une valeur vide désactive la règle correspondante (pas de plafond, pas de carence…) quand c'est
    possible, sinon l'écran admin signale qu'elle doit être remplie avant la première invitation.

### 13.3 Ce que les fondateurs font eux-mêmes

- Faire relire la **version 2 du contrat** par l'avocat. Le chantier prépare le texte (24 mois par
  restaurant, plafond et carence, doublons confirmés, passage sans suite, étape 5, délais lus des
  constantes, assiette, frais Club, statut RGPD) **sans le publier** : `npm run legal:publish` reste
  aux fondateurs.
- Remplir les **Réglages** (13.2 n° 15) et déposer le **deck**.
- Rattacher les clients existants (13.2 n° 5) avant la première invitation.
