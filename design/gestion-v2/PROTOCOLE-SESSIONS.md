# Gestion v2 — protocole des sessions de page

Tête de pont : la session « Dashboard design research » (Ambaka la pilote). Elle tient le kit, arbitre les
décisions communes, fusionne, et répond aux sessions par SendMessage. Les sessions de page ne se parlent
pas entre elles : tout passe par la tête.

## Où l'on travaille

- Un seul worktree partagé : `~/ominin-gestion-v2`, branche `gestion-v2`. Le serveur de dev tourne déjà sur
  **http://localhost:7200** (ne pas en lancer un autre, ne pas le redémarrer ; `npm install` interdit,
  `node_modules` est un lien vers l'installation principale).
- Compte de test : le gérant de `trattoria-lucia` (`test@ominin.com`), établissement de démo en base de
  production. On y lit, on y clique, on peut y créer des commandes de test ; on n'y règle rien de
  Stripe/HubRise/Popina/imprimantes réelles. Chaque session a son propre navigateur intégré, sans cookie :
  à l'arrivée sur `/connexion`, lire `frontend/.env.test.local` (`TEST_GERANT_EMAIL`, `TEST_GERANT_PASSWORD`,
  fichier local ignoré par git, à ne jamais recopier dans un message ou un compte rendu) et se connecter
  soi-même dans le volet avec `form_input`. Ne jamais inventer d'identifiants.
- Fichiers à soi : chaque session ne modifie que les fichiers de son périmètre (liste ci-dessous). Les
  fichiers partagés — `frontend/app/globals.css`, `frontend/components/gestion/ui/**`,
  `frontend/components/gestion/shell.tsx`, `frontend/components/gestion/visite-guidee.tsx`,
  `frontend/lib/gestion/**` — sont **gelés** : un besoin devient un message à la tête (quoi, pourquoi, la
  valeur proposée), jamais un fork local ni un style en ligne qui le contourne.
- Commits : `git add <vos fichiers>` puis `git commit` sur `gestion-v2`, message en français comme le dépôt
  (« Gestion v2 — Commandes : … »). Si `index.lock` existe, attendre 10 s et réessayer. Jamais de `git push`,
  jamais de `git checkout`/`switch`/`stash`/`reset`, jamais de modification de la branche d'une autre
  session. Le build doit rester vert pour tout le monde : `npx tsc --noEmit` et `npm run lint` **une seule
  fois par tour, juste avant le commit, jamais en cours de construction**, et toujours derrière le verrou
  partagé (un seul contrôle à la fois pour toute la flotte, chaque `tsc` coûte 800 Mo et un cœur) :
  `until mkdir /tmp/gestion-check.lock 2>/dev/null; do sleep 5; done; npx tsc --noEmit; npm run lint; rmdir /tmp/gestion-check.lock`
  (le `rmdir` doit s'exécuter même en cas d'échec). Un type cassé se répare dans la minute.

## Le contrat visuel

Lire, dans l'ordre : `frontend/components/gestion/DESIGN.md` (le contrat, prime sur tout), la route kit
`/menu/kit` (ou celle indiquée par la tête) pour voir chaque primitive en vrai, `design/gestion-v2/ember-glass.html`
(la maquette approuvée) et `design/gestion-v2/OMININ-SYSTEM.md`. Compétences à charger (Skill) avant de
construire : `frontend-design`, `dashboard-design` (écrans à chiffres), `animate` et `mobile-native` ; pour
la revue : `better-interface`, `review-animations`, `break-ui`, `web-design-guidelines`, `impeccable`
(`critique`, `audit`, `polish`, `harden`, `adapt`, `onboard`).

Ce qu'on ne change pas : les comportements. Rôles (gérant / serveur / cuisinier), gating des features, temps
réel Supabase, carillon, impression, PIN, raccourcis, attributs `data-visite`, textes métier. On rebâtit
l'interface, pas le produit — sauf décision écrite de la tête (les propositions de simplification de la
session UX arrivent par elle).

## La boucle : trois tours maximum, objectif 10/10

Pour **chaque page** du périmètre, dans l'ordre d'importance :

