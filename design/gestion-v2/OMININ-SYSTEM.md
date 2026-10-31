# Système Ominin — la seule source de couleurs, matières et mouvement pour les rendus

Extrait tel quel de `frontend/app/globals.css`, `components/landing-kit/kit.css`, `components/brand/wordmark.tsx`
et du shell de gestion. **Aucune teinte hors de ce document** (pas de pastel inventé, pas de bleu, pas de teal, pas
de lilas). Toute couleur d'un rendu doit être une de ces valeurs ou une transparence / un mélange `color-mix` de l'une
d'elles.

## Jetons

| Jeton | Sombre (défaut, le mode principal) | Clair (`html.light`) | Rôle |
|---|---|---|---|
| `--background` | `#0c0a08` | `#faf6f0` | page |
| `--foreground` | `#f3ece1` | `#221b13` | texte, chiffres |
| `--surface` | `#15110d` | `#f2ebe0` | cartes |
| `--surface-raised` | `#1c1712` | `#ffffff` | survol, popovers, pistes de barres |
| `--hairline` | `rgba(243,236,225,.09)` | `rgba(34,27,19,.12)` | bordures 1 px |
| `--muted` | `#a1937f` | `#7a6a58` | texte secondaire |
| `--faint` | `#6f6355` | `#a89a86` | étiquettes, axes |
| `--ember-1` | `#f0b35b` (ambre) | `#c08515` | **argent** : CA, panier, pourboires, part du CA |
| `--ember-2` | `#e2764b` (braise) | `#c05a32` | **commandes / activité** : compteurs, heures de pointe, nav active |
| `--ember-3` | `#c94f5e` (grenat) | `#a83848` | **problèmes et badges** : fermeture, rupture, pastille non-lue |
| `--chart-mark` | `#d4693f` | `#c05a32` | marque de graphique par défaut (≥ 3:1 validé sur surface) |
| `--shimmer-highlight` | `rgba(240,179,91,.14)` | `rgba(192,133,21,.18)` | reflet |
| `--glow-inner` | `rgba(240,179,91,.08)` | `rgba(192,133,21,.12)` | cœur de halo |
| `--glow-outer` | `rgba(226,118,75,.04)` | `rgba(192,90,50,.07)` | bord de halo |
| `--status-signed` | `#6cbf6c` | `#2e7d32` | écart **meilleur** (toujours avec un signe + un mot) |
| `--status-lost` | `#d95f5f` | `#a33030` | écart **moins bon** (idem) |

Le dégradé de marque, partout où une couleur « pleine » Ominin est attendue (bouton principal, segment actif,
bouchon de barre, mot-symbole) :
`linear-gradient(100deg, var(--ember-1), var(--ember-2) 55%, var(--ember-3))` — classe `.ember-gradient` ;
en texte : `.ember-text` (background-clip: text). Le mot-symbole est **« Ominin » en `.ember-text`, Fraunces 600**,
suivi du nom du produit en `--foreground`.

## Typographie

- Titres : **Fraunces** (Google Fonts, axes `SOFT 100, WONK 0`, opsz auto), poids 500–600, tracking -0.01 à -0.02em.
  Aperçu 30–40 px, sections 18–22 px, nom du restaurant 18–19 px.
- Texte et **tous les chiffres** : **Instrument Sans**, `font-variant-numeric: tabular-nums`, chiffres-titres 600,
  tuiles du jour 40 px, KPI 26–28 px, corps 14 px, étiquettes 11–13 px en capitales espacées (`tracking .08–.28em`)
  pour les surtitres (`text-[10px] uppercase tracking-[0.28em]` est la signature des surtitres Ominin, souvent en `.ember-text`).

## Formes et matières (shell de gestion actuel)

- Cartes : `rounded-2xl` (16 px) `border border-hairline bg-surface p-5` ; héros : `rounded-3xl` (24 px).
- Contrôles : pilules `rounded-full border border-hairline`, survol `border-ember-2/40` ; segment actif
  `.ember-gradient text-background`.
- En-tête collant : `bg-background/85 backdrop-blur-md border-b border-hairline` ; barre d'onglets mobile
  `fixed bottom-0 bg-background/90 backdrop-blur-md border-t border-hairline`, icône active `text-ember-1`, badge
  `bg-ember-3 text-background`.
- Halo : `.ember-glow` = `radial-gradient(ellipse at 50% 0%, var(--glow-inner), var(--glow-outer) 40%, transparent 70%)`.
- Aura (landing) : `.kit-aura` = deux radiales `color-mix(in oklab, var(--ember-2) 32%, transparent)` et
  `(var(--ember-3) 22%)`, respiration 9 s ; grille fine `.kit-grid` 56 px en `--hairline` masquée vers le bas.
- Dérive du héros : `.hero-gradient-drift` = radiale `color-mix(in srgb, var(--ember-2) 6%, transparent)` 8 s.
- Icônes : trait 1.75, monochromes `text-muted`, actives `text-ember-1`.

## Mouvement

- Entrée : `.rise` = translateY(14px)→0 + opacité, 0.6 s `cubic-bezier(.22,1,.36,1)`, décalée de 70 ms par bloc.
- Braise en mouvement : `.ember-flow` = le dégradé de marque en `background-size: 250% 100%` qui dérive 7 s —
  **réservé aux vues de service** ; le back-office du gérant reste posé (un filet `.ember-flow` de 4 px en haut
  d'un héros est acceptable, pas plus).
- Étincelles : `.ember-particle` (points flous qui montent 11 s, `ember-drift`), cachées en reduced-motion.
- Tout mouvement s'éteint sous `prefers-reduced-motion: reduce`.

## Ce que « néon, moderne, beau » veut dire chez Ominin

Pas de nouvelles couleurs : la lumière vient des **embers**. Halos `--glow-inner/outer` derrière les chiffres-titres,
bouchons de barres `--ember-1` qui luisent (`box-shadow: 0 0 12px color-mix(in srgb, var(--ember-1) 55%, transparent)`),
rail de navigation actif en `.ember-gradient` avec un halo braise, filets de 1 px en `--ember-2/40`, aura
`.kit-aura` qui respire derrière le héros, grain léger, grands chiffres Instrument Sans 600 serrés. Contraste
texte ≥ 4.5:1 sur sa surface réelle ; la couleur chaude (ember-3) ne sert qu'aux problèmes et aux badges.
