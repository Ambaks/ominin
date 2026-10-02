# 03 — Industry statistics: evidence base for the chicken-chain pitch

Compiled 29 September 2026 for a deck and motion-design ad aimed at the head office of a ~38-unit counter/takeaway chicken chain (France + Switzerland). Product pitched: QR order-and-pay from the phone (in the queue or before arriving), numbered ticket with live status and ML ready-time estimate, orders printed straight on the kitchen printers. Pricing: no monthly fee, 3 % of orders paid online, card-processor fees (Stripe) paid by the restaurant.

## How to read this

**Grades**

| Grade | Meaning |
|---|---|
| **A** | Independent: peer-reviewed research, official statistics or regulation, an independent market-research firm, or a sector body's commissioned study. Also used for a provider's own official price list (a primary fact). |
| **B** | Operator statement: earnings releases, SEC filings, CEO remarks on earnings calls. |
| **C+** | Survey commissioned by a vendor but fielded by an accredited pollster with published methodology. Usable if you name the sponsor. |
| **C** | Vendor marketing claim, or a figure with no traceable primary source. |

**Flags:** `[2nd]` means the figure was verified only through trade press relaying the source, not in the primary document. `[old]` means the data predate 2019 (foundational academic work is kept, but labelled).

**Method note.** Primary documents were read directly wherever possible: PDFs of AKTO, France Travail, the European Commission and the academic papers; SEC filings; Stripe and Uber pricing pages. The session's web-search budget ran out part-way through, so some items could not be traced to their origin. Those items appear under "Myths / do not use" or are marked as unverified. Nothing below is estimated or invented. Where a figure is our own arithmetic, it says **(computed)**.

---

## 1. The strongest, most defensible figures for the deck

