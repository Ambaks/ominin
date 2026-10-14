# Le Victoria (3 place Castellane, Montpellier): carte transcription

Research date: 2026-10-14. Every block names the page actually opened and the raw file kept under
`raw/`. "Verbatim" means copied character for character from that raw file (spelling, spacing
quirks and capitals kept, except runs of spaces collapsed). No carte page exists on the
restaurant's own site (levictoriamontpellier.com never had one and is now suspended, see the
report). No in-house QR-menu tool was found.

Alcoholic items are marked (alc).

---

## A. Deliveroo: the most complete current carte (delivery prices)

- URL: https://deliveroo.fr/fr/menu/montpellier/montpellier-centre/le-victoria
- Opened 2026-10-14 with Playwright. Raw: `raw/pw-deliveroo.html` (embedded `__NEXT_DATA__`
  extracted to `raw/deliveroo-next.json`, flat list in `raw/deliveroo-items.txt`), rendered text
  `raw/pw-deliveroo.txt`, screenshot `raw/pw-deliveroo.png`.
- Status that day: "Ouvre à 15:00 le lundi", `menuDisabled: true` (not taking orders until
  Monday). Restaurant name on Deliveroo is lowercase "le victoria". Rating 2.9 ("Voir les 10 avis").
- Promo: "1 acheté = 1 offert" (BuyOneGetOneFree) on Hamburger LE CHIKEN and Pizza Margherita.
- All lines below are **verbatim** from `deliveroo-next.json`, in Deliveroo's category order.
  Category names are printed as Deliveroo shows them.

### PLAT CHAUD
| Name (verbatim) | Description (verbatim) | Price |
|---|---|---|
| Tagliatelle au poulet curry | tagliatelle ,poulet ,crème fraiche ,curry | 10,99 € |
| Tagliatelle bolognaise | tagliatelle , sauce tomate ,parmesan , bœuf haché | 10,99 € |
| SOURIS D'Agneau confite Au Romarin | (none) | 20,99 € |

### Pizzas
All pizzas carry the option group "Souhaitez-vous un  suppléments ?" (0 to 99 choices):
Œuf, Oignons, Jambon anchois, Aubergines, Copeaux de parmesan, Champignons forestiers, Roquette,
Mozzarella, Gruyère, Chèvre, Roquefort brie, Jambon cru, Poivrons at **1,30 €** each;
Huile de truffe **2,60 €**. (Verbatim option names.)

| Name (verbatim) | Description (verbatim) | Price |
|---|---|---|
| Pizza vegetariana | Sauce tomate, fromage, tomates fraîches, aubergines, courgettes, oignons et poivrons. | 12,90 € |
| Pizza 4 fromaggio | Crème, gruyère, mozzarella, roquefort et chèvre. | 12,90 € |
| Pizza Margherita | Sauce tomate, fromage, mozzarella di buffala, tomates cerises et basilic frais. | 11,90 € (1 acheté = 1 offert) |
| Pizza regina tomate | Sauce tomate, fromage, mozzarella, jambon, champignons frais et basilic. | 12,90 € |
| bruschetta  chèvre miel | sauce tomate ,fromage ,roquette ,roquette ,chèvre et miel et tomate fraiche | 10,90 € |
| Pizza chèvre miel | Sauce tomate, fromage de chèvre, miel et herbe. | 12,90 € |
| Pizza salmone | Crème, saumon, fromage, roquette et saumon fumé. | 15,90 € |
| Pizza spezzial | Sauce tomate, fromage, mozzarella, après cuisson "mozzarella di buffala, jambon cru, roquette et copeaux de parmesan". | 14,90 € |
| Pizza au poulet | Poulet, fromage, crème fraîche, poivrons et oignon . | 12,90 € |

Vegetarian on this list: vegetariana, 4 fromaggio, Margherita, bruschetta chèvre miel, chèvre miel
(no dietary tags are set on Deliveroo; inferred from the ingredients only).

### Hamburger
Both burgers carry two option groups:
- "garniture" (exactly 1): bacon 0,00 € / Sans bacon 0,00 €
- "sauce" (0 or 1): algérienne / mayonnaise / ketchup / motarde (sic), all 0,00 €

