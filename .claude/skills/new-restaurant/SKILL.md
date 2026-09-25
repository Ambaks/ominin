---
name: new-restaurant
description: Onboard a new restaurant client end to end and build their customer-facing QR menu in two versions — one in the restaurant's own identity, one in the Ominin house style — from whatever the user hands over (flyer, menu photos, PDF, notes, links), completed by web research on the business, then loop with fresh, independent scoring agents until both pages score 9/10. Use this whenever the user says they signed, met or visited a restaurant, wants to add a client or prospect, sends a flyer or menu to turn into a page, asks for a demo or a menu page for a restaurant, or wants to update an existing client's carte, photos or theme — even if they never say "onboard". Trigger: /new-restaurant
---

# /new-restaurant

Turn what a restaurant hands over — a flyer, menu photos, a PDF, a few
notes — into its Ominin QR menu, in two versions: one wearing the
restaurant's own identity, one in the Ominin house style. Research the
business on the web, build, verify mechanically, then keep handing the page
to fresh scoring agents until both versions score 9/10.

LZ.FOOD (Montpellier, September 2026) was built this way and is the
reference implementation throughout: `const lzFood` in
`frontend/lib/menu-data.ts`, `.theme-lz-food` in `frontend/app/globals.css`,
`demos/lz-food/profile.json`. When unsure how to do something, look at how
LZ.FOOD does it.

## What you deliver

| Deliverable | Where |
|---|---|
| Restaurant-themed menu | `http://localhost:3000/menu/demo/<slug>` |
| Ominin-themed menu (same carte) | `http://localhost:3000/menu/demo/<slug>?theme=ominin` |
| Client record: sources, research, every inference, questions for the owner | `demos/<slug>/profile.json` + `demos/<slug>/docs/` |
| Carte, options, photos | `const <camelSlug>: Restaurant` in `frontend/lib/menu-data.ts`, registered in `restaurants` and `themeClasses` |
| Identity | `.theme-<slug>` in `frontend/app/globals.css`, brand fonts in `frontend/lib/menu/brand-fonts.ts` |
| Hand-off report | your final message |

The preview route renders straight from the static registry, so nothing
touches the database while you work. **Production seeding, commits, pushes
and owner accounts happen only when the user explicitly asks** — each is
outward-facing and some are hard to undo (Phase 9 has the safe procedure).

## Principles — each one cost a rework round on LZ.FOOD

