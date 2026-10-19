# 06 — BIG SMASH: brand identity and full carte

Research date: 2026-10-03. Tags: **[verified]** = seen directly in the source (HTML, CSS, image or live page) on that date; **[claim]** = stated by Big Smash or a third party but not cross-checked; **[unverified]** = inference or search-snippet only.
Assets: `assets/big-smash/` (mapping in `assets/big-smash/sources.json`). Raw snapshots: `assets/docs/`.

---

## 0. Key facts for the demo (TL;DR)

| Topic | Answer |
|---|---|
| Primary red (UI) | `#D72215` (CSS `--base--rouge`, page background) [verified, webflow CSS] |
| Logo / print red | `#D1000E` (logo PNGs, favicon, OG image, "Origine des viandes" frame) [verified, pixel sampling] |
| Dark red (hover) | `#A8160B` (`--base--rouge-foncé`) [verified] |
| Secondary | Black `#000000` + White `#FFFFFF` [verified] |
| Greys | `#4D4D55` (gris foncé), `#CAD7E5` (gris), `#A2AAB2` (gris input) [verified] |
| Typeface (site) | **Obviously** (OH no Type Co., commercial), weights 100–Black + italics. Free stand-in: **Archivo** (Google Fonts, variable width + weight; Archivo Black for headlines) |
| Logo | Custom ultra-condensed rounded caps wordmark "BIG SMASH" (+ ®); secondary "BIG" monogram (letters rotated 90°). SVGs downloaded |
| Main slogan | "1,2,3 ... SMASH !" (homepage) · storefront: "THE BEST SMASH BURGERS ARE MADE IN ~~AMERICA~~ HERE" |
| Drinks | **Coca-Cola** range (Coca-Cola, Coca-Cola Zéro / Sans sucres, Cherry; Fuze Tea) — not Pepsi |
| Halal | Yes — "toutes nos viandes sont certifiées AVS et Achahada" (site FAQ) |
| Demo restaurant | **Toulouse Matabiau**, 68 rue de Bayard, 31000 Toulouse — first restaurant (2021), Google 4.6 (2 381 avis) |
| Prices | The site's carte holds prices in its HTML but **hides them with CSS** (`.prix-card {display:none}`). Deliveroo is about 29 % higher than the site; Big Smash's own Delicity delivery site sits in between |

---

## 1. Brand identity

### 1.1 Logo system [verified unless noted]

1. **Primary wordmark, "BIG SMASH"**: custom lettering, not a font. Ultra-condensed, monoline, tall caps with rounded outer corners and squared counters. The S has long vertical terminals, and the G is drawn as a squared hook. There is no exclamation mark in the logo. "BIG SMASH !" is only the site `<title>`/og:title.
   - `logo-horizontal-blanc.svg`: official white SVG (Illustrator export, viewBox 624×177) from the site header.
   - The **extruded-block lockup** (red letters inside a white block with a 3-D drop extrusion toward the lower left, ® at top right) appears in `og-image-rouge.jpg` and on the "Origine des viandes" sheet.
   - On packaging the wordmark runs **vertically** up the side of the take-away bag (white bag, red block) [verified, `slider-15-premiere-commande.webp`].
2. **"BIG" monogram**: the letters B-I-G rotated 90° and stacked into a square-ish block. It is the favicon/app icon (red `#D1000E`) and appears on fry boxes, cups, sundae cups, staff T-shirts and window decals.
   - Vector: `badge-logo.svg` (white). PNG: `webclip-app-icon.png` (256²).
3. **Stacked lockup** "BIG" (large) over "SMASH" (small) in a white rounded block with ®. Seen as a window decal at Blagnac [verified, `storefronts/shop-center-blagnac.jpeg`].
4. **Hand-drawn sticker mark**: a scribbled "BIG SMASH" over a red heart/basketball doodle, on the bag-closure sticker "Merci pour ta commande" [verified, slider image]. It is secondary and informal.
5. **Rotating circular badges**: "BIG SMASH • DEVENIR FRANCHISÉ" and "BIG SMASH • REJOINDRE L'ÉQUIPE" (`badge-text-*.svg`).
6. **Mascot**: none found on the site, Instagram, packaging or storefronts [unverified, absence of evidence].

### 1.2 Colour palette

| Role | Hex | Where it comes from |
|---|---|---|
| Brand red, web / UI | **#D72215** | `:root --base--rouge: #d72215` in `big-smash-2.webflow.shared.3fbca3803.css`. The live page's `body` background is `rgb(215,34,21)` [verified in browser, 2026-10-03] |
| Brand red, logo / print | **#D1000E** (≈ #D2000E) | Dominant pixel of `webclip-app-icon.png`, `favicon.png` (#D1000E) and `og-image-rouge.jpg` (#D2000E). "Origine des viandes" frame ≈ #CC000C [verified, PIL sampling] |
| Dark red (hover, menu text) | **#A8160B** | `--base--rouge-foncé` [verified] |
| Black | **#000000** | `--base--black`, button borders, fascia [verified] |
| White | **#FFFFFF** | `--base--white`, cards, headings on red [verified] |
| Grey dark | #4D4D55 | `--base--gris-fonce` [verified] |
| Grey light | #CAD7E5 | `--base--gris` [verified] |
| Grey input | #A2AAB2 | `--base--gris-input` [verified] |
| Campaign "tomato" red (marketing backgrounds only) | ≈ #D2362A / #D84E3C | Hero sliders (brush texture / comic burst) [verified, sampling. A photographic rendering, not a token] |
| Packaging red (photographed) | ≈ #C01800 | Fry boxes in product shots (lighting-dependent) [verified, sampling] |

**How the site uses it** [verified CSS]: two themes alternate as you scroll (`variables-color-scroll.js`).
- **Dark** = red background `#D72215`, white headings and text, white buttons with red text, black menu button.
- **Light** = white background, red headings, black text, red buttons.

Product cards are white with a 20 px radius on the red page, with the item name in red Obviously Semi. The main CTA (`.cta`) is a white background, black text, a 0.15 rem solid black border, 0.6 rem radius and 13/20/16 px padding in Obviously Semi 15 px.

(The click & collect site shop.bigsmash.fr is a 6X POS template with its own `--main-color: #b5103e` / `#e33e2b`. It is not brand-defined, so ignore it.)

### 1.3 Typography [verified, CSS @font-face + computed styles]

