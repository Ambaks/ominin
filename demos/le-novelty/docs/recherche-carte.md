# Le Novelty — carte transcribed from the pages themselves (2026-10-14)

## Sources (all opened directly on 2026-10-14)

- **S1 = https://lenovelty-montpellier.fr/** — one-page site (Netlify, footer « © 2025 Le Novelty Bar »).
  Raw HTML: `raw/home.html`; extracted text: `raw/home.txt`. Tabs « Cocktails · Bières · Softs & Cafés · Restauration »
  are all in the HTML (switched by JS), so every line below from S1 is **verbatim from the HTML**.
  No date on the page.
- **S1-tapas = https://lenovelty-montpellier.fr/img3.png** — the « Restauration » tab shows this image
  (alt « Carte Tapas Le Novelty ») above the « La suite arrive bientôt ! » notice. Saved as
  `carte-tapas.jpg` (1037×1517). Read visually from the image (crops in `crops/t1–t3.png`); all text legible.
- **S1-HH = https://lenovelty-montpellier.fr/img2.png** — Happy Hour poster in the « Happy Hours » section.
  Saved as `happy-hour-affiche.jpg`. Read visually (crop `crops/h1.png`).
- **S1-goûter = https://lenovelty-montpellier.fr/img4.png** — « Formule Goûter » card on the site is only this
  image. Saved as `formule-gouter.jpg`. Read visually.
- S2 Privateaser (`raw/privateaser.html`), S3 Schlouk Map (`raw/schlouk.html`) — third-party, see end.

Capitals: the site HTML is in title case (kept as printed). The image cartes are in ALL CAPS; normalised to
sentence case below and marked so. Prices kept as printed (« 9€ », « 3,60€ »).
Alcoholic = 🍸 (all cocktails except the « Sans Alcool » block, beers except 1664 0°, cidre, Irish/French coffee, wines, punch/sangria).

---

## COCKTAILS (S1, verbatim) 🍸

Every line except Ti-Punch ends with « · XXL +3€ » in the description. **Ti-Punch has no XXL mention** (confirmed in HTML).

| Name (as printed) | Description (verbatim, the « · XXL +3€ » suffix removed here) | Price |
|---|---|---|
| Mojito | Mangue, fraise, framboise, passion ou pêche, rhum Bacardi Carta Oro, citron vert, cassonade, menthe fraîche, limonade | 9€ |
| Cuba Libre | Rhum Bacardi Carta Oro, citron vert, Coca Cola | 9€ |
| Ti-Punch | Rhum Bacardi Carta Oro, cassonade, citron vert *(no XXL)* | 9€ |
| Caïpirinha | Mangue, fraise, framboise, passion ou pêche, Cachaça Aguacana, cassonade, citron vert | 9€ |
| Caïpiroska | Mangue, fraise, framboise, passion ou pêche, vodka Eristoff, cassonade, citron vert | 9€ |
| Cosmopolitan | Vodka Eristoff, liqueur d'orange, citron vert, cranberry | 9€ |
| Daïquiri | Mangue, fraise, framboise, passion ou pêche, rhum Bacardi Carta Oro, sucre de canne, citron vert | 9€ |
| Gin Tonic | Gin, Schweppes tonic, citron vert | 9€ |
| Planteur | Rhum Bacardi Carta Oro, ananas, orange, grenadine | 9€ |
| Coco Bull | Vodka, sirop de cerise, citron vert, Redbull | 9€ |
| Gin Fizz | Gin Bombay Sapphire, sucre en poudre, jus de citron, limonade | 9€ |
| Margarita | Tequila, triple sec, jus de citron | 9€ |
| Piña Colada | Rhum Bacardi Carta Oro, crème de coco, ananas, vanille | 9€ |
| Tequila Sunrise | Tequila, jus d'orange, sirop de grenadine | 9€ |
| Sex on the Beach | Vodka Eristoff, crème de pêche, crème de cerise, crème de melon, jus de cranberry, jus d'ananas | 9€ |
| Tête à l'Envers | Vodka Eristoff, Orangina, liqueur de Curaçao bleu | 9€ |
| Long Island | Rhum Bacardi, gin, tequila, vodka Eristoff, sucre de canne, citron vert, Coca Cola | 11€ |
| Moscow Mule | Vodka Eristoff, citron vert, Ginger Beer | 11€ |
| Pornstar | Champagne, liqueur de passion, vodka Eristoff, jus de citron, sirop de vanille | 11€ |
| Expresso Martini | Vodka, liqueur café, sirop canne, expresso | 11€ |
| Spritz | Aperol, Prosecco, Perrier | 9,50€ |
| Jager Bomb | Jägermeister, Red Bull | 7€ |

