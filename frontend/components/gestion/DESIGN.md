# Gestion v2 — ember glass

Contrat de la refonte de l'espace de gestion. Chaque session de page le lit avant d'écrire une ligne.
Sources : `design/gestion-v2/OMININ-SYSTEM.md` (jetons), `design/gestion-v2/ember-glass.html` (comp approuvée),
`app/globals.css` bloc « Gestion v2 — ember glass » (jetons `--g-*` et utilitaires `.g-*`),
`components/gestion/ui/` (primitives), `/menu/kit` (vitrine, développement seulement).

## 1. Intention

Mode **Operate** : le gérant lit l'écran en salle, entre deux services, sur un portable ou un téléphone.
La précision et la retenue priment. Les chiffres sont honnêtes, tabulaires, lisibles d'un coup d'œil ; la couleur
porte du sens et rien d'autre. **La lumière vient des embers** : une aura de trois braises dérive lentement sous
l'espace, le verre la réfracte, et les données reposent sur des plaques claires qui ne floutent jamais rien.
Un seul élément mémorable (le verre teinté des cadres), tout le reste est posé.

## 2. Jetons

Les jetons de base (`--background`, `--foreground`, `--surface`, `--surface-raised`, `--hairline`, `--muted`,
`--faint`, `--ember-1/2/3`, `--shimmer-highlight`, `--glow-inner/outer`, `--status-signed/lost`, `--chart-mark`)
sont ceux d'OMININ-SYSTEM.md, en sombre et en `html.light`. **Aucune teinte nouvelle** : tout mélange passe par
`color-mix` sur ces jetons.

Les jetons du kit, préfixés `--g-*`, vivent sur `:root` (surcharges `html.light`, `(hover: hover) and
(pointer: fine)`, `max-width: 1200px`). Tout nombre nouveau d'une page va là, jamais dans un composant.

