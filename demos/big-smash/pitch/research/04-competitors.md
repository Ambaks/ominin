# 04 — Competitive landscape: ordering tech Big Smash will compare Ominin with

Prepared 2026-10-03 for the Ominin pitch to the Big Smash head office (Toulouse; master franchisor "Master Big Smash" within the NSUP group, which also runs New School Tacos).

**What Ominin offers chains:** QR order-and-pay from the phone, at the counter, in the queue or before arriving. Payment goes straight to the restaurant's own Stripe or Square account. The order prints on the kitchen ticket printers through the Omilink box, or lands in the Square POS for Square restaurants. The customer follows a numbered ticket live until « Prête ». No monthly fee; **1 to 3 % of orders paid online, decreasing with each restaurant's revenue**; a one-off setup kit per restaurant (Omilink €89 + €20 shipping in the current price list; QR supports quoted with the network); pilot in one restaurant with materials supplied.

**Citation rules used in this file**
- Every URL was read on **2026-10-03** unless marked otherwise. Page dates are given where the page shows one.
- **[verified]** = seen on the page, in its source code or JavaScript bundle, or on its App Store / Google Play listing on 2026-10-03. **[claim]** = the vendor's or company's own statement, a franchise-broker listing, or a press quote of the company. **[unverified]** = search snippet or second-hand only, or the page blocked us.
- "Not published" means we looked and found no public price. Prices are never estimated; our own arithmetic is labelled **(computed)**.
- Blocked on 2026-10-03: sundayapp.com (403 to scripts; read through a fetch tool), obypay.com blog, clyosystems.com, support.burgerking.fr, mcdonalds.fr service pages (its terms page loaded), bchef.fr, Indeed, LSA.

---

## 0. Key takeaways

1. **Big Smash is not greenfield: it already runs a digital ordering stack, most likely from the Bordeaux/Toulouse till vendor 6XPOS.**
   - Every "Commander" and "Click & Collect" button on bigsmash.fr goes to **shop.bigsmash.fr, a white-label 6XPOS-branded shop** (`appCode "bigsmash"`, assets on cdn.6xpos.shop, built on the Tereza platform, card payment through Stripe) [verified].
   - Restaurants have **ordering kiosks**: "Ces modifications sont possibles sur nos bornes en restaurant, sur notre site en Click & Collect ou sur les plateformes de livraison" (bigsmash.fr FAQ) [verified]. The kiosk and till vendor is **not named anywhere**; 6XPOS is the probable one (§1) [unverified inference].
   - Loyalty runs on **Avomark "MaCarte"** (bigsmash.macarte.club) [verified]. White-label iOS and Android apps have existed since January 2026 but have **0 ratings on iOS and 100+ downloads on Android**, and the website does not link to them [verified].
   - Delivery: Uber Eats and Deliveroo per restaurant; the Montpellier franchisee also uses **Delicity** [verified].