(Order above = order on the site.)

### ✨ Cocktails Signature (S1, verbatim) 🍸
| Le N'Fire | Jack Daniel's Fire, Triple Sec, jus de citron, jus de cranberry · XXL +3€ | 13€ |
|---|---|---|
| El Marez | Gin Premium Belle Rive, jus de citron, sirop de grenadine, menthe fraîche · XXL +3€ | 13€ |

### 🍹 Cocktails Sans Alcool (S1, verbatim) — not alcoholic
Each description ends with « · XXL » and the price is « 7€ / 9€ ». Reading: **7 € normal, 9 € in XXL**
(the word « XXL » sits right before the price pair). So XXL costs +2 € on sans-alcool vs +3 € on alcoholic cocktails. Likely; not stated in words.

| Red Berry | Purée de fruits rouges, cranberry, jus d'ananas · XXL | 7€ / 9€ |
|---|---|---|
| Exotique | Fruit exotique, jus de citron, sirop vanille, jus passion · XXL | 7€ / 9€ |
| Virgin Mojito | Mangue, fraise, framboise, passion ou pêche, menthe fraîche, citron vert, cassonade, limonade · XXL | 7€ / 9€ |
| Virgin Colada | Crème de coco, ananas, vanille · XXL | 7€ / 9€ |

**Nature (unflavoured) mojito:** the site lists the five flavours first in the ingredient list with no « nature »
and no « au choix »; whether a plain Mojito/Caïpirinha/Caïpiroska/Daïquiri/Virgin Mojito exists is **not stated** → question.

---

## BIÈRES (S1, verbatim)

### 🍺 Bières Pression — 25cl / 50cl / 1L 🍸
| Name (as printed) | Volumes | Prices (absolute, per volume) |
|---|---|---|
| Kronenbourg Blonde 4,5° | 25cl / 50cl / 1L | 3,60€ / 6€ / 11€ |
| Chouffe Blonde 8° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| Cherry Chouffe 8° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| La Bête Blanche 5,2° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| Ducasse Triple 9° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| La Bête Blonde 8° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| La Bête Rouge 8° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| Grimbergen Blonde 6,7° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| Fada IPA 5° | 25cl / 50cl / 1L | 4,50€ / 8€ / 15€ |
| Monaco | « Bière, grenadine, limonade · 25cl / 50cl » | 3,70€ / 6,20€ |
| Picon Bière | 25cl / 50cl | 4,20€ / 7€ |
| Bière du Moment | 25cl / 50cl | 4,50€ / 8€ |

