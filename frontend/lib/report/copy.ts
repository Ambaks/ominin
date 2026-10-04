import type { Night, Report } from "./data";

export type Lang = "en" | "fr";
export const LANGS: readonly Lang[] = ["en", "fr"];

export type Fmt = ReturnType<typeof makeFmt>;

/*
 * Espaces insécables : U+00A0 entre un nombre et son unité, avant « : » et à
 * l'intérieur des guillemets ; U+202F (fine) avant « ; ? ! % », comme Intl.
 */
export function makeFmt(lang: Lang) {
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const num = (v: number, digits = 0) =>
    v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return {
    num,
    int: (v: number) => num(Math.round(v)),
    eur: (v: number, digits = 0) =>
      v.toLocaleString(locale, { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }),
    pct: (v: number, digits = 0) => num(v, digits) + (lang === "fr" ? " %" : "%"),
    dur: (seconds: number) => {
      const s = Math.round(seconds);
      if (s < 60) return `${s} s`;
      const rest = s % 60;
      return `${Math.floor(s / 60)} min` + (rest ? ` ${rest} s` : "");
    },
    min: (seconds: number) => `${num(seconds / 60, 1)} min`,
    hours: (h: number) => `${num(h, 1)} h`,
  };
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const dowIndex = (n: Night) => DOW.indexOf(n.dow);
export const isWeekend = (n: Night) => n.dow === "Fri" || n.dow === "Sat";
export const onlineShare = (n: Night) => (n.orders ? (n.online / n.orders) * 100 : 0);
const night = (r: Report, day: string) => r.nights.find((n) => n.day === day)!;

/**
 * Texte de la page dans les deux langues. Les chaînes acceptent **gras** et
 * __accent__ (rendus par <Rich>) ; les fonctions reçoivent les données et le
 * formateur de la langue, pour que chiffres et texte ne divergent jamais.
 */
const en = {
  meta: { switchLabel: "Language", sections: "Sections", replay: "Replay" },
  mast: { brand: "Analytics", note: "Real data from a venue running on Ominin, 18 Sept – 3 Oct 2026" },
  nav: {
    adoption: "Paying online",
    speed: "Order to kitchen",
    reliability: "Payment success",
    rhythm: "Rhythm",
    menu: "Menu",
    guests: "Tables & guests",
    nights: "Night by night",
  },
  days: { short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], long: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  nightName: (n: Night) => `${n.dow} ${+n.day.slice(8)} ${n.day.slice(5, 7) === "09" ? "Sept" : "Oct"}`,
  oct1: "1 Oct",
  hero: {
    eyebrow: "A bar-restaurant in Toulouse · 16 service nights, Fri 18 Sept to Sat 3 Oct 2026",
    title: "Paid online, an order reaches the kitchen in __18 seconds__. Paid at the counter, it takes 4 min 39 s.",
    lede: (r: Report, f: Fmt) =>
      `This venue prints a kitchen or bar ticket only once an order is paid. Guests who pay from their table skip the walk and the queue, so their ticket prints almost at once. Online payment launched on 24 September and guests took to it fast: **on the final weekend, 2–3 October, ${f.pct(r.totals.lw_online_share)} of orders were paid from the table.**`,
    raceLabel: "Median time from order to kitchen ticket: 18 seconds online, 4 minutes 39 seconds at the counter",
    laneOnline: "Paid online from the table",
    laneCounter: "Paid at the counter",
    raceFoot: (r: Report, f: Fmt) =>
      `Order placed → ticket printed in the kitchen. Medians of ${f.int(r.speed.n_online)} online and ${f.int(r.speed.n_counter)} counter orders, replayed 30× faster than real time.`,
  },
  kpi: {
    revenue: "Revenue",
    revenueSub: (r: Report, f: Fmt) => `${f.int(r.totals.paid)} paid orders in ${r.totals.nights} nights`,
    online: "Paid online, weekend of 2–3 Oct",
    onlineSub: (r: Report, f: Fmt) => `${f.pct(r.totals.lw_online_rev_share)} of revenue`,
    success: "Online payment success",
    successSub: (r: Report, f: Fmt) => `since 30 Sept, up from ${f.pct(r.online_funnel.pre_rate)}`,
    basket: "Average order",
    basketSub: (r: Report, f: Fmt) => `${f.num(r.totals.units, 1)} items per order`,
    scans: "Menu visits that end in an order",
    scansSub: (r: Report, f: Fmt) => `out of ${f.int(r.funnel.sessions)} menu visits`,
  },
  legend: { online: "Online", card: "Card at the counter", cash: "Cash at the counter", paidOnline: "Paid online", paidCounter: "Paid at the counter" },
  adoption: {
    eyebrow: "Paying online",
    title: "Guests are switching to paying __from the table__",
    lede: (r: Report, f: Fmt) => {
      const [fri1, fri2, sat1, sat2] = ["2026-09-25", "2026-10-02", "2026-09-26", "2026-10-03"].map((d) => onlineShare(night(r, d)));
      return `Same nights, one week apart: on Friday the share of orders paid online went from **${f.pct(fri1)} to ${f.pct(fri2)}**; on Saturday, from **${f.pct(sat1)} to ${f.pct(sat2)}**. On the final weekend, online payments brought in ${f.pct(r.totals.lw_online_rev_share)} of revenue.`;
    },
    shareTitle: "Share of orders paid online, per night",
    shareSub: "Shaded columns are Fridays and Saturdays. Numbered markers are product changes, listed below.",
    events: (r: Report, f: Fmt) => [
      "**Wed 23 Sept.** Online card payment and Apple Pay switched on.",
      "**Thu 24 Sept.** The ‘Payer en ligne’ (pay online) button and a loyalty programme go live.",
      `**Sat 26 Sept, 10:38pm.** Paying online becomes the default choice, mid-service. That night the online share goes from **${f.pct(r.totals.sat26_before)} before the switch to ${f.pct(r.totals.sat26_after)} after**.`,
      "**Tue 29 Sept.** 3-D Secure bank authentication added. The success rate goes from about one in two to more than nine in ten.",
    ],
    stackTitle: "Paid orders per night, by payment method",
    stackSub: (mixed: number) => `‘Card at the counter’ includes ${mixed} bills split between card and cash.`,
    mixTitle: "Where the money came from",
    mixSub: "Share of takings by payment method",
    mixRows: ["Before online payment · 18–23 Sept", "Since launch · 24 Sept – 3 Oct", "Final weekend · 2–3 Oct"],
    mixNote: (r: Report, f: Fmt) =>
      `Online payment is replacing card payments at the counter. **Cash has not shrunk:** ${f.pct(r.mix.before.especes)} of takings before launch, ${f.pct(r.mix.after.especes)} since. The guests still queueing at the counter are increasingly the ones paying cash.`,
    basketTitle: "Online orders are the quick follow-up rounds",
    basketNote: (r: Report, f: Fmt) =>
      `Since launch, orders paid online average ${f.eur(r.totals.basket_online, 2)} for ${f.num(r.totals.units_online, 1)} items, against ${f.eur(r.totals.basket_counter, 2)} for ${f.num(r.totals.units_counter, 1)} items at the counter. Guests pay online for the small rounds: another drink, a fresh chicha. Those are the orders nobody wants to queue for.`,
  },
  speed: {
    eyebrow: "Order to kitchen",
    title: "Paying online removes the wait between __ordering and cooking__",
    lede: "In this venue, tickets print the moment an order is fully paid. For an order paid at the counter, the time from ordering to the kitchen ticket is the time the guest takes to walk up, queue and pay. We measured it on every paid order; payment and ticket are logged within the same second.",
    medOnline: "Median wait, paid online",
    medCounter: "Median wait, paid at the counter",
    nineIn10: (v: string) => `9 in 10 under ${v}`,
    over15: "Counter orders waiting over 15 min",
    over30: (v: string) => `${v} wait over 30 min`,
    saved: "Waiting time saved by paying online",
    savedSub: (n: number) => `${n} orders × the median gap`,
    ecdfTitle: "Share of orders already in the kitchen, by time since ordering",
    ecdfSub: "How to read it: one minute after ordering, what share of orders already has its ticket printed?",
    loadTitle: "The counter slows down when the bar is busy",
    loadSub: "Counter wait, by the number of orders placed in the previous 15 minutes",
    loadMedian: "Median wait",
    loadP90: "9 in 10 orders wait less than this",
    nightTitle: "Median counter wait, per night",
    nightSub: "Orders paid at the counter only. Shaded columns are Fridays and Saturdays.",
    nightNote: (r: Report, f: Fmt) => {
      const last = night(r, "2026-10-03");
      return `Saturday 3 October was the busiest of the 16 nights: ${last.orders} paid orders. Even with ${f.pct(onlineShare(last))} of them paid online, **the median counter wait reached ${f.num(last.counter_med / 60, 0)} min.** On peak nights the counter is the bottleneck, and every guest who pays online takes pressure off it.`;
    },
    printNote: (r: Report, f: Fmt) =>
      `Once a ticket is sent to print, Ominin’s printer box prints it in **${f.num(r.speed.print_med, 1)} s** (median), and ${f.pct(r.speed.print_under60, 1)} of tickets print within a minute. The ${r.speed.n_fallback} guests who started paying online and then paid at the counter waited longest of all: a median of ${f.dur(r.speed.fallback.p50)}.`,
  },
  reliability: {
    eyebrow: "Payment success",
    title: "Online payment now succeeds __92%__ of the time",
    lede: (r: Report, f: Fmt) =>
      `An attempt starts when a guest chooses to pay online. In the first week, ${f.pct(r.online_funnel.pre_rate)} of attempts ended in a payment. On 29 September an update added 3-D Secure bank authentication, which many European cards require. Since the 30th, ${f.pct(r.online_funnel.post_rate)} of attempts have succeeded.`,
    successTitle: "Online attempts that ended in a payment, per night",
    successSub: "Lines show the average before and after the 29 September update.",
    before: (v: string) => `24–29 Sept · ${v} average`,
    after: (v: string) => `30 Sept – 3 Oct · ${v} average`,
    outcomeTitle: (r: Report, f: Fmt) => `${f.int(r.online_funnel.intent)} online attempts since launch`,
    outcomeSub: "What happened to each attempt, 24 Sept to 3 Oct",
    outcomes: ["Paid online", "Paid at the counter instead", "Abandoned"],
    ghostNote: (r: Report, f: Fmt) => {
      const o = r.online_funnel;
      return `Including the first night (23 Sept), ${o.ghost_n} attempts were abandoned, on orders worth ${f.eur(o.ghost_value)}. **${f.pct(o.ghost_reordered)} were followed by a new order at the same table within 30 minutes**, typically ${f.dur(o.ghost_gap_med * 60)} later: the guest gave up on paying by card and ordered again. The other ${o.ghost_lost_n} (${f.eur(o.ghost_lost_value)}) were never followed by another order. That is the most that failed payments could have cost, and most of it happened before the update.`;
    },
  },
  rhythm: {
    eyebrow: "Rhythm",
    title: "A weekend business that peaks between __10pm and 1am__",
    lede: (r: Report, f: Fmt, weekendShare: number) =>
      `Fridays and Saturdays account for **${f.pct(weekendShare)} of revenue**. An average Saturday brings in ${f.eur(r.heat.rev_dow[5])}; an average Wednesday, ${f.eur(r.heat.rev_dow[2])}. The busiest quarter-hour of the period: ${r.heat.peak_n} orders between 11:45pm and midnight on Saturday 3 October.`,
    heatTitle: "Average paid orders per hour",
    heatSub: "By night of the week. Hours after midnight count towards the previous evening.",
    dowTitle: "Average revenue per night",
    dowSub: "Paid orders only. Two or three nights observed for each day of the week.",
  },
  menu: {
    eyebrow: "Menu",
    title: "Chichas bring in __41%__ of revenue",
    lede: (r: Report, f: Fmt) => {
      const tot = r.categories.reduce((s, c) => s + c.rev, 0);
      const ch = r.categories[0];
      const coke = r.top.find((t) => t.name === "Coca-Cola")!;
      return `Chichas lead by a wide margin: **${f.eur(ch.rev)}** from ${f.int(ch.units)} sold, ${f.pct((ch.rev / tot) * 100)} of revenue. The Premium and Classique chichas alone bring in ${f.eur(r.top[0].rev + r.top[1].rev)}. Soft drinks sell the most units (Coca-Cola: ${f.int(coke.units)}) but earn little.`;
    },
    catsTitle: "Revenue by menu category",
    catsSub: "Paid orders, 18 Sept to 3 Oct",
    topTitle: "Top 10 items by revenue",
    topSub: "With units sold",
    sold: (v: string) => `${v} sold`,
  },
  guests: {
    eyebrow: "Tables & guests",
    title: "Tables keep ordering __all night__",
    lede: (r: Report, f: Fmt) =>
      `A table that orders once usually orders again: **${f.pct(r.tables.multi)} of tables place two or more orders in a night.** The average table places ${f.num(r.tables.per_night, 0)} orders, spends ${f.eur(r.tables.rev, 2)} and keeps ordering for ${r.tables.span} minutes (median, tables with two or more orders). Every new round is a chance to pay from the table.`,
    tablesTitle: "Orders per table, per night",
    tablesSub: (r: Report, f: Fmt) => `${f.int(r.tables.nights)} table-nights across ${r.tables.used} of the venue’s 100 tables`,
    funnelTitle: "From scanning the QR code to ordering",
    funnelSub: (r: Report, f: Fmt) => `${f.int(r.funnel.sessions)} menu visits. Orders come in ${f.dur(r.funnel.scan_to_order_med)} after the scan (median).`,
    loyaltyTitle: "Loyalty programme, live since 24 September",
    members: "Members",
    membersSub: "signed up in 10 nights",
    withCard: "Orders with a loyalty card",
    withCardSub: "since 24 Sept",
    returning: "Came back another night",
    returningSub: "members seen on two or more nights",
    rewards: "Rewards redeemed",
    rewardsSub: (pts: string) => `${pts} points spent`,
  },
  nights: {
    eyebrow: "Night by night",
    title: "The numbers behind the charts",
    cols: ["Night", "Paid orders", "Revenue", "Paid online", "Online share of revenue", "Counter wait (median)", "Online attempts", "Abandoned", "Cancelled"],
    total: "Total",
    method: (r: Report, f: Fmt) => [
      "**Source.** Read-only queries on Ominin’s production database, Sunday 4 October 2026. The venue is not named, and no customer or staff data was extracted.",
      "**Service night.** 5am to 5am, Paris time, the venue’s own day boundary. Three test orders from 16 September are excluded.",
      "**Order to kitchen.** From the moment the order is placed to the creation of its kitchen ticket, which happens once the order is fully paid. Printing then takes a few seconds.",
      `**Online attempt.** An order where the guest chose to pay online. Abandoned means never paid and never cancelled. Revenue is money actually taken: ${f.eur(r.totals.rev)} across ${f.int(r.totals.paid)} paid orders.`,
    ],
  },
  charts: {
    hours: (h: number) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`),
    paidOnline: "Paid online",
    onlineOrders: "Online orders",
    ofTotal: (a: number, b: number) => `${a} of ${b}`,
    onlineRevenue: "Online share of revenue",
    revenue: "Revenue",
    after1Online: "of online orders after 1 min",
    after1Counter: "of counter orders",
    afterX: (v: string) => `After ${v}`,
    minutesAxis: "Minutes after the order was placed",
    minTick: (m: number) => `${m} min`,
    loadAxis: "Orders placed in the previous 15 minutes",
    loadHead: (label: string) => `${label} orders in the previous 15 min`,
    medianWait: "Median wait",
    under9: "9 in 10 under",
    counterOrders: "Counter orders",
    medianCounter: "Median counter wait",
    paidOrders: "Paid orders",
    successRate: "Success rate",
    attempts: "Attempts",
    abandoned: "Abandoned",
    share: "Share",
    avgOrders: "Avg paid orders",
    nightsSeen: "Nights observed",
    perHour: (max: number) => `${max} orders / hour`,
    avgRevenue: "Avg revenue per night",
    units: "Units sold",
    sessions: "Menu visits",
    ofSessions: "Share of all visits",
    funnel: ["Opened the menu", "Browsed a category", "Viewed a dish", "Added to basket", "Placed an order", "Started online payment"],
    tableNights: "Table-nights",
    tablesAxis: "Orders placed by one table in one night",
    tablesHead: (n: number, more: boolean) => `${more ? `${n} or more orders` : n === 1 ? "1 order" : `${n} orders`} in one night`,
    categories: {
      Chichas: "Chichas",
      Grillades: "Grills",
      Boissons: "Soft drinks",
      Cocktails: "Cocktails",
      Desserts: "Desserts",
      Pizzas: "Pizzas",
      "À partager": "Sharing plates",
      Smoothies: "Smoothies",
      "Salades gourmandes": "Salads",
      "Formules & retired items": "Set menus & discontinued items",
      Milkshakes: "Milkshakes",
      "Boissons chaudes": "Hot drinks",
      "Menu enfant": "Kids’ menu",
    } as Record<string, string>,
  },
};

export type Copy = typeof en;

const fr: Copy = {
  meta: { switchLabel: "Langue", sections: "Sections", replay: "Rejouer" },
  mast: { brand: "Analyses", note: "Données réelles d’un établissement qui utilise Ominin, du 18 sept. au 3 oct. 2026" },
  nav: {
    adoption: "Paiement en ligne",
    speed: "De la commande à la cuisine",
    reliability: "Paiements réussis",
    rhythm: "Rythme",
    menu: "Carte",
    guests: "Tables et clients",
    nights: "Soir par soir",
  },
  days: { short: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."], long: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] },
  nightName: (n: Night) => {
    const d = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."][dowIndex(n)];
    const day = +n.day.slice(8);
    return `${d} ${day === 1 ? "1er" : day} ${n.day.slice(5, 7) === "09" ? "sept." : "oct."}`;
  },
  oct1: "1er oct.",
  hero: {
    eyebrow: "Un bar-restaurant toulousain · 16 soirs de service, du ven. 18 sept. au sam. 3 oct. 2026",
    title: "Payée en ligne, une commande arrive en cuisine en __18 secondes__. Payée au comptoir, elle met 4 min 39 s.",
    lede: (r, f) =>
      `Dans ce bar-restaurant, un ticket ne sort en cuisine ou au bar qu’une fois la commande payée. Les clients qui paient depuis leur table s’épargnent le déplacement et la file d’attente : leur ticket sort presque aussitôt. Le paiement en ligne a été lancé le 24 septembre et les clients l’ont vite adopté : **le dernier week-end, les 2 et 3 octobre, ${f.pct(r.totals.lw_online_share)} des commandes ont été payées depuis la table.**`,
    raceLabel: "Temps médian entre la commande et le ticket cuisine : 18 secondes en ligne, 4 minutes 39 au comptoir",
    laneOnline: "Payée en ligne depuis la table",
    laneCounter: "Payée au comptoir",
    raceFoot: (r, f) =>
      `Commande passée → ticket imprimé en cuisine. Médianes calculées sur ${f.int(r.speed.n_online)} commandes en ligne et ${f.int(r.speed.n_counter)} au comptoir, rejouées 30 fois plus vite qu’en temps réel.`,
  },
  kpi: {
    revenue: "Chiffre d’affaires encaissé",
    revenueSub: (r, f) => `${f.int(r.totals.paid)} commandes payées en ${r.totals.nights} soirs`,
    online: "Payées en ligne, week-end des 2 et 3 oct.",
    onlineSub: (r, f) => `${f.pct(r.totals.lw_online_rev_share)} du chiffre d’affaires`,
    success: "Paiements en ligne réussis",
    successSub: (r, f) => `depuis le 30 sept., contre ${f.pct(r.online_funnel.pre_rate)} avant`,
    basket: "Panier moyen",
    basketSub: (r, f) => `${f.num(r.totals.units, 1)} article par commande`,
    scans: "Visites de la carte avec commande",
    scansSub: (r, f) => `sur ${f.int(r.funnel.sessions)} visites de la carte`,
  },
  legend: { online: "En ligne", card: "Carte au comptoir", cash: "Espèces au comptoir", paidOnline: "Payées en ligne", paidCounter: "Payées au comptoir" },
  adoption: {
    eyebrow: "Paiement en ligne",
    title: "Les clients adoptent le paiement __depuis la table__",
    lede: (r, f) => {
      const [fri1, fri2, sat1, sat2] = ["2026-09-25", "2026-10-02", "2026-09-26", "2026-10-03"].map((d) => onlineShare(night(r, d)));
      return `Mêmes soirs, à une semaine d’écart : le vendredi, la part des commandes payées en ligne est passée de **${f.pct(fri1)} à ${f.pct(fri2)}** ; le samedi, de **${f.pct(sat1)} à ${f.pct(sat2)}**. Le dernier week-end, le paiement en ligne a représenté ${f.pct(r.totals.lw_online_rev_share)} du chiffre d’affaires.`;
    },
    shareTitle: "Part des commandes payées en ligne, par soir",
    shareSub: "Colonnes grisées : vendredis et samedis. Les repères numérotés signalent des évolutions du produit, détaillées ci-dessous.",
    events: (r, f) => [
      "**Mer. 23 sept.** Activation du paiement par carte en ligne et d’Apple Pay.",
      "**Jeu. 24 sept.** Lancement du bouton « Payer en ligne » et d’un programme de fidélité.",
      `**Sam. 26 sept., 22 h 38.** Le paiement en ligne devient le choix par défaut, en plein service. Ce soir-là, la part en ligne passe de **${f.pct(r.totals.sat26_before)} avant le changement à ${f.pct(r.totals.sat26_after)} après**.`,
      "**Mar. 29 sept.** Ajout de l’authentification bancaire 3-D Secure. Le taux de réussite des paiements passe d’environ un sur deux à plus de neuf sur dix.",
    ],
    stackTitle: "Commandes payées par soir, selon le mode de paiement",
    stackSub: (mixed) => `« Carte au comptoir » inclut ${mixed} additions réglées en partie par carte, en partie en espèces.`,
    mixTitle: "D’où vient l’argent",
    mixSub: "Part des encaissements par mode de paiement",
    mixRows: ["Avant le paiement en ligne · 18–23 sept.", "Depuis le lancement · 24 sept. – 3 oct.", "Dernier week-end · 2–3 oct."],
    mixNote: (r, f) =>
      `Le paiement en ligne remplace la carte au comptoir. **Les espèces, elles, n’ont pas reculé :** ${f.pct(r.mix.before.especes)} des encaissements avant le lancement, ${f.pct(r.mix.after.especes)} depuis. Ceux qui font encore la queue au comptoir paient de plus en plus souvent en espèces.`,
    basketTitle: "En ligne, on règle surtout les tournées suivantes",
    basketNote: (r, f) =>
      `Depuis le lancement, une commande payée en ligne s’élève en moyenne à ${f.eur(r.totals.basket_online, 2)} pour ${f.num(r.totals.units_online, 1)} article, contre ${f.eur(r.totals.basket_counter, 2)} pour ${f.num(r.totals.units_counter, 1)} articles au comptoir. Les clients paient en ligne les petites tournées : un verre de plus, une nouvelle chicha. Ce sont justement les commandes pour lesquelles personne n’a envie de faire la queue.`,
  },
  speed: {
    eyebrow: "De la commande à la cuisine",
    title: "Payer en ligne supprime l’attente entre __la commande et sa préparation__",
    lede: "Dans cet établissement, le ticket sort dès que la commande est entièrement payée. Pour une commande réglée au comptoir, le temps entre la commande et le ticket cuisine, c’est le temps que met le client à se déplacer, à faire la queue et à payer. Nous l’avons mesuré sur chaque commande payée : paiement et ticket sont horodatés à la même seconde.",
    medOnline: "Attente médiane, paiement en ligne",
    medCounter: "Attente médiane, paiement au comptoir",
    nineIn10: (v) => `9 sur 10 en moins de ${v}`,
    over15: "Commandes au comptoir qui attendent plus de 15 min",
    over30: (v) => `${v} attendent plus de 30 min`,
    saved: "Attente évitée grâce au paiement en ligne",
    savedSub: (n) => `${n} commandes × l’écart médian`,
    ecdfTitle: "Part des commandes déjà en cuisine, selon le temps écoulé depuis la commande",
    ecdfSub: "Lecture : une minute après la commande, quelle part des commandes a déjà son ticket imprimé ?",
    loadTitle: "Le comptoir ralentit quand le bar est plein",
    loadSub: "Attente au comptoir, selon le nombre de commandes passées dans les 15 minutes précédentes",
    loadMedian: "Attente médiane",
    loadP90: "9 commandes sur 10 attendent moins que ce seuil",
    nightTitle: "Attente médiane au comptoir, par soir",
    nightSub: "Commandes payées au comptoir uniquement. Colonnes grisées : vendredis et samedis.",
    nightNote: (r, f) => {
      const last = night(r, "2026-10-03");
      return `Le samedi 3 octobre a été le soir le plus chargé des 16 : ${last.orders} commandes payées. Même avec ${f.pct(onlineShare(last))} de paiements en ligne, **l’attente médiane au comptoir a atteint ${f.num(last.counter_med / 60, 0)} min.** Les soirs de pointe, c’est le comptoir qui bloque, et chaque client qui paie en ligne le soulage.`;
    },
    printNote: (r, f) =>
      `Une fois le ticket transmis, le boîtier d’impression Ominin le sort en **${f.num(r.speed.print_med, 1)} s** (médiane), et ${f.pct(r.speed.print_under60, 1)} des tickets sortent en moins d’une minute. Les ${r.speed.n_fallback} clients qui ont commencé à payer en ligne avant de régler au comptoir ont attendu plus longtemps que tous les autres : ${f.dur(r.speed.fallback.p50)} en médiane.`,
  },
  reliability: {
    eyebrow: "Paiements réussis",
    title: "Le paiement en ligne réussit désormais dans __92 %__ des cas",
    lede: (r, f) =>
      `Une tentative commence quand le client choisit de payer en ligne. La première semaine, ${f.pct(r.online_funnel.pre_rate)} des tentatives ont abouti à un paiement. Le 29 septembre, une mise à jour a ajouté l’authentification bancaire 3-D Secure, exigée par de nombreuses cartes européennes. Depuis le 30, ${f.pct(r.online_funnel.post_rate)} des tentatives aboutissent.`,
    successTitle: "Tentatives en ligne abouties, par soir",
    successSub: "Les traits indiquent la moyenne avant et après la mise à jour du 29 septembre.",
    before: (v) => `24–29 sept. · ${v} en moyenne`,
    after: (v) => `30 sept. – 3 oct. · ${v} en moyenne`,
    outcomeTitle: (r, f) => `${f.int(r.online_funnel.intent)} tentatives de paiement en ligne depuis le lancement`,
    outcomeSub: "Ce qu’est devenue chaque tentative, du 24 sept. au 3 oct.",
    outcomes: ["Payées en ligne", "Finalement réglées au comptoir", "Abandonnées"],
    ghostNote: (r, f) => {
      const o = r.online_funnel;
      return `En comptant le premier soir (23 sept.), ${o.ghost_n} tentatives ont été abandonnées, pour ${f.eur(o.ghost_value)} de commandes. **${f.pct(o.ghost_reordered)} ont été suivies d’une autre commande à la même table dans les 30 minutes**, en général ${f.dur(o.ghost_gap_med * 60)} plus tard : le client a renoncé à payer par carte et a commandé de nouveau. Les ${o.ghost_lost_n} autres (${f.eur(o.ghost_lost_value)}) n’ont été suivies d’aucune commande. C’est le maximum que les échecs de paiement ont pu coûter, et l’essentiel date d’avant la mise à jour.`;
    },
  },
  rhythm: {
    eyebrow: "Rythme",
    title: "Une activité de week-end, qui bat son plein __entre 22 h et 1 h__",
    lede: (r, f, weekendShare) =>
      `Les vendredis et samedis représentent **${f.pct(weekendShare)} du chiffre d’affaires**. En moyenne, un samedi rapporte ${f.eur(r.heat.rev_dow[5])}, un mercredi ${f.eur(r.heat.rev_dow[2])}. Le quart d’heure le plus chargé de la période : ${r.heat.peak_n} commandes entre 23 h 45 et minuit, le samedi 3 octobre.`,
    heatTitle: "Commandes payées par heure, en moyenne",
    heatSub: "Par soir de la semaine. Les heures après minuit sont rattachées à la soirée commencée la veille.",
    dowTitle: "Chiffre d’affaires moyen par soir",
    dowSub: "Commandes payées uniquement. Deux ou trois soirs observés pour chaque jour de la semaine.",
  },
  menu: {
    eyebrow: "Carte",
    title: "Les chichas font __41 %__ du chiffre d’affaires",
    lede: (r, f) => {
      const tot = r.categories.reduce((s, c) => s + c.rev, 0);
      const ch = r.categories[0];
      const coke = r.top.find((t) => t.name === "Coca-Cola")!;
      return `Les chichas dominent largement : **${f.eur(ch.rev)}** pour ${f.int(ch.units)} vendues, soit ${f.pct((ch.rev / tot) * 100)} du chiffre d’affaires. Les chichas Premium et Classique rapportent à elles seules ${f.eur(r.top[0].rev + r.top[1].rev)}. Les boissons sont les plus vendues en volume (Coca-Cola : ${f.int(coke.units)}) mais rapportent peu.`;
    },
    catsTitle: "Chiffre d’affaires par catégorie",
    catsSub: "Commandes payées, du 18 sept. au 3 oct.",
    topTitle: "Les 10 articles qui rapportent le plus",
    topSub: "Avec les quantités vendues",
    sold: (v) => `${v} ventes`,
  },
  guests: {
    eyebrow: "Tables et clients",
    title: "Les tables commandent __toute la soirée__",
    lede: (r, f) =>
      `Une table qui commande une fois recommande le plus souvent : **${f.pct(r.tables.multi)} des tables passent au moins deux commandes dans la soirée.** En moyenne, une table passe ${f.num(r.tables.per_night, 0)} commandes, dépense ${f.eur(r.tables.rev, 2)} et continue de commander pendant ${r.tables.span} minutes (médiane, tables ayant passé au moins deux commandes). Chaque nouvelle tournée est une occasion de payer depuis la table.`,
    tablesTitle: "Commandes par table et par soir",
    tablesSub: (r, f) => `${f.int(r.tables.nights)} soirées-tables, sur ${r.tables.used} des 100 tables de l’établissement`,
    funnelTitle: "Du scan du QR code à la commande",
    funnelSub: (r, f) => `${f.int(r.funnel.sessions)} visites de la carte. La commande arrive ${f.dur(r.funnel.scan_to_order_med)} après le scan (médiane).`,
    loyaltyTitle: "Programme de fidélité, lancé le 24 septembre",
    members: "Membres",
    membersSub: "inscrits en 10 soirs",
    withCard: "Commandes avec carte de fidélité",
    withCardSub: "depuis le 24 sept.",
    returning: "Sont revenus un autre soir",
    returningSub: "membres vus au moins deux soirs",
    rewards: "Récompenses utilisées",
    rewardsSub: (pts) => `${pts} points dépensés`,
  },
  nights: {
    eyebrow: "Soir par soir",
    title: "Le détail des chiffres",
    cols: ["Soir", "Commandes payées", "Chiffre d’affaires", "Payées en ligne", "Part du chiffre d’affaires en ligne", "Attente au comptoir (médiane)", "Tentatives en ligne", "Abandonnées", "Annulées"],
    total: "Total",
    method: (r, f) => [
      "**Source.** Requêtes en lecture seule sur la base de production d’Ominin, le dimanche 4 octobre 2026. L’établissement n’est pas nommé et aucune donnée sur les clients ou le personnel n’a été extraite.",
      "**Soir de service.** De 5 h à 5 h, heure de Paris : c’est à 5 h que l’établissement change de journée. Trois commandes de test du 16 septembre sont exclues.",
      "**De la commande à la cuisine.** Du moment où la commande est passée à la création de son ticket cuisine, qui intervient une fois la commande entièrement payée. L’impression prend ensuite quelques secondes.",
      `**Tentative en ligne.** Commande pour laquelle le client a choisi de payer en ligne. Abandonnée : jamais payée ni annulée. Le chiffre d’affaires correspond à l’argent réellement encaissé : ${f.eur(r.totals.rev)} sur ${f.int(r.totals.paid)} commandes payées.`,
    ],
  },
  charts: {
    hours: (h) => `${h} h`,
    paidOnline: "Payées en ligne",
    onlineOrders: "Commandes en ligne",
    ofTotal: (a, b) => `${a} sur ${b}`,
    onlineRevenue: "Part du chiffre d’affaires en ligne",
    revenue: "Chiffre d’affaires",
    after1Online: "en ligne après 1 min",
    after1Counter: "au comptoir",
    afterX: (v) => `Au bout de ${v}`,
    minutesAxis: "Minutes écoulées depuis la commande",
    minTick: (m) => `${m} min`,
    loadAxis: "Commandes passées dans les 15 minutes précédentes",
    loadHead: (label) => `${label} commandes dans les 15 min précédentes`,
    medianWait: "Attente médiane",
    under9: "9 sur 10 en moins de",
    counterOrders: "Commandes au comptoir",
    medianCounter: "Attente médiane au comptoir",
    paidOrders: "Commandes payées",
    successRate: "Taux de réussite",
    attempts: "Tentatives",
    abandoned: "Abandonnées",
    share: "Part",
    avgOrders: "Commandes payées (moy.)",
    nightsSeen: "Soirs observés",
    perHour: (max) => `${max} commandes / heure`,
    avgRevenue: "CA moyen par soir",
    units: "Quantités vendues",
    sessions: "Visites de la carte",
    ofSessions: "Part de l’ensemble des visites",
    funnel: ["Carte ouverte", "Catégorie parcourue", "Plat consulté", "Article ajouté au panier", "Commande passée", "Paiement en ligne lancé"],
    tableNights: "Soirées-tables",
    tablesAxis: "Commandes passées par une table en une soirée",
    tablesHead: (n, more) => `${more ? `${n} commandes ou plus` : n === 1 ? "1 commande" : `${n} commandes`} dans la soirée`,
    categories: {
      Chichas: "Chichas",
      Grillades: "Grillades",
      Boissons: "Boissons",
      Cocktails: "Cocktails",
      Desserts: "Desserts",
      Pizzas: "Pizzas",
      "À partager": "À partager",
      Smoothies: "Smoothies",
      "Salades gourmandes": "Salades gourmandes",
      "Formules & retired items": "Formules et anciens articles",
      Milkshakes: "Milkshakes",
      "Boissons chaudes": "Boissons chaudes",
      "Menu enfant": "Menu enfant",
    },
  },
};

export const COPY: Record<Lang, Copy> = { en, fr };