| Jeton | Valeur | Rôle |
|---|---|---|
| `--g-blur` / `--g-saturate` | `20px` / `1.4` | backdrop-filter du verre |
| `--g-scrim` | `64%` | part de `--surface` sous le verre |
| `--g-tint-a` / `--g-tint-a-problem` | `10%` / `12%` | teinte d'entité du verre |
| `--g-specular` | `var(--shimmer-highlight)` | reflet intérieur haut-gauche et bord du ring |
| `--g-ring` / `--g-ring-hover` | `var(--hairline)` / ember-2 40 % | anneau filet, survol d'un cadre cliquable |
| `--g-bloom` / `--g-shadow` | `var(--glow-inner)` / `var(--glow-outer)` | bloom ambre dans le cadre, halo extérieur |
| `--g-shade` / `--g-edge` / `--g-drop` | background 55 % / 40 % / 80 % (clair : foreground 8 / 6 / 18 %) | ombre intérieure bas-droite, liseré, ombre portée |
| `--g-sheen` / `--g-rim` | foreground 4 % (clair : surface-raised 60 %) / ember-2 14 % | voile diagonal, bas du ring dégradé |
| `--g-glass-max` | `12` | plafond d'éléments `backdrop-filter` par écran |
| `--g-plate` | `70%` | part de `--surface` d'une plaque |
| `--g-mesh-1/2/3` | ember-2 32 %, ember-3 22 %, ember-1 18 % en oklab (clair : 18 / 12 / 14 %) | les trois braises de l'aura |
| `--g-mesh-dur-1/2/3` | `62s` / `70s` / `54s` | dérive de chaque braise |
| `--g-radius-card` / `-frame` / `-hero` / `-tabbar` | `16px` / `20px` / `24px` / `28px` | plaques et cartes ; cadres KPI, bandeaux, barre haute ; tuiles du jour ; barre d'onglets |
| `--g-pad` | `6px` | marge entre un cadre de verre et sa plaque (rayon plaque = rayon cadre − `--g-pad`) |
| `--g-gap` | `16px` | gouttière des grilles |
| `--g-rail` / `--g-rail-narrow` | `232px` / `200px` (≤ 1200 px) | largeur du rail |
| `--g-cap-h` / `--g-cap-h-hero` | `30px` / `34px` | rangée du surtitre d'un cadre |
| `--g-control` | `44px` (souris fine : `36px`) | hauteur des boutons, pilules, boutons icône |
| `--g-seg-h` / `--g-seg-pad` | `36px` (souris fine : `32px`) / `4px` | segment et marge du segmenté (44 px au doigt) |
| `--g-chip-h` / `--g-chip-tint` / `--g-chip-ring` | `24px` / `18%` / `35%` | pastille ; teinte et filet de la pastille problème |
| `--g-badge` | `18px` | compteur sur un bouton icône |
| `--g-icon` / `--g-icon-sm` / `--g-icon-chip` | `20px` / `16px` / `14px` | icônes : commandes, surtitres, pastilles |
| `--g-row-h` | `44px` | ligne d'une liste classée |
| `--g-share-slim` / `--g-share-bar` | `3px` / `8px` | barre de part fine / pleine |
| `--g-chart-h` / `--g-chart-h-dense` | `236px` / `176px` | hauteur des barres (7 colonnes / 24 colonnes) |
| `--g-gutter` / `--g-gutter-dense` | `40px` / `26px` | gouttière de l'axe des valeurs (à droite) |
| `--g-axis-h` / `--g-axis-h-dense` | `40px` / `20px` | hauteur de l'axe des étiquettes |
| `--g-bar-w` / `--g-bar-r` / `--g-bar-cap` | `min(46px, 62%)` / `7px` / `6px` | barre : largeur, rayon haut, bouchon |
| `--g-bar-r-dense` / `--g-bar-cap-dense` / `--g-bar-gap-dense` | `3px` / `3px` / `3px` | idem, colonnes denses |
| `--g-bar-body` | `28%` | part d'entité dans le corps d'une barre (mélangée à `--surface`) |
| `--g-text-day` / `-kpi` / `-h1` / `-h2` / `-name` | `40px` / `28px` / `36px` / `20px` / `18px` | chiffres du jour, KPI, titre de page, section, nom du restaurant |
| `--g-text-body` / `-label` / `-meta` / `-axis` / `-eyebrow` | `14px` / `13px` / `12px` / `11px` / `10px` | corps, étiquettes, repères, axes, surtitres |
| `--g-ease-out` | `cubic-bezier(.22, 1, .36, 1)` | entrées (rise), appui |
| `--g-ease-move` | `cubic-bezier(.77, 0, .175, 1)` | déplacement à l'écran (pouce du segmenté) |
| `--g-rise-dur` / `--g-stagger` | `0.6s` / `70ms` | montée en fondu, décalage par bloc |
| `--g-press-dur` / `--g-press-scale` | `200ms` / `0.96` | appui d'une commande |
| `--g-morph-dur` / `--g-hover-dur` / `--g-shimmer-dur` | `200ms` / `150ms` / `1.8s` | pouce du segmenté, survols, squelettes |
| `--g-field-gap` / `--g-text-field` / `--g-field-tracking` | `6px` / `11px` / `0.14em` | champ : écart étiquette–contrôle, étiquette en capitales |
| `--g-input-r` / `--g-input-px` / `--g-input-pr` | `12px` / `14px` / `44px` | saisie : rayon, marge, marge droite sous une unité ou un chevron |
| `--g-input-text` | `16px` (souris fine : `--g-text-body`) | taille de saisie ; 16 px au doigt pour qu'iOS ne zoome pas |
| `--g-input-invalid` / `--g-textarea-min` | `70%` / `96px` | anneau grenat d'un champ en erreur ; hauteur minimale d'une zone de texte |
| `--g-switch-w` / `-h` / `-thumb` / `-pad` / `-hit` | `48px` / `28px` / `20px` / `4px` / `44px` | interrupteur : rail, pouce, marge, zone tactile |
| `--g-dialog-w` / `--g-dialog-w-wide` / `--g-dialog-max-h` | `520px` / `1120px` / `85dvh` | feuille : largeur centrée (≥ 1024), largeur `wide`, hauteur maximale |
| `--g-dialog-pad` / `--g-dialog-handle-w` / `-h` / `--g-dialog-rise` | `20px` / `36px` / `4px` / `24px` | feuille : marge de la plaque, poignée, montée d'entrée au téléphone |
| `--g-backdrop` | `55%` (clair : `40%`) | part de `--background` du voile sous une feuille |
| `--g-danger-ring` | `50%` | filet grenat d'une commande destructrice |
| `--g-entity` | `var(--muted)` par défaut | couleur de l'entité courante, posée par `.g-money` / `.g-orders` / `.g-problem` |