| Family on bigsmash.fr | Files / weights | Used for | Licence |
|---|---|---|---|
| **Obviously** | Thin 100 (+It), Lght 300 (+It), Regular 400 (+It), Medi 500 (+It), Semi 600 (+It), Bold 700 (+It), Blck (+It). Self-hosted `.otf` on cdn.prod.website-files.com | `h1` Obviously 700, uppercase, 5 rem, line-height 1. `h2` 700, 2.4 rem. `h3` Obviously Semi 600, 1.3 rem, red. Body/`p` Obviously 400, 15 px / 1.5. Nav/CTA Obviously Semi. Product option labels Obviously Medi 13 px. Giant slide titles Obviously Blck at 13 vw. Fonts actually loaded on /la-carte: Obviously 400, 700 and Obviously Semi 600 | Commercial (OH no Type Co., James Edmondson, 2019; also on Adobe Fonts) |
| Gendis Headline | `GendisHeadline-Regular.otf` declared via @font-face | **Not applied** by any CSS rule or inline style found | Commercial (Surotype) |
| Logo lettering | n/a (outlined SVG) | Wordmark, fascia, "SMASH BURGER · FRIED CHICKEN · MILKSHAKE" packaging taglines (condensed italic caps in the same spirit) | Custom |

**Free Google Fonts stand-ins** (Ominin's choice, [unverified] visual match):
- For **Obviously**, use **Archivo**: variable `wdth` 62–125 and `wght` 100–900, with italics. Set `font-stretch: 112–125%` for the wide-grotesque feel, and use **Archivo Black** for the heavy uppercase headlines (Instagram posters, "THÉS & LIMONADES"). The alternative is **Anybody** (variable width).
- For the **logo-style condensed caps** (taglines, fascia text), use **Big Shoulders Display** 800–900 or **Antonio** 700. Use the SVG for the logo itself and never re-type it.

### 1.4 Graphic devices [verified]
- **Brush zig-zag "smash" pattern**: black hand-painted zig-zags, used tone-on-tone over red at 7–15 % opacity (`.background-bs` 15 %, `.background-bs-2` 7 %). Files: `pattern-fond-bs*.svg` (4 variants).
- **3-D extruded block** behind the wordmark (OG image).
- **Torn-paper split** red/white and **comic-burst rays** on posters (Big Chicken / Chicken Spicy poster, Thés & Limonades slider).
- **Heavy, wide, italic black caps** on Instagram posters ("INAUGURATION BLAGNAC", "IL A MIS TOUT LE MONDE D'ACCORD").
- Neon-outline red type for the "BIG SPICY ÉDITION" campaign (`gmaps-matabiau-owner-post-big-spicy-edition.jpg`).
- Rounded white **line icons** (rocket, cup, hands, wheel, burger) on the Équipe page (`icon-burger.svg`).

### 1.5 Photography style [verified]
- **Menu product shots**: studio cut-outs on **transparent background** (WebP with alpha on the site; on white JPG on Deliveroo). Low 3/4 front angle, glossy brioche/potato bun, cheese drip and crisp lettuce, McDonald's/BK-style hero renders.
  - Menus are shown as burger + red BIG fry box + red/clear BIG cup.
  - Drinks use the supplier's packshots (Coca-Cola cans, Evian/Badoit/Volvic bottles, Red Bull, Capri-Sun).
- **Lifestyle shots**: warm, grainy, close-up hands-in-frame food porn. Examples: a triple-patty burger held with manicured nails, a tender dipped in orange spicy sauce, sauce squeezed onto cheddar-bacon crinkle fries. The red interior is blurred in the background.
- **Campaign mock-ups**: US-street fantasy (Chicago billboard "SMASH", red puffer jacket with BIG SMASH print), CGI beach kiosk, GTA-style "MOOD 2026".
- Overall: **bright, saturated, red-dominant, not dark/moody**.

### 1.6 Packaging [verified, photos]
- **Fry boxes and nugget/tender trays**: red cardboard with a large white BIG monogram and small white icons/text "SMASH BURGER · ORIGINAL HOT-DOG · MILK SHAKE".
- **Burgers**: wrapped in white paper with a red BIG pattern, served on **red plastic trays**.
- **Cold drinks** (lemonades/teas): clear cups with the white BIG monogram and a red flavour label ("FIZZ YUZU", "THÉ BLANC TROPICAL"…). **Sundae and milkshake** cups are white with the red BIG monogram.
- **Take-away bag**: white kraft with the vertical red BIG SMASH block, "BIGSMASH.FR" plus TikTok/Instagram/Snapchat icons, and the top tagline "SMASH BURGER  FRIED CHICKEN  MILKSHAKE". The closure sticker reads "Merci pour ta commande [prénom]" with the restaurant address and hours.
- Big Salade comes in a kraft box with a BIG print.

### 1.7 Storefronts and interiors [verified, photos; franchise text = claim]
- **Franchise page claim**: "un univers in store fort et reconnaissable, fidèle à son ADN : urbain, moderne et minimaliste… directement inspirée de la culture street" ([bigsmash.fr/franchise](https://www.bigsmash.fr/franchise)).
- **Facades**: two treatments.
  - **Black/charcoal fascia** with the white wordmark: Matabiau, Croix de Pierre, Montpellier, Lyon. Matabiau's second fascia reads "SMASH BURGER · ORIGINAL HOT-DOG · MILKSHAKE".
  - **Red fascia** with an illuminated white wordmark: Blagnac, Muret (red awning).
  - Large white **BIG monogram window decals**. The window slogan "THE BEST SMASH BURGERS ARE MADE IN AMERICA" has "AMERICA" crossed by red spray-paint graffiti "HERE" with an arrow (Blagnac, Montaudran).
  - Door decals show HALAL, Deliveroo / Uber Eats, hours, a QR code, accepted payments (CB, Visa, Mastercard, Apple/Google Pay, Ticket Restaurant, Swile/Up).
- **Interior**: **red walls** in the brand red, white counter fronts and white tiling, black-on-white "ORDER" / "PICK UP" signage, LED strip lighting, a backlit white BIG sign, **red dome pendant lamps**, red chairs, wood or black tables, red trays, staff in red BIG T-shirts.
- **Terrace (Matabiau)**: red metal bistro chairs under Toulouse's brick arcades.
- Fenouillet and Lyon are co-branded **"BIG SMASH ⚡ NEW SCHOOL"**: the same founder's tacos chain shares the unit.

### 1.8 Tone of voice and slogans (verbatim)

Informal, street, mostly **tutoiement**, uppercase punch lines, slang ("kiffer", "claque", "béton", "bosser", "carré").

| Phrase | Source |
|---|---|
| "1,2,3 ... SMASH !" | bigsmash.fr homepage, section title [verified] |
| "Big Smash réinvente le fast food avec une expérience burger unique, inspirée de la street food américaine." | homepage [verified] |
| "la référence du smash burger premium et du fried chicken maison, en France et bien au-delà !" | homepage + meta description [verified] |
| "UN CONCEPT QUI SMASHE TOUT SUR SON PASSAGE !" | /franchise [verified] |
| "Premium - Innovant - Fait maison" | /franchise [verified] |
| "VIENS BOSSER DANS une ambiance qui CLAQUE !" / "REJOINS LA TEAM BIG SMASH" | /equipe [verified] |
| "UNE PETITE FAIM ?" · "T'ES CURIEUX ?" · "Trouve ton restau'" · "Check la carte" · "Commander en ligne" | site footer [verified] |
| "-15% SUR TA PREMIÈRE COMMANDE" | homepage slider [verified] |
| "THE BEST SMASH BURGERS ARE MADE IN ~~AMERICA~~ HERE" | storefront windows, Blagnac and Montaudran [verified, photos] |
| "SMASH BURGER · FRIED CHICKEN · MILKSHAKE" / "SMASH BURGER · ORIGINAL HOT-DOG · MILKSHAKE" | bag / fry box and Matabiau fascia [verified] |
| "🔥Venez kiffer nos f****g smash burger! 11 restaurants en France 🇫🇷 📍Toulouse x7📍Paris 📍Lyon 📍Echirolles📍Montpellier On débarque bientôt dans ta ville🔥" | Instagram bio @bigsmashfrance, 19.4k followers, 557 posts [verified 2026-10-03] |
| "C'est carré dans le smash 👊🏽🤤" | IG caption, 30 Sep 2026 (Grilled Smash) [verified] |
| "Qui est capable de finir ce COMBO ? 😍🔥 Composez vos menus COMBO avec ce que vous voulez dedans !" | IG caption, 17 Sep 2026 [verified] |
| "Compose ton menu combo — À ta propre sauce !" | IG reel cover, 17 Sep 2026 [verified] |
| "IL A MIS TOUT LE MONDE D'ACCORD" (Grilled Smash) | IG poster, 30 Sep 2026 [verified] |
| "BIG SPICY ÉDITION" | spring 2026 campaign, Google owner post 14 Apr 2026 [verified] |
| "Merci pour ta commande" | bag sticker [verified] |

**Instagram habits** [verified, @bigsmashfrance]:
- Emojis 🔥🍔🌶️👊🏽🤤😍🛵📍🇫🇷.
- Key words in CAPS (COMBO, BIG SMASH).
- Every caption ends with the 📍 list of all 10 addresses plus "Et en livraison sur Deliveroo 🛵" and the hashtags `#bigsmash #food #smashburger #smash #burger`.
- Content mix: launch posters (opening events with "100 premiers menus offerts", PS5 + GTA6 giveaways, influencers "Bebeta & Camelia83" for Paris 18), product drops, memes and gaming references.
- Story highlights: "Montpellier", "Toulouse centre", "Vous", "La carte", "Vos Avis".
- Google owner posts use the same emoji-heavy style with SEO keywords ("fast food halal, burger smash, street food, tacos…").
- Deliveroo category names also carry emojis: "SMASH BURGERS 🔥", "COMBO ⚡", "HOT DOG 🌭", "MENU ENFANT 👧🏻"…

### 1.9 Company and tech context (useful for the pitch)
- **Operator**: "Smash N Shake" (mentions légales). The website is built and published by the agency **Elypse** (Toulouse) on Webflow. Founder **Selim Jaouadi**, also behind New School Tacos. HQ in Toulouse [verified, site].
- **Timeline** (/franchise): 2021 first restaurant at Toulouse Matabiau; 2023 opened to franchising; 2024 Montpellier, Croix de Pierre and **Tanger** (first international site); 2025 more openings.
  - Key figures shown: "7 restaurants ouverts (mai 2025), 10 projets en cours, 1.2M CA annuel du réseau, 3K CA moyen/jour" [claim; note that 1.2 M€/year looks inconsistent with 3 k€/day × 7 restaurants].
  - Today: **11 restaurants** per the Instagram bio. The IG captions list 10 addresses: Toulouse Bayard (Matabiau), Croix de Pierre, Montaudran, Blagnac, Fenouillet/Saint-Alban, Muret, Montpellier, Échirolles, Lyon 2e, Paris 18. Blagnac opened 19/09/2026, Paris 18 on 26/09/2026.
  - "Ouvertures prochaines": Nîmes, Le Havre, Toulouse 4, Carcassonne [verified, homepage].
- **Ordering stack** [verified, page source]:
  - Click & collect at `shop.bigsmash.fr`, powered by **6X POS / Tereza** (`appCode: bigsmash`, back office `bo.tereza.fr`, Stripe "CB" payment, loyalty enabled `hasFidelity: true`).
  - Loyalty site `bigsmash.macarte.club`.
  - In-store **kiosks** ("bornes", site FAQ).
  - Montpellier's own delivery site `commandes.bigsmash.fr` runs on **Delicity**.
  - Plus Deliveroo and Uber Eats. Image names such as "6X MILK" / "6X SUNDAE" confirm that product data is synced from 6X POS.
- Contacts on the site: `sav@bigsmash.fr` (order issues), `contact@bigsmash.fr` (DPO).

---

## 2. The carte

### 2.1 Sources and price tiers

| Source | What it is | Status |
|---|---|---|
| **A. bigsmash.fr/la-carte** | Official CMS carte, 70 tiles across 10 categories, prices in the HTML | Prices **hidden on the live page** (`.prix-card { display:none }`, computed `display: none` on all 70 blocks) [verified]. Treat them as the official base price list, possibly stale. Several menu prices look wrong (e.g. Menu Big Cheese 8.90 < Menu Smash Classic 9.90) |
| **B. Deliveroo, Big Smash - Matabiau** | 78 items, full modifiers | [verified] via the page's `__NEXT_DATA__` in a browser. curl/WebFetch get a Cloudflare challenge. Extract saved: `assets/docs/deliveroo-matabiau-2026-10-03-extract.json`. Same prices at Croix de Pierre and Montpellier |
| **C. commandes.bigsmash.fr (Delicity), Big Smash Montpellier** | Big Smash's own delivery/C&C site | [verified, browser]. Prices sit between A and B |
| **D. Uber Eats, Matabiau** | — | **Blocked** by reCAPTCHA (browser) and 403 (curl/WebFetch); not bypassed. Search snippets only: "Menu Big Combo (€19.90), Menu Big Cheese (€14.90), Menu Smash Bacon (€13.90), Menu Smash Classic (€12.90)…", rating 4.4 [unverified, snippet]. That matches Deliveroo. Another snippet gives Smash Classic at 9.90 [unverified] |
| E. shop.bigsmash.fr (click & collect) | Would carry true pick-up prices | Needs a sale-mode selection (form POST) before the catalogue shows, and its JSON API needs a key. **Not done** (no form submission) |

Markup check (A → B): Smash Classic 6.90 → 8.90 (+29 %); Menu Smash Classic 9.90 → 12.90 (+30 %); Big Combo 14.90 → 19.90 (+34 %); Coca-Cola 1.90 → 2.90 (+53 %). C sits at about B minus 0.50 € on burgers and B minus 1.50 € on menus.

### 2.2 Full carte (descriptions verbatim from bigsmash.fr; differing platform wording noted)

Price columns: **Site** = A (bigsmash.fr, hidden); **Roo** = B (Deliveroo Matabiau, delivery); **Deli** = C (Delicity Montpellier). "—" = not listed there.

#### Nouveautés (site, 6 tiles)
| Item | Site | Roo | Deli | Description (site) |
|---|---|---|---|---|
| CREVETTES PANÉES | 5.90 | 7.50 | 6.90 | Beignets de crevettes décortiquées croustillants Servi avec sauce Big Sweety. |
| CHICKEN POP-CORN X15 | 5.90 | 8.90 | 7.90 | Morceaux de filet de poulet pané maison. |
| TACO SMASH (x2) | 7.90 | — | — | Choisissez deux Taco (classique ou épicé). |
| MENU SURF & TURF | 11.90 | 14.90 | 13.40 | Potato bun, steak haché smashé, crevettes panées, graine de sésame, cheddar et sauce Big Sweety servi avec frites et boisson. |
| MENU BIG MOUNTAIN | 11.90 | — | — | Potato Bun, filet de poulet pané maison, oignon confit, raclette, bacon et sauce Ranch servi avec frites et boisson. |
| MENU TACO SMASH | 10.90 | — | — | Choisissez deux Taco (classique ou épicé) servi avec frites et boisson. |

Deliveroo "NOUVEAUTÉS 🆕" today (Italian limited edition) [verified]:
- **Menu Big Italy Beef** 13.90 — "Pain focaccia, pesto aux tomates confites, steak haché smashé , tranche de mozzarella , feuilles de roquette , rondelles de tomates et sauce Ranch".
- **Menu Big Italy Chicken** 14.90 (same, with "filet de poulet pané maison").
- **Limonade DELLA MAMMA** 3.90 — "Limonade gazeuse au citron, ube et purée d'ananas, servi avec glaçons".
- **Chunky Cookies®** 4.50 — Peanut Chunk / White Chunk / Choco Chunk / Pista Chunk.

Delicity "Nouveautés" (Montpellier):
- Big Caesar 11.40 — "Salade fraîche, ( tenders croustillants OU crevettes panées), tomates cerises, copeaux de parmesan, oignons frits et sauce Ranch."
- **Big Shrimp** 11.40 — "Salade fraîche, crevettes panées, dés de mangue, oignons frits et sauce Big Sweety."
- Pistachio 4.95 — "Milkshake ou Sundae ? À toi de choisir".
- Menu Surf & Turf 13.40; Taco Smash 6.40; Menu Big Cheese 13.40.

The **BIG SPICY ÉDITION** (Apr 2026, Google owner post) added Smash Spicy, Chicken Spicy, Taco Spicy, Wrap Spicy, Popcorn Chicken Spicy, Frites Spicy, **Sundae Mango Spicy** and **Limonade Mango Spicy**. The last two are no longer on Deliveroo [verified absent].

#### Burgers, seul (site: 11)
| Item | Site | Roo | Deli | Description (site) |
|---|---|---|---|---|
| SMASH CLASSIC | 6.90 | 8.90 | 8.40 | Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, pickles, cheddar et sauce Big Smash. |
| SMASH SPICY | 6.90 | — (only in "+ Frites"/menu) | 8.40 | Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, cheddar, jalapenos et sauce Spicy. |
| SMASH BACON | 7.90 | 9.90 | 9.40 | Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, cheddar, bacon de boeuf et sauce Big Smash. |
| ORIGINAL CHEESE | 6.90 | 8.90 | 8.40 | Potato bun, steak haché smashé , oignons frais, double cheddar, pickles, sauce ketchup et moutarde US. (Roo: "oignons blancs") |
| BIG SMASH BURGER | 6.90 | 9.90 ("Big Smash") | 9.40 | Pain burger, 2 steaks smashés, 2 tranches de cheddar, pickles, salade iceberg et sauce Big Smash. |
| SURF TURF | 8.90 | 10.90 | 10.40 | Potato bun, steak haché smashé, crevettes panées, graine de sésame, cheddar et sauce Big Sweety. |
| BIG FISH | 6.90 | 8.90 | 8.40 | Potato bun, filet de colin pané maison, cheddar, salade iceberg et sauce Tartare. |
| ORIGINAL CHICKEN | 6.90 | 9.90 | 9.40 | Potato bun, filet de poulet pané maison, cheddar, salade et sauce Ranch. (Roo: "feuilles de salade et sauce chicken") |
| BIG CHICKEN | 7.90 | 10.90 | 10.40 | Potato bun, filet de poulet pané maison, feuille de salade, rondelle de tomate, pickles, cheddar et sauce Smokey BBQ. (Roo solo text says "sauce big smash", Roo menu text says "smokey Bbq") |
| CHICKEN SPICY | 7.90 | 10.90 | 10.40 | Potato bun, filet de poulet pané maison, feuille de salade, rondelle de tomate, jalapenos, cheddar et sauce Spicy. |
| BIG MOUNTAIN | 8.90 | — | — | Potato Bun, filet de poulet pané maison, oignon confit, raclette, bacon et sauce Ranch. |
| *Big Cheese* (not a solo tile on the site) | — | 10.90 | 10.40 | Roo: "Potato bun, double steak haché smashé, salade iceberg, pickles, oignons blancs, double cheddar et sauce Big Smash" |
| *Grilled Smash* (not solo on the site) | — | 10.90 | — | Roo: "Butter bread toasté, steak haché smashé, cheddar, sauce Big Smash, oignons confit" |
| *Big Italy Beef / Big Italy Chicken* | — | 9.90 / 8.90 | — | see Nouveautés |

Deliveroo sorts these into "SMASH BURGERS 🔥" (beef and fish) and "CHICKEN BURGERS 🍗".

#### Burgers + Frites (Deliveroo only, "BURGERS + FRITES🍔🍟", no drink)
- 10.90: Smash Classic, Smash Spicy, Big Fish, Original Cheeseburger.
- 11.90: Big Smash, Original Chicken, Smash Bacon.
- 13.50: Big Cheese, Big Chicken, Grilled Smash, Chicken Spicy, Surf & Turf.

#### Menus burger (site: 12) — "servi avec frites et boisson"
| Menu | Site | Roo | Deli |
|---|---|---|---|
| MENU SMASH CLASSIC | 9.90 | 12.90 | 11.40 |
| MENU SMASH SPICY | 9.90 | 12.90 | 11.40 |
| MENU ORIGINAL CHEESE | 9.90 | 12.90 ("Menu Original Cheeseburger") | 11.40 |
| MENU BIG FISH | 9.90 | 12.90 | 11.40 |
| MENU ORIGINAL CHICKEN | 9.90 | 13.90 | 12.40 |
| MENU BIG SMASH | 9.90 | 13.90 | 12.40 |
| MENU SMASH BACON | 10.90 | 13.90 | 12.40 |
| MENU BIG CHICKEN | 10.90 | 14.90 | 13.40 |
| MENU CHICKEN SPICY | 9.90 | 14.90 | 13.40 |
| MENU BIG CHEESE | 8.90 (likely wrong) | 14.90 | 13.40 |
| MENU GRILLED SMASH | 8.90 (likely wrong) | 14.90 | — |
| MENU SURF & TURF | 11.90 | 14.90 | 13.40 |
| (MENU BIG MOUNTAIN / MENU TACO SMASH, see Nouveautés) | 11.90 / 10.90 | — | — |
| Menu Big Italy Beef / Chicken | — | 13.90 / 14.90 | — |

Site descriptions of the two menus without a solo tile:
- MENU BIG CHEESE: "Potato bun, double steak haché smashé , oignons frais, pickles, salade, double cheddar et sauce Big Smash servi avec frites et boisson."
- MENU GRILLED SMASH: "Butter bread toasté, steak haché smashé, cheddar, oignons confit et sauce Big Smash servi avec frites et boisson."

Copy error on the site: MENU SMASH SPICY's text describes a "filet de poulet pané maison" [verified].

**Menu contents** [verified]:
- **Site detail pages**: side choice = Frites nature, Frites épicées, Frites cheddar, Frites cheddar bacon, Pops nature, Pops cheddar, Pops cheddar bacon. Drink choice = Thé & Limonade, Coca Cola, Red Bull, Badoit, Evian, Volvic.
- **Deliveroo**: "Choisis tes frites 🍟" (required).
  - Nature +0, Épicées +0.90, Cheddar +1.90, Cheddar Bacon +2.90.
- **Deliveroo**: "Choisis ta boisson 🥤" (required).
  - Coca Cola / Coca Zéro / Fuze Tea Pêche / Badoit / Evian +0.
  - Volvic Fraise / Fruits Exotiques +1.00.
  - Limonades (Lime Watermelon, Blue Mango Passion, Red Cherry, Fizz Yuzu, Della Mamma), Thé Blanc Tropical and Red Bull +1.50.
- **Deliveroo**: "Choisis tes sauces 🥫" (max 2).
  - Mayonnaise / Barbecue / Ketchup / Moutarde US free.
  - Big Smash / Spicy / Ranch / Big Sweety +0.50.

#### Combo (site: 1)
| Item | Site | Roo | Deli | Description |
|---|---|---|---|---|
| BIG COMBO | 14.90 | 19.90 | 17.40 | "C'est l'occasion de te faire plaisir avec deux burgers dans ton menu !" (Roo: "2 Burgers au choix. Servi avec frites et 1 boisson au choix.") |

Burger choices on Deliveroo, "Choisis ton 1er / 2ème Burger":
- +0: Smash Classic, Smash Spicy, Original Cheese, Big Fish.
- +1.50: Original Chicken, Smash Bacon, Big Smash, Big Chicken, Chicken Spicy, Big Italy Beef.
- +2.50: Big Cheese, Surf & Turf, Big Italy Chicken, Grilled Smash.

#### Hot-dogs (site: 4)
| Item | Site | Roo | Deli | Description (site) |
|---|---|---|---|---|
| CLASSIC DOG | 3.90 | 4.90 | 4.90 | Potato bun long, saucisse 100% boeuf, ketchup, moutarde US et oignons frits. |
| SPICY DOG | 3.90 | 4.90 | 4.90 | Potato bun long, saucisse 100% boeuf, jalapenos émincé et sauce Spicy. |
| CHEESY DOG | 4.90 | 5.90 | 5.90 | Potato bun long, saucisse 100% boeuf, sauce cheddar, pickles émincés et oignons frits. |
| BACON DOG | 4.90 | 5.90 | 5.90 | Potato bun long, saucisse 100% boeuf bacon, sauce smokey BBQ et oignons frits. |

#### Menu enfant (site: 1)
| Item | Site | Roo | Deli |
|---|---|---|---|
| BIG KIDS | 6.90 | 8.90 ("Menu Big Kids") | 7.90 |

- **Site**: "Menu enfant 7-11 ans, cheeseburger ou nuggets x5 au choix, frites, dessert au choix, boisson au choix et jouet."
- **Deliveroo**:
  - Plat: Cheeseburger / Nuggets x5 / Grilled Cheese enfant.
  - Frites Enfant.
  - Dessert: Kinder Country / Pom'Potes.
  - Boisson: Evian / Capri-Sun.
  - Jouet: Garçon / Fille.
- **Delicity**: "3-11 ans, Grilled cheese, cheeseburger ou nuggets x5 au choix…".

#### Sides (site: 20)
| Item | Site | Roo | Deli | Description (site) |
|---|---|---|---|---|
| Frites nature | 3.00 | 3.90 ("Frites", choice) | 4.00 ("Frites") | — |
| Frites épicées | 3.50 | 3.90 + 0.90 | (choice) | — |
| Frites cheddar | 4.00 | 3.90 + 1.90 | (choice) | — |
| Frites cheddar bacon | 5.00 | 3.90 + 2.90 | (choice) | — |
| Pops nature | 3.50 | — | 5.50 ("Pops", 3 versions) | Pomme de terre rapées assaisonnées en forme de petite boule. |
| Pops cheddar | 4.50 | — | (choice) | …avec sauce cheddar. |
| Pops cheddar bacon | 5.50 | — | (choice) | …avec sauce cheddar bacon. |
| CHICKEN POP CORN X15 | 5.90 | 8.90 | 7.90 | Morceaux de filet de poulet pané maison. |
| *Chicken Pop-Corn x9* | — | 4.90 | — | idem |
| CHICKEN POP-CORN SPICY | 7.90 | 9.90 (x15) | — | Morceaux de filet de poulet pané maison servi avec sa sauce spicy. |
| NUGGETS | 3.90 | 4.90 (x5; x10 +4.50) | 4.90 | Nuggets de poulet croustillant. |
| TENDERS X4 | 5.90 | 8.90 | 7.90 | Filet de poulet pané maison. |
| CREVETTES PANÉES | 5.90 – 9.90 | 7.50 (x5; x10 +4.90) | 6.90 | Beignets de crevettes décortiquées croustillants servi avec sauce Big Sweety. |
| LITTLE SMASH | 4.00 | 5.90 | 5.90 | Potato bun, steak haché frais et smashé, cheddar, pickles et sauce Big Smash. |
| LITTLE WRAP | 2.95 | 3.90 | 4.95 | Galette garnie de tenders maison, salade, cheddar, oignons frits, avec la sauce de votre choix (Ranch ou Miel-Moutarde). (Roo: Ranch, BBQ ou Spicy) |
| LITTLE WRAP SPICY | 2.95 | (Roo: Little Wrap → "Spicy" option) | — | Galette garnie de cheddar, tenders, salade, jalapenos et sauce Spicy. |
| TACO SMASH | 4.90 | 5.90 | 6.40 | Choisis ton Taco Smash (classique ou épicé). (Roo: "Galettes, salade, tomate et steak façon smash avec notre sauce maison en version classique et épicées!") |
| GRILLED CHEESE | 2.50 | 3.50 | 3.90 | (Roo: "Butter bread toasté, cheddar. Disponible en version bacon") |
| GRILLED CHEESE BACON | 3.50 | 3.50 + 1.40 | (choice) | — |
| BIG SALADE | 9.90 | 12.50 | Big Caesar 11.40 | Salade fraîche, tenders croustillants ou crevettes panées, tomates cerises, copeaux de parmesan, oignons frits et sauce Ranch ou Big Sweety. |
| SAUCES | 0.40 | 0.20 / 0.50 | — | Découvrez nos sauces exclusives Big Smash : Big Smash, Spicy, Ranch et Miel-Moutarde ! |

#### Sauces
- **House sauces** [verified site + Deliveroo + allergen table]: **Big Smash**, **Spicy**, **Ranch**, **Miel-Moutarde**, **Big Sweety** (with shrimp/Surf & Turf), **Smokey BBQ** (Big Chicken, Bacon Dog), **Tartare** (Big Fish), "sauce chicken" (Original Chicken wording on Roo), sauce cheddar / cheddar bacon (fries, pops, Cheesy Dog).
- **Sachets**: Mayonnaise, Ketchup, Moutarde (US), Barbecue.
- **Prices**: site 0.40 € each. Deliveroo extra = 0.50 € (Big Smash, Spicy, Ranch, Big Sweety) and 0.20 € (Mayo, Ketchup, BBQ, Moutarde US). Sides include up to 2 sauces, with house sauces at +0.50.

#### Desserts (site: 3) and Desserts glacés (site: 4)
| Item | Site | Roo | Deli | Description (site) |
|---|---|---|---|---|
| KINDER COUNTRY | 1.00 | (kids menu only) | 2.00 | Chocolat Kinder au cœur au lait fondant et des céréales soufflées croustillantes. |
| KOOL DOG | 3.90 | — | 4.90 | Pain hot-dog, glace vanille avec coulis et topping au choix. |
| GRILLED NUTELLA | 2.50 | 3.50 | 3.90 | Butter bread toasté et garni de Nutella. (Roo: "Pain Brioché toast garni de nutella"; Deli: "Potato bun grillé, garni de Nutella") |
| BIG SUNDAE | 3.50 | 4.50 | 4.50 | Glace vanille avec coulis et topping au choix. |
| BIG SUNDAE PISTACHIO | 3.95 | 4.95 ("Sundae Pistachio") | 4.95 ("Pistachio") | Nappage pistache et éclats de pistache caramélisés. |
| MILKSHAKE | 4.50 | 5.50 | 5.50 | Milkshake avec parfum au choix (caramel, fraise & vanille) et chantilly. |
| MILKSHAKE PISTACHE MACADAMIA | 4.95 | 5.95 | (Pistachio 4.95) | (Roo: "Milkshake pistache macadamia et coulis pistache") |
| *Chunky Cookies®* | — | 4.50 (Matabiau) | — | 4 flavours, see Nouveautés |
| *Cookies Chocolat Noisette* | — | 3.50 (Croix de Pierre, Montpellier) | 3.50 | "Cookie croustillant fourré au chocolat noisette" (Deli) |
| *Beignets Choco Noisette x3* | — | — | 3.90 | "Beignets moelleux au chocolat noisette x3" |
| *Little Sundae* | — | — | 2.90 (unavailable) | — |

Options:
- **Big Sundae and Kool Dog** — Coulis: Speculoos, Caramel, Fraise, Nutella. Topping: Speculoos (Lotus), Oreo, Daim.
- **Milkshake** — saveur: Fraise, Caramel, Vanille. Roo: chantilly +0.70.

#### Boissons (site: 8)
| Item | Site | Roo | Deli |
|---|---|---|---|
| COCA COLA (image "gamme coca": Coca-Cola Goût Original, Sans Sucres, Cherry) | 1.90 | Coca Cola 2.90 · Coca Cola Zéro 2.90 | 2.40 · Zéro 2.40 |
| FUZE TEA PÊCHE | 2.20 | 2.90 | 2.40 |
| BADOIT | 1.90 | 2.50 (50cl) | 2.40 |
| EVIAN | 1.50 | 2.00 (50cl) | 2.00 |
| VOLVIC (Juicy Fraise / Zest Citron in photo) | 2.50 | Volvic Juicy Fraise 50cl 3.20 · Fruits Exotique 50cl 3.20 | 3.00 |
| CAPRI-SUN | 2.00 | 1.50 (20cl) | 1.50 |
| RED BULL | 2.90 | 3.90 ("Redbull Original") | 3.40 |
| THÉ & LIMONADE | 2.90 | 3.90 each | 3.40 each |

The house iced drinks, served in clear BIG cups (site wording) [verified]:
- "Thé Blanc Tropical : Thé blanc, purée d'ananas, pêche, abricot, servi avec glaçons"
- "Limonade Red Cherry : Limonade gazeuse au citron, purée de cerise, servie avec glaçons"
- "Limonade Fizz Yuzu : Limonade gazeuse au citron, purée de yuzu, servie avec glaçons"
- "Limonade Blue Mango Passion : Limonade gazeuse, purée mangue-passion et sirop passion bleue, servie avec glaçons"
- "Limonade Lime Watermelon : Limonade gazeuse, sirop pastèque et citron vert, servie avec glaçons"
- Deliveroo adds the limited **Limonade DELLA MAMMA** (citron, ube, ananas). The homepage slider also shows a "Red Berry" cup [verified, image].

**Drinks brand: The Coca-Cola Company** (Coca-Cola, Coca-Cola Zéro / Sans sucres, Cherry, Fuze Tea). **No Pepsi** anywhere [verified].

#### Item counts and price ranges
| Category | Site tiles | Site price range | Deliveroo Matabiau items | Deliveroo range |
|---|---|---|---|---|
| Nouveautés | 6 | 5.90–11.90 | 4 | 3.90–14.90 |
| Burgers (seul) | 11 | 6.90–8.90 | 13 (9 "Smash" + 4 "Chicken") | 8.90–10.90 |
| Burgers + Frites | — | — | 12 | 10.90–13.50 |
| Menus burger | 12 | 8.90–11.90 | 12 | 12.90–14.90 |
| Combo | 1 | 14.90 | 1 | 19.90 |
| Hot-dogs | 4 | 3.90–4.90 | 4 | 4.90–5.90 |
| Menu enfant | 1 | 6.90 | 1 | 8.90 |
| Sides | 20 | 2.50–9.90 (sauce 0.40) | 12 | 3.50–12.50 |
| Desserts | 3 | 1.00–3.90 | 3 | 3.50–4.95 |
| Desserts glacés / Milkshakes | 4 | 3.50–4.95 | 2 | 5.50–5.95 |
| Boissons | 8 | 1.50–2.90 | 14 | 1.50–3.90 |
| **Total** | **70** (64 unique) | | **78** | |

### 2.3 Options and supplements (Deliveroo Matabiau, delivery prices) [verified]
- **Steaks** (solo beef burgers, "Combien de steaks souhaites-tu ?"): Simple +0, **Double +2.50**, **Triple +4.00**. Big Cheese: Double +0, Triple +2.50.
- **In menus and burger + frites**: "Tu souhaites un supplément ?" Cheddar +1.50 (Big Cheese +1.00), **Supplément steak +2.90**.
- **Veggie option**: "Option veggie (supplément steak non disponible)" +1.50 in menus, +1.00 in burger + frites. The site FAQ says there is a choice between "steak veggie" and "poulet veggie" on most recipes.
- Cheddar supplement on solo burgers: +1.50.
- "Petite douceur 🍭 ?" upsell on burger + frites: Grilled Nutella +3.50, Big Sundae +4.50, Milkshake +5.90.
- **Removals are free** ("On enlève quelque chose ?"): sans cheddar / pickles / salade / tomates / sauce / oignons / jalapenos / bacon / oignons confits / mozzarella / pesto / roquette. The site FAQ says: "Nous ne changeons pas les recettes de nos burgers, mais nous pouvons retirer les ingrédients de votre choix."
- **Side quantities**: Nuggets x5 / x10 (+4.50), Crevettes x5 / x10 (+4.90), Grilled Cheese bacon +1.40, Little Wrap BBQ / Ranch / Spicy, Taco Smash Classic / Spicy.
- **Big Salade**: base Poulet / Crevettes / Option veggie; sauce Ranch / Big Sweety / Sans.

### 2.4 Allergens, halal, origin [verified, site FAQ + PDF + PNG]

- **Halal**: "Oui, toutes nos viandes sont certifiées AVS et Achahada." Deliveroo tags every store "Halal", and doors carry a HALAL sticker.
- **Meat origin** (`origine-des-viandes.png`):

| Produit | Origine / élevage / abattage |
|---|---|
| Filet de poulet | Pologne / Pologne / Pologne |
| Steak de boeuf | Pologne / Pologne / Pologne |
| Nugget de poulet | UE / UE / UE |
| Bacon de boeuf | UE / UE / UE |
| Saucisse de boeuf | Pologne / Pologne / Pologne |
| Filet de colin | Océan Pacifique |
| Crevette | Indonésie |

- **Allergen table** (`assets/docs/tableau-allergenes.pdf`, 3 pages, transcribed). X = contient, 0 = traces. No item lists Arachide, Lupin, Mollusques or Crustacé (sic, even for shrimp, which are absent from the table).

| Plat | Fruit à coque | Gluten | Moutarde | Oeuf | Céleri | Soja | Poisson | Lait | Sésame | Sulfite |
|---|---|---|---|---|---|---|---|---|---|---|
| Smash Classic | | X | X | X | | 0 | | X | X | X |
| Smash Spicy | | X | X | | | X | | X | X | |
| Smash Bacon | | X | X | X | | 0 | | X | X | X |
| Original Cheese | | X | 0 | | | 0 | | X | X | |
| Big Smash | | X | X | X | | 0 | | X | X | X |
| Original Chicken | | X | 0 | X | X | | | X | X | 0 |
| Big Chicken | | X | 0 | 0 | X | | | X | X | X |
| Chicken Spicy | | X | X | 0 | X | X | | X | X | 0 |
| Big Fish | | X | X | | X | X | X | X | X | X |
| Cheesburger | | X | 0 | | | 0 | | X | X | |
| Taco Smash Spicy | | 0 | X | | | X | | X | | |
| Taco Smash Classic | | 0 | X | X | | 0 | | X | | X |
| Bacon Dog | | X | 0 | | 0 | X | | X | X | |
| Classic Dog | | X | X | | 0 | X | | X | X | |
| Spicy Dog | | X | X | | 0 | X | | X | X | |
| Cheesy Dog | | X | 0 | | 0 | X | | X | X | X |
| Frites | | | | | | | | | | |
| Frites cheddar / cheddar bacon | | | | | | | | X | | |
| Pops | | 0 | | | | | | 0 | | |
| Pops cheddar / cheddar bacon | | 0 | | | | | | X | | |
| Little Smash | | X | X | X | | 0 | | X | X | X |
| Grilled Cheese / Grilled Cheese bacon | | X | | | | | | X | X | |
| Nuggets | | X | 0 | 0 | X | 0 | | 0 | | |
| Tenders | | X | 0 | 0 | X | | | 0 | | 0 |
| Wrap Ranch | | X | 0 | X | X | | | X | | 0 |
| Wrap Miel Moutarde | | X | X | 0 | X | | | X | | 0 |
| Sauce Big Smash | | 0 | X | X | | 0 | | | | X |
| Sauce Spicy | | | X | | | X | | | | |
| Sauce Ranch | | | | X | | X | | X | | |
| Sauce Miel Moutarde | | | X | | | | | | | |
| Sauce Big Sweety | | | X | X | | | | | | X |
| Sachet mayonnaise | | X (as printed) | | X | | | | | | |
| Sachet ketchup | | | | | X | | | | | |
| Sachet moutarde | | | X | | | | | | | |
| Sachet barbecue | | | | | | | | | | |
| Sundae / Milkshake / Crème chantilly / Coulis caramel | | | | | | | | X | | |
| Grilled Nutella / Kool Dog | X | X | | | | X | | X | X | |
| Cookies / Beignets chocolat noisette | X | X | | | | X | | X | | |
| Kinder Country / Nutella | X | | | | | X | | X | | |
| Compote pomme / Coulis fraise | | | | | | | | | | |
| Coulis speculoos / Biscuit Speculoos | | X | | | | X | | | | |
| Biscuit Daim | | | | | | 0 | | X | | |
| Biscuit Oréo | | X | | | | X | | 0 | | |
| Steak Veggie | | 0 | | | | 0 | | | 0 | |
| Poulet Veggie | | X | | | | 0 | | 0 | 0 | |

(Columns Arachide, Lupin, Mollusques and Crustacé are empty for every row and are omitted. Deliveroo shows only "Veuillez contacter le restaurant" for allergens.)

### 2.5 Differences between restaurants [verified on Deliveroo for Matabiau, Croix de Pierre, Montpellier; Delicity for Montpellier]
- **Deliveroo prices are identical across restaurants.** The network uses one delivery price list.
- Matabiau sells **Chunky Cookies®** 4.50; Croix de Pierre and Montpellier sell **Cookies Chocolat Noisette** 3.50 instead.
- Montpellier's Delicity carte has its own extras (Big Shrimp salad, Beignets choco noisette, Little Sundae, Pops). It lacks the Big Italy items and lists Kids "3-11 ans".
- Fenouillet and Lyon are co-branded "Big Smash x New School" in the POS (likely tacos also sold there) [claim, POS names].
- Hours differ: see the homepage. Fenouillet stays open to 02:00 Thursday–Saturday; Échirolles to 01:00 on weekends.

---

## 3. Best demo identity: **Big Smash Toulouse – Matabiau**

Why this one:
- It is the **first restaurant** ("2021 : Lancement du premier restaurant Big Smash à Toulouse Matabiau", /franchise).
- It is in the HQ city, next to Gare Matabiau.
- Its address is printed on the official bag mock-up on the homepage.
- It has the **highest Google review volume** in the network: 4.6 ★, 2 381 avis.
- The website calls it **"Toulouse Bayard"**, while Google, Deliveroo, Uber Eats and the POS call it "Matabiau". Use "Toulouse Matabiau" with the "68 rue de Bayard" address.

| Field | Value |
|---|---|
| Name (Google) | Big Smash Toulouse - Matabiau [verified] |
| Address | 68 Rue de Bayard, 31000 Toulouse ("Situé dans : Hôtel aux Ambassadeurs") [verified, Google Maps] |
| Coordinates / Plus code | 43.6107748, 1.4515807 · JF62+8J Toulouse [verified] |
| Phone | **None published.** Google shows "Ajouter le numéro de téléphone", the POS stores "0", PagesJaunes has none [verified]. Nearest public numbers: Montpellier 04 67 27 98 77 (Delicity) or `sav@bigsmash.fr` |
| Hours | Lundi–Jeudi 11:00–23:00 · Vendredi 11:00–00:30 · Samedi 11:00–00:30 · Dimanche 12:00–23:00 [verified: homepage "Toulouse Bayard", matches 6X POS data and Google "Ferme à 00:30" on Saturday] |
| Google rating | **4.6 / 5, 2 381 avis** [verified, Google Maps, 2026-10-03]. Aggregators lag: Restaurant Guru 4.6 / 2 368, an older snippet 1 837 |
| Deliveroo rating | 4.4 "Très bien", 500+ avis [verified] |
| Uber Eats rating | 4.4 [unverified, search snippet] |
| Google Maps link | https://www.google.com/maps/place/?q=place_id:ChIJR1vj4XS9rhIR7_SQAWKbs6c (CID link: https://maps.google.com/?cid=12084173070400550127) |
| Services | Sur place, à emporter, Click & Collect (shop.bigsmash.fr/toulouse-matabiau), Deliveroo, Uber Eats. Site icons: wifi, accès handicapé, livraison, climatisation, terrasse |
| Look | Brick-arch Toulouse façade, two black fascias (white wordmark plus a "SMASH BURGER · ORIGINAL HOT-DOG · MILKSHAKE" tagline fascia), red chairs on the terrace, red interior (`gmaps-matabiau-*.jpg`) |

**Fallback**: Montpellier (121 av. de Palavas, 34000). It has a public phone and its own Delicity ordering site, but fewer reviews (Delicity shows 4.7 / 1 822; Deliveroo 4.3 / 153).

---

## 4. Assets (see `assets/big-smash/sources.json` for URL, page, pixel size and content of each file)

- **Brand (26 files)**:
  - Logos: `logo-horizontal-blanc.svg` (official), plus derived `logo-horizontal-rouge-DERIVED.svg` and 2400 px PNGs.
  - Monogram: `badge-logo.svg` (official), plus derived red SVG and 1024 PNG.
  - Icons: `webclip-app-icon.png` 256², `favicon.png` 32².
  - `og-image-rouge.jpg` 1200×630.
  - 4 brush patterns, 2 rotating badges, Click & Collect and burger icons.
  - 4 lifestyle photos (1066–1711 px wide).
  - 2 hero sliders 2500×1357.
  - `origine-des-viandes.png` 2000×1414.
  - `vendor-6xpos-logo.webp` (vendor, not brand).
- **bigsmash.fr product photos (74 WebP, transparent)**: every carte tile, the coulis and topping options, and drinks. Sizes: burgers 1000×666; menus, combo and kids 817×480; sides and desserts 600–1549 px.
- **Deliveroo product photos (78 JPG, white background, in `deliveroo/`)**: includes Big Italy Beef/Chicken, Chunky Cookies, Limonade Della Mamma, burger + frites shots, and `store-header-banner-matabiau.jpg` 1920×1279.
- **Storefronts (9, `storefronts/`)**: every restaurant's photo from the POS. Up to 3213×5712; Matabiau is only 199×265.
- **Google Maps (6, `gmaps-*`)**: Matabiau terrace 1200×1600, street view, interior counter, tray, Big Spicy and Big Chicken posters. These are reference only; customer photos must not be published.
- **Instagram (6, `instagram/`)**: 360–518 × 640 thumbnails of recent posters and posts.
- **Docs**: `carte-2026-10-03.html`, `home-…`, `franchise-…`, `equipe-…`, `webflow-shared.css`, `tableau-allergenes.pdf`, `shop-matabiau-…html`, `shop-points-de-vente-…html` (POS data for all 10 centres), `deliveroo-matabiau-2026-10-03-extract.json`. The two `*-BLOCKED-challenge*.html` files are the Cloudflare pages curl received.

## 5. Gaps
- **Uber Eats**: not read. reCAPTCHA in the browser, 403 for curl and WebFetch; not bypassed. Only search-snippet prices and rating.
- **True in-store prices**: unconfirmed. The site's prices are hidden and partly inconsistent. Click & collect prices would need a sale-mode form submission, which was not done.
- **restaurants.bigsmash.fr** (per-restaurant SEO pages) fails the TLS handshake (`SSLV3_ALERT_HANDSHAKE_FAILURE`), so it was not read.
- No press articles with interior photos were found. Interior evidence comes from Google Maps, Instagram and the brand's own photos.
- No official high-resolution vector of the extruded-block lockup or the hand-drawn heart sticker. They only appear inside raster images.
- No public phone number for Matabiau.