1. **Construire** la page sur le kit (ou la corriger, à partir du tour 2). Téléphone 375 × 812 d'abord,
   puis 1024 et 1440. Mouvement : entrées `g-rise` décalées, pressions, transitions d'état ; de la beauté
   là où l'œil se pose, de la retenue sur les données.
2. **Captures** : les pages de gestion exigent une session ; seul le **navigateur intégré** (outils
   `mcp__Claude_Browser__*`, déjà connecté en gérant de trattoria-lucia, cookie partagé entre sessions) les
   voit. Y charger la page avec `preview_start` `{url: "http://localhost:7200/gestion/..."}`, `resize_window`
   en `mobile` (375 × 812) puis `desktop` / `{width: 1440, height: 900}`, et `computer` `screenshot` à chaque
   position de défilement utile ; `read_console_messages` et `read_page` complètent. Un Playwright headless
   (`pw.sh tour.cjs`, `check_page.cjs`) ne sert que pour `/menu/kit` ou une page hors connexion. Regardez
   les captures vous-mêmes avant de les commenter aux relecteurs ; les relecteurs, qui tournent dans votre
   session, peuvent relire la page dans le même navigateur intégré, un à la fois.
   **Mémoire :** le Mac est à la limite. Fermez l'onglet du navigateur intégré (`tabs_close`) **dès qu'une
   capture ou une relecture est finie** — un volet ouvert sans capture en cours est une faute ; n'ouvrez pas
   plus d'un onglet ; les relecteurs lisent les captures plutôt que la page. **Un seul navigateur headless à la fois par session,
   fermé dès la capture finie** (le Mac a 8 Go : le gestionnaire de ressources tue tout Chromium inactif
   plus de 30 min ; six au plus pour toute la flotte). Les relecteurs jugent sur les images, ils ne
   lancent pas de navigateur. Le serveur de dev compile à la demande : laisser `networkidle` et un
   délai de 120 s, et ne jamais lancer `next build` dans le worktree partagé. Le navigateur intégré sert pour cliquer et vérifier les états (ouvrir une feuille, créer une
   commande de test, lancer la visite guidée).
3. **Relecture** par trois agents indépendants (modèle `sonnet`), en parallèle, chacun avec les captures
   téléphone + bureau et le code de la page, chacun notant /10 avec ses trois défauts les plus graves :
   - **UX & visuel** (`better-interface` + `impeccable critique`) : hiérarchie, lisibilité, contraste réel,
     cohérence avec DESIGN.md, états vides/chargement/erreur, copie.
   - **Mouvement & tactile** (`review-animations` + `mobile-native`) : chaque animation a un but, aucune
     sur les surfaces à haute fréquence, `prefers-reduced-motion` respecté, cibles ≥ 44 px, pas de 100vh
     cassé, pas de zoom à la saisie.
   - **Ingénierie** (`web-design-guidelines` + `break-ui`) : parité de comportement avec `main` (liste des
     actions de la page, chacune testée), données extrêmes (nom de plat de 60 caractères, 0 commande,
     200 commandes), accessibilité clavier, `tsc` et `lint` verts, aucun constant en dur.
4. **Tutoriel** : lancer la visite guidée de la page (`?visite=<id>` ou le bouton d'aide du shell) ; chaque
   étape doit cibler un élément présent (`data-visite` conservé), le texte doit décrire ce qu'on voit, et
   l'élément mis en lumière doit être cliquable depuis la bulle. Une étape qui *explique* au lieu de
   *guider* est un défaut à signaler à la tête (texte dans `frontend/lib/gestion/visites.ts`, gelé).
5. **Corriger** les défauts remontés, dans l'ordre des notes les plus basses. Un relecteur qui note 10 au
   tour N n'est pas relancé au tour N+1 sur la même page (on ne relit que ce qui est sous la cible).
6. **Pause obligatoire après le tour 1** (Ambaka, 2026-10-31) : une fois le premier tour fini (construction,
   captures, trois relectures, corrections, commit), envoyer à la tête le compte rendu du tour avec les
   chemins des captures téléphone + bureau, puis **attendre son « go »** avant d'entamer les tours 2 et 3.
   Pendant l'attente, passer au tour 1 de la page suivante du périmètre. Ambaka regarde les rendus entre
   les deux.
7. S'arrêter quand les trois notes sont à 10, ou après le tour 3. Puis page suivante.

## Compte rendu à la tête (SendMessage à « Dashboard design research »)

- À la fin de chaque page : notes par tour (ex. `UX 7→9→10, mouvement 8→10, ingé 9→10`), ce qui reste
  sous 10 et pourquoi, les captures finales (chemins), le commit.
- Dès qu'un besoin touche un fichier gelé ou une décision commune (un nouveau composant, une règle de
  DESIGN.md ambiguë, un texte de tutoriel, un comportement douteux) : message immédiat, continuer sur ce
  qui n'en dépend pas, ne pas attendre bloqué.