| Name (verbatim) | Description (verbatim) | Price |
|---|---|---|
| Hamburger LE CHIKEN avec frite maison | steak de poulet pané frit ,cheddar , salade ,tomate | 11,90 € (1 acheté = 1 offert) |
| Le  classique avec frite maison | Steak haché du boucher frais  ,double cheddar ,bacon ( au choix ) ,tomates  et salades. | 11,90 € |

No vegetarian burger on Deliveroo.

### TAPAS (no descriptions)
| Name (verbatim) | Price |
|---|---|
| FRITE MAISON | 5,00 € |
| Wings  poulet | 7,00 € |
| Fish and chips tapas | 9,00 € |
| Croquetas Chorizo | 7,00 € |
| Stick Mozzarella | 7,00 € |
| Patatas bravas | 7,00 € |
| Mini nems | 7,00 € |
| Mini saucissons | 5,50 € |
| Mini samossas | 6,00 € |
| frites patate douce | 7,00 € |

### Desserts
| Name (verbatim) | Description (verbatim) | Price |
|---|---|---|
| cheesecacke | fruit rouge ou caramel beurre salé | 5,00 € (option "parfum", exactly 1: fruit rouge / caramel beurre salé) |
| Tarte citron meringuée | | 6,00 € |
| Tarte tatin | | 5,00 € |
| moelleux au chocolat | | 5,00 € |

### Crêpes
Every crêpe and every gaufre carries the option group "sup  crepe /gaufre" (0 or 1):
nutella / coco / caramel beurre salée / banae (sic), **2,00 €** each.

| Name (verbatim) | Price |
|---|---|
| Crêpe nature | 3,20 € |
| Crêpe sucre | 3,60 € |
| Crêpe nutella | 4,00 € |
| Crêpe nutella banane | 5,00 € |
| Crêpe sucre citron | 3,80 € |
| crepe nutella coco  râpée | 5,00 € |
| Crêpe caramel beurre salé | 4,00 € |

### GAUFRES MAISON
| Name (verbatim) | Price |
|---|---|
| gaufre sucre | 3,60 € |
| gaufre sucre citron | 3,80 € |
| gaufre Nutella | 4,00 € |
| Gaufre Nutella Banane | 5,00 € |
| gaufre caramel beurre salé | 4,00 € |
| Gaufre Nutella coco Rapée | 5,00 € |

### salades
| Name (verbatim) | Description (verbatim) | Price |
|---|---|---|
| SALADE CESAR | (poulet ,œuf dur , copeaux de parmesan ,crouton ) | 10,90 € |
| salade de chèvre chaud | salade ,tomate ,toasts de chèvre chaud ,jambon serrano ,crouton ) | 10,90 € |

### Boissons fraîches
| Name (verbatim) | Detail (verbatim) | Price |
|---|---|---|
| Coca cola 33cl | 33cL | 3,00 € |
| Fuze Tea 33cl | 33cL | 3,00 € |
| Coca-cola 1L | | 5,50 € |
| Red Bull | | 5,00 € |

### Bières (bottles)
| Name (verbatim) | Detail (verbatim) | Price |
|---|---|---|
| Heineken (alc) | 33cL | 5,00 € |
| La  1664 sans alcools | 33cL | 5,00 € |
| Desparados (sic) (alc) | 33cL | 6,00 € |
| Corona (alc) | 33 cl | 6,00 € |

### Bouteilles de vins (alc). Category subtitle verbatim: "Rouge / blanc / rosés"
Colour is the one printed in the item name on Deliveroo; where the name gives none it is marked.
| Colour | Name (verbatim) | Detail (verbatim) | Price |
|---|---|---|---|
| blanc | Chardonnay (blanc) | 75 cl 13 vol | 13,00 € |
| blanc | Picpoul de pinet  (blanc) | Domaine morin-langaran 75 cl 13 vol | 15,00 € |
| blanc | Hotus bergerie  (vin blanc) | 75 cl 13vol | 25,00 € |
| blanc | viognier (blanc) | 75 cl 14 vol | 14,00 € |
| blanc doux | joy blanc doux | (none) | 16,00 € |
| rouge | Faugeres châteaux haut Lignières (rouge) | 75 cl13 vol | 16,00 € |
| rouge | Pic saint loup Château lansyre (rouge) | 75 cl 14 vol | 22,00 € |
| rouge | pic saint loup ROUGE   chateau lansyre BIO | 75 cl 13 vol | 18,00 € |
| rouge | MERLOT ROUGE | (none) | 14,00 € |
| rosé | Faugeres (rosé) | Château haut lignières 75 cl 13 vol | 16,00 € |
| rosé | Amour  de gris (rosé) | Domain grand-chemin 75 cl 12 vol | 17,00 € |
| rosé | Puech-haut  (rosé) | Argali 75 cl 13 vol | 22,99 € |