1. **The source is the truth; never invent.** Transcribe names, prices,
   ingredient lists and quantities exactly as printed, spelling quirks
   included ("Carnivor", "4 Fromage"). A plausible detail you added is worse
   than a gap: LZ.FOOD shipped invented drink volumes ("33 cl") from a
   flyer section that had no text at all, and "bordure fromage" where the
   flyer said "bordure". If the user asks for placeholder content (e.g.
   ordering options the source doesn't list), add it, and record every
   invented value in `profile.json` as `options_a_valider`.
2. **Claims keep their printed scope.** Halal, vegetarian, homemade, organic,
   allergens: reproduce exactly what the source claims, where it claims it.
   A halal stamp printed beside the pizzas belongs on the pizza sections,
   not in a site-wide banner — especially when the carte lists ham.
3. **Restaurant stock photography is usually shot *for* a restaurant.** Nine
   LZ.FOOD photos carried another business's name on a liner, a wrapper or a
   crate — invisible as a thumbnail, legible full size. Three illustrated the
   "Halal" section with prosciutto and salami. Every photo gets audited on a
   contact sheet before it ships (`photo_sheet.py`).
4. **Translate the brand's intent, not its print artefacts.** A flyer is
   loud because it competes in a letterbox. Reproducing its devices
   literally (starburst price stickers) reads cheap on a screen, and the
   user rejected it: they want modern and professional. Keep the palette,
   the type voice and one or two structural devices; let restraint do the
   rest.
5. **Measure, don't eyeball.** Sample the palette from pixels, compare the
   wordmark's proportions before choosing a typeface (Anton looked right and
   was the opposite width of LZ.FOOD's wide wordmark), measure contrast,
   clearance under the sticky nav, tap targets.
6. **Reviewers can be wrong or stale — verify before you fix, and never edit
   while a scorer is running.** Several LZ.FOOD findings were artefacts of a
   page that changed mid-review.
7. **Other sessions may share this repo and the dev server on port 3000.**
   Stage only your own files; warn before restarting the dev server.
8. **Nobody ever presses the final "Envoyer la commande" / pay button** — not
   you, not a scorer, not a tester. The dev server talks to the production
   database: on a seeded restaurant a real order would reach its kitchen.
   The preview route locks that button (`CartConfig.preview`), and
   `check_order.cjs` verifies the lock; production checks stop at the cart.
9. **Everything customer-facing is French.** Comments in this codebase are
   French too — match the surrounding code.

## Tools

Scripts live in `.claude/skills/new-restaurant/scripts/` (call it `$S`).
They exist because each was rewritten by hand, repeatedly, during LZ.FOOD.

| Script | Use |
|---|---|
| `render_source.py render <in> <out.png>` | HEIC/JPEG (EXIF-upright) or PDF → full-resolution PNG |
| `render_source.py grid <png> <dir>` / `crop` | tile a flyer to read the fine print; crop a region |
| `sample_palette.py <image> [--box]` | hue-family coverage and dominant hex — source and built page alike |
| `photo_sheet.py --from-menu <slug> <dir>` | verify every photo URL, flag duplicates, draw numbered sheets: `full-*` (branding, dish, diet) and `card-*` (the 16:9 crop shown) |
| `pw.sh tour.cjs <url> <prefix> [w] [h] [n]` | scroll-through screenshots to *look at* |
| `pw.sh check_page.cjs <url>` | theme + fonts actually applied, photos, overflow 320-1440, every category jump, reduced motion, console |
| `pw.sh check_order.cjs <url>` | one options modal per section (dialog semantics, on-screen, CTA), a multi-group item completed by pointer taps (each must register), add to cart, cart bar — never submits |
| `pw.sh check_contrast.cjs <url> [w] [h] [--light]` | contrast of every button, link and price measured on pixels (gradients, photos, veils) — run on both versions, `--light` for the Ominin light mode |
| `dev_server.sh status \| css-has <text> [url] \| restart` | is the served CSS the CSS you wrote? |

Work files (renders, sheets, screenshots) go in the session scratchpad,
never in the repo. `pw.sh` finds Playwright in the npx cache; if it's
missing, `npx -y playwright@latest install chromium` once.

---

## Phase 1 — Intake

Take everything the user gave: files, photos, links, notes, what they said
about the place.

1. Pick the slug: kebab-case **ASCII** of the trading name (`le-petit-cedre`,
   never `cèdre` — the theme class and scripts expect `[a-z0-9-]`). Check
   it isn't already in `restaurants` in `menu-data.ts`.
2. Archive the originals in `demos/<slug>/docs/` (rename sensibly:
   `flyer.heic`, `carte-recto.jpg`). They're the evidence every later
   decision points back to.
3. Render them: `render_source.py render` each file, then `grid` the dense
   ones. A PDF that only embeds a photo has no more detail than that photo —
   when both exist, the original image is the one to read.
4. User-supplied photos of the actual food, storefront or interior are gold:
   real dishes beat stock every time. Keep them for Phase 6.

**Checkpoint.** Everything expensive that follows — research, two photo
agents, up to 30 scoring runs — rests on the answers below. Once the source
is rendered, ask the user (AskUserQuestion if available, otherwise plainly)
about whichever of these is actually unclear, all in one message, and go on
without stopping when none is:

- **Coverage** — does the source show the whole carte? A verso missing,
  cut-off edges, glare over prices, a file the user named that isn't
  there. Research never supplies carte content: delivery platforms carry
  marked-up prices and stale dishes.
- **Photos** — if the owner's own dish photos are coming later: stock now
  (flagged, swapped on arrival) or wait?
- **Identity** — if there's no logo file, no signage or storefront photo,
  and the source's header is plain: can the user send Instagram
  screenshots or a photo of the sign? (Instagram blocks fetching.)
- **Structures the data model can't hold** — "3 mezzés au choix parmi 12",
  a half-and-half pizza, sizes with different option lists. Option groups
  hold one choice each (or unlimited with `multiple`), with no min/max: say
  how you'd approximate it and let the user decide.

## Phase 2 — Research (background agent)

Launch one `general-purpose` agent with the brief in
[references/research.md](references/research.md) as soon as you know the
name and town, and keep working while it runs. It returns address
verification (flyers carry wrong postcodes), the legal entity, Google
Business presence, socials, delivery platforms, hours, with a source and a
confidence level per fact. Missing online presence is itself a finding —
LZ.FOOD had no Google listing, which became a sales argument.

## Phase 3 — Transcribe the carte

Read the rendered tiles region by region and transcribe every category,
item, price, ingredient list, portion and size, plus every offer, formula
and supplement. Then:

- Keep printed spellings; expand an abbreviation only when it's unambiguous
  ("moza" → "mozzarella"), and note it.
- A section with prices but no text (drinks shown as photos) gets names
  read off the photos and **no** invented volumes.
- Record anything illegible or ambiguous as a question, not a guess.
- The **accuracy auditor** (round 1 of Phase 8) re-reads the source at full
  resolution and diffs it against your transcription — it caught four
  invented details on LZ.FOOD. Not earlier: the carte keeps changing until
  Phase 7, and an auditor measuring a moving file wastes its run.
- Alcoholic drinks carry `vatRate: 20` (the default is 10); the rate goes
  to the till.

**Ordering options.** If the source lists choices (meats, sauces, sizes,
supplements), model them as option groups. If it lists none and the user
wants ordering demonstrable, add plausible ones only on their request and
flag each in `profile.json`. Mechanics are in
[references/build.md](references/build.md): one group holds one choice
unless `multiple: true` (supplements), a formula carries its drink as its
own choices, a "3 meats" item is three required groups — beyond three, ask
(see the checkpoint).

## Phase 4 — Identity

Build the restaurant theme from evidence, best source first: a logo file,
then the sign or storefront, then the source's own header and colours, then
social screenshots. If none gives a distinct identity, build a restrained
theme from what *is* there, record it in `profile.json` as a proposal, and
add no motif the source doesn't carry — no cedars, arabesques or tricolours
because of the cuisine.

- **Palette** — `sample_palette.py` on the source, `--box` to exclude the
  table it was photographed on. Photographed print is warm-shifted and
  desaturated; nudge towards the saturated value it was aiming for. Pick a
  near-black or near-white ground, a foreground, and three accents in the
  `--ember-1/2/3` slots. A light theme has its own traps (button ink,
  scroll edge) — see build.md §5.
- **Type** — crop the wordmark and a section heading and compare their
  proportions (wide / condensed / serif / script) before choosing a Google
  Font. Pair a display face with a readable text face. Fonts load with
  `preload: false`, so only this restaurant's pages download them.
- **Mark** — use the restaurant's own wordmark as the hero, typeset in the
  display face. Don't invent a logo; if you draw a proposal, keep it in
  `demos/<slug>/design/` for the owner to approve. Never adopt a platform's
  icon (the ghost next to LZ.FOOD's name was Snapchat's).
- **Devices** — choose one or two structural devices from the source (LZ:
  crimson skewed banner behind section headings, crimson footer band) and
  make the brand colour carry structure, not garnish. Re-measure the built
  page with `sample_palette.py` on a full screenshot: LZ's flyer was 14 %
  red, the first build 0.6 %, and that gap was the loudest review complaint.
- **Ominin version** — nothing to design: `?theme=ominin` drops the theme
  class and the same carte renders in the house palette and fonts. It still
  has to score 9, so its photos, data and hero must be good on their own.

## Phase 5 — Build

Follow [references/build.md](references/build.md): profile, registry entry,
theme block, fonts, options, highlights, photos. After touching
`globals.css`, run `dev_server.sh css-has ".theme-<slug>"` against your page
— Turbopack in dev often keeps serving the old stylesheet, and you'd be
judging a page that doesn't exist. Then `npx tsc --noEmit` and
`npx eslint` on the files you touched.

## Phase 6 — Photos

Every item gets a photo that shows **that** dish. In order of preference:

1. The user's own photos of the dish → `frontend/public/<slug>/`. Check
   each one: is it the dish it's filed under (ask when unsure), does its
   16:9 crop hold, are there identifiable people (customers, staff) —
   leave those out.
2. Stock photos sourced by background agents using the brief in
   [references/photos.md](references/photos.md) — split the carte across two
   agents by category so they finish together.

Then audit with `photo_sheet.py --from-menu <slug>` and **read every
sheet**: `full-*` for third-party branding, wrong dish and diet
contradictions; `card-*` for framing. Replace what fails, re-audit, repeat
until clean. Off-centre subject → `pexelsRecadre` (server-side entropy crop).
When you find a contaminated Pexels series, add its range to the blocklist in
`references/photos.md` so the next client doesn't pay for it again.

## Phase 7 — Mechanical checks

Before any scorer sees the page:

```bash
$S/pw.sh check_page.cjs  "http://localhost:3000/menu/demo/<slug>"
$S/pw.sh check_page.cjs  "http://localhost:3000/menu/demo/<slug>?theme=ominin"
$S/pw.sh check_order.cjs "http://localhost:3000/menu/demo/<slug>"   # if options exist
$S/pw.sh check_contrast.cjs "http://localhost:3000/menu/demo/<slug>"
$S/pw.sh check_contrast.cjs "http://localhost:3000/menu/demo/<slug>?theme=ominin" 390 844 --light
$S/pw.sh tour.cjs "http://localhost:3000/menu/demo/<slug>" <scratch>/m 390 844 8
$S/pw.sh tour.cjs "http://localhost:3000/menu/demo/<slug>" <scratch>/d 1440 900 6
```

Fix every ÉCHEC, then **look at the tour screenshots yourself** — the
scripts can't tell you a heading is ugly. Also run `check_page.cjs` on every
other slug in the registry: shared components changed for one client must
not break another.

## Phase 8 — Scoring loop (target: 9/10 on both versions)

The loop is the point of this skill; its mechanics, prompts and rubric are in
[references/scoring.md](references/scoring.md). In short:

1. **Each round, spawn fresh agents in parallel** (`general-purpose`, one
   message): **two independent holistic scorers** every round; the ordering
   stress-tester in round 1 and whenever ordering code or options changed;
   the accuracy auditor in round 1 and whenever carte text changed. Fresh
   agents each round — one that has seen its earlier verdict anchors on it.
   The **lower** of the two holistic scores is the round's score for each
   version: one lenient scorer can't pass the page.
2. **Give scorers the brief, the URLs, the source path and the constraints —
   nothing else.** Not the target, not previous scores, not your opinion of
   the page. The constraints are copied from the owner questions already in
   `profile.json`, never written for the occasion; log the block each round
   so any drift is visible.
3. **Don't touch the code or restart the server while agents run.**
4. **Triage every report**: reproduce each claim (screenshot, script, source
   crop) before acting. Fix everything real and code-fixable. Record
   client-blocked items in `profile.json`. Log findings you verified as
   wrong, with the evidence, and taste calls you declined, with the reason.
5. **Re-run Phase 7**, then start the next round.

**Pass:** in the same round, **both** holistic scorers give **≥ 9 to the
restaurant version and ≥ 9 to the Ominin version** (whole numbers), and
neither the ordering tester nor the accuracy auditor has a must-fix open.

**Budget: 30 agent runs** for the whole loop — each scorer, tester and
auditor you launch in this phase counts one. A typical round costs 2-4.
Before a round, check it fits; if it doesn't, stop.

**Stop without passing** — and say so plainly — when either:
- the budget is spent, or
- two consecutive rounds raised neither version's score while every
  remaining finding is client-blocked, verified wrong, or a declined taste
  call.

Then report the last scores, what stands between them and 9, and exactly
which asset or decision from the owner would close each gap. Never argue a
scorer up, never hide a known defect, never round up.

## Phase 9 — Hand-off

Final message to the user:

- both preview URLs, and the last round's scores per version
- what was built (compact) and anything shared that changed for every
  restaurant
- **every inference and placeholder** still in the carte
- the questions for the owner (hours, claim scopes, invented options,
  postcode discrepancies, missing photos) — also written into
  `profile.json`
- sales findings from research (no Google listing, dead delivery page…)
- declined taste calls from the loop, with the reason, so the user can
  overrule them
- the next steps it does not take without a go-ahead: seeding production,
  committing, creating the owner account. Once the code is pushed, the
  preview is shareable with the owner at
  `https://menu.ominin.com/demo/<slug>` — ordering is locked there.

**When the user says go live**, follow the production checklist in
[references/build.md](references/build.md#going-live): confirm which
database `backend/.env` points at, confirm the slug doesn't exist yet (the
seed script purges by slug before inserting), seed, then verify on the real
URL with `check_page.cjs` and `check_order.cjs "…?table=1"` — without ever
submitting an order. **Committing:** other sessions may have work in
progress, and `/commit` stages with `git add -A` — don't let it. Stage by
path (`git add demos/<slug> frontend/public/<slug> …`), use `git add -p` for
the shared files (`menu-data.ts`, `globals.css`, `brand-fonts.ts`) so only
your hunks go in, review `git diff --cached --stat`, then write the message
and README entry the way `/commit` describes. Run `graphify update .` before
committing (CLAUDE.md requires it after code changes).

---

## Updating an existing client

When the user sends new material for a restaurant already in the registry
(corrected prices, the owner's real photos, opening hours, a new dish, a
theme tweak):

1. Read `demos/<slug>/profile.json` and the restaurant's block in
   `menu-data.ts`.
2. Apply the change with the same rules: source is truth, claims keep their
   scope, new photos go through `photo_sheet.py`.
3. Close the questions it answers in `profile.json`; keep the rest open.
4. Run Phase 7. For a visual change, run one scoring round.
5. If the restaurant is live, tell the user the database copy won't change
   until it's re-seeded or edited from the owner's space — and don't
   re-seed a live restaurant without asking: the seed purges the
   establishment, its orders included.