- Fin de session : récapitulatif par page + ce qui mériterait une passe de plus.

## Périmètres (une session par ligne)

| Session | Pages | Fichiers à soi |
|---|---|---|
| aperçu | `/gestion` (gérant, serveur, cuisinier) | `app/menu/gestion/page.tsx`, `components/gestion/apercu/**`, `fermetures-en-cours.tsx`, `stripe-prompt.tsx` |
| service | `/gestion/commandes`, `/gestion/caisse` | `app/menu/gestion/{commandes,caisse}/`, `components/gestion/commandes/**` |
| salle | `/gestion/tables`, `/gestion/terminaux` | `app/menu/gestion/{tables,terminaux}/`, `components/gestion/{tables,terminaux}/**`, `tablet-settings.tsx` |
| carte | `/gestion/menu`, `/gestion/produits` | `app/menu/gestion/{menu,produits}/`, `components/gestion/{menu,formules}/**`, `category-layout-settings.tsx`, `menu-target-picker.tsx`, `photo-field.tsx`, `tarifs-planifies.tsx` |
| argent | `/gestion/paiements`, `/gestion/retraits` | `app/menu/gestion/{paiements,retraits}/`, `components/gestion/{paiements,retraits}/**`, `payment-settings.tsx`, `payment-pin-settings.tsx`, `collect-settings.tsx` |
| clients | `/gestion/fidelite`, `/gestion/remise/[id]`, `/gestion/bulles` | `app/menu/gestion/{fidelite,remise,bulles}/`, `components/gestion/{fidelite,remise,bulles}/**` |
| maison | `/gestion/equipe`, `/gestion/etablissement`, `/gestion/badgeage` | `app/menu/gestion/{equipe,etablissement,badgeage}/`, `components/gestion/temps/**`, `opening-hours-editor.tsx`, `hours-field.tsx`, `fermetures-settings.tsx`, `service-mode-settings.tsx`, `hubrise-settings.tsx`, `popina-settings.tsx`, `data-licence-settings.tsx`, `profile-row.tsx`, `admin-lock-button.tsx` |
| alertes | `/gestion/notifications` + le moteur de visite guidée | `app/menu/gestion/notifications/`, `push-prompt.tsx`, `feature-locked.tsx`, `subscription-gate.tsx`, `visite-guidee.tsx` (seule session autorisée dessus) |
| soirées | `/gestion/soirees`, `[id]`, `[id]/live` | `app/menu/gestion/soirees/**`, `components/gestion/soirees/**` |

Le shell (`shell.tsx`) et les primitives sont construits par la tête avant le lancement ; l'aperçu sert de
référence d'usage du kit.

## Décisions UX validées par Ambaka (2026-10-31) — s'appliquent à toutes les sessions

`design/gestion-v2/UX-SIMPLICITE.md` est **validé en entier** : ses recommandations font partie du périmètre
de chaque session, au même titre que le thème. Elles priment sur la règle « on ne change pas les
comportements » là où elles la contredisent, et uniquement là. En particulier :

- Navigation par rôle : 4 onglets fixes + « Plus » (feuille), tableau par rôle en § 3.1 — construite par la
  tête dans le shell ; les pages n'y touchent pas mais doivent exister aux nouveaux noms.
