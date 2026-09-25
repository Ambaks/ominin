# Build reference

Exactly what to write, and where. The LZ.FOOD build is the worked example
for every section — read its code alongside this file.

## Contents
1. [Client record — profile.json](#1-client-record--profilejson)
2. [The carte — menu-data.ts](#2-the-carte--menu-datats)
3. [Option groups](#3-option-groups)
4. [Photos](#4-photos)
5. [The theme — globals.css](#5-the-theme--globalscss)
6. [Brand fonts](#6-brand-fonts)
7. [The preview route](#7-the-preview-route)
8. [Gotchas](#8-gotchas)
9. [Going live](#going-live)

---

## 1. Client record — profile.json

`demos/<slug>/profile.json`, in French. Start from `demos/_template/profile.json`
and grow it the way `demos/lz-food/profile.json` did. It is where everything
lives that the code can't say:

| Key | Holds |
|---|---|
| `slug`, `name`, `tagline`, `cuisine`, `address`, `city`, `phone`, `hours`, `socials` | identity — the verified values, not the flyer's typos |
| `legal` | raison sociale, SIREN/SIRET, NAF, dirigeant, dates — from research |
| `design` | palette (primary/secondary/accent hex), `style_notes` explaining *why* each choice (sampled values, type proportions, devices kept and dropped), `reference_images` |
| `menu.source` | where the carte came from and that it was verified line by line; states that `menu-data.ts` holds the carte (never duplicate it here) |
| `menu.categories_summary` | one line per category with its price range — for humans skimming |
| `menu.photos` | what's stock, known photo/dish mismatches for the photo shoot |
| `menu.photos_risque_marque` / `photos_halal` etc. | audit results that future edits must respect |
| `menu.options_a_valider` | every invented option value, if any |
| `offers` | promotions, delivery minimums — exactly as printed |
| `research` | one key per topic with sources and confidence (see research.md) |
| `production` | added at go-live: URL, seed command, what was verified |
| `notes` | the numbered list of questions for the owner |

Archive the source files in `demos/<slug>/docs/`; drawn proposals (a
monogram the owner didn't ask for) in `demos/<slug>/design/`.

## 2. The carte — menu-data.ts

In `frontend/lib/menu-data.ts`:

1. Add a comment block in French (who, where, which source, where the
   profile is), then `const <camelSlug>: Restaurant = { … }` **just before
   `const restaurants`**. Types are at the top of the file: `Restaurant`,
   `MenuCategory`, `MenuItem`, `OptionGroup`, `OptionChoice`, `Badge`.
2. Register it in **both** maps at the bottom:
   ```ts
   const restaurants = { …, [lzFood.slug]: lzFood };
   const themeClasses = { …, [lzFood.slug]: "theme-lz-food" };
   ```
3. Fields on `Restaurant` that matter:
   - `tagline` — the eyebrow line above the name in the hero.
   - `logo` — only if the restaurant **has** one you were given. Without
     `logo` or `coverImage`, the hero is typographic: the name in the
     display face, which is usually right.
   - `coverImage` — a real photo of the place (user-supplied) turns the
     hero into a photo banner. `poster` is for an artwork that already
     carries the name (BOHO).
   - `address` — the verified address (BAN), not the flyer's. The hero and
     footer link it to Maps via `mapsUrl()`.
   - `hours` — empty string if unknown; the footer hides it.
   - `highlights` — 1-3 short selling points from the source, shown in a
     full-width band under the hero (`MenuHighlights`). Only printed claims.
   - `googleReviewUrl` — only a real review link.
4. Fields on `MenuItem`: `id` (kebab-case ASCII, unique within the
   restaurant), `name`, `description`, `price` (number, euros), `detail`
   (format/portion shown as a pill: "33 cm", "x6"), `image`, `badges`
   (`"maison"`, `"top"`, `"nouveau"` — only when the source supports it; a
   badge on every item of a section distinguishes nothing), `options`,
   `vatRate` (**20 for alcohol** — the default is 10, and the rate goes to
   the till), `printName` (a shorter kitchen-ticket name when the menu name
   is long).
5. A repeated shape (every pizza is 33 cm with the same supplements) gets a
   small factory like `lzPizza()`.
6. **Don't run Prettier on this file** — it rewrites the other restaurants'
   hand-formatted one-liners into hundreds of lines of churn. Write your
   block formatted, leave theirs alone.

**Shared helpers — the rule of two.** LZ.FOOD's helpers (`lzSlug`,
`lzChoix`, `lzViande`, `lzSupplements`) are prefixed because one client
used them. If yours needs the same thing, lift the helper to a shared,
unprefixed one and point LZ.FOOD at it too — don't copy it with a new
prefix.

## 3. Option groups

```ts
interface OptionGroup {
  id: string;            // unique within the item
  name: string;          // shown as the fieldset legend
  obligatoire: boolean;  // required: "Ajouter" stays blocked until chosen
  multiple?: boolean;    // checkboxes, supplements add up; default single choice
  choices: { id: string; name: string; supplement: number }[];
}
```

- **One group holds one choice** unless `multiple: true`. So a "3 viandes"
  tacos is three required groups (`1re viande`, `2e viande`, `3e viande`),
  and a formula that includes a drink puts the drinks *in* the formula:
  `Frites + Coca-Cola`, `Frites + Sprite` — the kitchen ticket then says
  which can to pull.
- **Supplements are `multiple: true`.** `place_order` already sums every
  choice's supplement on a line — no migration needed.
- Optional single-choice groups get an automatic "Aucun" row; required ones
  don't.
- Choice ids must be unique within their group; the cart keys lines on
  `group:choice`, so two groups may reuse ids safely.
- Keep option vocabularies (the sauce list, the drink list) as one const
  used by every item, not retyped per item.

## 4. Photos

Helpers at the top of `menu-data.ts`:

| Helper | For |
|---|---|
| `pexels(path, 800)` | Pexels, e.g. `"1234567/pexels-photo-1234567.jpeg"` |
| `pexelsRecadre(path, 800)` | same, cropped server-side to 16:9 around the densest area — for subjects off-centre |
| `unsplash(id, 800)` | Unsplash, e.g. `"photo-1773620494884-940e0db95e46"` |
| `"/<slug>/<file>.jpg"` | the restaurant's own photos, in `frontend/public/<slug>/` |

800 px is right for the card (≈350-460 CSS px at DPR 2). Cards are
`aspect-video` with `object-cover`: judge every photo by its **centred 16:9
crop** (`photo_sheet.py` draws exactly that).

User photos: bake the orientation into the pixels first (iPhone photos are
stored sideways with an EXIF flag), then compress for the web:

```bash
python3 $S/render_source.py render IMG_1234.HEIC <scratch>/dish.png
sips -s format jpeg -s formatOptions 80 -Z 1600 <scratch>/dish.png --out frontend/public/<slug>/<dish>.jpg
```

Then check it with `photo_sheet.py` like any other.

The CSP already allows Pexels and Unsplash (`next.config.ts`). Any other
image host must be added there first, or the images silently fail in
production.

## 5. The theme — globals.css

Add `.theme-<slug>` in `frontend/app/globals.css` next to `.theme-boho` and
`.theme-lz-food`, **before** `@theme inline`. Start by copying the
`.theme-lz-food` block and replacing values; keep only the rules your
design uses. Anatomy:

```css
/* Comment in French: who, which source, what the palette/type express. */
.theme-<slug> {
  --background: …;  --foreground: …;
  --surface: …;     --surface-raised: …;  --hairline: …;
  --muted: …;       --faint: …;           /* muted/faint must pass 4.5:1 on --background */
  --ember-1: …; --ember-2: …; --ember-3: …; /* accent ramp, light → brand colour */
  --shimmer-highlight: …; --glow-inner: …; --glow-outer: …;

  --brand-display: var(--font-<display>), var(--font-fraunces), sans-serif;
  --brand-sans: var(--font-<text>), var(--font-instrument-sans), sans-serif;
  /* Optional: the name alone in the sign's face when it differs from the
     display face (O’Crousti: Didact Gothic name, Poppins dishes). Style
     .hero-name with it; check_page.cjs then checks h1 against it. */
  --brand-wordmark: var(--font-<sign>), var(--brand-display);
  /* body resolves --font-sans in ITS scope, where --brand-sans doesn't exist:
     without this line every paragraph stays in Ominin's font. */
  font-family: var(--brand-sans);

  color-scheme: dark; /* or light */
}
.theme-<slug> :focus-visible { outline: 2px solid var(--ember-1); outline-offset: 3px; }
```

- **Single-weight display fonts** (Archivo Black, Anton, Bebas…): add
  `.theme-<slug> .font-display { font-weight: 400; }` — shared components use
  `font-medium`, which would synthesise a smeared faux-bold. Add
  `text-transform: uppercase` and a tight `line-height` here if the voice
  is all-caps.
- **Theme hooks** in shared components — neutral without a theme, yours to
  style:

  | Class | Element | LZ.FOOD used it for |
  |---|---|---|
  | `.dish-price` | price on each card | yellow price, crimson rule underneath |
  | `.dish-detail` | "33 cm", "x6" pill | yellow outline pill |
  | `.category-heading` | section `h2` | crimson skewed banner (`::before`) |
  | `.category-rule` | line after the heading | solid crimson tail |

  Plus plain selectors scoped to the theme: `article` (card border/radius/
  shadow), `footer` (a brand-coloured band — then override `.text-muted`
  and `.ember-text` inside it for contrast).
- `.ember-gradient` / `.ember-text` build from the three ember tokens. If
  your third ember is a dark brand colour, lighten the text gradient's tail
  under the theme (LZ used `color-mix(… 62%, white)`) or small gradient text
  fails contrast.
- Contrast: body text ≥ 4.5:1, large text ≥ 3:1. Measure — white on
  raspberry red was 4.25:1 with `#f7f2f3` and 4.71:1 with pure white.
- Prices are **typography**, not stickers (see SKILL.md principle 4).

**Light themes.** LZ.FOOD is dark; a light theme (cream ground, dark ink)
trips three things the dark one doesn't:
- **Button ink.** Buttons and the active category pill print
  `text-background` on the `ember-gradient`. On a light theme that's light
  text on your accents — so every ember stop must reach **4.5:1 against
  `--background`**, which in practice means deep, saturated accents, not
  pastels. Check the "Choisir", "+ Ajouter" and "Voir la commande" labels.
- **Scroll edge.** Overscrolling on iOS shows the document's own background,
  dark by default. Add `html:has(.theme-<slug>) { background-color: <your
  --background>; }` next to the theme block, and check on a phone.
- `color-scheme: light` on the class, so form controls and scrollbars
  follow.

The Ominin version (`?theme=ominin`) has its own light mode behind the
sun/moon toggle in the category bar; it's scored in both modes.

After every edit: `dev_server.sh css-has ".theme-<slug>" <page-url>`.

## 6. Brand fonts

In `frontend/lib/menu/brand-fonts.ts`, per font:

```ts
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
  preload: false, // only restaurants whose theme names it download the file
});
```

Append its `.variable` to `brandFontVariables` (already applied on both
menu routes). Reuse a font another restaurant already loads rather than
adding a near-duplicate. Name the constant after the font, comment which
restaurant uses it and why.

## 7. The preview route

`frontend/app/menu/demo/[slug]/page.tsx` renders any registry slug without
the database: ordering open on a fictitious table (`DEMO_TABLE`), analytics
off (`tracking: false`), `CartBar` rendered, `?theme=ominin` drops the theme
class. You shouldn't need to touch it. The final "Commander" fails without a
seeded establishment — expected on the preview.

## 8. Gotchas

- **Stale CSS in dev.** Turbopack often keeps serving the old `globals.css`.
  Check with `dev_server.sh css-has`; fix with `dev_server.sh restart` (it
  kills every `next dev` — warn if another session uses port 3000).
- **Stale CSS in the user's browser.** The chunk keeps the same filename
  across rebuilds; tell the user to hard-reload (Cmd+Shift+R) when they
  "still see the old version".
- **React hooks before early returns** in client components — ESLint's
  `rules-of-hooks` fails the build otherwise.
- **Transforms trap `position: fixed`.** Anything animated with `transform`
  (the `Reveal` wrapper on sections) becomes the containing block of fixed
  descendants mid-animation. Overlays render through `createPortal` to
  `document.body` for that reason.
- **Production anchors are database ids.** On `/m/<slug>` the category
  anchors are row ids, not your registry slugs — select by text in scripts.
- **`formatPrice`** always prints two decimals ("8,00 €").
- **The table gate.** On `/m/<slug>` without `?table=N`, every order button
  is disabled ("Scannez le Cachet de votre table"). For a takeaway business
  that's a product question for the owner, not a bug to "fix".

---

## Going live

Only when the user asks. Checklist:

1. **Code on `main`.** Another session may have work in progress, and
   `/commit` stages with `git add -A` — so stage yourself, by path:
   ```bash
   git add demos/<slug> frontend/public/<slug>
   git add -p frontend/lib/menu-data.ts frontend/app/globals.css frontend/lib/menu/brand-fonts.ts
   git diff --cached --stat        # only your files, only your hunks
   graphify update . && git add graphify-out
   ```
   Then commit with the message and README entry `/commit` describes. If
   another session already committed your files, confirm they're in `HEAD`
   (`git show HEAD:<path> | grep …`) and that
   `git ls-remote origin refs/heads/main` matches `HEAD`. Once pushed, the
   preview is live and shareable at `https://menu.ominin.com/demo/<slug>`,
   with ordering locked.
2. **Which database?** `backend/.env` → `SUPABASE_URL`. List the
   establishments with the service key (read-only):
   ```bash
   URL=$(grep -E "^SUPABASE_URL=" backend/.env | cut -d= -f2-)
   KEY=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" backend/.env | cut -d= -f2-)
   curl -sS "$URL/rest/v1/etablissements?select=slug,name,offre" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
   ```
   Never print the key.
3. **Slug absent?** `npm run seed:restaurant -- <slug>` deletes the
   establishment with that slug first — cascading to its orders, tables and
   memberships — then inserts. On a new slug that deletes nothing. On an
   existing one it wipes a live restaurant: stop and ask.
4. **Seed** from `frontend/`: `npm run seed:restaurant -- <slug>`
   (offre `connect`, 12 tables, no owner account). To create the owner at
   the same time: `npm run seed:restaurant -- <slug> <email> <password>`.
   **Never `npm run shop:owner`** — it serves Ominin Shop (`shop_members`,
   shop "mybox" by default) and would reset that shop owner's password.
   No script attaches an owner to an already-seeded menu without purging
   it: re-seeding with credentials is safe only while the restaurant has
   zero orders (check first); after that, it needs a dedicated
   `memberships` script — raise it with the user.
5. **Verify on the real URL** — `https://menu.ominin.com/m/<slug>`:
   `check_page.cjs` on it, `check_order.cjs "…?table=1"`. The scripts block
   the analytics call, so the client's first statistics aren't a robot's.
   Never submit an order: it would enter the restaurant's real history and
   print in its kitchen.
6. **Record it**: `production` key in `profile.json`, an entry at the top of
   the README "Project status" (the `/commit` skill requires it), commit.