| # | Figure | What it measures | Geo / year | Source | Grade |
|---|---|---|---|---|---|
| 1 | **Only 40 % of takeaway customers and 45 % of on-site customers are "very satisfied" with waiting time in fast-food/burger restaurants. For rush-hour management it is 34 % and 36 %.** | Share "très satisfait" (sub-total of "c'est parfait" + "très satisfaisant") | France, fieldwork May 2024, n=1,084 fast-food customers | AKTO (the branch's skills operator), fieldwork by Toluna-Harris Interactive, *Nouvelles attentes des clients de restauration rapide*, July 2024, p.23 | A |
| 2 | **Takeaway is the lowest-rated fast-food channel (7.4/10), behind delivery (7.9), click & collect (7.9), drive (7.8) and on-site (7.7).** Cited irritants: frequent forgotten items and long waits. | Mean overall satisfaction by channel | France 2024 | AKTO/Toluna-Harris 2024, p.21 | A |
| 3 | **Going from 10 to 15 people in the queue cuts purchase incidence from 30 % to 27 %, a 10 % drop in sales.** Customers react to the length of the queue, not to how fast it moves. | Causal econometric estimate (video-counted queue + POS data) | Deli counter at a Latin-American hypermarket; published 2013 `[old]` | Lu, Musalem, Olivares, Schilkrut, *Management Science* 59(8), 2013 | A |
| 4 | **Drive-thru customers value waiting at ≥ $0.04 per second (≈10× the average wage). A 7-second cut in wait gives a chain about +1 pt of market share on average (> 3 % for McDonald's).** | Structural demand model | US (Cook County IL), 2005 data `[old]` | Allon, Federgruen, Pierson, *MSOM* 13(4), 2011 | A |
| 5 | **In French fast food, 1 order in 10 was placed digitally (kiosk, web, app) in 2021. 57 % of digital orders came from 18–34-year-olds, vs 42 % of the overall market.** | Share of orders/visits | France 2021 | NPD Group (now Circana), via Snacking.fr, Feb 2022 `[2nd]` | A |
| 6 | **In French fast food, digital orders averaged €6.10 vs €4.90 for traditional orders (+23 %).** Correlational, not causal. | Average ticket by channel | France 2017 `[old]` | NPD Group, via Snacking.fr, March 2018 `[2nd]` | A |
| 7 | **At McDonald's, digital was over 40 % of systemwide sales in its top 6 markets (France is one of them). In France specifically, digital is "over half of sales".** | Digital share (kiosk + app + delivery) | Q3 2023 (top 6); France: Q2 2022 call | McDonald's Q3 2023 earnings release (SEC 8-K Ex. 99.1); CEO C. Kempczinski on the Q2 2022 call, via Restaurant Dive `[2nd]` | B |
| 8 | **Yum! Brands (KFC, Taco Bell, Pizza Hut): digital system sales ≈ $40 bn in 2025, digital mix nearly 60 %; above 60 % excluding Pizza Hut in Q2 2026.** | Digital share of system sales | Global, FY2025 / Q2 2026 | Yum! earnings releases (SEC 8-K Ex. 99.1, 4 Feb 2026 and 30 Jul 2026) | B |
| 9 | **"Aides de cuisine et employés polyvalents de la restauration" is France's most-sought occupation: 97,100 hiring projects in 2026, 39.7 % of them seasonal.** Only 35.6 % are judged difficult to fill, below the 43.8 % all-occupation average. For cooks, 57.6 % are difficult. | Employer hiring intentions | France 2026 | France Travail, *Enquête BMO 2026*, Éclairages & Synthèses #87, April 2026 | A |
| 10 | **Fast-food workforce: about 294,000 employees, 58 % part-time, average age 28–29.** | Workforce profile, convention IDCC 1501 | France, 31 Dec 2021 | AKTO Panorama statistique 2022 (DARES convention-collective data) | A |
| 11 | **Fast-food chicken is a €1.04 bn chain segment in 2024 (4th segment in chain restaurants) and ≈ €1.2 bn in 2025, with more than 700 outlets in 2025, twice as many as five years earlier.** | Chain-restaurant revenue and outlets | France 2024–2025 | Food Service Vision, *Revue Chaînes* 2025 press release (22 May 2025); 2026 edition via Snacking.fr; outlets via Novethic `[2nd]` | A |
| 12 | **Stripe charges 1.5 % + €0.25 on standard EEA cards. From 21 Oct 2026 it charges 2.8 % + €0.25 on premium EEA cards, up from 1.9 %.** Uber Eats' official FR merchant page lists 30 % ("Standard") or 33 % ("Premium") service fees. | Official tariffs | France, as of 29 Sep 2026 | stripe.com/fr/pricing; merchants.ubereats.com/fr/fr/pricing (carries a contradictory "Japan only" disclaimer, see §2.6) | A (tariff) |

---

## 2. Pillar 1: Increase revenue

### 2.1 Queue balking and reneging: academic evidence

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| Queue 10 → 15 people: purchase incidence 30 % → 27 %, i.e. **−10 % sales**. The effect is nonlinear: customers are insensitive to short lines but "balk when experiencing long lines". | Effect of queue length on purchase (causal estimate, video + POS) | Deli, hypermarket in a Latin-American capital; data 2008–09; published 2013 `[old]` | Lu et al., *Management Science* 59(8):1743–63 | https://pubsonline.informs.org/doi/10.1287/mnsc.1120.1686 (PDF: https://www.dii.uchile.cl/wp-content/uploads/2015/11/Measuring-the-Effect-of-Waiting-Time-on-Customer-Purchases.pdf) | A |
| "Customers appear to focus mostly on the length of the queue, without adjusting enough for the speed at which the line moves." Halving the queue from 12 to 6 people raises purchase probability by 5 %. Adding a second server, which also halves the wait but leaves the visible line in place, adds only 0.9 %. | Visible queue length vs actual speed | same | same | same | A |
| Only **7 %** of deli sales lost to a longer line (5 → 10 people) are recovered through substitute purchases. The rest is lost. | Substitution of lost sales | same | same | same | A |
| Cost of waiting **≥ $0.04 per second** (≈ 10× the average wage). A **7-second** wait reduction gives **+1 pt** market share on average, **> 3 %** for McDonald's. The gain comes "primarily from the acquisition of new customers". | Structural estimate, drive-thru | Cook County IL, 2005 data; published 2011 `[old]` | Allon, Federgruen, Pierson, *MSOM* 13(4):489–507 | https://business.columbia.edu/sites/default/files-efs/pubfiles/5373/customer_wait_fastfood.pdf | A |
| Longer waits → more **reneging**, a longer time before the customer returns, and shorter visits. Simulation: **without waiting, revenue would be ≈ +15 %.** | 94,404 customers, 12 months | Sit-down "popular Indian restaurant"; published 2018 | De Vries, Roy, De Koster, *Journal of Operations Management* 63:59–78 | https://research.tilburguniversity.edu/en/publications/worth-the-wait-how-restaurant-waiting-time-influences-customer-be/ | A (context is table service) |

**How to use this.** Lu et al. is the strongest scientific support for the core mechanism. People judge the line by how long it looks. Every customer who orders from their phone leaves the visible line, so the line looks shorter to the next arrival. This is **our inference** from the paper, not a measured QR-ordering result. Phrase it as "research shows customers judge the line by its length", not "QR ordering adds 10 % sales".

The "7-second rule" started as an industry maxim (a vendor executive quoted in 2008). Only cite it as Allon et al.'s estimate, and name its scope: US drive-thrus, 2005 data.

### 2.2 How long people tolerate waiting: surveys (weak, use carefully)

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| 47 % of French people will wait at most 3–4 min in a queue. 78 % give up entering a shop if the queue is too long. 76 % have already abandoned a purchase at the till. | Self-reported, **retail** | France, Nov 2017, n=1,001 `[old]` | Harris Interactive for StrongPoint (retail tech vendor), via GPO Magazine `[2nd]` | https://www.gpomag.fr/commerce-que-font-les-francais-face-a-une-file-d-attente/ | C+ |
| Fast-food diners: 27 % expect their order within 2–3 min, 42 % within 5 min, 7 % with no wait. **36 %** say they have switched restaurant or stopped going because of slow service. | Self-reported | US, Feb 2023, n≈2,540 / 1,824 | CivicScience (independent polling) | https://civicscience.com/three-quarters-of-fast-food-diners-expect-their-orders-in-5-minutes-or-less/ | A (US) |
| UK shoppers abandon after 5 min 54 s on average. | Self-reported, retail | UK 2013, n=1,344 `[old]` | Omnico (vendor) | https://www.retailtechnology.co.uk/news/4806/queuing-shoppers:-gone-in-six-minutes/ | C, avoid |
| 86 % avoid stores with long queues. 9 min is the average maximum wait. | Self-reported, retail | UK 2015, n=2,000 `[old]` | Box Technologies & Intel (vendors) | https://www.euroshop-tradefair.com/en/Home/Archive/86_percent_of_shoppers_avoid_a_store_with_long_queues | C, avoid |

The tolerance thresholds contradict each other (3–4 min, 5:54, 9 min). All of them are retail and self-reported, mostly vendor-sponsored, and mostly pre-2019. **Do not put a precise "customers leave after X minutes" figure in the deck.** Use Lu et al. (behaviour) and AKTO (French fast-food satisfaction) instead.

### 2.3 Digital ordering and average ticket

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| Digital orders averaged **€6.10 vs €4.90** for traditional orders (**+23 %**). +20 % beverage consumption. 36 % of digital orders were placed between 19:00 and 22:00 (vs 20 %). Millennials made 56 % of digital orders. | Average ticket by channel, French fast food | France 2017 `[old]` | NPD Group (M. Bertoch), via Snacking.fr, 16 Mar 2018 `[2nd]` | https://www.snacking.fr/actualites/management-franchise/3759--FoodTech--Le-digital-booste-le-ticket-moyen-de-la-restauration-rapide/ | A (correlational) |
| Online orders carried **14 % more special instructions** (custom toppings) and ≈ **100 kcal more** than phone orders. Mechanism: removing the social friction of saying it out loud. | 160,000 orders, 56,000 customers | US pizza chain, 2007–11 `[old]` | Goldfarb, McDevitt, Samila, Silverman, *Management Science* 61(12), 2015 | https://www.fuqua.duke.edu/duke-fuqua-insights/mcdevitt-self-service ; https://ideas.repec.org/a/inm/ormnsc/v61y2015i12p2963-2981.html | A |
| Kiosks: "20 % average increase in order values" (Tillster); "+35 % average check" (Future Ordering customers). | Vendor claims | n/a | Future Ordering blog, 2024/25 | https://www.futureordering.com/news/elevate-your-qsr-business-with-self-service-kiosks---the-path-to-increased-revenue-and-customer-satisfaction | C |
| "61 % of customers spend more" at kiosks. "95 % of Gen Z prefer kiosks to the till." | Vendor whitepaper | UK, undated | Vita Mojo | https://www.vitamojo.com/blog/self-service-kiosks-benefits/ | C |

**Caveat.** No independent, causal study of **QR/mobile ordering at a counter QSR** raising the average ticket was found. NPD's +23 % is a correlation: digital users are younger, order in the evening, and order more. Goldfarb et al. explain the mechanism (people order more freely without the social friction). The deck line that holds up: "In French fast food, digital tickets were 23 % higher (NPD, 2017)". Pair it with "the pilot will measure it on your own data".

### 2.4 Share of digital sales at major QSR chains

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| Digital systemwide sales in McDonald's top 6 markets (US, France, UK, Germany, Canada, Australia): "nearly $9 billion for the quarter, representing **over 40 %** of their Systemwide sales". | Kiosk + app + delivery | Q3 2023 | McDonald's Q3 2023 earnings release, SEC 8-K Ex. 99.1 (30 Oct 2023) | https://www.sec.gov/Archives/edgar/data/63908/000006390823000098/exhibit991-9302023xexcelte.htm | B |
| "Germany, France and the U.K., where digital makes up **over half of sales**." | Digital share, McDonald's France | Q2 2022 call | CEO Chris Kempczinski, via Restaurant Dive (27 Jul 2022) `[2nd]` | https://www.restaurantdive.com/news/mcdonalds-digital-sales-top-6b-across-top-6-markets/628094/ | B |
| McDonald's deployed "Ready on Arrival" (crew start assembling a mobile order before the customer arrives) in its top 6 markets by end 2025. Loyalty-member sales ≈ $37 bn in 2025 across 70 markets. | Strategy / loyalty | 2025 | McDonald's FY2025 10-K | https://www.sec.gov/Archives/edgar/data/63908/000006390826000035/mcd-20251231.htm | B |
| Yum! Brands: "digital system sales approaching $40 billion with digital mix nearly **60 %**" (FY2025). "Excluding Pizza Hut, … digital mix exceeding **60 %**" (Q2 2026). | Digital share (KFC + Taco Bell + Pizza Hut) | Global 2025–26 | Yum! 8-K Ex. 99.1 (4 Feb 2026; 30 Jul 2026) | https://www.sec.gov/Archives/edgar/data/1041061/000104106126000003/a8kex991242026.htm ; https://www.sec.gov/Archives/edgar/data/1041061/000104106126000149/a8kex9917302026.htm | B |
| French fast food: **1 order in 10** digital (2021). Digital was 7 % of all out-of-home visits (470 m visits), +5 pts vs 2019. It was 3 % of fast-food orders in 2017. | Market-wide digital share | France 2017 → 2021 | NPD Group via Snacking.fr (2 Feb 2022; 16 Mar 2018) `[2nd]` | https://www.snacking.fr/actualites/communaute/5949-Bilan-2021-le-digital-explose-en-restauration-et-la-rapide-est-a-13-/ | A |
| Among French fast-food/burger customers in the last 12 months: **65 %** ordered on site, 39 % takeaway, 23 % drive, 14 % delivery, **9 % click & collect**. | Channels used | France 2024 | AKTO/Toluna-Harris 2024, p.18 | https://observatoire.akto.fr/content/uploads/sites/3/2024/10/Restauration-rapide-Etude-nouvelles-attentes-des-clients-2024-Rapport.pdf | A |

Not found in this session: separate figures for KFC France and Burger King France (neither reports France alone). McDonald's has stopped publishing a digital share since 2024 and now reports loyalty sales instead.

### 2.5 Throughput and orders per hour at peak

**No independent study found** that quantifies an orders-per-hour gain from mobile/QR ordering at counter QSRs. What exists:

- *Adjacent academic evidence:* Buell, Kim & Tsay (*Management Science* 2017), field experiments in food service. Operational transparency (customers and cooks seeing each other) gave **+22.2 % customer-reported quality and −19.2 % throughput time**. This is about transparency, not ordering channels. At most it supports a live order-status screen. https://ideas.repec.org/a/inm/ormnsc/v63y2017i6p1673-1695.html (A)
- *Vendor claim:* "15 % reduction in service time" attributed to the National Restaurant Association, quoted by Future Ordering with no primary link. (C, untraced)

**Recommendation:** use no throughput figure in the deck. Promise to measure it in the pilot (see §8).

### 2.6 Delivery-platform commissions in France (contrast with 3 %)

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| Uber Eats merchant plans: "Produits du quotidien" **15 %**. "Standard" **30 %** (15 % on Uber Eats takeaway). "Premium" **33 %** (23 % on takeaway). Plus **€1.99/week** subscription. Uber Direct from €5.90 HT per delivery. | Official service fees | Page at merchants.ubereats.com/fr/fr/, viewed 29 Sep 2026 | Uber Eats | https://merchants.ubereats.com/fr/fr/pricing/ | A (tariff), **but see contradiction** |
| Contradiction: the same FR page carries the disclaimer "Les formules tarifaires présentées sur cette page sont uniquement disponibles au Japon." This looks like a template error, but it means the page cannot be quoted as a confirmed French tariff without checking an actual French contract. | | | | | |
| Uber Eats plans usually described as Lite 15 % / Plus 25 % / Premium 30 %; default Plus ≈ 27 %; 30 % HT typical with Uber delivery. Deliveroo 25–35 % with delivery, ~14–20 % with own delivery. | Trade-press / competitor blog compilations | France 2026 | Fooderise, commandeici (competitor vendors) | https://www.fooderise.com/commission-plateformes | C |
| Gira Conseil's Bernard Boutboul: commissions "can reach 30 %" and restaurants often raise prices to cover them. | Expert quote | France | LSA, relayed in search results only; LSA blocks automated reading | https://www.lsa-conso.fr/comment-deliveroo-se-diversifie-pour-mieux-regner-en-france,453564/ | A−, unverified quote |

**Deck-safe phrasing:** "Delivery platforms charge French restaurants up to 30 %+ of the order (Uber Eats merchant tariff: 30 % 'Standard', 33 % 'Premium')". This contrast is fair only for **delivery** orders. For in-store orders the relevant comparison is the card terminal (§2.7).

### 2.7 Payment costs: presenting the all-in cost honestly

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| **1.5 % + €0.25** standard EEA cards. **2.8 % + €0.25** premium EEA cards. 2.5 % + €0.25 UK cards. 3.15 % + €0.25 international cards (+2 % currency conversion). No setup or monthly fee. | Stripe online card pricing | France, viewed 29 Sep 2026 | Stripe | https://stripe.com/fr/pricing | A (tariff) |
| Premium EEA cards go **from 1.9 % to 2.8 %** for **existing** accounts from **21 Oct 2026** (new accounts already on the new rate). Radar becomes paid (€0.05/transaction) from 22 Jan 2027. | Price change | France 2026 | Realdev.fr (30 Jul 2026), citing Stripe's pricing page and merchant email `[2nd]` | https://www.realdev.fr/stripe-augmente-ses-tarifs-2026/ | A− |
| Stripe Terminal (in person): **1.4 % + €0.10** EEA cards, 2.9 % + €0.10 non-EEA. | Counter terminal benchmark | France 2026 | Stripe | https://stripe.com/fr/pricing | A (tariff) |
| Stripe Connect, "Stripe gère les tarifs" model: no platform or payout fees; Stripe collects processing fees from the connected account. "Vous gérez les tarifs" model: €2 per active account per month + 0.25 % + €0.10 per payout. | Platform fees | 2026 | Stripe | https://stripe.com/fr/connect/pricing | A (tariff) |
| SumUp pay-as-you-go: **1.75 %** per in-person card payment, all cards. Subscription plan: €19/month for lower rates (rates not rendered on the page). | Counter terminal benchmark | France 2026 | SumUp | https://www.sumup.com/fr-fr/tarifs/ | A (tariff) |
| EU Interchange Fee Regulation caps interchange at **0.2 %** (consumer debit) and **0.3 %** (consumer credit). | Regulatory floor of card acceptance cost | EU, since 2015 | Regulation (EU) 2015/751 | https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32015R0751 | A |
| Bank TPE contracts "0.3 %–1.75 %". | Negotiated merchant service charge | France | Trade-press/vendor compilations | e.g. https://www.legalstart.fr/fiches-pratiques/banque/taux-commission-carte-bancaire-commercant-2023/ | C (no official French average found) |
| Switzerland: 2.9 % + CHF 0.30 on Swiss cards; 3.25 % + CHF 0.30 on international cards. | Stripe CH online pricing | CH, viewed 29 Sep 2026 | Stripe | https://stripe.com/fr-ch/pricing | A (tariff) |

**Worked example (computed; standard EEA card; Ominin 3 % + Stripe 1.5 % + €0.25):**

| Ticket | Ominin 3 % | Stripe std | **All-in** | All-in % | Premium card all-in* | Counter TPE (SumUp 1.75 % / Stripe Terminal) | Uber Eats "Standard" 30 % |
|---|---|---|---|---|---|---|---|
| €10 | €0.30 | €0.40 | **€0.70** | **7.0 %** | €0.83 (8.3 %) | €0.18 / €0.24 | €3.00 |
| €15 | €0.45 | €0.475 | **€0.93** | **6.2 %** | €1.12 (7.5 %) | €0.26 / €0.31 | €4.50 |
| €20 | €0.60 | €0.55 | **€1.15** | **5.8 %** | €1.41 (7.1 %) | €0.35 / €0.38 | €6.00 |
| €30 | €0.90 | €0.70 | **€1.60** | **5.3 %** | €1.99 (6.6 %) | €0.53 / €0.52 | €9.00 |

\*2.8 % + €0.25 from 21 Oct 2026. Uber shown before VAT on the commission.

What to say honestly:
- The all-in cost is **about 5–7 % of an online order** at typical fast-food tickets. The fixed €0.25 weighs most on small tickets.
- Many online orders would otherwise have been paid by card at the counter. The **true extra cost** of shifting an order to mobile is the difference, about **4–5 points**, not the full 5–7 %.
- It is **4–6× cheaper than a delivery platform** for the same order value. But delivery is a different service, so do not call the two equivalent.
- Break-even check for the franchisor (formula, to fill with their data): extra cost ≈ digital share × (all-in rate − counter card rate). It must be outweighed by recovered balking sales plus ticket uplift, multiplied by gross margin.

---

## 3. Pillar 2: Improve the customer experience

### 3.1 What French fast-food customers say (AKTO / Toluna-Harris 2024: the core French source)

Methodology: n=1,084 fast-food consumers representative of French adults 18+, online, 23–28 May 2024. Qualitative phase: 4 focus groups (18–30 and 31–50), Nov 2023. Commissioned by AKTO, the operator for the restauration rapide branch (IDCC 1501), for its skills observatory. **Grade A.**
URL: https://observatoire.akto.fr/content/uploads/sites/3/2024/10/Restauration-rapide-Etude-nouvelles-attentes-des-clients-2024-Rapport.pdf

| Figure (fast-food/burger customers) | Delivery | On site | Takeaway | Page |
|---|---|---|---|---|
| Very satisfied with **waiting time** | n/a | **45 %** | **40 %** | 23 |
| Very satisfied with **rush-hour management** | n/a | **36 %** | **34 %** | 23 |
| Very satisfied with **ease of ordering** | 70 % | 56 % | 58 % | 23 |
| Very satisfied with **order accuracy** ("pas d'oublis") | **60 %** | 53 % | **44 %** | 22 |
| Overall satisfaction /10 (C&C 7.9, drive 7.8) | 7.9 | 7.7 | **7.4** | 21 |

The report's headline, "La rapidité, l'atout clé de la restauration rapide est remis en cause", is about wait times and rush hours. (Careful: its prose says "moins de la moitié des clients sont satisfaits", but the metric is **très** satisfaits. Quote it as "very satisfied".)

Other findings:
- Services judged important when choosing a fast-food restaurant (p.32): a **buzzer telling you your order is ready: 70 %**; **online/app ordering options (delivery or click & collect): 67 %**; help using kiosks 74 %.
- Qualitative (p.20): remote channels are valued for speed "ou encore la possibilité d'avoir **un aperçu du temps d'attente**". This is direct French consumer support for a live ETA.
- Qualitative (p.23): frustrations include "**trop de canaux de commande différents**, et une mauvaise gestion des priorités". **Risk for the pitch.** Show that QR orders join the same numbered queue and print on the same kitchen printers. Do not present them as yet another parallel channel.

### 3.2 Appetite for ordering and paying by phone in France

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| "Commande à table et/ou paiement à table en restaurant": **50 %** know and use it (16–24: **65 %**, 25–34: **57 %**, 50–65: 36 %). **59 %** intend to use it (16–24: **70 %**, 25–34: **66 %**). Click & collect: 64 % use it (25–34: 76 %), 70 % intend to. | Self-reported use/intent (proxy: table-service item, not counter QSR) | France, 27–28 Feb 2025, n=2,000 aged 16–65 | OpinionWay for Lyf (payment app), 5th edition, ISO 20252 | https://www.opinion-way.com/wp-content/uploads/2025/03/OpinionWay-pour-Lyf-Pay-Les-Francais-et-les-services-de-paiement-mobile-24-mars.pdf | C+ |
| Paying by QR code **in shops**: only 22 % use it, 34 % intend to. | Counterweight: QR payment in retail is still niche | same | same | same | C+ |
| 57 % of digital restaurant orders are placed by 18–34-year-olds. | Age skew of digital ordering | France 2021 | NPD via Snacking.fr `[2nd]` | see §2.4 | A |

No French survey found that directly asks "phone vs counter" preference for fast food. The Food Service Vision, Gira, Circana, IFOP and YouGov sources checked do not publish one openly. The vendor claims that do exist (Vita Mojo "95 % of Gen Z prefer kiosks") are grade C.

### 3.3 Psychology of waiting: why the numbered ticket and live ETA matter

| Finding | Evidence | Year | Source | URL | Grade |
|---|---|---|---|---|---|
| "Occupied time feels shorter than unoccupied time". "Uncertain waits are longer than known, finite waits". "Unexplained waits are longer than explained waits". "Unfair waits are longer than equitable waits". First law of service: **Satisfaction = Perception − Expectation**. | Conceptual (the reference text) | 1985 `[old]` | David Maister, "The Psychology of Waiting Lines", in *The Service Encounter* (Lexington Books) | https://davidmaister.com/articles/the-psychology-of-waiting-lines/ | A (classic, conceptual) |
| Field experiment: giving **information about the expected wait significantly reduced overestimation of waiting time**. Nuance: it also made perceived wait weigh more on the evaluation, so the ETA must be accurate. | Controlled field experiment (phone queue) | NL 2002 `[old]` | Antonides, Verhoef, van Aalst, *Journal of Consumer Psychology* 12(3) | https://research.wur.nl/en/publications/consumer-perception-and-evaluation-of-waiting-time-a-field-experi | A |
| Delay announcements change behaviour: they update beliefs about the wait and **lower customers' per-unit waiting cost**. | Empirical, call-center data | 2017 | Yu, Allon, Bassamboo, *Management Science* 63(1) | https://ideas.repec.org/a/inm/ormnsc/v63y2017i1p1-20.html | A |
| "Labor illusion": when a service shows the work being done, people can prefer a **longer** wait to an instant result. | 5 experiments | 2011 | Buell & Norton, *Management Science* 57(9) | https://ideas.repec.org/a/inm/ormnsc/v57y2011i9p1564-1579.html | A |
| Operational transparency in food service: **+22.2 % customer-reported quality, −19.2 % throughput time**. | 2 field + 2 lab experiments | 2017 | Buell, Kim, Tsay, *Management Science* 63(6) | https://ideas.repec.org/a/inm/ormnsc/v63y2017i6p1673-1695.html | A |
| Telling callers their **position in the queue** beat music and apologies on satisfaction and abandonment. | Field + lab | 2007 `[old]` | Munichor & Rafaeli, *Journal of Applied Psychology* 92(2):511 | https://doi.org/10.1037/0021-9010.92.2.511 | A, **abstract not retrieved; verify exact wording before quoting** |
| French fast-food customers value "un aperçu du temps d'attente" in remote channels. | Focus groups | France 2023–24 | AKTO/Toluna-Harris 2024, p.20 | see §3.1 | A (qualitative) |

Not found as independent, citable figures: a measured satisfaction gain from Domino's Tracker, Starbucks, Chipotle or Uber ETAs. Present these brands as **well-known examples**, with no attached numbers.

### 3.4 Accuracy of verbal vs digital orders

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| Very satisfied with order accuracy: **60 %** for delivery (orders placed in an app) vs **53 %** on site and **44 %** for takeaway (orders mostly placed verbally or at kiosks). Qualitative: "oublis de commande fréquents" in takeaway. | Customer-perceived accuracy by channel | France 2024 | AKTO/Toluna-Harris 2024, pp.21–22 | see §3.1 | A (perception, not audited error rate) |
| Online orders include 14 % more special instructions than phone orders. Customers specify more when they type than when they speak. | Order complexity | US 2007–11 `[old]` | Goldfarb et al. 2015 | see §2.3 | A |
| "74 % of QSR operators reported that kiosks improved order accuracy." | Operator opinion, attributed to QSR Magazine | undated | Quoted by Future Ordering (vendor), no primary link | see §2.3 | C, untraced |

**Gap.** No independent audit comparing error rates of verbal vs digital counter orders was found. The US drive-thru mystery-shop studies (Intouch Insight's 25th study, 2025, 2,265 visits, 13 brands) measure accuracy but did not publish a verbal-vs-app split on the page we could read (https://www.intouchinsight.com/resources/studies/drive-thru/). The defensible claim is qualitative: "the customer enters the order themselves, it is printed as entered, and nothing is lost in translation at the counter". Use the AKTO perception gap (60 % vs 44 %) as supporting evidence.

---

## 4. Pillar 3: Make employees' work easier

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| **Aides de cuisine and employés polyvalents de la restauration** are France's most-sought occupation: **97,100** hiring projects, **35.6 %** judged difficult, **39.7 %** seasonal. **Serveurs**: 93,800 projects, 42.2 % difficult, 67.4 % seasonal. **Cuisiniers**: 51,600 projects, **57.6 %** difficult. **All occupations: 43.8 %** difficult. | Employer hiring intentions (BMO survey) | France 2026 | France Travail, BMO 2026, *Éclairages & Synthèses* #87 (April 2026) | https://statistiques.francetravail.org/bmo (report PDF via "Téléchargez le document") | A |
| **294,100 employees** (31 Dec 2021) = **178,100 FTE**; **58 % part-time**; average age **28.2 (women) / 29.2 (men)**; 81 % on permanent contracts (CDI); 89 % employees/manual workers; 42 % work in firms with fewer than 10 staff. | Workforce profile, IDCC 1501 | France 2021 | AKTO Panorama statistique Restauration rapide, exercice 2022 (DARES convention-collective data) | https://observatoire.akto.fr/content/uploads/sites/3/2024/02/Panorama-statistique-Restauration-Rapide-Exercice-2022.pdf | A |
| "Employé polyvalent de restauration" was the #1 job ad in the QSR sector: **31,750** ads collected in 2022. Next: cooks, 6,630. | Job ads collected by Pôle emploi | France 2022 | same | same | A |
| 83,298 companies; 251,949 "salariés en ETP"; 25,680 apprentices (+41 % vs 2023). | Branch key figures | France 2024 | AKTO / France compétences | https://observatoire.akto.fr/statistique/restauration-rapide/ | A |
| Impact on jobs recommended by the branch study: train crew in "**gestion du stress, de conflit, de crise et à la priorisation des tâches**"; "**plus de personnel pour préparer les commandes durant les horaires « coup de feu »**"; dedicated crew for takeaway / click & collect. | Qualitative (branch study) | France 2024 | AKTO/Toluna-Harris 2024, p.12 | see §3.1 | A (qualitative) |
| Customers expect the ideal crew member to be "Efficace / Rapide" (19 %, #1 spontaneous mention). | Spontaneous mentions | France 2024 | AKTO/Toluna-Harris 2024, p.14 | see §3.1 | A |

**Careful with the "pénurie" narrative.** In 2026 the polyvalent crew role is the **highest-volume** hire in France, but its difficulty rate (35.6 %) is **below** the national average. The strong argument is **volume and churn**: lots of young, part-time, seasonal staff to recruit and train constantly, so every task removed from the till matters. Scarcity applies to **cooks** (57.6 % difficult).

Not found: a reliable **turnover rate** for IDCC 1501; the DARES pages were CAPTCHA-protected. Also not found: independent measures of **time spent taking orders and payments** or of rush-hour stress in French QSR. Do not use turnover or "X hours saved" figures unless the client supplies its own data.

Headcount figures conflict by definition: 294,100 employees / 178,100 FTE (DARES 2021) vs 251,949 "salariés en ETP" (France compétences 2024) vs 322,180 "direct employees" / "300,000 emplois directs" (SNARR, https://www.snarr.fr/). Say "about 250,000–320,000 employees depending on the source".

---

## 5. Market context

### 5.1 Out-of-home and fast-food market

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| Out-of-home food: **€128.3 bn** (+4.2 % vs 2024) for **11.97 bn meals, flat**. Growth is price, not volume. Commercial foodservice €75.37 bn (+3.4 %). **Counter service (VAC) = 59.2 % of meals** in commercial foodservice. | Market size and structure | France 2025 | Gira Conseil, via Snacking.fr (25 May 2026) `[2nd]` | https://www.snacking.fr/actualites/8112-Exclu-2025-une-annee-de-bascule-pour-la-consommation-alimentaire-hors-domicile-selon-Gira/ | A |
| Chain restaurants: **€25.5 bn** in 2025 (+3 %), **traffic −2 %**, 20,796 outlets. | Chain market | France 2025 | Food Service Vision *Revue Chaînes* 2026, via Snacking.fr (10 May 2026) `[2nd]` | https://www.snacking.fr/actualites/8095-A-25-5-mds-d-euros-la-restauration-chainee-accelere-sa-mutation-tiree-par-la-rapide/ | A |
| 2019–2024: chain revenue **+26 % to €21 bn**, driven entirely by outlet growth (+27 %). **Revenue per outlet −1 %.** Fast food went from 71 % to 75 % of the chain market. 311 QSR chains ≈ €15.6 bn (+33 % vs 2019). | Growth decomposition | France 2019–2024 | Food Service Vision press release, 22 May 2025 | https://www.resto-today.com/www.resto-today.com/w/pdf/food-service-vision-cp-revue-chaines-2025.pdf?VersionId=1748336386.650029 | A |
| Fast food = **70 %** of out-of-home visits. Fast-food traffic **+3 % vs 2019** while all foodservice is **−8 %**. Early 2025: frequency −0.3 %, average bill −0.2 %. | Traffic | France 2024–25 | Circana CREST, via Snacking.fr (18 Jun 2025) `[2nd]` | https://www.snacking.fr/actualites/7571-20-chiffres-pour-comprendre-la-restauration-rapide-en-France-en-2025-CDSnacking/ | A |

**Pitch angle, supported by the data:** traffic is flat to negative and revenue per outlet is not growing. Same-store growth has to come from **converting the footfall you already have** (fewer walk-aways, higher tickets), not from more visits.

### 5.2 The chicken boom

| Figure | What it measures | Geo / year | Source | URL | Grade |
|---|---|---|---|---|---|
| "Fast food poulet": **€1,036 m**, the #4 chain segment after burgers (€8,822 m), bakery/sandwich (€1,468 m) and grills (€1,062 m). | Chain revenue | France 2024 | Food Service Vision press release, 22 May 2025 | (FSV PDF above) | A |
| Poultry fast food ≈ **€1.2 bn** (burgers €9.2 bn). | Chain revenue | France 2025 | FSV *Revue Chaînes* 2026 via Snacking.fr `[2nd]` | (Snacking.fr 8095 above) | A |
| "En 2025, l'Hexagone comptait **plus de 700 points de vente**, d'après le cabinet Food Service Vision, soit **deux fois plus qu'il y a cinq ans**." | Chicken QSR outlets | France 2025 | Novethic (12 Jun 2026) citing FSV `[2nd]` | https://www.novethic.fr/economie-et-social/transformation-de-leconomie/consommation-importations-elevages-intensifs-que-cache-folie-poulet | A |
| **16** specialised chicken chains in 2025 vs **7** in 2019; segment revenue **€670 m → €1.3 bn**. | Chains and revenue | France 2019–2025 | Strateg'eat, via LSA (search snippet only; LSA blocks automated reading) `[2nd]` | https://www.lsa-conso.fr/decryptage-de-popeyes-a-picadeli-pourquoi-le-poulet-est-la-nouvelle-star-du-snacking,464984 | A−, unverified in primary |
| Fried chicken market **€1.12 bn**, 5 % of the total. | "France Snacking" survey of 150 majors | France 2024/25 | Snacking.fr (18 Jun 2025) | (Snacking.fr 7571 above) | A− |
| Breaded chicken promotions at foodservice distributors **+32 %**; halal promotions +40 % since 2021. | Supply-side signal | France 2025 | FSV 2025 via Snacking.fr | same | A |
| Chicken restaurants €958 m (2023), +€149 m in 2022→23, outlets **+60 %** 2019–2023. | Segment | France 2023 | Au cœur du CHR (source of the figures not named in the article) | https://aucoeurduchr.fr/article/restauration-rapide/snacking-le-poulet-frit-plonge-dans-le-succes/ | C (unattributed) |

**Contradiction:** the chicken segment is sized at €0.96 bn (2023, unattributed), €1.04 bn (FSV 2024), €1.12 bn (France Snacking), ≈ €1.2 bn (FSV 2025) and €1.3 bn (Strateg'eat 2025). The perimeters differ (chains only vs all players; fried only vs all chicken). Pick one source (**Food Service Vision**), state its perimeter, and do not mix years across sources. FSV's chain perimeter also changed between editions (€21 bn for 2024 vs €25.5 bn for 2025 with only "+3 %"). Do not compute growth across two FSV editions.

---

## 6. Contradictions to be aware of

1. **Queue tolerance thresholds** vary: 3–4 min for 47 % (Harris/StrongPoint FR 2017), 5 min 54 s (Omnico UK 2013), 9 min (Box/Intel UK 2015). All are retail and self-reported. Do not quote a single threshold.
2. **AKTO wording:** the report text says "satisfaits"; the metric is "très satisfaits". Quote "very satisfied".
3. **Uber Eats FR tariff:** the official page shows 15/30/33 % but says it applies "uniquement au Japon". Trade press says 15/25/30 % (default Plus ≈ 27 %).
4. **Stripe premium EEA cards:** 1.9 % (existing accounts until 20 Oct 2026) vs 2.8 % (new accounts now; everyone from 21 Oct 2026). Older third-party pages also show international at 3.25 %; the official page now says 3.15 %.
5. **Digital share:** McDonald's France is "over half of sales" (2022, kiosks included), while the market-wide figure for French fast food is 1 order in 10 (NPD 2021). Different scope, not an error. McDonald's figure proves the behaviour exists; NPD's shows how much headroom remains outside the top brands.
6. **Staff "shortage":** the polyvalent role is below the average difficulty rate (BMO 2026). Cooks are well above it.
7. **Chicken segment size:** €0.96–1.3 bn depending on source (§5.2).
8. **Workforce size:** 250k–322k depending on source and definition (§4).

---

## 7. Myths and figures NOT to use

| Commonly repeated claim | What we found | Verdict |
|---|---|---|
| "73 % of customers abandon a queue after 5 minutes" | Qminder attributes it to ICMI 2017. That article is about **call-center hold times** and does not contain the 73 % figure. | **Myth: do not use** |
| "86 % of consumers avoid stores with long queues" | Box Technologies & Intel (vendors), UK retail, 2015. | Do not use for QSR |
| "66 % abandoned a purchase because of queues; only 22 % came back" | Original source unclear (Qminder cites a blog aggregator). | **Untraceable: do not use** |
| "Kiosks increase the average ticket by 20–30 % / 35 %" | Tillster and Future Ordering, both vendors, no independent method. | Vendor claim (C) at best; better to use NPD's +23 % |
| "65 % of consumers used QR ordering (McKinsey)", "70 % favour QR codes (Roland Berger)" | Cited by Sunday and others with generic links; no primary report found. | **Untraceable: do not use** |
| "68 % of French fast-food outlets have kiosks" | Appears in search snippets with no named source. | **Untraceable: do not use** |
| "A 7-second cut = +1 % sales" (industry maxim) | Began as a vendor executive's quote (Hughlett 2008). Allon et al. (2011) confirm about +1 pt **market share** for US drive-thrus (2005 data). | Use **only** as Allon et al., with scope stated |
| "Uber Eats really costs 38–42 % of sales" | Computed by a competing vendor blog (commandeici), including VAT and ads. | C: avoid, or rebuild the calculation yourself |
| "94 % of French people say 10 minutes is the absolute maximum" | Only in a vendor blog's summary (Skipit) of Harris/StrongPoint 2017. Not in GPO Magazine's report of the same study. Retail, 2017. | Do not use |
| "People overestimate their waiting time by 36 %" | Widely repeated. Not traced to a primary study in this session. | Do not use unless traced |
| "Taco Bell digital orders are 20 % larger" | Not verified to a primary Yum/Taco Bell statement in this session. | Do not use unless traced |
| "200,000–300,000 unfilled jobs in French hospitality" (UMIH, 2021–22) | Post-Covid union estimate; not verified; outdated. | Do not use; BMO 2026 is the official alternative |

---

## 8. Gaps, and how the pilot can fill them

What independent sources do not give us, and what a 4–8 week pilot in 2–3 restaurants could measure (with a control restaurant or before/after weeks):

- **Walk-aways at peak:** count arrivals vs orders with a door counter or a simple manual tally at 12:00–14:00 and 19:00–21:00.
- **Average ticket, QR vs counter**, same restaurant and same time slot. This controls for NPD's selection bias.
- **Orders per hour at peak** and **counter time per order** from POS timestamps.
- **Order errors / remakes** per 100 orders, QR vs counter.
- **Accuracy of the predicted ready time**: share of orders ready within ±2 min of the ETA shown.
- **Customer satisfaction** with a short in-app survey reusing AKTO's items (waiting time, rush-hour management, order accuracy), so results are comparable with the 2024 national benchmark (40–45 % very satisfied with waiting time).

This lets the deck say "national data show the problem (AKTO, Lu et al.); your pilot will show the gain" without inventing a gain figure.

---

## 9. Source list (primary documents read unless marked `[2nd]`)

- AKTO / Toluna-Harris Interactive, *Les nouvelles attentes des clients de la restauration rapide*, July 2024: https://observatoire.akto.fr/content/uploads/sites/3/2024/10/Restauration-rapide-Etude-nouvelles-attentes-des-clients-2024-Rapport.pdf
- AKTO, Panorama statistique Restauration rapide, exercice 2022: https://observatoire.akto.fr/content/uploads/sites/3/2024/02/Panorama-statistique-Restauration-Rapide-Exercice-2022.pdf ; key figures 2024: https://observatoire.akto.fr/statistique/restauration-rapide/
- France Travail, Enquête BMO 2026, *Éclairages & Synthèses* #87, April 2026: https://statistiques.francetravail.org/bmo
- Lu, Musalem, Olivares, Schilkrut (2013), *Management Science*: https://pubsonline.informs.org/doi/10.1287/mnsc.1120.1686
- Allon, Federgruen, Pierson (2011), *MSOM*: https://business.columbia.edu/sites/default/files-efs/pubfiles/5373/customer_wait_fastfood.pdf
- De Vries, Roy, De Koster (2018), *JOM*: https://research.tilburguniversity.edu/en/publications/worth-the-wait-how-restaurant-waiting-time-influences-customer-be/
- Goldfarb, McDevitt, Samila, Silverman (2015), *Management Science*: https://ideas.repec.org/a/inm/ormnsc/v61y2015i12p2963-2981.html ; summary: https://www.fuqua.duke.edu/duke-fuqua-insights/mcdevitt-self-service
- Buell & Norton (2011): https://ideas.repec.org/a/inm/ormnsc/v57y2011i9p1564-1579.html ; Buell, Kim, Tsay (2017): https://ideas.repec.org/a/inm/ormnsc/v63y2017i6p1673-1695.html ; Yu, Allon, Bassamboo (2017): https://ideas.repec.org/a/inm/ormnsc/v63y2017i1p1-20.html
- Antonides, Verhoef, van Aalst (2002): https://research.wur.nl/en/publications/consumer-perception-and-evaluation-of-waiting-time-a-field-experi
- Maister (1985): https://davidmaister.com/articles/the-psychology-of-waiting-lines/
- Munichor & Rafaeli (2007): https://doi.org/10.1037/0021-9010.92.2.511 (abstract not retrieved)
- CivicScience (2023): https://civicscience.com/three-quarters-of-fast-food-diners-expect-their-orders-in-5-minutes-or-less/
- Harris Interactive for StrongPoint (2017), via GPO Magazine `[2nd]`: https://www.gpomag.fr/commerce-que-font-les-francais-face-a-une-file-d-attente/
- OpinionWay for Lyf (2025): https://www.opinion-way.com/wp-content/uploads/2025/03/OpinionWay-pour-Lyf-Pay-Les-Francais-et-les-services-de-paiement-mobile-24-mars.pdf
- NPD Group via Snacking.fr `[2nd]`: https://www.snacking.fr/actualites/communaute/5949-Bilan-2021-le-digital-explose-en-restauration-et-la-rapide-est-a-13-/ ; https://www.snacking.fr/actualites/management-franchise/3759--FoodTech--Le-digital-booste-le-ticket-moyen-de-la-restauration-rapide/
- McDonald's Q3 2023 release (SEC): https://www.sec.gov/Archives/edgar/data/63908/000006390823000098/exhibit991-9302023xexcelte.htm ; FY2025 10-K: https://www.sec.gov/Archives/edgar/data/63908/000006390826000035/mcd-20251231.htm ; Restaurant Dive `[2nd]`: https://www.restaurantdive.com/news/mcdonalds-digital-sales-top-6b-across-top-6-markets/628094/
- Yum! Brands releases (SEC): https://www.sec.gov/Archives/edgar/data/1041061/000104106126000003/a8kex991242026.htm ; https://www.sec.gov/Archives/edgar/data/1041061/000104106126000149/a8kex9917302026.htm
- Stripe pricing: https://stripe.com/fr/pricing ; https://stripe.com/fr/connect/pricing ; https://stripe.com/fr-ch/pricing ; change notice `[2nd]`: https://www.realdev.fr/stripe-augmente-ses-tarifs-2026/
- Uber Eats merchant pricing (FR): https://merchants.ubereats.com/fr/fr/pricing/
- SumUp pricing: https://www.sumup.com/fr-fr/tarifs/
- Regulation (EU) 2015/751: https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32015R0751
- Food Service Vision *Revue Chaînes* 2025 press release: https://www.resto-today.com/www.resto-today.com/w/pdf/food-service-vision-cp-revue-chaines-2025.pdf?VersionId=1748336386.650029 ; 2026 edition via Snacking.fr `[2nd]`: https://www.snacking.fr/actualites/8095-A-25-5-mds-d-euros-la-restauration-chainee-accelere-sa-mutation-tiree-par-la-rapide/
- Gira 2025 via Snacking.fr `[2nd]`: https://www.snacking.fr/actualites/8112-Exclu-2025-une-annee-de-bascule-pour-la-consommation-alimentaire-hors-domicile-selon-Gira/
- Circana / France Snacking via Snacking.fr `[2nd]`: https://www.snacking.fr/actualites/7571-20-chiffres-pour-comprendre-la-restauration-rapide-en-France-en-2025-CDSnacking/
- Novethic (FSV chicken outlets) `[2nd]`: https://www.novethic.fr/economie-et-social/transformation-de-leconomie/consommation-importations-elevages-intensifs-que-cache-folie-poulet
- Vendor sources (grade C): Future Ordering, Vita Mojo, Sunday, Qminder, Skipit, Fooderise, commandeici (URLs in the tables above).