- Vocabulaire : **Aperçu reste Aperçu.** Menu → **Carte**, Terminaux → **Imprimantes**, Produits →
  **Abonnement**, Établissement → **Réglages**, Badgeage → **Pointage**, Notifications → **Alertes**,
  Paliers → **Récompenses**, Bulles → **Réservations**. Les URLs restent celles d'aujourd'hui tant que la
  tête n'a pas tranché la migration des liens diffusés ; seuls les libellés changent.
- **§ 7 d'UX-SIMPLICITE.md (les 18 réponses d'Ambaka) prime sur le reste du document.** Notamment : pas de
  catégories proposées ni de saisie « plusieurs articles » (§ 3.7 abandonné, seul reste le bouton
  « + Ajouter un article » de l'état vide) ; barre mobile gérant = Aperçu · Commandes · Tables · Carte + Plus ;
  carte de bienvenue + liste « Avant votre premier service » ; écran Cuisine avec « En vente » (serveur
  seulement si le restaurant l'autorise) ; déconnexion dans Plus ; formules : « le midi en semaine » déduit
  des horaires (repli 11 h 30 – 14 h 30), étape facultative repliée, choix hors carte supprimés (plat créé
  « masqué seul »), aperçu client dès la première passe, « proposé d'office » oui, étapes réutilisables plus
  tard, affiche multi-formules en option « Présentation » repliée.
- La cloche disparaît (§ 3.10) : les alertes vivent dans « Plus » et dans Réglages ; la session « alertes »
  conçoit ce fil.
- La visite d'accueil est remplacée par la carte « Avant votre premier service » sur Aujourd'hui (§ 3.3),
  session « aperçu ».
- Les recommandations de page (Réglages en 4 sections, écran Cuisine avec interrupteur « En vente », fiche
  article en deux temps, catégories proposées, état vide des commandes, describeError à 3 familles, rôles en
  3 cartes, club « Créer et publier ») sont à réaliser par la session propriétaire de la page, dans sa boucle.
- Le constructeur de formules (§ 6, feuille en trois pas avec aperçu client permanent, ≤ 14 contrôles) est
  à réaliser par la session « carte ».
- Questions ouvertes (§ 5 et § 6.7) : **ne pas attendre.** Ambaka veut voir plutôt que trancher sur papier :
  prendre la valeur par défaut que le document propose, la construire, et la signaler dans le compte rendu
  (« choix par défaut : … »). Il réagira sur le rendu.
- Tout reste en développement sur `gestion-v2` : rien ne part sur `main`, rien n'est déployé.
- **HubRise, intouchable (Ambaka, 2026-10-31).** Un restaurant relié à HubRise doit retrouver tout ce qu'il
  voit aujourd'hui : état de la connexion et réglages (`hubrise-settings.tsx`), références HubRise sur les
  commandes (`commandes/hubrise-ref.tsx`, cartes commande / encaisser / servir / comptoir / retrait), les
  mentions dans Caisse, Paiements, Fidélité, et toute correspondance carte ↔ caisse. On n'en change ni la
  logique ni les données ; on les **montre** au même endroit ou mieux, lisibles, jamais masquées derrière
  un repli par défaut. Avant de commencer : `grep -rn -i hubrise` sur vos fichiers, chaque occurrence est
  listée dans votre compte rendu avec « conservée telle quelle » ou « déplacée vers … ». Le relecteur
  ingénierie vérifie la parité HubRise explicitement.
  **Ajouter est permis, changer non :** si un restaurant relié à HubRise manque d'une information utile sur
  votre page (référence, état de synchronisation, correspondance carte ↔ caisse, dernier envoi…), vous
  pouvez l'afficher à partir des données déjà présentes dans le store ; la logique d'envoi et les données
  restent intactes. Votre compte rendu final comporte deux listes obligatoires : « Ajouté » (chaque
  information ou action HubRise ajoutée, où, pourquoi) et « Recommandé » (ce que vous changeriez dans
  l'intégration ou ailleurs, sans l'avoir fait).