Settled: Monaco 3,70/6,20 · Picon Bière 4,20/7 · Bière du Moment 4,50/8 (the previous pass's « most likely reading » was right).
Which beer is « du moment » is not said.

### 🍺 Bières Bouteilles — 33cl
| 1664 0° Sans Alcool | 33cl | 5€ | not alcoholic |
|---|---|---|---|
| Heineken 5° | 33cl | 6€ | 🍸 |
| Desperados 5,9° | 33cl | 6€ | 🍸 |
| Corona 4,5° | 33cl | 6€ | 🍸 |
| Cidre 4,5° | 25cl | 7€ | 🍸 |
| Kastel Rouge 8° | 33cl | 7€ | 🍸 |
| Triple Karmeliet 8,4° | 33cl | 7€ | 🍸 |
| Guinness 8° | 33cl | 7€ | 🍸 — « 8° » printed as such; Guinness Draught is ~4,2° → likely a typo (or a Guinness Special/Foreign Extra ~7,5–8°?) → question |

---

## SOFTS & CAFÉS (S1, verbatim)

### ☕ Boissons Chaudes
| Café / Noisette / Décaféiné | « Fin de service 20h » | 1,90€ / 2€ / 2€ |
|---|---|---|
| Café Allongé | « Fin de service 20h » | 2,20€ |
| Double Café / Café Crème | | 3,60€ |
| Cappuccino / Chocolat Chaud | | 3,60€ |
| Café / Chocolat Viennois | | 4€ |
| Thé / Infusion | | 3,20€ |
| Irish Coffee / French Coffee 🍸 | | 9€ |
| Thés Glacés Maison | « Citron, Passion, Framboise, Pêche » | 5€ |

(Thés Glacés Maison is printed at the end of the « Boissons Chaudes » block.)

### 🥤 Boissons Fraîches
| Name | Detail as printed | Price |
|---|---|---|
| Coca Cola / Cherry / Zéro | 33cl | 4€ |
| Fanta Orange / Sprite | 25cl | 4€ |
| Fuzetea (thé pêche) | 25cl | 4€ |
| Tropico / Orangina | 25cl | 4€ |
| Limonade Pression | 33cl / 50cl | 3,40€ / 5€ |
| Diabolo | 33cl / 50cl | 3,60€ / 5,20€ |
| Badoit Rouge / Perrier | 33cl | 4€ |
| Ginger Beer Bio / Schweppes Tonic | 25cl | 4€ |
| Red Bull | 25cl | 5,50€ |
| Evian | 33cl | 3,80€ |
| Eau Plate / Gazeuse | 100cl | 5€ / 5,20€ |
| Jus de Fruits | « Orange, ananas, pomme, abricot, tomate, fraise · 25cl » | 4€ |
| Jus de Fruits Pressés | « Orange, citron » | 5€ |
| Sirop à l'Eau | « 33cl / 50cl · Grenadine, pêche, menthe, fraise, citron… » | 3€ / 4,20€ |
| Smoothie | « Mangue, pêche, fruits rouges, fruits exotiques » | 6€ |
| Milk-Shake | « Vanille, fraise, chocolat, banane » | 6,50€ |

Settled: Limonade Pression 33cl 3,40€ / 50cl 5€; Diabolo 33cl 3,60€ / 50cl 5,20€; Sirop à l'eau 3€ / 4,20€.
« Eau Plate / Gazeuse 100cl 5€ / 5,20€ » = plate 5 €, gazeuse 5,20 € (by position; likely).

---

## RESTAURATION — « Carte Tapas » (S1-tapas image, read visually; caps normalised to sentence case)

Header « TAPAS », logo top-right. Prices as printed (« 22,00€ »).

### Planches
| Planche mixte (Fromage et Charcuterie) | 22,00€ |
|---|---|
| Planche de charcuterie | 13,00€ |
| Planche de fromages | 13,00€ |
| Planche tapas — (Stick de Mozzarella, Beignets de Calamars, Accras de Morue, Wings de Poulet, Oignons Rings, Charcuteries & Fromages) | 30,00€ |
| 👑 Planche gourmande — (Stick de Mozzarella, Beignets de Calamars, Accras de Morue, Wings de Poulet, Oignons Rings, Charcuteries & Fromages, Mozzarella Di Bufala, saumon fumé, frites de patates douces, salade, Camembert rôti aux figues & noix) | 60,00€ |

(Parenthesised contents are verbatim in the image's own mixed case.)

### À la carte
| Sticks mozzarella | 7,50€ |
|---|---|
| Sépions (Seiches persillées) | 8,00€ |
| Patatas persillées | 7,50€ |
| Mini saucissons | 7,50€ |
| Patatas bravas | 7,50€ |
| Bruschetta au choix (Chèvre Miel, Norvégienne) | 13,00€ |
| Beignets de calamars | 6,50€ |
| Mini nems poulet | 8,00€ |
| Beignets de crevettes | 8,00€ |
| Croquetas de chorizo | 8,00€ |
| Wings de poulet | 8,50€ |

### Les incontournables
| Mozzarella di bufala — TOMATE & JAMBON SERRANO | 13,00€ |
|---|---|
| Jambon serrano (Toast Pan con Tomate) | 13,00€ |
| Accras de morue | 6,50€ |
| Panier de frites | 5,00€ |
| Oignons rings (sic, « OIGNONS RINGS ») | 6,50€ |
| Frites de patates douces | 7,50€ |
| Camembert rôti (Figues et Noix) | 12,00€ |
| Fish & chips (sauce Tartare) | 9,50€ |
| Beignets de courgettes | 7,50€ |
| Pan con tomate | 8,00€ |

Below the image the site still says « 🍽️ La suite arrive bientôt ! Formules étudiant, carte restaurant complète et bien plus encore... »
(verbatim) — so the tapas carte is published, a full restaurant carte is not.

---

## FORMULES SPÉCIALES (S1)

### Formule Goûter — 5€ (S1-goûter image, read visually; card heading « Tous les jours » in HTML)
« FORMULE GOÛTER 5€ » · « Crèpe ou Gaufre (Nutella, sucre, citron...) + Boisson au choix (Boisson chaude, diabolo,
limonade, sirop) » · « Suppléments : Fruit ou chantilly +1€ ». (« Crèpe » spelt with a grave accent on the image.)
Hours of the goûter not stated.

### Café du Matin — 1 € (HTML, verbatim)
Tag « Tous les matins » · « ⏰ 9h00 — 12h00 · Tous les jours » · items « Expresso », « Café Allongé », « Noisette » ·
note « * Offre valable uniquement de 9h à 12h, du lundi au dimanche ».

### Formule Étudiante — 8,50€ (HTML, verbatim)
Tag « Sur présentation carte étudiante » · items:
- « Burger + Frites » — « Bœuf ou poulet »
- « Pizza Margarita » — « Poulet curry ou Bolognaise » ← detail looks copy-pasted from the tagliatelles line → question
- « Tagliatelles » — « Poulet curry ou Bolognaise »
- « + Boisson au choix » — « Coca · Fuzetea · Limonade · Sirop · Diabolo »
- note « * Sur présentation d'un justificatif étudiant en cours de validité »

---

## HAPPY HOUR 17H – 23H (S1-HH poster, read visually; caps normalised)

Banner on S1 (verbatim): « Tous les jours de 17h à 23h, profitez de nos bières, cocktails et shots à prix réduits. »

| Vins 🍸 | 12.5cl | 75cl |
|---|---|---|
| Chardonnay | 3.00€ | 17€ |
| Vin moelleux | 3.50€ | 20€ |
| Punch & Sangria | 3.00€ | 17€ |
| Punch & Sangria 50 cl | 6.00€ | — |

| Bières 🍸 | |
|---|---|
| Pinte de blonde (Kro) | 4.00€ |
| Pinte de Monaco | 4.20€ |

| Cocktails 🍸 | | XXL |
|---|---|---|
| Mojito | 6.00€ | +3€ |
| Aperol Spritz | 6.00€ | +3€ |
| Coco Bull | 6.00€ | +3€ |
| Planteur | 6.00€ | +3€ |
| Caipirinha | 6.00€ | +3€ |
| Tête à l'envers | 6.00€ | +3€ |

« SANS ALCOOLS 5.50€ — VIRGIN MOJITO, VIRGIN COLADA »
Footer of poster: « INFOS & RÉSERVATIONS 📞 04 67 60 81 87 | 📍 10 Rue Saint-Guilhem, 34000 Montpellier » ← phone differs from the site's 04 34 35 36 28.
Logo on poster reads « BAR · AMBIANCE · COCKTAILS · TAPAS · BIÈRES » (main logo: « BAR – BRASSERIE – COCKTAIL – TAPAS – PUB »).

Implications: the S1 carte prices are the **normal (outside HH) prices** — confirmed by Mojito 9€ on the carte vs 6€ HH.
**Wines appear only on the HH poster** (no normal-price wine list anywhere). **No shots** are listed anywhere despite the banner.
**No champagne** listed (only as an ingredient of the Pornstar).

---

## Third-party (undated, lower trust)

- S2 Privateaser https://www.privateaser.com/lieu/41384-le-novelty — « Pinte de bière 4 € · Cocktail 6 € » = the HH prices
  (match S1-HH). Text mentions « paella façon Victoria (poulet gambas) », « dos de merlu crème citron coco », « tiramisu mangue fait
  maison » — not on any Novelty carte; « façon Victoria » = sister bar Le Victoria (3 place Castellane). One of the 8 Privateaser
  photos (365604) actually shows **Le Victoria's** storefront, so the listing mixes the two venues.
- S3 Schlouk Map https://www.schlouk-map.com/fr/places/le-novelty — HH: Bière blonde 50cl 4,00 €, ambrée 50cl 5,00 €, blanche
  50cl 5,00 €, Mojito 6,00 €, Caïpirinha 6,00 €, Jagerbomb 6,00 €, Coupe de Champagne 5,00 € (each « Jusqu'à 1h »).
  Ambrée/blanche HH 5 €, Jagerbomb HH 6 € and champagne 5 € are on no official source.
- Wanderlog (Google mirror) review digest mentions a « plat du jour + dessert » at 14,80 and dishes (sardines, huîtres gratinées,
  poulet aux olives) — undated reviews; no plat du jour on the site.

---

## DIFF vs the demo as it stood before this pass — all resolved on 2026-10-14 (kept for the record) (`const leNovelty`, frontend/lib/menu-data.ts L3322–3648)

### Wrong lines
1. **Planteur** description: demo « Rhum, ananas, orange, grenadine » → site « Rhum Bacardi Carta Oro, ananas, orange, grenadine ».
2. **Sex on the Beach**: demo « Vodka Eristoff, liqueurs de pêche, cerise et melon, cranberry, jus d'ananas » → site « Vodka Eristoff, crème de pêche, crème de cerise, crème de melon, jus de cranberry, jus d'ananas ».
3. **Expresso Martini**: demo « Vodka, liqueur de café, sirop de sucre de canne, expresso » → site « Vodka, liqueur café, sirop canne, expresso ».
4. **Exotique**: demo « Fruits exotiques, jus de citron, sirop de vanille, jus de passion » → site « Fruit exotique, jus de citron, sirop vanille, jus passion ».
5. **Mojito / Daïquiri / Virgin Mojito**: demo inserts « · » after the flavours; site uses a plain comma (« …passion ou pêche, rhum Bacardi… »). Cosmetic.
6. **Moscow Mule** « ginger beer » → site « Ginger Beer »; **Tête à l'Envers** « curaçao bleu » → « Curaçao bleu ». Cosmetic.
7. **Sans alcool** (4 items): demo 7 € with no XXL; site « XXL 7€ / 9€ » → add an XXL option at +2 € (9 €) — pending owner confirmation of the reading.
8. **Formule Étudiante**: demo « Pizza Margherita » → site spells « Pizza Margarita » (and its detail « Poulet curry ou Bolognaise » is odd — question). Demo description « Un plat et une boisson, sur présentation de la carte étudiante » is a paraphrase (acceptable, but site wording is « Sur présentation carte étudiante »).
9. **Cocktail order**: demo places Spritz after Tête à l'Envers; site has it after Expresso Martini (Long Island, Moscow Mule, Pornstar, Expresso Martini, Spritz, Jager Bomb). Pression order: site Monaco → Picon → Bière du Moment; demo has Bière du Moment first. Cosmetic.
10. Demo beer names drop « Blonde » (« Chouffe » vs « Chouffe Blonde 8° », « Grimbergen » vs « Grimbergen Blonde 6,7° », « Kronenbourg » vs « Kronenbourg Blonde 4,5° ») and moves it to the description — acceptable restyling, flagging only.
11. Guinness: demo omits the « 8° » (deliberate; site prints it).

### Missing lines (on the site, not in the demo)
- Softs: **Ginger Beer Bio / Schweppes Tonic 25cl 4€**, **Evian 33cl 3,80€**, **Eau Plate / Gazeuse 100cl 5€ / 5,20€**, **Sirop à l'Eau 33cl / 50cl 3€ / 4,20€** (Grenadine, pêche, menthe, fraise, citron…).
- **The whole Tapas carte** (5 planches, 11 « À la carte », 10 « Les incontournables »).
- **Formule Goûter 5€** (crêpe ou gaufre + boisson; suppléments fruit ou chantilly +1€).
- Happy-hour prices (poster) and the wines (only priced in HH) — decide whether the demo shows an HH section.
- « Fuzetea (thé pêche) » — demo « Fuzetea pêche »: fine.

### Lines on the demo that are on no source
- Cocktails category tagline « prix hors happy hours » and pression tagline « Prix hors happy hours »: not printed on the site, but now **supported** by the HH poster (mojito 9€ vs 6€ HH). OK to keep.
- « Classique » as a Coca-Cola version label: site says « Coca Cola / Cherry / Zéro ». Fine.
- Café du matin description « De 9h à 12h, du lundi au dimanche » — matches site note. OK.
- Nothing invented otherwise; all prices in the demo match S1 exactly (all volume supplements recomputed: Kro +2,40/+7,40, pressions +3,50/+10,50, Monaco +2,50, Picon +2,80, Bière du Moment +3,50, Limonade +1,60, Diabolo +1,60 — all correct).
