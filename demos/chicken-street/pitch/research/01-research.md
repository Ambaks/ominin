# Chicken Street — research for Ominin head-office pitch (as of 2026-10-06)

Tags: [verified] read on a primary source (URL given) · [claim] company says it about itself · [inferred] my calculation · [unverified] third-party or not confirmed.
All raw material is in this folder: `homepage.html`, `css/`, `pages/`, `pdf/` (franchise brochure 2026 + allergen sheet), `reviews/*.json` (750 Google reviews), `assets/`, `menu.json`, `locator-restaurants.json`.

## Key points for the pitch

1. **Size**: ~118 restaurants in 8+ countries per their own Oct 2026 posts, ~108 in France on their store locator; "37 openings to come" [claim, Instagram feed on https://restaurants.chickenstreet.fr/burger-avignon-cap-sud/]. Brochure 2026: 100 restaurants in 2025, target >130 in 2026, 20-25 openings per year [claim, brochure p.4 and p.8].
2. **Money per site**: 1.1 M EUR average revenue per restaurant, 5 M orders/year, >110 M EUR network revenue in 2025 [claim, brochure 2026 p.6]. [inferred] ~22 EUR average ticket and ~137 orders/day/restaurant (50k orders/yr).
3. **Franchise model**: 5 % royalty + 2 % marketing on revenue, 25 k EUR entry fee [claim, brochure]. Every restaurant is its own legal entity (franchisee SAS) [verified, registry search]. So a network-wide tool is a franchisor choice that each franchisee pays for: the "3 % of online orders, no monthly fee" angle fits, a per-site monthly fee is a harder sell.
4. **They already sell "order on your phone": on WhatsApp.** Site-wide "Commander" button, in-store poster with QR "Scannez pour commander", -25 % on first order, via Chataigne (AI WhatsApp ordering) [verified, homepage + `assets/promo/borne-16-9.jpg`]. Direct competitor to a QR order flow; there is no ticket number, no kitchen print story in what they show.
5. **Fragmented stack today**: kiosks (bornes) in at least some restaurants, own app by DISHOP (click & collect + delivery, 4.3 stars / 427 ratings), a second click & collect marketplace page on Borneo (45 restaurants), Uber Eats, Deliveroo, WhatsApp. Five channels, no sign of one network dashboard [verified/inferred, see Ordering].
6. **Order numbers already exist** ("Commande 193" in a Lille review) and kiosks print/show them; the pitch is not "numbered ticket" itself but "same ticket for scan-and-pay at the table/queue, no kiosk hardware, kitchen printed, status screen".
7. **Pain is queue + errors, visible in reviews**: 750 Google reviews sampled over 5 restaurants: 66 % five stars, 19 % one star. Among the 168 one/two-star reviews: 27 cite waiting (20 to 50 min quoted), 27 missing/wrong items, 18 Uber Eats/Deliveroo, 29 cold/raw/dry food (some overlap). Wait mentions peak at Lille Flandres (27 of 150); one-star share peaks at La Chapelle (51 of 150) and Ivry (45).
8. **Ratings spread across sites = consistency story**: Gare de l'Est 4.6 (1 097) vs Ivry 3.9 (949) vs La Chapelle 4.0 (409); Tripadvisor has Paris 18 at 1.0/5 [unverified, search snippet]. Head-office single screen answers "which site is slow".
9. **Brand is loud and young** (yellow #FCD403 / black, WoodHeinz condensed display font, streetwear, influencers, esport, rap, halal). A white-label menu must be dark/yellow, big type, humour.
10. **Menu is simple and photo-led** (11 naans, ~10 chicken boxes, ~8 burgers/wraps, kids, desserts, sauces, supplements): easy to model, but the official site shows no prices and is stale (2021-24 photos) while the real range moved on (Ritchie Box, Naan Fury, bowls...). Prices only from a third-party aggregator.
11. **Drinks: Coca-Cola range** per third-party menu list (no Pepsi brands) and customers mention "coca cherry" [unverified, see Drinks].
12. **Franchise tech is a selling point for them**: brochure lists "Application mobile", loyalty programmes, kiosk training for staff, mystery shoppers and audits [claim]. A network screen fits their "reportings et plans d'action" claim.

## Network

**Count and geography**
- Homepage: "+ de 100 restaurants" with FRANCE, BELGIQUE, ALGÉRIE, MAROC, "ET BIENTÔT" SÉNÉGAL, DUBAÏ [verified, https://www.chickenstreet.fr/ — stale, Dakar and Dubai already listed on locator].
- Instagram blurbs (Oct 2026): "+118 restaurants en France, Algérie, Maroc, Tunisie, Dubaï, La Réunion, Canada, Sénégal", next "Nouvelle Calédonie, Arabie Saoudite, île Maurice", "37 ouvertures à venir" [claim, https://restaurants.chickenstreet.fr/burger-avignon-cap-sud/ feed, posts dated 3 and 10 Oct 2026].
- Store locator https://restaurants.chickenstreet.fr/ lists **117 entries** [verified, rendered page 2026-10-06; `locator-restaurants.json`]: 108 in France, plus Charleroi (Belgium), Marrakech, Dakar x2, Dubai, Algeria x4 (Alger, Oran x2, Mostaganem). Canada, Tunisia, Réunion are claimed but not on the locator.
- Brochure 2026 map (p.6): 100+ in France; abroad: Algeria 5, Canada 3, Tunisia 2, Dubai 1, Réunion 1, Morocco 1*, Senegal 1, Saudi Arabia 1*, New Caledonia 1* (* in opening) [claim, `pdf/plaquette-2026.pdf`].
- Heavy Île-de-France (Paris 11/18/19/Châtelet/Gare de l'Est/Av. de Clichy, 93, 94, 92, 91, 95, 77, 78) then Lyon area (Lyon 1er, Villeurbanne, Vénissieux, Vaulx-en-Velin, Saint-Priest, Villefranche, Vienne), Marseille (3), Nord (Lille x2, Lens, Douai, Roubaix, Arras), Avignon x2, Nice x2, Bordeaux x2, Nantes x2, Dijon x2, Strasbourg, Metz, Nancy, Mulhouse, Toulouse, Montpellier, Nîmes, Perpignan, Poitiers, Tours, Orléans, Reims, Troyes, Caen, Le Havre, Rouen, Angers, Le Mans, Vannes, La Roche-sur-Yon, Annecy, Annemasse, Grenoble-Échirolles, Valence, Montélimar, Saint-Étienne, Mâcon, Chalon, Bourg-en-Bresse, Besançon, Belfort, Sens, Montargis, Creil, Cergy, Persan, Melun, Meaux, Bussy-Saint-Georges, Corbeil, Évry, Plaisir, Montigny-le-Bretonneux. Full list with addresses: `locator-restaurants.json`.
- Recent openings on homepage: Avignon Cap Sud, Champs-sur-Marne, Besançon; Porte de Montreuil inaugurated 2026-10-03, Corbeil-Essonnes 2026-10-10 [verified, restaurant page feed].

**History** (brochure 2026 p.3 [claim])
- 2011 first restaurant Ivry-sur-Seine (94); franchise launched 2018 (brochure 2025 said 2018, 2026 timeline shows 2014/2018 entries; trade press says 2017/2018); restaurants: 1 (2011), 4 (2014), 16 (2020), 32 (2021), 56 (2022), 70 (2023), 85 (2024), 100 (2025).
- 2023 first drive (Le Pontet, Avignon); 2024 second drive (Marseille Plombières), "Franchise de l'année 2024", CS Coffee (Plaisir) and CS Original (Oberkampf, fried chicken only, small format); Ritchie Box launched (600 000 boxes sold in 3 months [claim]).
- Formats: standard restaurant (min 100 m2), drive, CS Coffee, CS Original.

**Franchise terms** (brochure 2026 p.10 [claim], https://www.chickenstreet.fr/wp-content/uploads/2026/03/PLAQUETTE-CHICKEN-STREET-v.2026_web.pdf)
- Contract 7 years. Entry fee 25 000 EUR HT; initial training + opening assistance 10 000 EUR HT.
- Royalty 5 % of revenue HT; marketing fund 2 %.
- Total investment 1 500 to 2 200 EUR HT per m2 turnkey, excluding real estate; min 100 m2; extraction min 400 mm; facade >5 m. Older third-party figure: from 350 000 EUR total, 80 000 EUR personal contribution [unverified, toute-la-franchise.com].
- Training 6-8 weeks; modules include "Comptoir, bornes et gestion de la livraison à domicile". Mystery shoppers, food-safety audits, national convention.
- Revenue: 1.1 M EUR average per restaurant (brochure); "1 300 000 EUR potential after 2 years" (toute-la-franchise.com [claim]); 2023: 4 M customers, 75 M EUR [unverified].
- Marketing claims: 850 K followers (brochure; older 450-500 K in press), TV/radio (RMC Sport, Canal+), influencers, esport (partner of Naza's team), PSG-Monaco LED boards.
- Awards: Franchise of the year 2024 [claim].

**Franchisor and people**
- Site publisher: **CS DEVELOPPEMENT**, SIRET 83486990100035, 13 Av. de la Métallurgie 93210 Saint-Denis; "Directeur de publication: M Hachemi AMAR" [verified, https://www.chickenstreet.fr/mentions-legales/].
- Registry (official open data, https://recherche-entreprises.api.gouv.fr/search?q=834869901): CS DEVELOPPEMENT, SAS, SIREN 834869901, created 2018-01-16, NAF 70.22Z (business consulting, i.e. franchisor/holding), 20-49 employees band, Saint-Denis. Président: Jonathan Charles Marc-Antoine RENUCCI (b. 1979). Directeur général délégué: Papa Sidy BA (b. 1984). 2024 net result +2 162 956 EUR, revenue not published [verified, registry].
- Trade press names the founder as "Sufyan Renucci, Founder and Associate Director" [claim, https://ac-franchise.com/article/la-franchise-chicken-street-poursuit-son-developpement-hors-de-lhexagone]. I could not confirm that this is the same person as the registry's Jonathan Renucci, and Hachemi Amar's role is unexplained. Do not address anyone by name in the pitch without checking.
- Franchise development contacts in the brochure: Yannis Brignone (développeur de la franchise), Sabah Belabbes (chargée de développement) [claim, brochure p.11]. Phone numbers are in `pdf/plaquette-2026.txt`.
- HQ: Saint-Denis (93) per legal notices; brand born in Ivry-sur-Seine.
- Group: none found. Individual restaurants are separate SAS owned by franchisees (e.g. CS Argenteuil, CS Nancy, Chicken Street Strasbourg SAS), some via investment holdings (AIM INVESTMENT, GROUP INVEST) [verified, registry search "chicken street"]. [inferred] multi-unit franchisees exist.
- Web agency: Digital DG (Argenteuil). Site: WordPress + Elementor + WooCommerce (a streetwear shop "boutique work in progress").

## Ordering today

| Channel | Evidence | Tag |
|---|---|---|
| **WhatsApp ordering (Chataigne)** | "Commander" floating button on every page → go.chataigne.ai/a/infaxz → wa.me/33629292828 ("Bonjour ! Je voudrais commander"); popup on 2026-07-14 "Commandez votre commande en quelques clics", -25 % first order; in-store poster 1440x2560 titled "borne 16 9" with QR "Scannez pour commander" | [verified] `assets/promo-2026-07.jpeg`, `assets/promo/borne-16-9.jpg`. Chataigne is a Swiss AI WhatsApp-ordering startup [claim, trendwatching.com]. One number for the brand (central), restaurant selection happens in chat [inferred] |
| **Kiosks (bornes)** | Brochure training module "Comptoir, bornes..."; Google reviews: Lille Flandres "assez de bornes pour commander", another 1-star "paiement en borne n'est pas disponible"; Marseille Belsunce "m'aider avec la borne". Vendor not visible | [verified] brochure p.9; reviews in `reviews/`. Not every site has them [inferred] |
| **Click & collect marketplace** | Site button → https://borneoapp.com/cie/ChickenStreet (Borneo web app, Firebase "unified-order"): 45 restaurants listed; at snapshot 19 open, 11 closed, **15 "Indisp. (temporairement indisponible)"**; header text stale ("+60 adresses") | [verified] rendered 2026-10-06 ~23:55 Paris, `pages/borneo-rendered.txt`, `assets/borneo-clickcollect.png` |
| **Own app** | iOS/Android "Chicken Street France", seller DISHOP (dishop.co), bundle com.dishop.chickenstreet, live since 2022-07-25, v2.8.0 (2025-08-05), 4.31 / 427 ratings; click & collect, delivery, live order tracking, saved card | [verified] iTunes lookup id1635374624, Play id com.dishop.chickenstreet. (DISHOP also publishes "Chicken Drive France" and "Chicken Addict": different chicken brands, not confirmed linked) |
| **Loyalty** | Brochure lists "Programmes de fidélité, Application mobile"; no details found on site/app description | [claim] |
| **Delivery** | Uber Eats and Deliveroo logos on every menu page, referral codes (Deliveroo 10 EUR, Uber Eats 20 EUR) in site feed; many reviews of incomplete Uber Eats orders | [verified] |
| **Table/QR ordering** | None seen except the WhatsApp QR poster | [verified absence on site] |
| **Payment at venue** | Card, cash, meal vouchers (restaurant page) | [verified] https://restaurants.chickenstreet.fr/burger-avignon-cap-sud/ |
| **POS / kiosk vendor** | Not visible. A "myli.io" widget loads on restaurant pages (unidentified, likely reviews/loyalty widget) | [unverified] |
| **Order numbers** | Review "Commande 193" at Lille Flandres | [verified] reviews |

Takeaway: ordering is multi-vendor and franchisee-driven (DISHOP app, Borneo, Chataigne, kiosks, aggregators); no single owner of the order flow or a network view [inferred].

## Drinks partner

- Third-party menu (https://fastfoodsmenu.com/prix-menu-chicken-street-france/, dated 2026-03-08) lists: Coca-Cola (Cherry, Vanille, Zero), Sprite, Fanta, Fuze Tea, Oasis, Orangina, Schweppes, Perrier, Cristaline. No Pepsi brands. [unverified, aggregator]
- Google reviews mention "coca cherry" bottles/cans at Lille Flandres, La Chapelle (3 reviews) [verified in reviews]. Fuze Tea, Sprite, Fanta, Oasis are Coca-Cola Company brands (general knowledge); Orangina/Schweppes are Suntory brands distributed in France.
- Conclusion: **Coca-Cola range, likely partner; not confirmed from a menu board or contract.** The official website menu shows no drinks. Do not state it as fact in the pitch.

## Reviews evidence

Source: Google Maps, 5 restaurants, ~150 most recent reviews each (n=750, 531 with text), read 2026-10-07 (`reviews/*.json`).

| Restaurant | Google rating (count) | 1-star in sample of 150 | Wait mentions in sample |
|---|---|---|---|
| Gare de l'Est (Paris 10) | 4.6 (1 097) | 4 | 15 |
| Marseille Belsunce | 4.3 (1 375) | 18 | 16 |
| Lille Gare Flandres | 4.3 (186) | 21 | 27 |
| Paris 18 La Chapelle | 4.0 (409) | 51 | 17 |
| Ivry-sur-Seine (original) | 3.9 (949) | 45 | 19 |

Sample distribution: 5★ 497 (66 %), 4★ 55, 3★ 30, 2★ 29, 1★ 139 (19 %). Biased to recent reviews and to 5 sites, not a network average. Other aggregates: Google 4.0 (915) shown for Ivry on Wanderlog (older snapshot); Custplace Roubaix 3.9 (100) with AI summary "temps d'attente trop longs, erreurs de commande" [unverified, https://fr.custplace.com/chicken-street-roubaix-naan-fried-chicken-156904].

Among the 168 one/two-star reviews (keyword count, overlaps possible): waiting 27, missing/wrong items 27, Uber Eats/Deliveroo 18, cold/raw/dry 29, hygiene 20, staff attitude 26. Eleven reviews quote a wait of 20 to 50 minutes.

Short snippets (Google reviews):
- "Service hyper long, j'ai attendu 50min alors que j'étais dans les premiers à commander, service désordonné." (Lille Flandres, 1★)
- "attendu 30 min pour trois articles" (Lille Flandres, 2★); "Attente très longue pour une ritchie box (20mn)" (Lille Flandres, 1★)
- "à chaques fois j'attends mes commandes pendant beaucoup trop longtemps" (Lille Flandres, 3★)
- "50min d'attente pour un menu plus jamais" (Ivry, 1★); "40 min d'attente" (Marseille Belsunce, 1★)
- "Il serait bien de vérifier les livraisons Uber eats avant de les envoyer. Il manquait la moitié de mon menu" (Ivry, 2★)
- "Je n'ai reçu que la moitié de ce que j'avais payé... plus de vérification avant d'envoyer les commandes." (Ivry, 1★)
- "Les commandes Uber Eats sont toujours incomplètes, le personnel envoie les commandes sans vérifier" (La Chapelle, 1★)
- "la moitié de ma commande n'a pas été effectuée et ils ont oublié plein de choses" (Lille Flandres, 1★, takeaway)
- "Il y a assez de bornes pour commander, donc c'est pratique." (Lille Flandres, 5★); "Le paiement en borne n'est pas disponible (pas précisé)." (Lille Flandres, 1★)
- "l'attente est très raisonnable même quand il y a du monde" (Marseille Belsunce, 5★), proof that speed varies by site.
- Positive: staff friendliness is cited by name in many 5★ reviews (service is a strength; the problem is throughput and checking).

## Brand

- **Colours** (from Elementor CSS, `css/`): yellow **#FCD403** (51 uses; yellow buttons with black text), black **#000000**, white **#FFFFFF**; minor: #F4D905, #EDEDED, #AFAFAF, #FFBC7D. Posters add dark charcoal map-pattern backgrounds and a green WhatsApp accent only in the WhatsApp promo. [verified]
- **Fonts**: **WoodHeinzNo2-New** (headings, buttons, nav), WoodHeinzNo2-Regular, WoodHeinzNo2-DecoCapsNew: custom TTFs self-hosted (`assets/fonts/`, from https://www.chickenstreet.fr/wp-content/uploads/2021/12/); body Open Sans; Roboto / Roboto Slab loaded via Google Fonts (minor). Posters use a condensed heavy italic sans (not WoodHeinz). Licence of WoodHeinz unknown: do not ship the TTFs without checking.
- **Slogan**: "La Street, c'est chic !" (also "La faim n'attend pas !", "Pour toutes les faims", "Naan & Fried Chicken, la référence depuis 2011"). Emblem: circular stamp "NAAN & FRIED CHICKEN – LA STREET C'EST CHIC" around CHICKEN STREET with yellow horizontal bars.
- **Tone**: street/streetwear, humour and emoji, tutoiement, football/rap/esport influencers, solidarity actions, "halal" as explicit positioning.
- **Logo files**: no SVG published. `assets/logo.png` (3164x822 RGBA, https://www.chickenstreet.fr/wp-content/uploads/2021/12/LOGO_CS_HALO.png), favicon 512 and 192 px (`assets/favicon-*.png`, from cropped-favicon_chicken_street.png). Circular emblem only visible in posters (`assets/promo/`). Packaging: yellow paper bag, black box with yellow stripes.
- Photography: studio cut-outs on transparent PNG, 300x300 (burgers, boxes) or 800x600 (naans): 39 photos in `assets/products/`; low resolution for hero use.

## Gaps / not found
- No Google rating for the whole chain (per-site only); Trustpilot not found; Tripadvisor blocked.
- No kiosk vendor, no POS vendor, no loyalty mechanics, no numbers on app downloads.
- Official menu prices and product descriptions do not exist on the website; the allergen PDF (2026-08-27) is the most current list of products and options.

## Correction (2026-10-07, strict recount)

The keyword counts above ("waiting 27", "missing/wrong items 27" among the 168 one/two-star reviews) are loose: they overlap and catch unrelated phrases. A strict recount finds about 6 reviews quoting an explicit wait of 20 to 50 minutes (Ivry, Lille Flandres), and the wrong/missing-item reviews are mostly Uber Eats / Deliveroo deliveries. The pitch therefore cites quotes, not these percentages.