Côté Tailwind (`@theme inline`) : `text-g-day`, `text-g-kpi`, `text-g-h1`, `text-g-h2`, `text-g-name`,
`text-g-body`, `text-g-label`, `text-g-meta`, `text-g-axis` (taille + interlignage + approche + graisse),
`rounded-g-card` / `-frame` / `-hero`, `p-g-pad`, `gap-g-gap`, `h-g-control`, `w-g-rail`, `text-g-entity`,
`bg-g-entity`. Les utilitaires `.g-*` sont hors `@layer` : ils gagnent sur une classe Tailwind posée sur le même
élément — on leur passe des classes de **placement** (grille, marges), pas des classes qui redéfinissent ce qu'ils
fixent.

## 3. Matières

**Verre** (`.g-glass`, un `backdrop-filter`, teinté par `.g-glass-money` / `-orders` / `-problem`) :
le rail, la barre haute, la barre d'onglets et sa feuille « Plus », les segmentés, les cadres KPI et tuiles du
jour, les bandeaux (Notice). Le verre n'héberge que des surtitres, des icônes et des commandes ; **jamais de texte
qui porte un chiffre directement sur du flou**.

**Plaque** (`.g-plate`, `--surface` à 70 % + filet) : listes, graphiques, tableaux, formulaires, cartes de
section, et la surface des chiffres à l'intérieur d'un cadre de verre. Une plaque directement enfant d'un
`.g-glass` prend le rayon du cadre moins `--g-pad` (rayons concentriques).

**Budget** : au plus `--g-glass-max` (12) éléments à `backdrop-filter` par écran, rail et barre haute compris.
Un Aperçu type en consomme 10 (2 tuiles, 1 bandeau, 1 segmenté, 4 KPI, rail, barre haute) ; au-delà, on prend
`StatTile plain`, `Segmented glass={false}`, ou une plaque.

**Replis** (automatiques) : sous `prefers-reduced-transparency: reduce` ou sans `backdrop-filter`, le verre
devient `--surface-raised` opaque, la plaque `--surface`, et l'aura disparaît. Sous `prefers-reduced-motion`,
tout s'arrête (aura, rise, shimmer, appui, pouce).

**Aura** : `<Mesh />` une seule fois par écran, posée par le shell, `position: fixed` sous tout (`z-index: 0`) ;
le contenu est dans un conteneur `relative z-1`. Trois disques en radiale qui dérivent sur `transform` seul.

## 4. Couleur suit l'entité

| Entité | Jeton | Classe | Ce qu'elle mesure |
|---|---|---|---|
| Argent | `--ember-1` | `g-money` / `g-glass-money` | CA, panier, pourboires, part du CA |
| Commandes, activité, personnes | `--ember-2` | `g-orders` / `g-glass-orders` | compteurs, heures de pointe, lignes, nav active, info |
| Problème, badge | `--ember-3` | `g-problem` / `g-glass-problem` | fermeture, rupture, retrait, non-lus |
| Écart meilleur / moins bon | `--status-signed` / `--status-lost` | `text-status-signed` / `-lost` | **toujours** avec un signe ou un mot (« +12 % vs vendredi dernier ») |

Un chiffre-titre a **un seul** repère. Pas de rouge ou de vert seuls ; pas de texte gris sur fond coloré ; la
couleur chaude ne décore jamais. Les séries secondaires et les pistes sont `--surface-raised`.

## 5. Typographie

- **Fraunces 600** (`font-display`) : H1 `text-g-h1` 36 px, sections `text-g-h2` 20 px, nom du restaurant
  `text-g-name` 18 px, mot-symbole « Ominin » en `.ember-text`.