Spelling questions (do not correct silently): "lansyre" is probably Château de Lancyre (Pic
Saint-Loup); "Hotus bergerie" is unclear (L'Hortus « La Bergerie » ?); "morin-langaran" is
probably Domaine Morin-Langaran. No glass prices on Deliveroo.

### Alcools  ford (sic) (alc, bottles)
| Name (verbatim) | Detail (verbatim) | Price |
|---|---|---|
| VODKA Poliakov | | 30,00 € |
| Whisky william lassons | 70 cl 40 vol | 26,00 € |
| Whisky label 5 | 70 cl 40 vol | 26,00 € |
| Whisky cutty sark | 70 cl 40 vol | 26,00 € |
| Bacardi ambre | rhumcarta oro 70cl. 37 vol | 26,00 € |
| Saint James royal ambré | 70 cl 45 vol | 26,00 € |
| Saint James blanc | 70 cl 40 vol | 26,00 € |
| Havana club ambré | 70 cl 40 vol | 30,00 € |

### COCKTAILS xxl   Maison (alc)
| Name (verbatim) | Price |
|---|---|
| PUNCH MAISON 50 CL | 8,00 € |
| SANGRIA MAISON 50 CL | 8,00 € |
| SEX ON THE BEACH  MAISON | 8,00 € |
| planteur 50 cl | 8,00 € |

(The Sex on the Beach line has no volume on Deliveroo; it sits in the "xxl" category.)

---

## B. Dine-in slates photographed in front of the restaurant (April 2024)

- Source photo: Google Maps user photo by "Philippe MARTINET", "Photo – avr. 2024", the cover
  photo of the Le Victoria listing. Opened 2026-10-14 via Playwright (Google limited view), full
  resolution 4000×3000 downloaded: `assets/storefront-google-2024-04.jpg`; viewer screenshot
  `raw/gphotos/p00.png`. The same photo is on Privateaser (`assets/privateaser-storefront.jpg`).
- Crops: `assets/slate-tapas-2024-04-crop.png`, `assets/slate-formule-midi-2024-04-crop.png`.
- Transcribed by me from a handwritten chalkboard: **verbatim as far as legible**, spelling as
  written, but this is reading handwriting, so every doubt is flagged. **18 months old** — prices
  may have changed.

### "NOS TAPAS — Le Victoria" (chalkboard on the right of the door)
| Line as written | Price as written | Note |
|---|---|---|
| Planche mixte | 22€ | |
| Planche charcuterie | 13€ | |
| Planche fromage | 13€ | |
| Planche tapas (sticks, calamar, accras, wings, oignons rings, charcuterie, fromage) | 30€ ? | The "30€" sits between this line and the next one; one of the two has no price. Most likely Planche tapas = 30 €. |
| Panier de frites | ? (or 30€) | see above |
| Frites de patates douce | 5€ | |
| Fish & chips | 7€ | |
| Stick mozzarella | 7,50€ | |
| Sépion (seiches persillées) | 7,50€ | |
| Patatas persillées | 8€ | |
| Mini saucissons | 7€ | |
| Patatas Bravas | 7,50€ | |
| Bruschetta (chèvre miel, norvegienne) | 7€ | |
| Beignets de calamar | 13€ ? | "13€" follows ", norvegienne)" written on the calamar line; could be the bruschetta's second price. Question. |
| Poulpe à la catalanne (sic) | 6€ ? | low for octopus; alignment uncertain |
| Beignets de crevette | 9€ | |
| Croquetas de chorizo | 8€ | |
| Wings de poulet | 7,50€ | |
| Mini nems | 7,50€ | |
| Mozzarela di Buffala tomate & jambon | 7,50€ or 12€ | two prices at the end of the board; RG's older carte has "Mozzarella di buffala tomate et jambon serrano" at 12, so 12 € is likely and the extra 7,50 € is unexplained. Question. |

Footer of the board: "RAFRAICHISSEZ-VOUS !" with Coca-Cola, Fuze Tea, Tropico, Fanta, Sprite logos.

### "FORMULE DU MIDI" (chalkboard on the left of the door, partly cut by the frame)
| Line as written | Price as written |
|---|---|
| Plat ① | 9,90€ |
| Plat ① + dessert | 11,90€ ? (could read 13,90) |
| Plat ② | 12,90€ |
| Plat ② + dessert | 14,90€ ? (could read 16,90) |

Visible fragments of that day's dishes: "…atelles au poulet" (tagliatelles au poulet),
"…hampignons et parmesan.", "…de thon à l'avotique (?) et", "…patates …ouces (+3€)",
"Pain perdu", "…ce caramel (?)". Not usable as carte lines.

Also visible: a framed printed menu on the left wall (illegible at this resolution) and a green
board "BIERE DU MOMENT — GRIM DE PRINTEMPS — édition limitée !!" (Grimbergen de printemps,
draught, April 2024).

---

## C. Bar prices: Schlouk Map (crowd-sourced, no date)

- URL: https://www.schlouk-map.com/fr/places/le-victoria — opened with curl 2026-10-14.
  Raw: `raw/schlouk.html`, text `raw/schlouk.txt`. **Verbatim.**
- Happy hour every day 16:00–01:00; opening 10:30–01:00 every day.

| Drink (verbatim) | Happy Hour | Standard |
|---|---|---|
| Kronenbourg (50cl) (alc) | 3,50 € | 5,80 € |
| Monaco (50cl) (alc) | 3,50 € | 5,80 € |
| Pietra (50cl) (alc) | 5,50 € | 6,50 € |
| Mojito (alc) | 5,50 € | 8,00 € |
| Sex on the Beach (alc) | 5,50 € | 8,00 € |
| Jagerbomb (alc) | 5,50 € | 8,00 € |
| Cuba Libre (alc) | 5,50 € | 8,00 € |
| Planteur (alc) | 5,50 € | 8,00 € |

Draught vs bottle is not stated; "Kronenbourg/Monaco/Pietra 50cl" are presumably pression.

## D. Privateaser (no date) — https://www.privateaser.com/lieu/56860-le-victoria
Opened with curl 2026-10-14. Raw `raw/privateaser.html`, text `raw/privateaser.txt`. Verbatim:
"Carte du Victoria — Boissons — Pinte de bière 4,5 € — Verre de vin 3,5 € — Cocktail 8 €".
Also verbatim: "du burger maison aux spécialités du jour à 12,90€", "Entre plats végétariens,
happy hour généreux (16h-1h)".

## E. MisterGoodBeer (user-added, "Unverified prices") — https://www.mistergoodbeer.com/en/bars/au-bistrot-victoria-montpellier
Opened with curl. Raw `raw/mgb.txt`: "Pint during Happy Hour at €4.00", "Pint starting at €5.90".

## F. Group website (cafedesarts34.fr, published 09/09/2026) — https://www.cafedesarts34.fr/le-victoria-w1
Opened with Playwright 2026-10-14. Raw `raw/pw-cda-victoria.html/.txt`, `raw/cda/*.txt`.
No carte, no prices per item. Verbatim facts about the offer:
- "Deux plats du jour au choix sont proposés à partir de 9,90 euros"
- "les girafes de bières et de cocktails de 3L à 5L sont disponibles pour les groupes"
- "Petit déjeuner, brunch, déjeuner, dîner : le service fonctionne en continu de l'ouverture à
  la fermeture, 7 jours sur 7 de 10h à 1h du matin."
- "Happy Hour … actif de 16h à 1h du matin … tarifs préférentiels sur les cocktails et bières pression."
- "La carte s'articule autour d'une cuisine française généreuse et de tapas à partager"

## G. Older owner carte (restaurantguru, "Menu du propriétaire 5 années plus tôt", i.e. ~2021)
- https://fr.restaurantguru.com/Au-Bistrot-Victoria-Montpellier/menu — opened with Playwright.
  Raw `raw/pw-rg-menu.txt`. Verbatim:
- Entrée: Terrine de canard maison aux noisettes 9 · Rillette de sardine pain grillé 9 ·
  Mozzarella di buffala tomate et jambon serrano 12
- Plat principal: Poulpe a la sétoise 14.5 · Pièce du boucher 14.9 · Tartare de boeuf charolais
  coupe au couteau classique 16.9
- Les burgers: El diez 13.9 · Le chicken bacon 13.9 · Le végétarien 13.9
- Les crepes: Crepe nature 3 · Crepe creme de marron 3.5 · Crepe nutella 3.5
- **Overturns the previous pass**: the burgers and crêpes ARE part of this owner menu (the
  page's category bar lists "Entrée Plat principal Les burgers Les crepes"; the "restaurants
  nearby" block just renders in between). And BODACC 2019 gives TGT's first nom commercial as
  **"EL DIEZ"**, so "El diez" was the house burger.
- lacarte.menu (aggregator, mixes in other venues) adds descriptions for the same lines:
  "El Diez — viande limousine du boucher solavi; double cheddar; bacon,tomate; salade; tomate;
  sauce burger" 14 €, "Le Végétarien — steak végé; cheddar; tomate; salade; sauce burger maison"
  14 €, "Le Chicken Bacon — steak de poulet pane frit; cheddar; bacon; salade; tomate" 14 €,
  "Poulpe A La Sétoise — servi + du risotto" 15 €, "Tartare … — servis + frites maisons" 17 €.
  (`raw/pw-lacarte-menu.txt`.) The same page lists cocktails "Mojito Classic : Havana 3 Ans 25 €",
  "Coco Punch : Rhum Blanc Et Brun, Lait De Coco, Citron Vert, Ananas 18 €", "Planteur : Rhum,
  Ananas, Orange, Grenadine 22 €", "Cocktails 1 Litre 20 €", "Mojito Aux Fraises 22 €",
  mocktails "Jungle Green : Jus D'orange, Jus De Kiwi, Jus D'ananas 6 €", "Dream Paradise …
  6 €", "Virgin Mojito À La Pomme Verte 6 €", and wines "Viognier - Les Violettes, Vin De Pays
  D'oc Igp Jean Luc Colombo (75Cl) 15 €", "Chardonnay - … Domaine De Sarrat De Goundy (75Cl)
  15 €", rosé "Cinsault-Grenache - … Moment De Plaisir (75Cl) 15 €", rosé "Pic Saint Loup -
  … Chateau Lancyre (75Cl) 23 €", rouge "Faugeres Aop - … Chateau Haut Ligniere (75Cl) 16 €",
  rouge "Pic Saint Loup … Coste D'aleyrac (75Cl) 24 €". **Low reliability** (the same page has
  "Pizza - Normale: Tropica 5 €", "Arepas: Tentation 8 €" which are clearly another venue's).
  The 18–25 € cocktails are probably 1-litre/shared formats. Undated.
- lacarte.menu also links a PDF "victoria-brasserie-montpellier-carte.pdf"
  (https://weur-cdn.lacarte.menu/storage/media/companies_menu_pdf/113316057/victoria-brasserie-montpellier-carte.pdf)
  — **not opened**: blocked by a Cloudflare challenge. The user can open it in a normal browser.

## H. Misattributed: do NOT use
- restaurantguru's "Menu mis en ligne par les utilisateurs 5 mois plus tôt"
  (`assets/MISATTRIBUTED-cafe-des-arts-brunch-slate-rg.jpg`) is a **Café des Arts** slate
  ("Formule Brunch 18.90 €", the CAFÉ DES ARTS sign and red printed carte behind it).

---

## Conflicts between sources (not resolved)
1. Fish & chips: 9 € Deliveroo vs 7 € slate (2024). Stick mozzarella 7 € vs 7,50 €. Patatas
   bravas 7 € vs 7,50 €. Wings 7 € vs 7,50 €. Mini nems 7 € vs 7,50 €. Croquetas 7 € vs 8 €.
   Mini saucissons 5,50 € vs 7 €. Frites patate douce 7 € vs 5 €. Deliveroo is lower than the
   2024 slate on most tapas — unusual for delivery; the Deliveroo prices may be old.
2. Plat du jour: 12,90 € (Privateaser) vs "à partir de 9,90 euros", two choices (group site
   Sept 2026; slate 2024: Plat ① 9,90 / Plat ② 12,90).
3. Pint: 4,5 € (Privateaser) vs 5,80 € for 50 cl (Schlouk) vs 5,90 € (MisterGoodBeer).
4. Cocktail: 8 € (Schlouk standard, Privateaser) vs 8 € for 50 cl "xxl" (Deliveroo) vs 18–25 €
   (lacarte, probably 1 L). Girafes 3–5 L exist (group site) — no price found.
5. Pic Saint Loup Lancyre: rouge 22 € and rouge BIO 18 € (Deliveroo) vs rosé 23 € (lacarte).
6. Opening time: 10h30 (Schlouk, old own site, Petit Futé) vs 10h (group site Sept 2026,
   Privateaser).

---

## Diff against the current demo (`const leVictoria`, frontend/lib/menu-data.ts L3749–3980)

### Lines that are wrong or not verbatim
- Margherita description: demo "Base tomate, mozzarella di buffala, tomates cerises, basilic
  frais" — Deliveroo: "Sauce tomate, fromage, mozzarella di buffala, tomates cerises et basilic
  frais." ("fromage" missing; "Base" invented).
- Vegetariana: demo ends "…oignons, poivrons" — source "…oignons et poivrons." (minor).
- Spezzial: demo "à la sortie du four, mozzarella di buffala…" — source 'après cuisson
  "mozzarella di buffala, jambon cru, roquette et copeaux de parmesan"'.
- Salade de chèvre chaud: demo "Tomate, toasts de chèvre, jambon serrano, croûtons" — source
  "salade ,tomate ,toasts de chèvre chaud ,jambon serrano ,crouton )".
- Salade César: demo "croûtons" — source "crouton" (fine to normalise, say so).
- Tagliatelles: Deliveroo spells "Tagliatelle" (singular). Bolognaise demo "viande hachée de
  bœuf" — source "bœuf haché"; demo drops "tagliatelle" and "parmesan" order is fine.
- Le Chiken: on Deliveroo it has the same bacon / sans bacon choice as Le Classique; the demo
  gives the choice to Le Classique only.
- Merlot "Rouge · vin de la maison" and Joy "Blanc moelleux · vin de la maison": "vin de la
  maison" is on **no source**; Deliveroo says "MERLOT ROUGE" and "joy blanc doux".
- Pic Saint Loup "Château Lansyre": that is Deliveroo's spelling, keep or ask (probably Lancyre).
- Ticker "Plat du jour 12,90 €": the group site (09/2026) says two plats du jour "à partir de
  9,90 euros".
- Hours "10h30–1h": group site and Privateaser say 10h; Schlouk/old site 10h30. Ask.
- Bières: "Kronenbourg pression": Schlouk says "Kronenbourg (50cl)", not "pression" (likely
  but unstated).
- Mojito 8 € in Cocktails: from Schlouk (standard price), OK, but not on Deliveroo.

### Lines missing from the demo (present on a source)
- Deliveroo: "bruschetta chèvre miel" 10,90 € (Pizzas category); pizza supplements (13 at
  1,30 €, huile de truffe 2,60 €); burger sauce choice (algérienne, mayonnaise, ketchup,
  moutarde); crêpe/gaufre supplement (nutella, coco, caramel beurre salé, banane +2,00 €);
  wines Picpoul de Pinet blanc 15 €, Hotus bergerie blanc 25 €, Viognier blanc 14 €, Pic Saint
  Loup rouge BIO 18 €; the 8 spirit bottles 26–30 €.
- Schlouk: Pietra 50 cl 6,50 € (HH 5,50 €), Jagerbomb 8 € (HH 5,50 €), Cuba Libre 8 €
  (HH 5,50 €).
- Slate 2024 (old, to confirm): Planche mixte 22 €, Planche charcuterie 13 €, Planche
  fromage 13 €, Planche tapas 30 € (?), Sépion (seiches persillées) 7,50 €, Patatas
  persillées 8 €, Bruschetta (chèvre miel, norvégienne) 7 €, Beignets de calamar 13 € (?),
  Poulpe à la catalane 6 € (?), Beignets de crevette 9 €, Mozzarella di buffala tomate &
  jambon 12 € (?), Formule du midi.
- Group site: girafes 3–5 L (no price), petit-déjeuner, brunch.
- Verre de vin 3,5 € (Privateaser) — no by-the-glass list anywhere.

### Lines in the demo that are on no source
- "vin de la maison" on Merlot and Joy (see above).
- Highlights "Terrasse chauffée et couverte": the Privateaser photos do show a terrace enclosed
  with clear plastic walls and awnings (`assets/privateaser-terrace-covered-*.jpg`); "chauffée"
  came from Tripadvisor snippets only. "Écrans pour les matchs": Schlouk "Télévision Oui",
  "Bar sportif" — supported.
- Everything else in the demo traces to Deliveroo or Schlouk.
