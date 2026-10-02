# 04 — Competitive landscape: ordering tech O'Crousti Poulet Original will compare Ominin with

Prepared 2026-09-29 for the Ominin pitch to the O'Crousti Poulet Original head office (Chenôve / Dijon).

**Citation rules used in this file**
- Every URL was accessed on **2026-09-29**. Where a page shows a publication or update date, it is given in brackets.
- "Vendor claim" means the figure comes from the vendor's own marketing or case study. None of them are independent.
- "Not published" means I looked and found no public price. No price below is estimated unless it is clearly labelled as my own arithmetic.
- "Third-party" means a review or comparison site. Those are often written by competitors, and I say so when that is the case.

**Limits**
- The shared web-search budget ran out during the research. Some vendors could only be checked through pages already found. Gaps are listed in §9.
- These sites returned 403 and could not be read directly: obypay.com, dood.com, tastycloud.fr, Deliveroo merchant pages, the Innovorder help centre and Toast.

---

## 0. Key takeaways

1. **O'Crousti has no ordering vendor today, so this is a greenfield deal.**
   - The website says "38 restaurants en France et en Suisse" and its only ordering link is "Aussi sur Uber Eats" [https://ocroustipouletoriginal.com/].
   - The franchise pack sells "Intégration Uber Eats" [https://ocroustipouletoriginal.com/devenir-franchise].
   - No app, click & collect, kiosk or QR ordering is visible.
   - Today's real "click & collect" is Uber Eats pickup. An independent count of 20,587 orders measured the pickup commission at 15% [https://restaurenta.fr/blogs/blog/commission-uber-eats-vraie-marge] (2026-06-20).
2. **The market splits into five kinds of offer. Almost all charge a monthly fee per site, and most require their own till:**
   - (a) delivery platforms used for pickup, paid by commission;
   - (b) all-in-one till ecosystems with ordering add-ons: Innovorder, Zelty, Lightspeed, SumUp, Square, Popina, L'Addition;
   - (c) ordering layers that work with any till: Sunday, Obypay, Dood, Deliverect/Tabesto, FLYX, Châtaigne;
   - (d) cheap QR / click & collect subscriptions for independents at €29–79 a month: Qwick Order, ClickEat, Collectly, commande-restaurant and others;
   - (e) self-order kiosks: hardware about €1,500–7,000 per unit (up to €15,000), plus €40–200 a month of software.
3. **Ominin's pure percentage with no subscription is rare, but not unique.**
   - Brewbook advertises "2 % sans abo" [https://brewbook.fr/blog/click-and-collect-restaurant-prix-comparatif.html] (2026-06-06).
   - GetEat advertises a free tool with 0% commission [https://geteat.fr/].
   - GloriaFood was free, but Oracle shuts it down on 30 April 2027 [https://storekit.com/blog/alternatives-to-gloriafood-online-ordering-system-for-restaurants-2023].
   - None of these three shows a fast-food chain reference.
4. **Peer chains are ahead on digital ordering:**
   - O'Tacos uses FLYX for kiosks, click & collect and loyalty.
   - Chamas Tacos and BCHEF use Innovorder.
   - Pitaya uses Apitic.
   - 100 % Crousti, a direct crispy-chicken competitor, uses Biborne.
   - Chicken Street runs "scan to order" over WhatsApp with Châtaigne.
   - The closest look-alike, Master Poulet, still sends every order button to Uber Eats pickup.
5. **Nobody in French independent or franchise fast food advertises a predicted ready time to the customer.**
   - The norm is an order number, a status screen and a "ready" SMS or email.
   - McDonald's France avoids prediction altogether: preparation starts only when the customer arrives.
   - This is a real opening for Ominin, but only once the feature ships and is measured (§5).
6. **Main weaknesses to prepare for:**
   - no till integration, so reconciliation and reporting are harder;
   - a percentage fee overtakes flat subscriptions above about €2,000–5,000 of online sales per restaurant per month;
   - company size and support for 38 sites;
   - payment gaps: titres-restaurant, TWINT, cash customers;
   - no chain reference yet.

---

## 1. Starting point: what O'Crousti uses today

| Item | Finding | Source |
|---|---|---|
| Network | "38 restaurants en France et en Suisse". The store list shows about 37 in France and 1 in Lausanne. | https://ocroustipouletoriginal.com/ ; https://ocroustipouletoriginal.com/nos-restaurants |
| Franchise directories | Still say 16 restaurants at end of 2025, so out of date | https://www.toute-la-franchise.com/franchise/o-crousti-poulet-original |
| Format | 100 % counter and takeaway, about 50 m², no dining room | https://ac-franchise.com/article/la-franchise-ocrousti-poulet-original-mise-sur-un-modele-a-couts-maitrises (19/12/2025) |
| Franchise economics | Entry about €10,000 HT, equipment about €60,000 HT, **fixed royalty €2,500 HT/month** (ac-franchise). Toute-la-franchise gives €7,000 entry and €2,000/month royalty. | same two URLs |
| Online ordering | Only "Aussi sur Uber Eats". The franchise offer includes "Intégration Uber Eats". One Deliveroo listing seen in Dijon (page returned 403). | https://ocroustipouletoriginal.com/ ; https://ocroustipouletoriginal.com/devenir-franchise ; https://deliveroo.fr/fr/menu/dijon/dijon-centre/ocrousti-poulet |
| Till | Described only as "logiciel de caisse"; the vendor is not public | toute-la-franchise URL above |

Implications:
- **The royalty is fixed, not a percentage.** The head office does not earn more when franchisees sell more. The pitch therefore has to show value for franchisees (labour, throughput, less Uber commission) and for the network (a shared digital channel, network data, a stronger franchise sales pitch with no capex).
- **The franchise pack actively promotes Uber Eats.** Ominin should present itself as covering the in-store queue and pickup, not as replacing Uber delivery.
- **There is a name trap.** "100 % Crousti" (Biborne client) and a Dishop app called "O'CROUSTY" are different businesses from O'Crousti Poulet Original.

---

## 2. Alternatives by category: model, prices, till requirement, references

### 2.1 Delivery platforms used as click & collect (the status quo)

**Uber Eats (pickup, Webshop, Uber Direct)**
- **Pickup commission (Standard plan):** about 15 %.
  - Measured at 15.0 % of the tax-inclusive total across 20,587 orders from four restaurants in Moselle [https://restaurenta.fr/blogs/blog/commission-uber-eats-vraie-marge] (2026-06-20).
  - A competitor blog gives about 10 % (6–12 %) [https://commandeici.com/blogs/guide-restaurateur/commission-uber-eats-grille-tarifaire-complete] (2026-06-03).
- **Official pricing page:** shows Standard 30 % with "Frais de service réduits à 15 % sur les commandes à emporter", plus €1.99 a week [https://merchants.ubereats.com/fr/fr/pricing/].
  - **Caveat:** the page carries a footnote saying the plans are "uniquement disponibles au Japon". Do not quote it as the French price list.
- **Uber Direct (white-label delivery):** "à partir de 5,90 € HT par livraison" [https://merchants.ubereats.com/fr/fr/services/uber-direct/].
- **Webshop (restaurant's own site):** no public price [https://merchants.ubereats.com/fr/fr/services/online-ordering/].
- **Till:** none needed; Uber provides a tablet.
- **Strength Ominin lacks:** Uber brings new customers through its marketplace. Ominin does not.

**Deliveroo (DoorDash since 2025-10-02)**
- No official French rate card [https://merchants.deliveroo.com/fr-FR].
- Pickup launched in 2020 at a commission "deux fois inférieur" to delivery [https://www.lhotellerie-restauration.fr/actualite/deliveroo-deploie-l-option-vente-a-emporter].
- Third-party estimate for pickup: 14–18 % [https://brewbook.fr/blog/click-and-collect-restaurant-prix-comparatif.html].
- Acquisition: [https://en.wikipedia.org/wiki/Deliveroo].
- No French QR-menu product was found, and no "Deliveroo Hop" product for restaurants.

**Just Eat**
- Stopped operating in France on 2024-12-09 [https://newsroom.justeattakeaway.com/en-WW/244843-just-eat-takeaway-com-confirms-decision-to-end-operations-in-france-following-consultation/].
- Still active in Switzerland; rates not published (page returned 403).

### 2.2 All-in-one till ecosystems with ordering, QR or kiosk modules (a till change is required)

| Vendor | What | Pricing model and published prices | Till requirement | French fast-food references | Vendor claims / stability |
|---|---|---|---|---|---|
| **Innovorder** (Paris) | Till, kiosks, click & collect, QR "Click & Serve", white-label delivery, KDS (kitchen screen), customer status screen | **Not published** (quote). Third-party figures: from €79 HT/month per site [https://fr.mobiletransaction.org/innovorder-avis/]; "Growth" €299/month for 2–10 sites [https://tool-advisor.fr/logiciel-de-caisse/comparatif/innovorder/] (2026-07-10). Kiosk €2,000–15,000; a €6,000 kiosk financed over 36 months costs about €190–210/month plus software [https://www.innovorder.com/en/blog/price-self-ordering-kiosk] (2026-09-02). | Own ecosystem; the kiosk connects to the Innovorder till | Quick, Chamas Tacos, Amorino, Bagel Corner, La Mie Câline [https://www.innovorder.com/en/commercial-catering/fast-food]; BCHEF, Double XL, Smash Smash [https://www.innovorder.com/en/self-ordering-kiosk]; Big Fernand [https://www.innovorder.com/en/success-stories/big-fermand-x-innovorder] | Vendor claims: kiosk ticket €16.60 HT vs €12.37 at the counter (+34 %) [price blog]; QR "up to 10 %" bigger basket and "12 minutes" saved per table [https://www.innovorder.com/en/order-at-table-system]. Stability: raised €20M in June 2026, profitable since 2024, €15M revenue forecast for 2026, 1–2 French acquisitions planned [https://www.maddyness.com/2026/06/04/innovorder-leve-20-millions-deuros-pour-digitaliser-les-restaurants-et-cantines-en-europe/] |
| **Zelty** (Paris) | iPad till; kiosk, online ordering, KDS and delivery add-ons | Not public. Figures from a leaked Sept 2024 licence sheet, reported by a third party [https://www.lacaisseideale.fr/articles/zelty-avis/] (2026-07): till **€89 HT/month per site**, online ordering **+€60**, kiosk **+€59**, KDS +€19, delivery +€59; no commitment; 0 % commission; payments via PayGreen or Stripe | Zelty till | Pokawa, Côte Sushi, Blend, Matsuri, Burger Papa, Bouillon [https://www.zelty.fr/en/activites/zelty-multisite-franchise-multimarque-restaurant] | Vendor claims: basket +10–30 % (cites a 2017 study) [https://blog.zelty.fr/bornes-commande-restaurant]; "5,000+" sites [https://www.zelty.fr/en/besoins/zelty-click-and-collect-restaurant] |
| **Lightspeed Restaurant** | Till; Order Anywhere (QR and takeaway); kiosk add-on | Basic €89, Core €159, Pro €249 per month. QR ordering and kiosk are "en supplément", prices not shown [https://www.lightspeedhq.fr/caisse/restaurant/pricing/]. Stripe fees are extra. One-year commitment [https://www.lacaisseideale.fr/articles/lightspeed-avis/] (2026-09-16). | "Uniquement compatible avec Lightspeed Restaurant (K Series)" [https://www.lightspeedhq.fr/caisse/restaurant/order-anywhere/] | Not identified for chicken or tacos | Vendor claim "+8 %" transactions [Order Anywhere page]. Accepts titres-restaurant (CONECS) [https://www.lightspeedhq.fr/restaurant/] |
| **SumUp (formerly Tiller) Order & Pay** | QR ordering and payment, plus order-ahead time slots | Included in Caisse Plus at **€49/month + 2.50 % per transaction** [https://www.sumup.com/fr-fr/order-and-pay/]. POS Pro €79/month with a 12-month commitment [https://quelle-caisse.fr/solution/sumup-pos-pro] | SumUp till | — | Vendor claim: "panier moyen augmente de 20 %" |
| **Square** (France) | Till; online ordering; Scan to Pay; kiosk | Free plan €0/month includes online ordering. Plus €59 HT per site. Kiosk €30/month per device. KDS €15 HT/device on the free plan [https://squareup.com/fr/fr/point-of-sale/restaurants/pricing]. Online cards 1.4 % + €0.25 (EEA) [https://squareup.com/fr/fr/payments/pricing] | Square ecosystem | — | — |
| **Popina** (JDC group) | Till; Foxorder click & collect; iPad kiosk | Advertised €39–55 HT/month. A real quote seen by a reviewer: €99 HT/month on a 48-month lease plus €521 upfront; Foxorder +€39/month [https://www.entrepreneurhero.fr/logiciels-de-caisse/avis-popina-jdc/] (2026-03-16) | Popina till | Class'Croute | — |
| **L'Addition** | Till with QR and click & collect modules | Official page shows no prices [https://www.laddition.com/fr/prix-logiciel-caisse]. Third-party: from €49 HT/month; modules not priced [https://www.lacaisseideale.fr/articles/laddition-avis/] | L'Addition till | — | 12,000 sites in France, Switzerland and Luxembourg (third-party) |
| **Cashpad** | Till | "Lite" from €79 HT/month (third-party) [https://www.entrepreneurhero.fr/logiciels-de-caisse/avis-cashpad/]; the official page shows no real prices [https://www.cashpad.io/tarifs] | Cashpad till | — | Independent SAS, 20–49 staff [https://www.societe.com/societe/cashpad-525151429.html] |
| **Clyo Systems / Eatself** | Fast-food till plus kiosk | Kiosk "à partir de 1390 €"; subscription not shown [https://www.eatself.com/borne-de-commande-pour-restaurant-et-fast-food/] | Clyo till | — | — |

### 2.3 Ordering layers that work with an existing till (most comparable positioning)

| Vendor | What | Pricing model and published prices | Till / kitchen integration | French references | Vendor claims / stability |
|---|---|---|---|---|---|
| **Sunday** (Paris) | QR pay-at-table, digital ordering, click & collect, terminal, loyalty, AI menu; now moving into fast-food kiosks | **€29 / €99 / €199 per month**. Add-ons: Click & Collect +€29, Commande digitale +€49, Fidélité +€49. Installation €49 in Paris, €299 elsewhere; A7 QR codes €3 each [https://sundayapp.com/fr/tarifs/]. **Transaction fees exist but are not published** [https://sundayapp.com/fr/conditions-generales-de-services-facilitateur-de-paiement-indicateur/]. Diner-side fee reported in 2024 [https://www.entrepreneurhero.fr/terminal-de-paiement/sunday-paiement-restaurant-avis/] | "50+" till integrations: Lightspeed, L'Addition, Zelty, Popina, Cashpad, Oracle [https://www.tech-food.fr/logiciel/sunday] | Groupe Bertrand, Hippopotamus, Au Bureau, PNY, Big Mamma, Bouillon Pigalle [https://sundayapp.com/fr/] | Vendor claims: "5,000+" restaurants; Bouillon Pigalle +9 % daily customers. Raised $21M in Nov 2025; about 200 staff; cut 20 % of staff in 2022; targeting "300+ kiosks" in fast food by summer 2026 [https://www.maddyness.com/2025/11/12/sunday-spin-off-de-big-mamma-leve-18-millions-deuros-pour-poursuivre-sa-conquete-du-marche-americain/]. Click & collect uses customer-chosen time slots plus a "ready" SMS or email [https://sundayapp.com/fr/click-and-collect/] |
| **Obypay** | QR ordering and payment, click & collect, kiosk, loyalty/CRM; aimed at franchise networks | €49 HT/month per site [https://pro.obypay.com/abo/obypay]. Click & Collect from €59 HT; "Pack Expert" €199 HT with "Nos clients paient moins" [https://www.digital-restaurateur.fr/obypay]. Press quotes €79–199 [https://www.snacking.fr/actualites/6569-Obypay-leve-1-2-million-euros-pour-deployer-sa-solution-tout-en-un-en-restauration/]. Kiosk hardware about €3,000–4,000 per a competitor [https://biborne.com/fr-blog/les-meilleures-bornes-de-commande-en-france/] | Lightspeed (about 500 connected clients) [https://www.lightspeedhq.fr/integrations/obypay/]; Clyo, Toast, Tiller, SumUp, Cashpad, Deliverect [https://get.obypay.fr/borne-de-commande] | Agapes group (Flunch, 3 Brasseurs) [Snacking URL] | About 1,500 sites; about 20 staff; €1.2M raised (2023) [Snacking URL]. Titres-restaurant partnerships mentioned in a search snippet only (site returned 403) [https://obypay.com/en/order-and-payment/] |
| **Dood** (Lyon) | Click & collect, QR at the table, kiosks, CRM, marketplace | Fixed SaaS fee plus Stripe fees; **amounts not published** [https://www.tech-food.fr/logiciel/dood] (2026-07-24) | L'Addition, Lightspeed, Zelty, Cashpad, Clyo, SumUp | Jour | "1,500+" clients; about €5M raised (unverified, source returned 403) |
| **Deliverect** (incl. **Tabesto**) | Brings aggregator orders into the till; "Direct" web store, QR and kiosk | Deliverect: **not published** [https://www.deliverect.com/en/pricing]. **Tabesto** (published): **€179 HT/month for the first kiosk, €40 for each extra kiosk**, about €780 set-up per location, IC++ payment 0.70 % + interchange; kiosk hardware "price upon request" [https://tabesto.com/en/tarifs] | Integrates with tills: Lightspeed, Zelty, L'Addition, SumUp | Tabesto: Berliner Das Original, Waffle Factory, Yogurt Factory, Nachos [https://www.tabesto.com/]. Wingstop France runs its web ordering on Deliverect pickup [https://pickup.deliverect.com/wingstop-fr/fr/order/] | Deliverect bought Tabesto in Dec 2024 (1,400 customers in France and Switzerland) [https://www.deliverect.com/en/press/deliverect-acquires-tabesto-powerful-food-ordering-smart-kiosk-technologies]. Vendor claim: "+30 %" average basket on kiosks |
| **FLYX** (Brussels) | Kiosk, click & collect, app, loyalty, OMS, integration with any till through middleware | **Not published** [https://www.flyx.cloud/en/self-ordering-kiosk/] | Till middleware | **O'Tacos** (kiosks, click & collect, loyalty) [https://www.flyx.cloud/en/blog/customer-testimonial-otacos-a-groundbreaking-digital-transformation-with-flyx/] (2025-02-10); Quick and Burger King are listed as clients (country not stated) | Vendor claims: basket "+29 %", "4,500" locations, ROI in "3–6 months" |
| **Flipdish** (Ireland) | Branded web and app ordering, kiosk, till, KDS | UK: from £119/month per site billed annually [https://www.flipdish.com/gb/pricing]. France: no prices [https://www.flipdish.com/fr/tarifs]. Per-order fee not official | Sells its own till and integrates with others | Cojean. The only halal fried-chicken reference found anywhere is Chicken Cottage (UK) [https://www.flipdish.com/fr/votre-entreprise/restaurants-a-service-rapide] | Vendor claim: +25 % AOV (average order value). Headcount cut 40 %; FY to Jan 2024 loss €11.1M on €18.7M revenue [https://www.irishexaminer.com/business/companies/arid-41477185.html] |
| **Châtaigne** | AI ordering and payment over WhatsApp; QR in store opens a WhatsApp chat | "Forfait, sans commission"; amounts not published [https://chataigne.ai/] | 100+ tills, including Zelty, Innovorder, Lightspeed, Deliverect, HubRise, Square, Oracle | **Chicken Street** (100+ restaurants): the site's "Commander" button and in-store QR campaign go through Châtaigne (seen in page source of https://www.chickenstreet.fr/) | Launched in 2024 [https://www.hubrise.com/fr/apps/chataigne] |
| **Apitic** | Kiosks, connected tills, table ordering | Not published | Own tills | **Pitaya** (90+ restaurants) [https://www.apitic.com/lavenir-de-la-street-food-thailandaise-focus-sur-pitaya/] | — |
| **me&u / Mr Yum** | QR order and pay | Not published | 70+ tills | UK, Australia and US only [https://www.meandu.com/gb/serve/order-pay] | Little relevance for France |

### 2.4 Cheap QR / click & collect tools for independents (Ominin's price-sensitive rivals)

| Vendor | Model | Published price | Printing / till | Chain references |
|---|---|---|---|---|
| **Qwick Order** | Subscription + fee per payment | **€29 / €39 / €69 per month + €0.10–0.15 per online payment + Stripe fees**; 30-day trial [https://qwickorder.fr/] ; [https://qwickorder.fr/blog/alternative-sunday-restaurant] (2026-08-21) | Kitchen screen with printable tickets; admits it has few till integrations | None named |
| **ClickEat** | Flat fee, no commission | **€59/month per site**; markets itself as a "borne de commande sur téléphone" [https://www.click-eat.fr/borne-de-commande] | Zelty, Redbiscuit, Deliverect, Otter, Rushour; connected printers | Aims at franchises; one testimonial (Pastels) |
| **commande-restaurant.com** | Flat fee | €29 / €39 / €49 per month, 0 % commission [https://commande-restaurant.com/] | **Prints automatically to 80 mm thermal printers** (Epson TM-T20, Star TSP100) through a Windows/Mac app | None named |
| **Collectly** | Flat fee | €49.99 HT/month, 0 % [https://collectly.fr/comparatif-logiciel-click-and-collect] (Mar 2026) | — | — |
| **LivePepper** | Flat fee + set-up | From €59/month (annual billing), set-up from €299 [https://www.livepepper.fr/tarifs] | — | — |
| **commandeici** | Flat fee | €1/month for 3 months, then €29.99/month [https://commandeici.com/blogs/guide-restaurateur/commission-just-eat-paient-restaurateurs] | — | — |
| **Brewbook** | **Percentage, no subscription** | "2 %" with "aucun abo ni minimum mensuel" [https://brewbook.fr/blog/click-and-collect-restaurant-prix-comparatif.html] (2026-06-06) | Square integration; mainly a booking tool [https://brewbook.fr/] | — |
| **GetEat** | Free | "0 %" commission, no monthly fee; aims at fast food, kebab and tacos in France, Belgium and Switzerland [https://geteat.fr/] | Orders reach staff smartphones; no till or printer integration mentioned | None named. Figures on the site are targets, not results |
| **shopcaisse** | Freemium | "100 tickets par mois gratuits"; paid tiers not captured [https://shopcaisse.com/commande-qr-code] | Sends the ticket to the till, KDS and waiter; payments via Stripe | — |
| **Delicity** | "Sans commission"; fees not published [https://www.delicity.com/] | — | Zelty, HubRise | "3,000+" restaurants (vendor claim) |
| **GloriaFood** (Oracle) | Free core, paid add-ons ($29/month for online payments, $49/month POS) [https://www.gloriafood.com/pricing] | — | — | **Shuts down on 30 April 2027**; no new sign-ups since early 2025 [https://storekit.com/blog/alternatives-to-gloriafood-online-ordering-system-for-restaurants-2023] |

### 2.5 Self-order kiosks: vendors and what a kiosk really costs in France

**Vendors**

- **Acrelec**
  - Now 100 % owned by Glory (26 Nov 2025) [https://acrelec.com/glory-acquires-remaining-equity-shares-in-acrelec-group/].
  - Over 120,000 installations; has supplied McDonald's France since 2008 [https://acrelec.com/fr/lascension-du-marche-de-la-restauration-rapide-en-france/].
  - Other clients: KFC and Burger King; integrates with enterprise tills (Micros, Aloha, PAR). Price not published. Vendor claim: "30 %" higher average check [https://acrelec.com/kiosk/].
  - Built for large chains. I found no Acrelec–Wavetec or Acrelec–Grubbrr deal; Wavetec is a separate queue-management company [https://www.wavetec.com/about-us/].
- **Biborne** (French maker and integrator)
  - Quote only.
  - Its own ranges: counter kiosk €1,500–3,000, totem €3,500–8,000, rental €90–250 HT/month, software €40–100/month, installation €500–1,500 [https://biborne.com/fr-blog/quel-prix-borne-de-commande/] (2024-04-16).
  - Clients: Pizza Time, **100 % Crousti**, O'Tacos [https://tool-advisor.fr/logiciel-de-caisse/comparatif/borne-de-commande-restaurant/]. 100 % Crousti's website runs on a Biborne subdomain [https://100.biborne.com/notre-histoire/].
  - Vendor claim: sales +12–28 %.
- **6XPOS**
  - Quote only.
  - Clients: Streat Burger, Steak n Shake, New School Tacos, HFC, Wall Street Burgers.
  - Vendor claim: +15–30 % [https://6xpos.fr/borne-de-commande/].
- **Borneasy**
  - €79 / €149 / €349 per month (up to 2, 5 or unlimited kiosks).
  - Claims "50+" restaurants. Hosted on a vercel.app domain, which suggests a very small operator [https://borneasy.vercel.app/].
- **Splash360, JDC**
  - Each works only with its own till. Splash is about €3,000–5,000 per unit (competitor comparison) [https://biborne.com/fr-blog/les-meilleures-bornes-de-commande-en-france/].
- **Grubbrr**
  - Price not published; no clear French presence [https://grubbrr.com/pricing/].
- Innovorder, Zelty, Tabesto, Obypay, FLYX, Square, Clyo: see the tables above.

**Typical kiosk cost in France (ranges from several sources, most of them vendors)**

| Cost line | Range | Sources |
|---|---|---|
| Hardware purchase | About €1,500–7,000 per unit, up to €15,000 for premium or outdoor units. Listed prices: Symbioz 22" €3,600 HT, 27" €5,800 HT; Aures Komet 27" from €6,991 HT | https://www.innovorder.com/en/blog/price-self-ordering-kiosk ; https://wawacom.fr/prix-dune-borne-de-commande-pour-fast-food-restaurant/ (2026-04-08) ; https://www.jmpsolutions.fr/produits/bornes-de-commande/ ; https://www.hellopro.fr/borne-de-commande-2018186-fr-1-feuille.html |
| Lease or rental | €80–400 HT/month. iMin: €237–345 HT/month; 48-month financing from €329 HT (kiosk only) or €399 HT (with till) | https://www.ajmonetic.com/details-prix+borne+de+commande+fast+food+imin-408 ; wawacom and biborne URLs above |
| Software licence | €40–200 per kiosk per month | https://www.tabesto.com/en/articles/whats-the-cost-of-a-self-order-kiosk-for-restaurants (2025-09-27) ; biborne URL above |
| Installation and set-up | About €300–1,500 per site; Tabesto publishes about €780 | https://tabesto.com/en/tarifs ; https://qwickorder.fr/blog/borne-de-commande-restaurant |
| Maintenance | 10–15 % of the purchase price per year (competitor source) | qwickorder URL above |
| 3-year total cost per kiosk | €8,000–15,000 (competitor source) | qwickorder URL above |

**Illustrative cost for the network (my own arithmetic, 1 kiosk per restaurant, 38 restaurants)**
- Tabesto list price: 38 × €179 × 12 = **€81,624 a year**, plus about €29,640 of one-time set-up. Whether hardware is included is not clear from the page.
- Innovorder financing example alone (€200/month): 38 × €200 × 12 ≈ **€91,200 a year**, before software.

Space matters too. O'Crousti units are about 50 m² counters. Gira Conseil's Bernard Boutboul, reported by the franchise press, says kiosks "take up space" and that "tomorrow's kiosk is our smartphone". He also says McDonald's plans to remove its kiosks "within five years". That is his own account, not a McDonald's statement [https://officieldelafranchise.fr/bornes-de-commande-en-restaurant-une-fausse-bonne-idee/] (2024-08-27).

### 2.6 Switzerland (the Lausanne restaurant, and any future Swiss sites)

- **TWINT** dominates mobile payment. Its own figures: 6M+ users, 901M transactions in 2025 [https://www.twint.ch/en/].
  - The Swiss National Bank's 2024 survey: in physical shops, mobile payment apps now account for almost one payment in five, while cash still leads for eating out [https://www.snb.ch/dam/jcr:bce1ef81-882c-4e0e-bcaf-7f7224bf34c2/paytrans_survey_report_2024.en.pdf].
- TWINT's recommended scan-order-pay partners are **Pindot** and **Yoordi** [https://www.twint.ch/fr/clients-commerciaux/solutions-sectorielles/restauration/].
  - **Yoordi** (Zurich): till licence "starts at just CHF 63.20 per month", payment fees "from 0.99 %", takeaway webshop, kiosks, 400+ venues. Vendor claim: "Up to 30 % more revenue" [https://www.yoordi.com/]. Its takeaway webshop "talks to your POS" [https://yoordi.com/takeaway-webshop].
  - **Pindot:** a CHF 69/month figure appeared only in a search snippet and was not verified.
- **Stripe in Switzerland:** supports TWINT (CHF only; works with Connect) [https://docs.stripe.com/payments/twint].
  - On a Swiss Stripe account: TWINT costs 1.9 % + CHF 0.30 [https://stripe.com/ch/pricing/local-payment-methods]; Swiss cards 2.9 % + CHF 0.30 [https://stripe.com/fr-ch/pricing].
  - On a French account, TWINT costs 2.6 % + €0.25 plus 2 % currency conversion [https://stripe.com/fr/pricing/local-payment-methods].
  - So Swiss restaurants should have Swiss connected accounts.

---

## 3. What comparable chains use

Unless marked otherwise, the vendor was identified from the vendor domains loaded in each chain's own ordering pages (page source, 2026-09-29).

| Chain | Units | Kiosk (vendor) | Own app | Click & collect / web | QR ordering | Delivery | Sources |
|---|---|---|---|---|---|---|---|
| **O'Crousti Poulet Original** | 38 (site) | None seen | None | None; Uber Eats only | None | Uber Eats; Deliveroo (Dijon) | https://ocroustipouletoriginal.com/ |
| **Master Poulet** (halal chicken, takeaway only; closest look-alike) | About 31–36 | Not public | None | **Uber Eats in pickup mode** (31 shop links with `diningMode=PICKUP`) | No | Uber Eats | https://www.master-poulet.fr/restaurants ; https://fr.wikipedia.org/wiki/Master_Poulet |
| **Chicken Street** | 100+ (90 in May 2025; €110M revenue in 2025) | Not public | Not public | **WhatsApp ordering via Châtaigne AI** | **Yes: in-store "Scannez pour commander" → WhatsApp, -25 % on the first order** | Uber Eats, Deliveroo | https://www.chickenstreet.fr/ ; https://fr.wikipedia.org/wiki/Chicken_Street |
| **Tasty Crousty** | 60+ (57 franchised shops open, 66 in progress, April 2026) | Not public | Not confirmed | Not public; site links to Uber Eats | QR used for Google reviews only (Cadeo) | Uber Eats | https://fr.wikipedia.org/wiki/Tasty_Crousty ; https://pokaa.fr/2026/04/21/tasty-crousty-le-1er-restaurant-franchise-ouvre-a-strasbourg/ ; https://cadeo.io/succes-clients/tasty-crousty-2/ |
| **100 % Crousti** | Not verified | **Biborne** | Not public | Biborne-hosted site | Not public | Not verified | https://100.biborne.com/notre-histoire/ |
| **O'Tacos** | 400+ in 8 countries; €491M revenue in 2025 | **FLYX** (earlier Graphcom) | "O'Tacos Officiel" (OPoints loyalty) | FLYX (`commandes.o-tacos.com` → api.flyx.cloud) | Loyalty QR | Via FLYX connectors | https://lexpress-franchise.com/actualites/otacos-vise-600-restaurants-a-lhorizon-2029/ ; FLYX case study above ; https://apps.apple.com/fr/app/otacos-officiel/id1510837681 |
| **Chamas Tacos** | 100–116 | **Innovorder**; some franchisees use Biborne or Borneo | Yes (Dishop) | Innovorder (`commandes.chamas-tacos.com`) | Not public | Yes | https://chamas-tacos.com/franchise/ ; https://www.innovorder.com/en/tacos ; https://apps.apple.com/fr/app/chamas-tacos/id1557922205 |
| **BCHEF** | 70+ after buying Les Burgers de Papa (Jan 2026) | **Innovorder** | Not public | Innovorder (`commandes.bchef.fr`) | Not public | Uber Eats and Deliveroo, through Innovorder | https://www.innovorder.com/en/success-stories/bchef-innovorder ; https://www.franchise-magazine.com/news-franchise/reseau-bchef-rachat-burgers-papa-janvier-2026 |
| **Big Fernand** | Not verified | Not verified | Not public | **Innovorder** | Not public | Yes | https://www.innovorder.com/en/success-stories/big-fermand-x-innovorder |
| **Pitaya** | 90+ | **Apitic** | Belgian app only (FR not confirmed) | Shopify site plus Apitic | Apitic table ordering (Nice) | Uber Eats | https://pitaya-thaistreetfood.com/a-propos ; Apitic URL above |
| **Crispy Soul** (halal chicken) | 7 | Not public | No | Different vendor per shop: Belorder, Izipass | Mentioned in one review only | Yes | https://crispysoul.fr/en/ |
| **Kaptain Fry** (closest match to "Kfry") | 5 | Not public | No | Own site being built, not live ("Aucun magasin configuré") | No | Uber Eats, Deliveroo | https://kaptainfry.fr/ ; https://achat.kaptainfry.fr/ |
| **KFC France** | 400 | Yes; vendor in France not public (Acrelec supplies KFC globally) | KFC France app ("Colonel Club") | Yes | Not public | Yes | https://apps.apple.com/fr/app/kfc-france-poulet-burger/id1622002883 ; https://acrelec.com/kiosk/ . Secondary blog: 77 % of transactions digital in 2023 [https://getdring.com/actualites/kfc-poulet-frit-conquete-france-2026] |
| **McDonald's France** | 1,485+ | 90 %+ of restaurants had kiosks by 2016 (Acrelec) | McDo+ | Click & Collect; "Click & Ready" geofencing | QR at the table in McDo+ | Yes | https://en.wikipedia.org/wiki/McDonald%27s_France ; https://www.mcdonalds.fr/cgv |
| **Burger King France** | 532 (2023) | Yes; FLYX lists BK (country unclear) | Yes | Yes | "KingTable" planned for H2 2024 | Yes | https://www.snacking.fr/actualites/6774-Burger-King-France-encore-plus-engage-responsable-et-accessible-avec-Alexandre-Simon-/ |
| **Wingstop France** | Few | Yes | Not public | **Deliverect pickup** | Not public | Uber Eats | https://pickup.deliverect.com/wingstop-fr/fr/order/ |
| **Five Guys France** | About 30 | Not confirmed | Yes | Own-branded (vendor unknown) | Not public | Uber Eats, Deliveroo | https://www.fiveguys.fr/commande-en-ligne/ |

**Reading the table**
- **The large tacos and burger franchises (O'Tacos, Chamas, BCHEF) are fully equipped:** kiosks, app, web click & collect and loyalty, all tied to the till. These are the reference the O'Crousti head office will have in mind.
- **Chicken chains of O'Crousti's size are not.** Master Poulet, Tasty Crousty and O'Crousti itself still use Uber Eats as their click & collect.
- **Chicken Street is the exception, but it went for WhatsApp, not a web page.** The market is testing "phone as the kiosk" in exactly this segment, and a WhatsApp vendor (Châtaigne) may pitch O'Crousti too.
- **Several small chains mix vendors shop by shop** (Chamas franchisees, Crispy Soul). A single network-wide tool is a known gap.

Industry data points:
- NPD Group (now Circana), 2021: orders by app, web or kiosk were 7 % of out-of-home dining visits (2 % in 2019); in fast food, 1 order in 10 was digital [https://www.snacking.fr/actualites/5949-Bilan-2021-le-digital-explose-en-restauration-et-la-rapide-est-a-13-/?news_id=5949].
- NPD, 2017: the average digital ticket was €6.1 vs €4.9 for traditional orders [https://www.snacking.fr/actualites/management-franchise/3759--FoodTech--Le-digital-booste-le-ticket-moyen-de-la-restauration-rapide/].
- I found no authoritative share of McDonald's France orders taken at kiosks. Figures such as "95 % of Quick customers use kiosks" or "68 % of fast-food restaurants equipped" could not be verified; do not use them.

---

## 4. Pricing models compared (list prices; my arithmetic)

**Per-restaurant platform fee per month**
- Card processing fees are excluded, because every option incurs them.
- For Ominin, 3 % applies only to orders paid online.

| Online orders per restaurant per month | Ominin 3 % | Uber Eats pickup about 15 % | ClickEat €59 flat | Sunday Starter + C&C + digital ordering (€107 + undisclosed transaction fees) | Zelty till + online ordering (€149, but replaces the till) | Tabesto kiosk (€179 + about €780 set-up + hardware) |
|---|---|---|---|---|---|---|
| €1,000 | €30 | €150 | €59 | €107+ | €149 | €179 |
| €3,000 | €90 | €450 | €59 | €107+ | €149 | €179 |
| €5,000 | €150 | €750 | €59 | €107+ | €149 | €179 |
| €10,000 | €300 | €1,500 | €59 | €107+ | €149 | €179 |
| €20,000 | €600 | €3,000 | €59 | €107+ | €149 | €179 |

**Break-even online revenue per restaurant per month**
- The point above which 3 % costs more than the flat fee:
  - ClickEat €59: about €1,970
  - Innovorder from €79 (third-party): about €2,630
  - Sunday €107: about €3,570
  - Zelty €149: about €4,970
  - Tabesto €179: about €5,970
  - Obypay Expert €199: about €6,630
- **Ominin is always far cheaper than Uber Eats pickup**, by about 12 points of commission.
- **Each flat subscription becomes cheaper than Ominin at its own break-even level** (list above).

**Per-order view** (my arithmetic, using Stripe France standard EEA cards: 1.5 % + €0.25 [https://stripe.com/fr/pricing])

| Ticket | Ominin fee (3 %) | Stripe fee | Total cost to the restaurant | Share of the ticket |
|---|---|---|---|---|
| €12 | €0.36 | €0.43 | €0.79 | about 6.6 % |
| €8 | €0.24 | €0.37 | €0.61 | about 7.6 % |

- Premium EEA cards cost 2.8 % + €0.25 on Stripe.
- For comparison, a counter card payment costs about 1.75 % with SumUp [https://www.sumup.com/fr-fr/tarifs/] or Zettle [https://www.zettle.com/fr/tarifs], or 0.6–2 % on a bank terminal [https://www.pennylane.com/fr/fiches-pratiques/compte-pro/quels-sont-les-frais-pour-un-tpe].
- **Moving a counter customer onto their phone therefore costs about €0.55–0.70 more per €12 order than a card at the counter** (€0.79 against €0.07–0.24). The gains in staff time, throughput and basket have to cover that.

**Network view for 38 restaurants**
- Ominin costs nothing where adoption is low. At €5,000 of online orders per restaurant per month, it costs about €5,700 a month for the network.
- For comparison, a flat €59 subscription would cost €2,242 a month, and Sunday Starter + Click & Collect + digital ordering about €4,066 a month before its transaction fees.

---

## 5. Predicted ready time (ETA) offered to customers

| Who | What the customer gets | Predicted? | Source |
|---|---|---|---|
| McDonald's France (McDo+) | Preparation starts only when the customer arrives: "ne peut en aucune manière intervenir avant la présentation du Client". Click & Ready is triggered by geofencing. | **No.** It avoids the need to predict. | https://www.mcdonalds.fr/cgv |
| McDonald's global "Ready on Arrival" | Geofenced start; claimed 62 seconds less waiting | No customer-facing estimate | https://www.restaurantdive.com/news/McDonalds-doubles-down-geofencing-loyalty-growth/701753/ (2023-12-11) |
| Starbucks (North America) | 5-minute pickup windows reflecting "real-time availability", driven by the "Smart Queue" algorithm (May 2026) | **Yes, dynamic**; model type not published | https://www.nrn.com/restaurant-technology/starbucks-will-soon-let-you-plan-your-pickup-times |
| Chipotle (US) | "Smarter Pickup Times" based on digital order capacity (2017); vendor claim: wait "reduced by as much as 50 %" | **Yes, capacity-based**; no ML claimed | https://ir.chipotle.com/news-releases?item=122413 |
| Olo (US platform) | "Predictive quoting and capacity management" | **Claimed**, no details | https://www2.olo.com/order |
| Uber Eats | Gradient-boosted models predict delivery time using average prep time over the last 7 days and the last hour | Yes, but used for courier dispatch | https://www.uber.com/blog/michelangelo-machine-learning-platform/ (2017-09-05) |
| Deliveroo | "Our algorithm learns your average prep time from every order"; restaurants tap "Order Ready", which records how long each order took | Yes, for dispatch. **The same design as Ominin's "Prête" tap.** | https://help.deliveroo.com/en/articles/2152581-understanding-prep-times |
| DoorDash | LightGBM prep-time model for "Assisted Order Release" (page returned 403; seen in a summary only) | Yes, for dispatch | https://careersatdoordash.com/blog/lifecycle-of-a-successful-ml-product-reducing-dasher-wait-times/ |
| Sunday (FR) | Customer picks a pickup time; SMS or email "lorsque leur commande est prête"; order status visible | **No**: the customer chooses a slot | https://sundayapp.com/fr/click-and-collect/ |
| Innovorder (FR) | "Ready" email; customer status screen showing live order status | **No** | https://www.innovorder.com/commande-ligne ; https://www.innovorder.com/ecran-client |
| Zelty (FR) | Waiting screen for customers and couriers | **No** | https://www.zelty.fr/besoins/zelty-digitalisation-restaurant |
| Fresh KDS (US) | Status SMS and customer screen, $27 per screen per month (Premium) | No | https://www.fresh.technology/kds/pricing |
| Crunchtime Kitchen (formerly QSR Automations ConnectSmart) | "Send an SMS message to the guest when their food is ready" | No customer ETA; forecasts kitchen prep | https://www.crunchtime.com/kitchen |
| Domino's France | Stage tracker (page returned 403; seen in a summary only) | Stages, not a time | https://www.dominos.fr/dominos-pizza/live-pizza-tracker |

**Conclusion (medium confidence)**
- In French fast food the standard is an order number, a status screen and a "ready" message.
- A precise ready time predicted for each order and shown to the customer is offered only by a few large US chains (Starbucks, Chipotle) and claimed by Olo. Delivery platforms predict prep times, but to dispatch couriers.
- **No French independent or franchise ordering vendor advertises it**, so it is a genuine differentiator.
- Two cautions for the pitch:
  1. Present it as "coming soon, with measured accuracy after a pilot", not as a feature that exists today.
  2. The method is not exotic: Deliveroo and Uber publicly describe the same approach (rolling prep-time averages plus a "ready" tap as the label). The moat is in doing it at the counter, per restaurant, and showing it to the customer, not in the algorithm.
- A wrong estimate shown to a waiting customer is worse than none. Plan a conservative display, such as a range or "about X min".

---

## 6. Where Ominin is genuinely different, and where it is weaker

### Genuine differences (supported by the research above)
1. **No fixed cost and no capex, per restaurant and for the network.**
   - Every till ecosystem (§2.2), every till-agnostic layer (§2.3) and every kiosk (§2.5) charges a monthly fee per site, often €49–199, plus hardware for kiosks.
   - Low adopters pay almost nothing. That matters in a franchise where the head office cannot force spending on franchisees who pay a fixed €2,000–2,500 royalty.
   - The only other pure-percentage offers found (Brewbook 2 %, GetEat free) have no fast-food chain references and no counter printing box. GloriaFood is being shut down.
2. **Keeps the existing till and printers, with no integration project.**
   - Till vendors require their own till: Zelty, Lightspeed Order Anywhere ("uniquement compatible K Series"), SumUp Order & Pay, Square, Popina, L'Addition, Innovorder kiosks.
   - Till-agnostic layers depend on a till integration (Sunday, Obypay, Dood, Châtaigne, ClickEat). O'Crousti's till vendor is not public, so it may not be on their lists.
   - Ominin's plug-in box prints on standard kitchen ticket printers regardless of the till.
   - **Caveat:** the cheap tool commande-restaurant.com also prints to 80 mm thermal printers, via a PC app. Printing alone is not unique; the combination is.
3. **Built for counter and queue, not tables.**
   - Most QR players were designed for pay-at-table: Sunday, SumUp Order & Pay, Lightspeed Order Anywhere, Obypay.
   - O'Crousti units have no dining room. Ominin's flow fits the format: numbered ticket, live status, "Prête" tap, push notification.
   - ClickEat, GetEat and Qwick Order pitch the same "kiosk on the phone" idea, but at single-restaurant scale.
4. **No kiosk footprint in about 50 m² units.** This is consistent with the Gira Conseil view that "the kiosk of tomorrow is the smartphone" (an opinion, second-hand).
5. **Much cheaper than the current de facto channel**: about 3 % vs about 15 % for Uber Eats pickup.
6. **A predicted ready time shown to the customer.** No French competitor advertises one (§5), provided it ships.
7. **Same-segment timing.** Chicken Street's WhatsApp campaign shows chicken chains want "scan to order" now. Master Poulet and Tasty Crousty have nothing yet, so O'Crousti could be first in its tier with a web-based, no-app flow.

### Weaker points (be candid)
1. **No till integration.**
   - Online orders print in the kitchen but do not enter the till.
   - That means two sources of truth for revenue, the till close ("Z"), VAT, stock and franchisor reporting.
   - Innovorder, Zelty, Sunday, Obypay, Deliverect, FLYX and Châtaigne all sell "orders go straight into your till".
   - Expect questions from franchisees' accountants about recording these sales.
2. **The percentage grows with success.**
   - Above about €2,000–6,600 of online orders per restaurant per month, a flat subscription is cheaper on paper (§4).
   - The restaurant also pays Stripe fees, so the real cost is about 6–8 % of a small ticket, versus about 1.75 % for a card at the counter.
3. **Company size and continuity.**
   - Rivals: Innovorder (€20M raised, profitable, 50–99 staff), Sunday (about 200 staff, $21M raised in 2025), FLYX, Acrelec/Glory.
   - Even Obypay, at about 20 staff, is larger than a side project.
   - A head office rolling out to 38 sites will ask about support during lunch and dinner rushes, a replacement box when one fails, onboarding capacity, and what happens if Ominin stops.
   - GloriaFood's shutdown is a live example of ordering tools disappearing.
4. **Payment coverage.**
   - **Titres-restaurant**: 6M beneficiaries [https://www.cntr.fr/].
     - Stripe's support is a waitlist-only private beta, with "partial" Connect support [https://docs.stripe.com/payments/meal-vouchers/fr-meal-vouchers].
     - It needs CNTR approval and a contract with each issuer, and Edenred is not listed.
     - Sunday (Edenred), Lightspeed (CONECS), Innovorder (help-centre article titles) and reportedly Obypay already accept them.
   - **Cash customers** stay at the counter.
   - **Switzerland:** TWINT is expected, and Stripe's Swiss card fees are higher.
5. **No proof in the chain segment yet.**
   - The head office has heard kiosk claims of +10–40 % basket (Innovorder, Acrelec, FLYX, Tabesto, Biborne; all vendor claims).
   - Ominin needs measured pilot figures of its own: adoption rate, queue time, ticket size, readiness accuracy.
6. **No delivery aggregation or loyalty story in this offer.**
   - Innovorder, FLYX and Deliverect bring Uber Eats orders into the till and run loyalty programmes (O'Tacos OPoints, BCHEF Foodies).
   - With Ominin, the Uber tablet stays separate.
7. **Adoption risk.** A QR code in a queue is easier to ignore than a kiosk in the customer's path. Adoption depends on signs, staff prompting and perhaps a first-order incentive (Chicken Street offers -25 %).

---

## 7. Top objections to prepare for, with suggested answers

1. **"3 % forever costs more than a €59 subscription once it works."**
   - Show the break-even table (§4) honestly.
   - Argue: zero cost for low-adoption franchisees, no hardware, the printer box included, and far cheaper than Uber pickup at about 15 %.
   - Prepare a network-level answer the team can defend, for example a monthly cap or a lower rate above a volume threshold. Decide this before the meeting; do not improvise it.
2. **"Your orders don't go into our till: how do we reconcile, report and stay compliant?"**
   - Have a clear process ready: daily export and payout reports from the dashboard, how franchisees record online sales, and the NF525 / accounting position, checked with an accountant.
   - Offer a roadmap to till integration, possibly through HubRise or Deliverect-style connectors, once O'Crousti's till vendor is known.
3. **"You are very small. Who answers at 8 pm on a Saturday across 38 restaurants and Lausanne, and what if you disappear?"**
   - Offer a support SLA, spare boxes and a fallback: orders stay visible on the staff dashboard or phone if a printer or box fails.
   - Propose a staged rollout (pilot of 2–3 restaurants, then waves) and data export or escrow guarantees.
4. **"Why not kiosks or an app like O'Tacos and Chamas? Kiosks raise the ticket by 30 %."**
   - Those figures are vendor claims.
   - Kiosks cost about €1,500–7,000 plus €40–200/month each, or about €80,000–90,000 a year for 38 units at list prices, and take floor space a 50 m² counter does not have.
   - A phone flow gives upsell prompts without capex.
   - Commit to measuring basket and adoption in the pilot rather than promising uplift.
5. **"Our lunch customers pay with titres-restaurant, some pay cash, and Swiss customers want TWINT."**
   - Be precise about what works today: cards, Apple Pay and Google Pay through Stripe.
   - What is planned: titres-restaurant through Stripe's beta, which needs CNTR approval and issuer contracts; TWINT for Swiss accounts.
   - Cash customers keep using the counter, and Ominin removes the online payers from that queue.
- **Also expect:**
  - "Uber Eats is already in our franchise pack." Answer: Ominin complements delivery and replaces only Uber pickup at about 15 %.
  - "Can you really predict ready times?" Answer: soon, with measured accuracy.
  - "Chicken Street does WhatsApp ordering." Answer: no chat and no app needed, just a web page from a QR code, plus kitchen printing.

---

## 8. Short list for the summary slide (price and model)

| Alternative | Model | Price (published or third-party) | Needs its own till | Fast-food reference |
|---|---|---|---|---|
| Uber Eats pickup | Commission | About 15 % (Standard, measured) | No | O'Crousti today, Master Poulet |
| Innovorder | Subscription + hardware | Not published (third-party from €79 HT/month per site); kiosk €2,000–15,000 | Yes (ecosystem) | Chamas Tacos, BCHEF, Big Fernand, Quick |
| FLYX | Quote | Not published | No (middleware) | O'Tacos |
| Sunday | Subscription + undisclosed transaction fees | €29–199/month + Click & Collect €29 + ordering €49 | No (50+ integrations) | PNY, Hippopotamus (casual dining); moving into fast-food kiosks |
| Obypay | Subscription | €49–199 HT/month per site | No | Flunch, 3 Brasseurs |
| Zelty | Subscription | €89 till + €60 online + €59 kiosk (unofficial) | Yes | Pokawa, Côte Sushi |
| Tabesto (Deliverect) kiosk | Subscription + set-up + hardware | €179/month first kiosk, €40 each extra, about €780 set-up | No | Berliner, Waffle Factory |
| Châtaigne (WhatsApp) | Flat fee, no commission | Not published | No (100+ tills) | Chicken Street |
| ClickEat / Qwick Order | Flat fee (+ €0.10–0.15 per payment for Qwick) | €59/month; €29–69/month | No | No chain named |
| Biborne kiosks | Purchase or rental | Quote; its own ranges €1,500–8,000 per unit, €90–250/month rental | Sells its own till; claims integrations | 100 % Crousti, O'Tacos, Pizza Time |

---

## 9. Not verified or not found

- **Not researched (search budget exhausted):**
  - Pyramid Computer / Polytouch, Nextep, Posiflex, Hiboutik, Hiopos, Revel.
  - Enterprise pricing for Oracle Micros, NCR Aloha and PAR.
  - "KioskPro", "Yumi" and "Ordr" in the French market; no evidence was found that any of them is relevant there.
- **Chains not researched:** Jollibee France, Pepe Chicken, Hot Chicken, New York Fried Chicken, Sam's Chicken, Tacos Avenue.
- **Unreliable, excluded:**
  - Companeo's "top kiosks" page, which lists generic product names and describes a restaurant kiosk as "OCPP compatible" (an EV-charging protocol).
  - Unverified statistics: "95 % Quick kiosk use", "400 kiosks in 180 Quick restaurants", "68 % of fast-food restaurants equipped".
- **Uncertain:**
  - The French Uber Eats pricing page (Japan footnote).
  - Obypay's official prices (site returned 403).
  - Dood's funding.
  - Pindot's price.
  - O'Crousti's unit count: the site says 38, directories say 16 at end of 2025.