- **Instrument Sans**, `tabular-nums` pour tout chiffre : chiffres du jour `text-g-day` 40 px 600, KPI
  `text-g-kpi` 28 px 600, corps `text-g-body` 14, étiquettes `text-g-label` 13, repères `text-g-meta` 12, axes
  `text-g-axis` 11, surtitre `.g-eyebrow` 10 px capitales `.28em` 600 à la couleur de l'entité.
- Chiffres alignés à droite dans les tableaux ; « — » pour une donnée absente, jamais un faux zéro ; pas de phrase
  hors infobulles, états vides et bandeaux.

## 6. Espaces et rayons

Cartes et plaques 16 px, cadres 20 px, héros 24 px, barre d'onglets 28 px, pilules pleines. Gouttière des grilles
`gap-g-gap` (16 px). Plaque dans un cadre : marge `p-g-pad` (6 px), rayon concentrique. Icônes trait 1,75–1,8,
`currentColor`, monochromes `text-muted`, actives `text-ember-1`.

## 7. Mouvement

- **Entrée** : `.g-rise` (translateY 14 px → 0 + opacité, `--g-rise-dur` 0.6 s, `--g-ease-out`), décalée de
  `--g-stagger` 70 ms par bloc via `style={{ "--g-i": n }}`. Une seule orchestration par page, à l'arrivée.
- **Appui** : `.g-press` (scale `--g-press-scale` 0.96, `--g-press-dur` 200 ms, jamais sur un désactivé), posé
  d'office par `GlassButton` et par un `GlassFrame` cliquable.
- **Segmenté** : le pouce glisse en `transform` sur `--g-morph-dur` 200 ms, `--g-ease-move`.
- **Survols** : bordure et couleur sur `--g-hover-dur` 150 ms, uniquement sous `(hover: hover) and
  (pointer: fine)`.
- **Aura** : transform seul, 54–70 s, `will-change: transform` sur les trois disques.
- Jamais d'animation sur une action répétée (raccourcis, frappe, survol de ligne). Le **délice** est réservé aux
  moments rares : arrivée d'une commande, « c'est prêt » — à décider avec la session de tête, pas par page.
- Tout s'éteint sous `prefers-reduced-motion: reduce`.

## 8. États

| État | Forme |
|---|---|
| Chargement | `<Shimmer />` à la taille du contenu final, dans le cadre qui l'attendra |
| Données en attente | l'ancien contenu reste, enveloppé de `.g-stale` (opacité 0.4), avec un `<Chip>Mise à jour…</Chip>` ; jamais de zéro furtif |
| Vide | `<EmptyState text action />` : une phrase, une action ; jamais un « tout va bien » sur un compte sans données |
| Erreur | `<ErrorNotice error onRetry />` grenat, une fois par page, les derniers chiffres connus restant affichés ; la famille (réseau, droit, donnée) vient de `describeError` (§ 12) |
| Réservé au gérant | `<ReserveGerant ask />` à la place de l'écran : qui peut le faire, quoi lui demander |
| Petite base | repère en gris (« était 1 »), pas de pourcentage sous ~5 |

## 9. Accessibilité (plancher)

Texte ≥ 4,5:1 sur sa surface réelle (`--muted` sur `--surface` : 5,9:1 sombre, 5,0:1 clair) ; focus visible
`outline: 2px solid var(--ember-1)` à 2 px (posé sur `.g-btn`, les cadres cliquables, les radios du segmenté) ;
cibles ≥ 44 px au doigt (`--g-control`, `--g-seg-h`, `--g-row-h`) ; `--ember-3` jamais seul en petit texte : une
pastille problème garde son texte en `--foreground` avec une icône. Les graphiques portent `role="img"` et une
description complète ; les listes classées un `aria-label`. Les commandes ont `touch-action: manipulation`, pas de
sélection au maintien, pas de flash de tap.

## 10. Responsive

- **≥ 1024 px** : rail de verre collé à gauche, `--g-rail` (232 px ; 200 px sous 1200 px), barre haute collée,
  contenu jusqu'à 1440 px.