2. **The gap Ominin can fill is real and specific.** Big Smash's live web ordering is **slot-based Click & Collect only**: 15-minute pickup slots, earliest "0 minute", latest "2 days" ahead, no "as soon as possible" option, no wait-time display. The confirmation page shows "Confirmée → Préparation → Prêt", but it has **no polling or websocket code**, so the status changes only if the customer reloads [verified in the shop's JavaScript]. **No QR ordering in the restaurant** was found.
3. **The biggest competitor is the incumbent's own module, not another start-up.** 6XPOS sells "QR Code à table", Click & Collect, kiosks, a kitchen screen and a customer-call screen ("Écran d'appel client") [verified on 6xpos.fr]. Expect "we can switch on 6XPOS QR" or "we already have kiosks". Ominin must win on the live phone ticket, pay-on-phone with no app, and no added monthly cost, and must not create a second, unreconciled till.
4. **Big Smash's royalty is a percentage, unlike O'Crousti's.** A franchise-broker listing gives **25 K€ entry fee, "5% Redevance métier", "2% Redevance marketing", 300 K€ total investment, 100 m², 1.1 M€ average franchisee revenue at two years** [claim, kapp-retail.com]. The head office earns more when franchisees sell more, so an uplift story speaks to it directly. But royalties are computed on revenue, so **online orders must show up in each restaurant's reported revenue**, and a 1–3 % fee on top of 7 % of royalties will be scrutinised.
5. **What comparable burger chains use:**
   - **Majors** (McDonald's, Burger King, Quick, KFC) run their own apps plus kiosks; Acrelec supplies McDonald's and Burger King [claim]. **McDonald's France already sells "Service à Table": "scannez le QR code via l'app McDo+, commandez depuis votre mobile"** [verified, App Store]; **Burger King generalised "King Table" (QR at the table) in April 2024** "pour désengorger les files d'attentes, aux bornes comme aux comptoirs" [verified article]. Quick: "95 % des commandes passées sur borne" (trade press, March 2025) [claim].
   - **Premium and Paris burger chains** use web-first ordering vendors: Innovorder (Big Fernand, BCHEF, Smash Smash), Belorder (Black & White, Burger & Fries), Dood (PNY, Bill's Burger), Zelty (Bioburger), Uber's order.store (Blend), sunday pay-at-table (PNY) [mostly verified, §3].
   - **South-west regional networks** (Big Smash, New School Tacos, Steak n Shake) appear on **6XPOS** [verified logos/shops].
   - **No smash-burger chain was found using counter or table QR ordering** (caveat: ClickEat, which sells "borne sur téléphone", shows a logo of Junk, a 17-unit smash chain; what Junk uses it for was not checked).
6. **Nobody in French fast food shows the customer a predicted ready time.** The norm is a slot picked by the customer, a status screen and a "ready" SMS. McDonald's avoids prediction by starting preparation on arrival. Big Smash's own confirmation page does not even refresh. A live ticket is a clear differentiator today; a predicted ETA would be a further one, but Ominin's countdown exists only in the demo (§5).
7. **Candid weak points:** no integration with 6XPOS (two systems, NF525 till vs separate payments, royalty base), company size vs a ~10-unit network growing ~10 a year, titres-restaurant not yet supported, adoption risk when kiosks already exist, no chain reference.

---

## 1. Starting point: what Big Smash uses today

| Item | Finding (exact quote where possible) | Source | Status |
|---|---|---|---|
| Network | 10 restaurants listed: Toulouse Bayard/Matabiau (68 rue de Bayard), Toulouse Croix de Pierre, Montpellier, Échirolles, Muret, Fenouillet "Big Smash x New School" (Saint-Alban), Lyon "Big Smash x New School", Toulouse Montaudran, Blagnac, Paris 18 (148 av. de Saint-Ouen). "Ouvertures prochaines ! Nimes, Le Havre, Toulouse 4, Carcassonne". Abroad: Tangier (2024, company timeline); a Marrakech shared store listed on Glovo [unverified]. | https://www.bigsmash.fr/ ; https://shop.bigsmash.fr/points-de-vente | [verified] |
| Company's own key figures | "7 Restaurants ouverts (mai 2025)", "10 Projets en cours", "1.2M CA annuel du réseau", "3K CA moyen/jour". The 1.2M is probably per restaurant, mislabelled: 3K × 365 ≈ 1.1M (computed). | https://www.bigsmash.fr/franchise | [verified] page; figures [claim] |
| History and ownership | "Fondée en 2019 par Fethi Mabrouka et Rachaïd Kaïd"; started as "Smash & Shake" in "9 m² à Colomiers"; "En rejoignant NSUP début 2025, la nouvelle entité Master Big Smash créée par la maison mère de New School Tacos"; NSUP "pilotée par Selim Jaouadi et Anthony Mazzone"; goal "champion français du smash burger"; franchise lead Benjamin Schmit (ex-Black & White, Nobi Nobi) to reach "dix ouvertures par an". bigsmash.fr presents Selim Jaouadi as the founder figure. Legal notice names "Smash N Shake". | https://www.snacking.fr/actualites/7689-Big-Smash-accelere-et-prepare-un-format-in-store-a-Fenouillet-aux-cotes-de-New-Schoo/ (19 Sep 2025) ; https://www.bigsmash.fr/franchise ; https://www.bigsmash.fr/mentions-legales | [verified] article; facts [claim] |
| Format | Target 100 m², about 10 staff per restaurant; shared stores with New School Tacos: "Sur 210 m², Big Smash et New School Tacos cohabiteront … mutualisant l'outil de production". Late hours: up to 01:00–02:00 at weekends at some sites. | https://kapp-retail.com/enseignes/big-smash ; Snacking article above ; bigsmash.fr | [claim] / [verified] |
| Franchise economics | "25K de droit d'entrée", "80K d'apport minimum", "1,1M CA moyen franchisé à 2 ans", "5% Redevance métier", "2% Redevance marketing", "Investissement global 300 K€", "Durée du contrat 7 ans", "ROI cible 3 ans". | https://kapp-retail.com/enseignes/big-smash (page dated 2026-10-02) | [claim] (broker listing) |
| Menu prices | Burgers €6.90–8.90; meal deals €8.90–11.90, mostly **€9.90** ("MENU SMASH CLASSIC 9.90 €"); "BIG COMBO 14.90 €" (two burgers); kids' menu €6.90; sides €3.00–5.50. | https://www.bigsmash.fr/la-carte | [verified] |
| Web ordering | shop.bigsmash.fr = 6XPOS-branded white-label shop (assets on cdn.6xpos.shop/bigsmash and cdn.yalik.fr/6xpos; back office `"boUrl":"https:\/\/bo.tereza.fr"`, i.e. the Tereza platform, whose name matches the Android app's developer). Its route table can import products from 6XPOS (`produits/import-6xpos`) **or Zelty** (`import.zelty`), plus Hey Pongo, Merim, Uber Direct hooks. One service per restaurant, "Click & Collect"; payment "CB" via Stripe. Checkout: cart → service → "Heure de la commande" → summary → payment; `unit_duration: 15`, `min_delay_before_book: "0 minute"`, `max_delay_before_book: "2 days"`. No ASAP option, no wait-time display. Banner "-15% SUR TA PREMIÈRE COMMANDE". | https://shop.bigsmash.fr/toulouse-matabiau/produits ; JS bundle https://shop.bigsmash.fr/build/assets/Checkout-502fbc3a.js | [verified] |
| Order status | Confirmation page: "Confirmée → Préparation → Prêt", order number, "Heure de retrait"; **no polling or websocket**, so it updates only on reload. | https://shop.bigsmash.fr/build/assets/Confirmation-613de61f.js | [verified] |
| Kiosks | "nos bornes en restaurant" (FAQ). Vendor not found. | https://www.bigsmash.fr/ | [verified] existence; vendor [unverified] |
| Till / kiosk vendor | Not named anywhere. 6XPOS is likely: the web shop is 6XPOS-branded (though its platform also supports Zelty imports, so Zelty cannot be excluded); 6XPOS sells till + kiosk + kitchen screen + call screen; 6XPOS says the Avomark loyalty Big Smash uses is built into its till and kiosk; sister brand New School Tacos is a named 6XPOS client whose own shop (shop.newschooltacos.fr) is also 6XPOS; 6XPOS has an office in Cugnaux (Toulouse). 6XPOS client lists do **not** name Big Smash. | https://6xpos.fr/programme-de-fidelite/ ; https://6xpos.fr/ils-nous-font-confiance/ ; https://shop.newschooltacos.fr/points-de-vente | [unverified] inference |
| Apps | iOS "Big Smash" by developer **ZEY**, released 2026-01-09, v1.0, 0 ratings; Android "Big Smash" by **Tereza Apps**, 100+ downloads; the screenshots show the 6XPOS slot screen. Not linked from bigsmash.fr. | https://apps.apple.com/fr/app/big-smash/id6754971454 ; https://play.google.com/store/apps/details?id=fr.tereza.bigsmash | [verified] |
| Delivery | Uber Eats links for 10 sites, Deliveroo for 9; Fenouillet and Lyon Uber links open in pickup mode (`diningMode=PICKUP`); delivery marked "EN COURS" for six sites. Montpellier "Commander en livraison" → commandes.bigsmash.fr/order/ on **Delicity**. | https://www.bigsmash.fr/ ; https://commandes.bigsmash.fr/order/ | [verified] |
| Loyalty | bigsmash.macarte.club (Avomark MaCarte white-label). | https://bigsmash.macarte.club/ | [verified] |
| QR in restaurant | None found on site, shop services or press. | — | [verified absence on pages checked] |

**Implications**
- **The royalty is a percentage (5 % + 2 %).** Unlike O'Crousti's fixed royalty, every euro a franchisee gains pays the head office 7 cents. Two consequences: the uplift argument works at head-office level, and online sales must flow into each restaurant's declared revenue (reconciliation is a head-office question, not just an accountant's).
- **The comparison set is "switch on the 6XPOS module" vs "add Ominin".** Ominin is not replacing Uber delivery, nor (yet) the kiosks.
- **The app experiment has not worked.** 0 ratings and 100+ downloads support the "no app to download" argument.
- **Shared Big Smash × New School stores** (Fenouillet, Lyon) suggest a group-level deal (NSUP, ~40 New School restaurants) if the pilot works. Do not lead with it.
- **Name traps:** "Smash Smash", "Smashy Burger", "Smash Theory", "Starsmash" and "O'Smash" are different businesses.

---

## 2. Alternatives by category: model, prices, till requirement, references

### 2.1 Delivery platforms used as click & collect

**Uber Eats (pickup, Uber Direct)**
- **Pickup commission (Standard plan): about 15 %.** Measured: "15,0 % du montant TTC sur 99 % des commandes à emporter" over "20 587 commandes terminées" in 4 Moselle restaurants, Jul 2025–Aug 2026 [verified, https://restaurenta.fr/blogs/blog/commission-uber-eats-vraie-marge, modified 2026-09-25].
- **Official page (3 Oct 2026):** Standard 30 % with "Frais de service réduits à 15 % sur les commandes à emporter"; Premium 33 % with "-10 % sur les frais de service pour les commandes à emporter" (23 % if read as 10 points off; ambiguous); €1.99/week [verified, https://merchants.ubereats.com/fr/fr/pricing/]. **Caveat:** the footnote still says "uniquement disponibles au Japon". Do not quote it as the French contract.
- **Uber Direct:** "Prix à partir de 5,90 € HT par livraison" [verified, https://merchants.ubereats.com/fr/fr/services/uber-direct/].
- **Uber "order.store" branded storefronts** exist in France (Blend, Bioburger use them) [verified, https://www.order.store/brand/blend]. No public price.
- **Strength Ominin lacks:** marketplace reach (new customers).

**Deliveroo (DoorDash since 2025-10-02)**
- No official French rate card. The "12 % commission on Pickup orders" quoted by French blogs traces to a UK COVID-era page (https://go.deliveroo.com/pickup) [verified]: not a French rate.
- Third-party estimate (Fooderise): Lite 14 % HT, Plus 22–25 % HT, Premium 27–30 % [claim, https://www.fooderise.com/fr/blog/commission-deliveroo-restaurant-france-pourcentage-2026, 2026-05-15].

**Delicity (Nice) — used by Big Smash Montpellier**
- "en direct & sans commission"; claims 3,000+ partner restaurants [claim, https://delicity.com/].
- Press (2022): restaurants pay about **€1 per order plus delivery cost** [claim, https://nicepresse.com/delicity-la-start-up-nicoise-et-ethique-qui-defie-les-geants-americains-et-ca-cartonne/].
- Tariff page: "4 offres", no public prices [verified, https://pro.delicity.com/tarif].
- Also used by Black & White Rennes, Smash Theory, historically Big Fernand [verified/claim].

### 2.2 Till ecosystems with ordering, QR or kiosk modules (a till change is required)

| Vendor | What | Pricing model and published prices | Till requirement | Burger / fast-food references | Notes / status |
|---|---|---|---|---|---|
| **6XPOS** (IXCYS group; Mérignac, Cugnaux, Sainte-Savine) — **Big Smash's web-shop vendor** | NF525 till; kiosks 22/27/32"; order pad; kitchen screen; "Écran d'appel client"; drive; Click & Collect; **"QR Code à table"**; loyalty via Hey Pongo or Avomark; API "on request" | "6x starter … à partir de 49€ Facturé par mois hors matériel > licence NF525 1 caisse"; "6x advance … à partir de 155€ … licence NF525 1 caisse > licence 1 borne de commande > licence 1 KDS"; "6x custom" on quote. QR/C&C module prices not published. | Own ecosystem | New School Tacos ("New School Tacos – Commande digitalisée avec 6XPos"), Steak n Shake, Str'eat Burger, Burger Way, Captain Burger, HFC, G33 Tacos, Nobi Nobi | Prices [verified, https://6xpos.fr/tarifs/]; modules [verified, https://6xpos.fr/qr-code-a-table/ , https://6xpos.fr/ecran-client/]; vendor claim kiosk "+15% à 30%" ticket [https://6xpos.fr/borne-de-commande/]. Its QR page does not mention paying at the table [verified]. |
| **Innovorder** (Paris) | Till, kiosks, C&C, QR "Click & Serve", KDS, Order Display System | **Not published.** Third party: "à partir de 79€ HT /mois" [https://fr.mobiletransaction.org/innovorder-avis/, 2025-12-04]; "Growth … 299€/mois pour 2 à 10 points de vente" [https://tool-advisor.fr/logiciel-de-caisse/comparatif/innovorder/, 2026-07-10]. Kiosk "€2,000 and €15,000"; "€6,000 financed over 36 months … €190 to €210" per month [https://www.innovorder.com/en/blog/price-self-ordering-kiosk]. | Own ecosystem | **Smash Smash**, BCHEF, Double XL [on innovorder.com, claim]; Big Fernand (commande.bigfernand.com loads Innovorder) [verified]. Quick: third-party mentions only (dropped vs 29 Sep). | Raised €20M (June 2026), forecasts €15M revenue; Acrelec co-founder on the board [verified, https://www.maddyness.com/2026/06/04/innovorder-leve-20-millions-deuros-pour-digitaliser-les-restaurants-et-cantines-en-europe/]. Vendor claim: kiosk ticket €16.60 vs €12.37. |
| **Zelty** (Paris) | iPad till; kiosk, online ordering, KDS, delivery add-ons | Not public. Leaked licence sheet via third party: "89 € HT par mois et par établissement … 59 € pour la borne et 60 € pour la commande en ligne"; KDS +€19 | Zelty till | Bioburger (bioburger.zelty-order.fr) [verified]; ordering accounts exist for PNY, Big Fernand, Les Burgers de Papa [verified exist]; Blend logo on Zelty page [claim] | [claim, https://www.lacaisseideale.fr/articles/zelty-avis/, 2026-07-23] |
| **Lightspeed Restaurant** | Till; Order Anywhere (QR/takeaway); kiosk via integrations | "Basic 89 € /mois", "Core 159 €", "Pro 249 €"; QR "En supplément"; kiosk "des frais supplémentaires peuvent s'appliquer" | "uniquement compatible avec Lightspeed Restaurant (K Series)" | — | [verified, https://www.lightspeedhq.fr/caisse/restaurant/pricing/ ; …/order-anywhere/] |
| **SumUp (ex-Tiller) Order & Pay** | QR order & pay, order-ahead | "49 € Tarif mensuel Caisse Plus / 2,50 % Frais de transaction"; the tariffs page also shows Caisse Plus at "39 €": treat as €39–49 | SumUp till | — | [verified, https://www.sumup.com/fr-fr/order-and-pay/ ; https://www.sumup.com/fr-fr/tarifs/] |
| **Square** (France) | Till; online ordering; kiosk; KDS | "Gratuit 0 €/mois"; "Plus 59 € HT/mois … par point de vente"; online ordering "Niveau gratuit inclus"; KDS "15 € HT/mois par appareil"; kiosk "30 € par mois, par appareil" after a 30-day trial; kiosk stand "139 € HT"; online cards 1.4 % + €0.25 EEA; in person 1.65 %; in store accepts "titres-restaurant numériques (Edenred, Swile (Bimpli, Natixis), Sodexo et UpDéjeuner)" | Square POS | — | [verified, https://squareup.com/fr/fr/point-of-sale/restaurants/pricing ; https://squareup.com/fr/fr/payments/pricing]. **Ominin already pushes orders into Square POS** (internal). |
| **Popina / Jalia / Splash (JDC)** | Till; Foxorder C&C; kiosks | Popina "39 à 55 € HT/mois"; real quote €99 HT/month over 47 months + first rent €521.40 HT; Foxorder "39 € HT/mois" [claim, https://www.entrepreneurhero.fr/logiciels-de-caisse/avis-popina-jdc/, 2026-03-16]. Splash kiosks: "On chiffre pendant la démo" [verified, https://splash360.fr/borne-de-commande/] | Own till | Class'Croute | — |
| **L'Addition** | Till with QR and C&C modules | Official: quote only. Third party: "49 €/mois HT" software, "85 €/mois HT" with hardware | Own till | — | [verified / claim, https://www.lacaisseideale.fr/articles/laddition-avis/] |
| **Cashpad, Hiboutik, Hiopos, Clyo** | Tills | Cashpad: not published [verified]. Hiboutik: "GRATUIT / Options payantes facultatives", third-party Premium €16.90/month, includes QR ordering and "order ready notification" [verified/claim]. Hiopos: not published. Clyo: site blocked. | Own tills | — | https://www.cashpad.io/tarifs ; https://www.hiboutik.com/fr/ ; https://www.hiopos.com/fr/ |
| **Zenchef** (booking, merged with CoverManager July 2025) | Booking; C&C and pay-at-table usage-based | "Reserve €129/mois", "Manage €169", "Grow €249"; card fees "6% / 4% / 2%"; 1-year minimum | Integrations | None in fast food | [verified, https://www.zenchef.com/fr/tarifs]. Not relevant to a counter format. |

### 2.3 Ordering layers that work with an existing till

| Vendor | What | Pricing model and published prices | Till / kitchen integration | Burger / fast-food references | Notes / status |
|---|---|---|---|---|---|
| **Sunday** (Paris) | QR pay-at-table, digital ordering, C&C, terminals, loyalty, kiosks | "Starter 29€ par mois", "Standard 99€", "Premium 199€"; C&C "+29€/mois", Commande digitale "+49€/mois", Fidélité "+49€/mois", Prépaiement "+29€"; install "49€" Paris / "299€" elsewhere; QR A7 "3€". Transaction fees not published. HT not stated. | POS integrations | **PNY**: "On a constaté une augmentation de 8 % du panier moyen" — but the article is labelled "[Publi-reportage]" (sponsored) [verified, https://www.lhotellerie-restauration.fr/actualite/chez-pny-les-moyens-de-paiement-de-sunday-ont-tout-change, 28 Oct 2025] | Prices [verified via fetch tool, https://sundayapp.com/fr/tarifs/]. Expansion: "3 000 restaurants partenaires, dont 1 500 en France"; "kiosks dans plus de 300 lieux d'ici l'été prochain" [verified, https://www.maddyness.com/2025/11/12/sunday-spin-off-de-big-mamma-leve-18-millions-deuros-pour-poursuivre-sa-conquete-du-marche-americain/]: no evidence found that this happened. |
| **Obypay** | QR order & pay, C&C, kiosk, loyalty | "49€ HT / mois / établissement"; third party: C&C "59€ HT", "pack expert" "199€ HT"; "Notification SMS du consommateur lorsqu'une commande est prête" | HubRise-connected; Lightspeed | Agapes (Flunch, 3 Brasseurs) | [verified, https://pro.obypay.com/abo/obypay ; claim, https://www.digital-restaurateur.fr/obypay] |
| **Deliverect / Tabesto** | Aggregator-to-till; Tabesto kiosks and "Direct" QR/C&C | Deliverect: quote only [verified]. Tabesto: "First kiosk 179€ HT", "Additional kiosk 40€ HT"; setup "Estimated total: 780€/location"; payments "IC++ … 0,70% + 0€"; QR/C&C "Request a quote" | POS connectors | Tabesto: Tacos Avenue, Waffle Factory, Gyraya | [verified, https://www.deliverect.com/en/pricing ; https://tabesto.com/en/tarifs] |
| **FLYX** (Brussels) | Kiosk, C&C, app, loyalty, middleware | Not published | Middleware | **O'Tacos** (case study, 2025-02-10) | [verified page; claim case study, https://www.flyx.cloud/en/blog/customer-testimonial-otacos-a-groundbreaking-digital-transformation-with-flyx/] |
| **Belorder** | White-label web/app ordering, kiosks, loyalty | Not found | — | **Black & White Burger** (commande.bnwburger.com; iOS app "Black And White" by BELORDER), **Burger & Fries** (order.burger-fries.com) | [verified, page source] |
| **Dood** (Lyon) | C&C, QR, kiosks, CRM | Not published | Many tills | **PNY** (order.pnyburger.com), **Bill's Burger** | [verified, page source] |
| **Châtaigne** | WhatsApp ordering | "Forfait, sans commission"; amounts not published | 100+ tills | **PNY** homepage "commander" link opens WhatsApp [verified]; Chicken Street | https://chataigne.ai/ |
| **HubRise** (connector: a realistic route to till integration) | Order hub between apps and tills | "€35 Excl. VAT / location / month"; "Locations 1 to 5 €35 / 6 to 30 €30 / 31 and more €27"; "No Setup Fee" → 10 sites = **€325/month** (computed) | POS pages for Zelty, Lightspeed, Jalia, Popina, Clyo; **6XPOS not listed** | — | [verified, https://www.hubrise.com/pricing] |
| **Eatself** (Clyo) | Online ordering, table ordering, kiosk mode | "79 € Par mois"; "Option 'Borne de commande' pour 49 € / mois supplémentaire"; annual "63€ / mois" | via HubRise/Clyo | — | [verified, https://www.eatself.com/] |

### 2.4 Cheap QR / click & collect tools (Ominin's price-sensitive rivals)

| Vendor | Model | Published price | Printing / till | Chain references | Status |
|---|---|---|---|---|---|
| **ClickEat** (closest analogue: "borne sur téléphone") | Flat fee + own payment fee | "Forfait Pro Flash 59€ /mois HT Tarif fixe. Engagement d'un an … Borne sur téléphone / Commande à table … Paiement en ligne : 1%+10cts"; "Paiement via tous les Titres Restaurant"; both plans 99 €/month promo | Zelty, Redbiscuit, or via Rushour/Deliverect/Otter | Logos: Blend, Junk, Bagelstein, Bumpy, Groupe Bertrand | [verified, https://www.click-eat.fr/tarifs] |
| **Qwick Order** | Subscription + per payment | "Early 29€/mois + 0,15€ par paiement en ligne", "Standard 39€ + 0,15€", "Pro 69€ + 0,10€"; Stripe fees on top | Few integrations | None named | [verified, https://qwickorder.fr/] |
| **commande-restaurant.com** | Flat fee | "Starter (29€/mois) / Essentiel (39€/mois) / Premium (49€/mois)"; "0% de commission" | Prints to 80 mm thermal printers via a PC app | None named | [verified, https://commande-restaurant.com/] |
| **Brewbook** | **Percentage, no subscription** | "Brewbook · 2 % sans abonnement" | Square integration | None | [verified, https://brewbook.fr/blog/click-and-collect-restaurant-prix-comparatif.html] |
| **GetEat** | Free | "Solution gratuite … Commission GetEat 0%", payment via the merchant's own Stripe; QR "en vitrine ou au comptoir" | Staff smartphones | None named | [verified, https://geteat.fr/] |
| **GloriaFood** (Oracle) | Free core | "GloriaFood will reach end of life on April 30, 2027" | — | — | [verified, https://www.gloriafood.com/] |

### 2.5 Self-order kiosks: vendors and what a kiosk really costs in France

**Vendors relevant to burger chains**
- **Acrelec (Glory):** Glory bought the remaining shares on 26 Nov 2025; "over 120,000 installations across more than 70 countries" [verified, https://acrelec.com/glory-acquires-remaining-equity-shares-in-acrelec-group/]. Supplies McDonald's France since 2008 [claim] and Burger King (Acrelec K27 kiosks for a BK immersive concept, PR) [claim, https://www.prnewswire.com/news-releases/acrelec-kiosks-selected-to-deploy-burger-king-activision-immersive-in-restaurant-experience-301662055.html]. Price not published.
- **6XPOS:** kiosk licence bundled in "6x advance" from €155/month (till + kiosk + KDS licences, hardware excluded) [verified].
- **Innovorder, Tabesto, FLYX, Square, Eatself:** see tables above.
- **Biborne, Wawacom, iMin resellers, Borneasy (€79/€149/€349 per month; tiny vercel.app site, low credibility), Pyramid Polytouch (no price)** [verified].

**Typical kiosk cost in France (ranges from several sources, most of them vendors)**

| Cost line | Range (exact quotes) | Sources [all verified 2026-10-03] |
|---|---|---|
| Hardware purchase | Biborne "2 000 € et 7 000 € HT"; Wawacom entry "1 500 € – 3 500 €", turnkey "4 000 € à 6 000 €"; Innovorder "€2,000 and €15,000"; Qwick "2 000 € et 6 000 €" (up to 15,000) | https://biborne.com/fr-blog/quel-prix-borne-de-commande/ (mod. 2026-09-24) ; https://wawacom.fr/prix-dune-borne-de-commande-pour-fast-food-restaurant/ (2026-04-08) ; https://www.innovorder.com/en/blog/price-self-ordering-kiosk ; https://qwickorder.fr/blog/borne-de-commande-restaurant (2026-08-09) |
| Lease / rental | Biborne "90 € et 250 € HT par mois"; iMin "237 € à 345 € HT/mois", 48-month "Borne seule : à partir de 329 € HT/mois" (autumn promo "borne + caisse + TPE à 149 € HT/mois") | biborne URL ; https://www.ajmonetic.com/details-prix+borne+de+commande+fast+food+imin-408 |
| Software | Biborne "40 € et 100 € / mois"; Tabesto article "40€ to 200€ per kiosk"; Tabesto list "179€ HT" first kiosk, "40€" each extra; Square "30 € par mois, par appareil"; Eatself +€49 | https://www.tabesto.com/en/articles/whats-the-cost-of-a-self-order-kiosk-for-restaurants (2025-11-13) ; https://tabesto.com/en/tarifs |
| Installation | Biborne "500 € et 1 500 €"; Tabesto "780€/location" | as above |
| 3-year total per kiosk | Qwick (competitor) "8 000 à 15 000 € par borne" | qwickorder URL |

**Illustration for Big Smash (computed, list prices, 1 extra kiosk in each of 10 restaurants):** at €2,000–7,000 per unit, **€20,000–70,000 of hardware**, plus €40–200/month of software each (**€4,800–24,000 a year**). Ominin's setup kit at the current list price is **€109 per restaurant (€1,090 for 10)**. Kiosks also take floor space in a 100 m² unit. Gira's Bernard Boutboul: « la borne de demain, c'est notre smartphone » and McDonald's « prévoient de supprimer les bornes dans les cinq années à venir … qui de surcroît, prennent des places assises » [verified, his own account, not a McDonald's statement; https://officieldelafranchise.fr/bornes-de-commande-en-restaurant-une-fausse-bonne-idee/, 27 Aug 2024].

**Candour:** Big Smash already owns kiosks. The pitch is not "replace your kiosks" but "add capacity at the peak without buying more kiosks, and reach the customer before they reach the queue".

---

## 3. What comparable burger and smash chains use

Vendor identified from the chain's own ordering pages (page source, JavaScript bundle) or app-store developer, 2026-10-03, unless marked otherwise.

| Chain | France units | Kiosk (vendor) | Own app (developer) | Web C&C (vendor) | QR order/pay | Delivery | Loyalty | Sources |
|---|---|---|---|---|---|---|---|---|
| **Big Smash** | 10 [verified list] | Yes; vendor not found (6XPOS likely) | ZEY / Tereza Apps, little used [verified] | **6XPOS** slots [verified]; Delicity (Montpellier) | None found | Uber Eats, Deliveroo | Avomark MaCarte | §1 |
| **New School Tacos** (founder's chain, same group) | "une quarantaine" [claim, https://www.toute-la-franchise.com/news-new-school-tacos-10-ans, 2026-08-10] | 6XPOS logo "Commande digitalisée avec 6XPos" [verified]; kiosks probable | No current official app found | **6XPOS** shop.newschooltacos.fr, C&C + Livraison [verified] | None found | Yes | Not found | https://6xpos.fr/borne-de-commande/ ; https://shop.newschooltacos.fr/points-de-vente |
| **Black & White Burger** | 35 FR + 9 BE; "1,1 million d'euros de chiffre d'affaires moyen par restaurant et un panier moyen de 20 euros" [claim, 22 May 2026] | Belorder [unverified snippet] | "Black And White" by **BELORDER** [verified] | **Belorder** commande.bnwburger.com [verified]; Rennes on **Delicity** [verified] | Not found | Uber Eats, Deliveroo | Belorder points | https://lexpress-franchise.com/articles/black-white-burger-50-restaurants-france-45-m-de-ca-et-expansion-internationale/ ; https://commande.bnwburger.com/ |
| **Smash Smash** | Not verified; "1er réseau de smash burgers en France" (self) [claim] | **Innovorder** (franchisee testimonial) [claim] | Not found | Probably Innovorder | Not found | Yes | Not found | https://www.innovorder.com/borne-de-commande ; https://www.toute-la-franchise.com/franchise/smash-smash |
| **Big Fernand** | ~50–60 [unverified] | Not found | Not found | **Innovorder** commande.bigfernand.com [verified]; Zelty ordering account exists | Not found | Yes | Not found | https://commande.bigfernand.com/home/places |
| **PNY** | "8 restaurants à Paris" [verified] | Not found | Not found | **Dood** order.pnyburger.com [verified]; **WhatsApp via Châtaigne** [verified] | **sunday** pay-at-table (sponsored article) [claim] | — | Not found | https://www.pnyburger.com/ ; lhotellerie URL above |
| **Blend** | 3–5 [unverified] | Not found | Not found | **Uber order.store** [verified] | Not found | Uber | Not found | https://www.order.store/brand/blend |
| **Five Guys France** | ~38–41 [unverified] | "la borne digitale dans certains restaurants" [verified]; vendor not found | "Five Guys" by Five Guys JV Ltd [verified] | Own shop order.fiveguys.fr, vendor unknown [verified] | Not found | Deliveroo | Five Guys Rewards (Wallet) [verified] | https://fiveguys.fr/faqs/ |
| **Bioburger** | ~23 [verified site list] | Not found | Not found | **Zelty** bioburger.zelty-order.fr [verified] | Not found | Uber order.store, Uber Eats, Deliveroo | Programme page | https://www.bioburger.fr/commander/ |
| **Burger & Fries** | 5 (Paris area) [verified] | Not found | Not found | **Belorder** [verified] | Not found | Uber Eats | Mentioned | https://order.burger-fries.com/ |
| **O'Tacos** | 400+ [unverified] | **FLYX** [claim] | "O'Tacos Officiel" [verified] | **FLYX** [claim] | Not stated | Yes | FLYX loyalty | FLYX case study |
| **BCHEF** (+ Les Burgers de Papa) | 55 + 21 [unverified] | **Innovorder**; Vannes franchisee: "Mes bornes assurent un flux moyen de 2000€/jour" [claim] | Not found | Probably Innovorder | Not found | — | Les Burgers de Papa: Hey Pongo [verified] | https://www.innovorder.com/borne-de-commande |
| **Steak n Shake France** | ~33 [unverified] | Yes ("Nous passons aux bornes", Calais franchisee) [claim]; **6XPOS logo** [verified] | FR Play listing returns 404 [verified] | Geolocated C&C (older) [claim] | Not found | Uber Eats | — | https://6xpos.fr/borne-de-commande/ |
| **Bill's Burger** ("first smash burger chain", 2019) | Not verified | Borneo page [unverified] | Dishop | **Dood** + **Dishop** [verified] | Not found | — | — | https://bills-burger.fr/ |
| **Quick** | "135 restaurants en France" (Apr 2024) [claim] | Yes: "95 % des commandes passées sur borne" (Mar 2025) [claim, trade press] | "Quick France" [verified] | In app [verified] | Table ordering "d'ici la fin du premier trimestre 2025" (announced) [claim] | Yes | Qlub Quick | https://www.republik-retail.fr/strategie-retail/enseignes/de-la-relance-a-la-conquete-quick-accelere-et-vise-l-europe.html ; https://www.republikgroup.com/articles/2a7923dc-bbb2-f111-a6a7-6045bd9f5987/Quick,%20le%20Petit%20Poucet%20du%20burger%20en%20pleine%20dynamique |
| **Burger King France** | "532 restaurants" end-2023; 600th opened Nov 2025 [claim] | Yes; CEO: "il préfère la borne", "quasiment 100 % des commandes passent par le digital" [claim, Républik Retail 3 Dec 2025]; Acrelec in a BK concept PR [claim] | "BURGER KING France" [verified] | In app + "King Delivery" [verified] | **"King Table" generalised to the French network** in April 2024, "pour désengorger les files d'attentes, aux bornes comme aux comptoirs" [verified article] | Yes | Kingdom ("plus de 3 millions de membres actifs") [claim] | https://apps.apple.com/fr/app/burger-king-france/id924879230 ; https://www.snacking.fr/actualites/6904-Burger-King-generalise-la-commande-a-table/ ; https://www.republik-retail.fr/strategie-retail/enseignes/burger-king-accelere-nouveaux-formats-ia-en-cuisine-et-concept-miami-en-2026.html |
| **McDonald's France** | ~1,500 [unverified] | Yes (Acrelec since 2008) [claim] | McDo+ [verified] | C&C, "Click & Ready" geofenced [verified] | **Yes, in the app: "Service à Table : … scannez le QR code via l'app McDo+, commandez depuis votre mobile … on vous apporte votre commande directement à table"** [verified] | Yes | McDo+ points | https://apps.apple.com/fr/app/mcdo-faites-vous-livrer/id324887734 ; https://www.mcdonalds.fr/cgv |
| **Popeyes France** (chicken + burger) | ~20–26 [unverified] | Not found | No FR app found | Custom web app (Checkout.com payments) [verified in JS] | Not found | Uber | — | https://popeyesfrance.fr/ |

Other smash chains seen: **Junk** ("17 restaurants ouverts" incl. Toulouse, "30 M€" expected in 2025, founded 2021) [claim, https://resto.zepros.fr/snacking/burger-poulet/junk-pose-ses-smash-burgers-dubai]; its ordering stack was not checked, but ClickEat ("borne sur téléphone") shows a Junk logo among its clients, linking to junkburgers.co.uk (possibly the UK business only) [verified logo; use unknown]; Ça Va Smasher ("huit adresses" in Île-de-France in Oct 2024 per Franchise Magazine, read through a fetch tool; 15 units per a directory [unverified]), Dumbo (Paris) [unverified], Starsmash (Amixem; "plus de 100 cuisines", delivery-led) [verified site], Smashy Burger (Marseille) [unverified]. "Smash Bros" and "Le Smash" were not found as chains; "Burger Theory" appears to be a single restaurant.

**Reading the table**
- **The majors have moved past kiosks to the phone.** McDonald's runs table service through a QR code in its app; Burger King generalised "King Table" in April 2024 explicitly to relieve kiosk and counter queues; Quick announced table ordering for 2025. BK's CEO says "quasiment 100 %" of orders are digital, KFC "plus de 80 %" of sales [claims]. They do it inside their own apps, which a 10-unit chain cannot afford to build and whose customers won't download (Big Smash's app: 0 ratings).
- **Every premium/smash chain has web click & collect, almost always slot-based, with no live status.** That is exactly Big Smash's current state.
- **No smash-burger chain was found offering QR ordering in the restaurant.** Big Smash could be first in its tier. The incumbent vendors (6XPOS, Innovorder, FLYX) all sell a QR module, so the "first" window is open but not exclusive.
- **Franchisees add tools locally** (Big Smash Montpellier and Black & White Rennes on Delicity). A single network-wide tool chosen by the head office is a known gap.

Industry data points (see 03 for full quotes): NPD 2021: in French fast food "une commande sur 10" was digital; McDonald's France: digital "over half of sales" (2022, kiosks included). Black & White's "panier moyen de 20 euros" (2025, company claim via franchise press) is the only published average ticket from a premium burger chain found; Big Smash's menus mostly cost €9.90.

---

## 4. Pricing models compared (list prices; our arithmetic)

**Per-restaurant platform cost per month (computed).** Card processing excluded, since every option incurs it (but see the note on ClickEat and Tabesto below). Ominin's fee applies only to orders paid online; the 1 % and 3 % columns are the ends of the range.

| Online orders per restaurant per month | Ominin 1 % | Ominin 3 % | Uber Eats pickup ≈ 15 % | ClickEat €59 flat (1-yr commitment) | Eatself €79 | Sunday Starter + C&C + digital ordering (€107 + undisclosed txn fees) | 6XPOS "6x advance" (€155, till + 1 kiosk + KDS; already paid if in use) | Tabesto kiosk (€179 + ~€780 set-up + hardware) |
|---|---|---|---|---|---|---|---|---|
| €1,000 | €10 | €30 | €150 | €59 | €79 | €107+ | €155 | €179 |
| €3,000 | €30 | €90 | €450 | €59 | €79 | €107+ | €155 | €179 |
| €5,000 | €50 | €150 | €750 | €59 | €79 | €107+ | €155 | €179 |
| €10,000 | €100 | €300 | €1,500 | €59 | €79 | €107+ | €155 | €179 |
| €20,000 | €200 | €600 | €3,000 | €59 | €79 | €107+ | €155 | €179 |

**Break-even online revenue per restaurant per month** (above which Ominin costs more than the flat fee; computed):

| Flat alternative | at Ominin 3 % | at Ominin 1 % |
|---|---|---|
| ClickEat €59 | ≈ €1,970 | ≈ €5,900 |
| Eatself €79 | ≈ €2,630 | ≈ €7,900 |
| Sunday €107 | ≈ €3,570 | ≈ €10,700 |
| Obypay Expert €199 | ≈ €6,630 | ≈ €19,900 |
| Tabesto €179 | ≈ €5,970 | ≈ €17,900 |

**Big Smash scale (computed from its own "3K CA moyen/jour", i.e. ≈ €90,000/month per restaurant at 30 days):**

| Share of revenue ordered and paid online | Online €/month/restaurant | Ominin at 1 % | Ominin at 3 % | Network of 10 at 3 % | Same orders on Uber pickup (15 %) |
|---|---|---|---|---|---|
| 5 % | €4,500 | €45 | €135 | €1,350 | €675 |
| 10 % | €9,000 | €90 | €270 | €2,700 | €1,350 |
| 20 % | €18,000 | €180 | €540 | €5,400 | €2,700 |

What this shows, honestly:
- At Big Smash's volumes, **a flat-fee tool becomes cheaper on paper once online orders pass a few thousand euros a month per restaurant**, especially at the 3 % tier. The decreasing tiers are what keep Ominin competitive at volume: decide the tier thresholds before the meeting, from these numbers.
- The fair comparison is not with the 6XPOS licence itself, which Big Smash presumably already pays, but with **the unknown price of switching on 6XPOS's QR module** (not published). Ask, or let Big Smash say it.
- **Payment processing differs by vendor:** ClickEat advertises "1%+10cts" processing and Tabesto "IC++ 0,70 %", both cheaper than Stripe standard (1.5 % + €0.25). Ominin's all-in per order at Big Smash's €9.90 menu is **€0.50 (5.0 %) at 1 %** and **€0.70 (7.0 %) at 3 %** with a standard EEA card; for a €19.80 two-menu order, €0.75 (3.8 %) and €1.14 (5.8 %) (computed, Stripe https://stripe.com/fr/pricing).
- **A counter card costs about 1.4–1.75 %** (Stripe Terminal "1,4 % + 0,10 €", SumUp "1,75 %", Square "1,65 %") [verified]. Moving a counter customer to the phone therefore costs roughly €0.35–0.55 more per €9.90 menu. Recovered peak sales and ticket uplift have to cover that.
- **Royalty angle (hypothetical, computed):** if the pilot showed a 2 % sales uplift on €90,000/month, that is €1,800 more sales per restaurant, i.e. **€126/month more royalties and marketing fees** for the network (7 %), before any cost. Use only once the pilot has measured a real number.
- **Setup:** Ominin's kit (€109 per restaurant at list) vs a kiosk at €1,500–7,000.

---

## 5. Predicted ready time (ETA) offered to customers

| Who | What the customer gets | Predicted? | Source / status |
|---|---|---|---|
| **Big Smash today (6XPOS shop)** | Customer picks a 15-minute slot; confirmation page "Confirmée → Préparation → Prêt" that updates only on reload | **No** | shop.bigsmash.fr JS bundles [verified] |
| 6XPOS | "Écran d'appel client": shows in real time which orders are ready / in preparation | No (status only) | https://6xpos.fr/ecran-client/ [verified] |
| McDonald's France | "la préparation de la Commande en Restaurant ne peut en aucune manière intervenir avant la présentation du Client"; "Click & Ready" starts preparation when the customer is near; arrival "dans un délai maximum de 5 minutes" | **No**: avoids prediction | https://www.mcdonalds.fr/cgv [verified] |
| McDonald's "Ready on Arrival" (US pilot) | Geofenced start; "a 62-second reduction in wait times for mobile pickup customers" | No customer estimate | https://www.restaurantdive.com/news/McDonalds-doubles-down-geofencing-loyalty-growth/701753/ (11 Dec 2023) [verified] |
| Burger King France | Start preparation ~5 min before arrival (same model) | No | support.burgerking.fr (403) [unverified] |
| Innovorder | Order Display System: orders "being prepared" / ready; "track the preparation of their order in real time" | No | https://www.innovorder.com/en/order-display-system [verified] |
| Obypay | "Notification SMS du consommateur lorsqu'une commande est prête" | No | https://pro.obypay.com/abo/obypay [verified] |
| Deliverect | Statuses Preparing / Prepared / Pickup Ready; holds orders using average prep time | Internal only | https://developers.deliverect.com/page/order-status [verified] |
| Square Online (US help page) | "automatic timing calculations" from "required prep time per order" and capacity → computed pickup time | Rule-based, not learned; French availability not checked | https://squareup.com/help/us/en/article/6866-in-store-and-curbside-pickup-with-square-online-store [verified] |
| Sunday, FLYX, Lightspeed Order Anywhere, SumUp Order & Pay, Qwick, ClickEat, Eatself, GetEat | No ETA wording found | No | pages above [verified absence] |
| Starbucks (North America) | "five-minute pickup windows … reflect real-time availability", "powered by Starbucks' Smart Queue algorithm" | **Yes, dynamic** | https://www.nrn.com/restaurant-technology/starbucks-will-soon-let-you-plan-your-pickup-times [verified] |
| Chipotle (US) | "Smarter Pickup Times"; in tests "a reduction of wait times for digital orders by as much as 50%" | **Yes, capacity-based** | https://ir.chipotle.com/news-releases?item=122413 (20 Feb 2017) [verified] |
| Deliveroo | "Our algorithm learns your average prep time from every order you make" | Yes, for courier dispatch | https://help.deliveroo.com/en/articles/2152581-understanding-prep-times [verified] |

**Conclusion (medium confidence; based on absence of evidence on the pages checked).**
- In French fast food, the standard is a pickup slot or an order number, a status screen and a "ready" message. Big Smash's own flow does not even refresh live.
- **Ominin's live numbered ticket (pushed in real time until « Prête ») is already a differentiator against Big Smash's current flow.** Lead with that, because it ships today.
- A **predicted ready time** shown per order is offered only by a few large US chains. Ominin's « Prête dans environ N min » countdown exists in the demo only; present it as "next, with accuracy measured in the pilot". The method (rolling prep-time averages + a « Prête » tap as label) is the same as Deliveroo's: the moat is doing it at the counter and showing it to the customer, not the algorithm. A wrong estimate is worse than none: show a range or "about X min".

---

## 6. Where Ominin is genuinely different, and where it is weaker

### Genuine differences (supported by the research above)
1. **Live order status on the customer's phone, no app.** Big Smash's 6XPOS confirmation page updates only on reload; its apps are barely used. Ominin's ticket updates live until « Prête ». Directly matches AKTO's 70 % "bipper" finding (03 §3.1).
2. **Order now, at the counter or in the queue — not just a slot for later.** The current shop is slot-based. Ominin covers the in-store peak, the use case kiosks cover today, without buying hardware.
3. **No monthly fee and near-zero capex.** 6XPOS modules, Sunday, Obypay, ClickEat and kiosks all charge per site per month, plus kiosk hardware at €1,500–7,000. Ominin: a €109 kit and a decreasing 1–3 % only on online-paid orders. Low-adoption franchisees pay almost nothing; with a percentage royalty, the head office's interests align with franchisee sales.
4. **Pay on the phone, straight into the restaurant's own account** (Stripe direct charges, or Square). No money transits through Ominin.
5. **Works across vendors.** Prints on standard kitchen ticket printers via Omilink, or pushes into Square POS. A head-office-chosen tool that franchisees can't fragment (cf. Montpellier on Delicity).
6. **Much cheaper than Uber pickup** (about 15 % TTC) for the orders Big Smash already sends to Uber in pickup mode (Fenouillet and Lyon links).
7. **First in its tier.** No smash-burger chain found with in-restaurant QR ordering; McDonald's proves the behaviour with McDo+ table service.

### Weaker points (be candid)
1. **No 6XPOS integration.** Ominin orders would not enter the 6XPOS till (NF525), its Z report, its KDS or its royalty reporting. That means two sources of revenue truth in a network whose **royalties are 5 % + 2 % of revenue**. HubRise does not list 6XPOS; 6XPOS offers an API "on request" (price and terms unknown). If the till turned out to be Zelty, HubRise (€30–35 per site per month) is a known route. Square POS integration exists, but Big Smash is not on Square.
2. **The incumbent can match the core feature.** 6XPOS sells "QR Code à table" and a call screen; switching it on may cost Big Smash little and keeps one system.
3. **Kitchens may run on screens, not printers.** If Big Smash kitchens use 6XPOS KDS screens rather than ticket printers, Omilink printing adds a parallel ticket flow. Verify on site in the pilot restaurant.
4. **The percentage grows with success.** At Big Smash volumes (≈ €90k/month per restaurant), a flat €59–199 tool is cheaper above a few thousand euros of online orders at 3 % (§4). The tiers must be designed for this network.
5. **Payment coverage.** **Titres-restaurant**: Stripe's support is a "Version bêta privée" with a waitlist, issuers Bimpli, Pluxee, Up Déjeuner, Swile (no Edenred), CNTR approval required [verified, https://docs.stripe.com/payments/meal-vouchers/fr-meal-vouchers]; ClickEat advertises "tous les Titres Restaurant"; Square accepts digital titres-restaurant in store (online not confirmed) [verified, https://squareup.com/fr/fr/payments/pricing]. 6 M beneficiaries [verified, https://www.cntr.fr/]. France Snacking estimates the "gamelle" habit deprives chains of "576 M€ liés aux titres-restaurant" [verified, Snacking.fr 18 Jun 2025]. Cash customers stay at the counter or kiosk.
6. **Company size and continuity.** Rivals: 6XPOS (regional group with three offices), Innovorder (€20M raised), Sunday (~3,000 restaurants), Acrelec/Glory. A network adding ~10 restaurants a year will ask about late-night support (sites open until 01:00–02:00), spare boxes, onboarding capacity and what happens if Ominin stops. GloriaFood's 2027 shutdown is a live example.
7. **Adoption risk with kiosks already in store.** A QR code is easier to ignore than a kiosk in the customer's path. Adoption depends on signage, staff prompting and possibly a first-order incentive (Big Smash already runs "-15% sur ta première commande" online).
8. **No delivery aggregation or loyalty integration.** Avomark MaCarte loyalty is wired into the current stack; Ominin would need a loyalty link or would sit outside it.
9. **No chain reference yet**, against vendor case studies claiming +15–30 % baskets (6XPOS, Innovorder, FLYX, Tabesto; all vendor claims).

---

## 7. Top objections to prepare for, with suggested answers

1. **"6XPOS already does QR, click & collect and kiosks. Why add a second system?"**
   - Acknowledge it. Show Big Smash's own flow: slot-only, status that never refreshes, apps nobody installs (0 ratings).
   - Ominin's difference is the live phone ticket, pay-on-phone with no app, and no added monthly cost. Offer to prove it side by side in one restaurant.
   - Have an integration answer ready: orders printed and reconciled daily now; a 6XPOS API integration as the roadmap (to be discussed with 6XPOS).
2. **"Your orders don't go into our till: how do franchisees declare revenue, and how do we compute royalties?"**
   - Online payments land in each restaurant's own Stripe/Square account, itemised; daily export and payout reports per restaurant from the dashboard; how franchisees record them under NF525 (check with an accountant first).
   - Show the integration path. Do not wave this away: with a revenue-based royalty, it is the head office's own question.
3. **"1–3 % on top of our 7 % royalties and card fees, for orders customers would place at the kiosk anyway."**
   - Only online-paid orders; no subscription; €109 setup vs €1,500–7,000 per kiosk; decreasing tiers at volume; 12–14 points cheaper per order than Uber pickup (≈ 15 % TTC).
   - The value is the orders kiosks and the counter lose at the peak (walk-aways judged by queue length: Lu et al.), plus the head office's 7 % on any recovered sales. Commit to measuring adoption, peak orders and ticket in the pilot.
4. **"We already have kiosks; kiosks raise the ticket by 15–30 %."** Those are vendor claims (6XPOS, Innovorder, FLYX). The phone gives the same upsell screens without another €2,000–7,000 kiosk, and starts before the customer reaches the queue. McDonald's itself added phone ordering at the table.
5. **"You are very small. Who answers at 1 am on a Saturday across 10 restaurants, 14 with the announced openings?"** Support SLA, spare Omilink boxes, fallback (orders stay visible on the staff dashboard if a printer fails), staged rollout with new openings first.
- **Also expect:**
  - "Our customers pay with titres-restaurant / cash" → cards, Apple Pay, Google Pay today; titres-restaurant via Stripe's private beta later; cash stays at the counter.
  - "Our franchisees choose their own tools" (Delicity in Montpellier) → a head-office-chosen tool with no fixed cost is easier to impose than another subscription.
  - "Can you predict ready times?" → live status today; predicted time next, with measured accuracy.

---

## 8. Short list for the summary slide (price and model)

| Alternative | Model | Price (published or third-party) | Needs its own till | Burger / fast-food reference |
|---|---|---|---|---|
| **6XPOS modules (incumbent)** | Subscription + hardware | From €49/month (till) to €155/month (till + kiosk + KDS); QR/C&C module price not published | Yes (6XPOS) | Big Smash web shop, New School Tacos, Steak n Shake |
| Uber Eats pickup | Commission | ≈ 15 % TTC (measured) | No | Big Smash today (pickup links) |
| Delicity | Per order | ≈ €1/order + delivery (press, 2022); offers not published | No | Big Smash Montpellier, Black & White Rennes |
| Innovorder | Subscription + hardware | Not published (third-party from €79 HT/month); kiosk €2,000–15,000 | Yes | Smash Smash, BCHEF, Big Fernand |
| Sunday | Subscription + undisclosed txn fees | €29–199/month + C&C €29 + ordering €49 | No | PNY (sponsored case) |
| Belorder | Not published | Not published | No | Black & White, Burger & Fries |
| ClickEat ("borne sur téléphone") | Flat fee + own payment fee | €59 HT/month, 1-year commitment, payments 1 % + €0.10 | No (Zelty, Deliverect, Otter) | Logos incl. Blend, Groupe Bertrand |
| Tabesto (Deliverect) kiosk | Subscription + set-up + hardware | €179/month first kiosk, €40 each extra, ~€780 set-up | No | Tacos Avenue, Waffle Factory |
| Kiosk hardware (any vendor) | Purchase or lease | €1,500–7,000 per unit; €90–345/month lease; €40–200/month software | Usually | McDonald's, BK, Quick, Five Guys, Big Smash |
| **Ominin** | % of online-paid orders, decreasing | 1–3 %, no monthly fee, €109 kit per restaurant | No (prints via Omilink; Square POS push) | Pilot to come |

---

## 9. Not verified or not found

- **Big Smash's till and kiosk vendor**: not named anywhere; 6XPOS inferred. The web shop runs on the Tereza platform skinned as 6XPOS, which can also import from Zelty, so a Zelty till cannot be excluded (one research pass inferred Zelty from those route names; we treat that as unproven). Whether its kitchens use ticket printers or KDS screens: unknown (ask / check in the pilot restaurant).
- **6XPOS QR module and API pricing**: not published.
- **Big Smash average ticket**: not published; menus €8.90–11.90, Big Combo €14.90. "3K CA moyen/jour" and "1.2M CA annuel du réseau" are inconsistent labels on the same page.
- **Kiosk share of Big Smash orders**: not found.
- **Unit counts** for Big Fernand, Five Guys, BK, McDonald's, Steak n Shake, O'Tacos, Smash Smash: second-hand only.
- **Quick "95 %" kiosk use**: trade-press relay (2024–25), no primary Quick document.
- **Delicity's current prices**, **Belorder's prices**, **Dood's prices**, **Deliverect/FLYX prices**: not published.
- **Burger King France ETA model**: support site blocked.
- **Sunday's "300+ kiosk locations"** target: no evidence it was reached.
- **Stripe premium-card change on 21 Oct 2026** for existing accounts: now only on a third-party page (realdev.fr, 30 Jul 2026); Stripe's own page shows the new 2.8 % rate without the date.
- Chains not researched in depth: Ça Va Smasher, Dumbo, Smashy Burger, Burger Way, Captain Burger.