- **< 1024 px** : rail masqué, barre d'onglets de verre flottante en bas (`--g-radius-tabbar`, marge
  `env(safe-area-inset-bottom)`), **cinq entrées + « Plus »** qui ouvre une feuille de verre au-dessus.
- **≤ 720 px** : une colonne partout (tuiles, KPI, duos), H1 32 px, chiffres du jour 36 px, bandeau sur deux
  lignes (texte en pleine largeur, action à droite).
- Les grilles passent par les variantes Tailwind (`sm:`, `lg:`, `xl:`), les largeurs par les jetons.

## 11. Formulaires

- **Un seul modèle d'enregistrement par section** : soit chaque contrôle enregistre au geste (interrupteur,
  segmenté, liste — avec un `<Chip>Mise à jour…</Chip>` le temps de l'aller-retour), soit la section porte **un**
  bouton « Enregistrer » qui écrit tout d'un bloc. Jamais les deux dans la même carte, jamais deux boutons
  Enregistrer sur un écran.
- **Un bouton désactivé dit pourquoi** : une phrase en `text-g-meta text-muted` à côté (« Indiquez un prix pour
  enregistrer »), posée dans le `footer` d'une feuille par un `<p>` en premier. Un bouton désactivé ne porte pas
  d'infobulle.
- **La validation se fait au champ** (`Field error`) au moment d'enregistrer, jamais par un toast ; le champ passe
  `aria-invalid`, son erreur est lue avec lui. L'indication (`hint`) dit la contrainte **avant** la saisie
  (« 4 chiffres »), l'erreur dit comment corriger.
- Étiquettes en capitales 11 px `--muted`, astérisque braise pour un champ obligatoire ; placeholders = un exemple
  au format attendu (« 0,00 »), jamais une consigne.
- Saisies sur `--background`, anneau filet, focus `outline` braise 2 px, 16 px au doigt ; un nombre est tabulaire
  et aligné à droite (`Input numeric`), son unité dans le champ (`unit="€"`). Clavier : `type` / `inputMode`
  justes (`numeric` pose `decimal`), `autoComplete` quand il existe, jamais de blocage du collage.
- Un interrupteur décrit **l'état allumé** (« Visible sur la carte », pas « Masquer ») ; une case à cocher sert
  aux listes d'options, l'interrupteur à un réglage qui s'applique seul.
- **Feuille** (`Sheet`) pour tout formulaire qui n'est pas la page elle-même : collée en bas au téléphone,
  centrée dès 1024 px, `wide` pour un constructeur à deux colonnes (pleine largeur sous 1024). Le formulaire vit
  sur sa plaque ; le titre nomme l'objet (« Modifier le prix »), le `footer` porte Annuler puis l'action. Une
  feuille compte pour **un** élément de verre.
- **Confirmation** (`ConfirmSheet`) seulement pour l'irréversible : titre = geste + objet (« Supprimer
  “Tiramisù” ? »), texte = ce qui est perdu, bouton = verbe + objet en `danger`. Ce qui se défait s'exécute tout
  de suite avec un « Annuler » dans le toast.

## 12. Erreurs

Un seul point de conversion, `lib/gestion/errors.ts` → `describeError(error)` rend `{ family, title, text,
retry, message }` ; les pages ne composent plus de phrase d'erreur. `message` (titre + texte) va dans un toast,
`title` / `text` dans `<ErrorNotice>` ou un `Field error`.

| Famille | Quand | Titre → texte | Réessayer |
|---|---|---|---|
| `reseau` | hors ligne, `TypeError` de fetch, délai dépassé, 0 / 408 / 502–504, `PGRST000-003`, `57014`, message « fetch / network / réseau / timeout » | « Hors connexion » ou « Connexion perdue » → « Vérifiez le réseau, puis réessayez. » | oui |
| `droit` | 401, `PGRST301`, JWT/session expirés | « Session expirée » → « Reconnectez-vous, puis reprenez où vous en étiez. » | non |
| `droit` | 403, `42501`, policy / RLS / permission / « réservé » | « Réservé au gérant » → « Demandez-lui de faire ce geste, ou de vous ouvrir ce droit dans Équipe. » | non |
| `donnee` | `23505` / 409 / doublon | « Ce nom existe déjà » (le champ nommé quand Postgres le donne) → « Choisissez-en un autre. » | non |
| `donnee` | `23502` / valeur nulle | « Un champ est vide » → « Indiquez le prix pour enregistrer. » | non |
| `donnee` | `23503` / clé étrangère | « Encore utilisé ailleurs » → « Retirez-le d'abord de ce qui s'en sert, puis réessayez. » | non |
| `donnee` | `23514`, `22xxx`, syntaxe | « Valeur refusée » → « Vérifiez le prix, puis enregistrez. » | non |
| `donnee` | `PGRST116`, 404, « introuvable » | « Introuvable » → « Il a peut-être été supprimé entre-temps : rechargez la page. » | oui |
| `donnee` | message métier d'une RPC, phrase française lisible | « Impossible d'enregistrer » → le message tel quel | non |
| `donnee` | tout le reste | « Impossible d'enregistrer » → « Rechargez la page et réessayez. » | oui |

Règles : une erreur de page s'affiche **une fois**, en `<ErrorNotice>` sous le titre, les derniers chiffres connus
restant visibles ; une erreur de geste va dans `toast.error(describeError(e).message)` — les toasts d'erreur
**restent jusqu'au tap** ; une erreur de saisie va dans le `Field` concerné. Un écran fermé par le rôle montre
`<ReserveGerant ask="…" />`, pas une erreur. Jamais « Une erreur est survenue. », jamais de « Oups », jamais de
point d'exclamation.

## 13. Primitives (`components/gestion/ui`, export `index.ts`)

| Primitive | Props | Rend |
|---|---|---|
| `Mesh` | — | l'aura fixe, `aria-hidden`, une par écran |
| `GlassFrame` | `entity?`, `eyebrow?`, `icon?`, `href?`, `hero?`, `title?`, `className?`, `children` | un cadre de verre teinté, surtitre + icône à la couleur de l'entité, puis la ou les plaques enfants ; `href` en fait un lien entier avec appui et anneau de survol |
| `Plate` | attributs d'un `div` | la plaque claire |
| `StatTile` | `label`, `value`, `baseline?`, `delta?: { text, tone: better · worse · neutral }`, `href?`, `entity?`, `icon?`, `hero?`, `plain?`, `title?` | cadre + plaque avec le chiffre (40 px héros / 28 px KPI) et son repère unique ; `plain` = plaque seule avec un point d'entité, hors budget de verre |
| `Segmented<T>` | `label`, `options: { value, label }[]`, `value`, `onChange`, `glass?` | groupe de radios natifs, pouce en dégradé de marque qui glisse ; `glass={false}` sur une plaque |
| `Notice` | `tone?: problem · info`, `icon?`, `title`, `text?`, `action?` | bandeau `role="status"` de verre (grenat si problème), titre gras, texte en `--muted`, action à droite |
| `Chip` | `tone?: neutral · problem`, `icon?`, `children` | pastille 24 px, filet neutre ou teinte grenat |
| `GlassButton` | `variant?: primary · secondary · danger · icon` (icon exige `aria-label`), `type?: button · submit`, `href?`, `badge?`, attributs d'un `button` | pilule dégradé de marque / pilule filet / filet grenat (destructeur, toujours avec un mot) / bouton rond avec compteur ; appui d'office, désactivé à 30 % |
| `RankedList` | `items: { label, value, amount, meta? }[]`, `entity?`, `size?: slim · bar`, `label?` | liste classée ; `slim` = rang + filet de 3 px, `bar` = barre de 8 px à bouchon, colonne `meta` à droite |
| `Bars` | `data: { label, value, sub? }[]`, `ticks: number[]`, `format`, `label`, `entity?`, `dense?` | barres à bouchon sur grille, axe tabulaire à droite, maximum étiqueté, infobulles `title` ; `dense` pour 24 colonnes (étiquette vide = colonne muette) |
| `SectionHeading` | `title`, `sub?`, `right?`, `id?`, `level?: 1 · 2` | titre Fraunces 36 / 20 px, sous-titre `--muted`, emplacement à droite pour un contrôle ou une légende |
| `Shimmer` | `className?` | squelette scintillant à la taille donnée |
| `EmptyState` | `text`, `action?` | plaque : une phrase, une action |
| `ErrorNotice` | `error: unknown`, `onRetry?` | bandeau grenat de `describeError` : icône par famille (hors ligne, cadenas, alerte), « Réessayer » seulement si `retry` et `onRetry` |
| `ReserveGerant` | `ask`, `name?` | plaque « Réservé au gérant » + « Demandez à {prénom} de {ask}. » ; sans `name`, le prénom du gérant vient du store |
| `Field` | `label`, `required?`, `hint?`, `error?`, `className?`, `children` | étiquette 11 px capitales, le contrôle, puis l'indication 12 px ou l'erreur grenat avec icône (`role="alert"`) ; donne id, `aria-describedby` et `aria-invalid` au contrôle enfant (`useField()` pour un contrôle maison) |
| `Input` | `numeric?`, `unit?`, attributs d'un `input` | saisie `--g-control` sur `--background`, anneau filet, focus braise ; `numeric` = tabulaire à droite + clavier décimal ; `unit` posée dans le champ |
| `Textarea` | `rows?` (3), attributs d'un `textarea` | même matière, redimensionnable en hauteur |
| `Select` | attributs d'un `select`, `children` = `<option>` | liste native habillée, chevron à droite |
| `Switch` | `checked`, `onChange`, `disabled?`, `label?`, `hint?`, `aria-label?` | `role="switch"` 28 × 48, rail dégradé de marque allumé, pouce en transform 200 ms, 44 px de zone tactile ; avec `label`, une ligne pleine largeur libellé + indication |
| `Checkbox` | `checked`, `onChange`, `disabled?`, `label`, `hint?`, `name?` | case native sous une boîte dessinée (coche icône), libellé et case = une cible de 44 px |
| `Sheet` | `title`, `description?`, `onClose`, `size?: md · wide`, `footer?`, `children` | `<dialog>` modal de verre : feuille basse au téléphone, centré ≥ 1024 (`wide` 1120 px, plein écran sous 1024) ; corps sur plaque défilante, Échap et fond ferment, focus rendu, page figée ; `data-autofocus` sur le champ attendu ; à monter conditionnellement |
| `ConfirmSheet` | `title`, `text`, `confirmLabel`, `cancelLabel?`, `destructive?`, `busy?`, `onConfirm`, `onClose` | feuille de confirmation : Annuler (focus) puis l'action, `danger` si destructeur, « Un instant… » quand `busy` |

Types exportés : `Entity`, `DeltaTone`, `Bar`, `RankedItem` (et `ErrorFamily`, `ErrorDescription` depuis `lib/gestion/errors`) ; tables `ENTITY` et `GLASS_ENTITY` pour poser une
entité sur un élément maison.

## 14. Règles pour les sessions de page

1. Ne touchez qu'aux fichiers de votre page (`app/menu/gestion/<page>/`, `components/gestion/<page>/`).
2. Le kit (`components/gestion/ui/`, le bloc `--g-*` de `globals.css`, ce document) appartient à la session de
   tête : un besoin nouveau est **une demande**, jamais une variante locale, un `style` en dur ou un nombre dans
   un composant.
3. Gardez chaque attribut `data-visite` et `data-visite-bord` à sa place : la visite guidée les cible.
4. Gardez chaque comportement (sélecteurs, store, temps réel, carillon, permissions) ; seule la matière change.
5. Jamais de hex, de `rgba` ou de nombre nouveau hors du bloc de jetons ; les mélanges passent par `color-mix`
   des jetons existants.
6. Comptez vos éléments de verre : rail + barre haute compris, ≤ 12.
7. Vérifiez à 1440, 1024 et 375 px, en sombre et en clair, sous `prefers-reduced-motion` et
   `prefers-reduced-transparency`.
