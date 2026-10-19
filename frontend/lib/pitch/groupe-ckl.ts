import { contactEmail, featuresSection, installSection } from "@/lib/landing-data";
import { getRestaurant } from "@/lib/menu-data";
import { commonSources, euros, fieldReport as field, minutesSeconds, percent, screenSizes, thousands } from "@/lib/pitch/kit";
import type { Source } from "@/lib/pitch/types";
import { report } from "@/lib/report/data";
import { menuPrintUrl, siteUrl } from "@/lib/site";
import captures from "@/public/pitch/groupe-ckl/captures.json";

/*
 * La présentation au Groupe CKL (Med Belkhir, quatre bars-brasseries de
 * l'Écusson, Montpellier) : /groupe-ckl/presentation, exportée en PDF. Chaque
 * fait vient de demos/groupe-ecusson/research/01-groupe.md ou des
 * profile.json des trois démos, avec sa source ; aucun prix d'Ominin, aucune
 * date promise. Les captures sont celles des démos (public/pitch/groupe-ckl,
 * écrites par le script de capture, qui note dans captures.json les cartes
 * prises et les zones de la vue groupe que la présentation annote).
 *
 * Typographie : espace insécable (\u00a0) avant « : ; ! ? », à l'intérieur
 * des guillemets, avant « € », « % » et les unités, et entre les milliers.
 */

// ——— Le mouvement ————————————————————————————————————————————————

/** Les réglages du mouvement à l'écran (components/pitch/groupe-ckl/deck.css les lit en variables). */
export const motion = {
  /** Part d'une diapositive visible avant que ses éléments entrent, en vue continue. */
  revealThreshold: 0.35,
  /** Durée d'une entrée d'élément, en ms. */
  enterMs: 760,
  /** Écart entre deux éléments qui entrent l'un après l'autre, en ms. */
  staggerMs: 110,
  /** En mode présentation, l'attente avant les entrées : le fondu de la diapositive d'abord. */
  presentDelayMs: 260,
  /** Le passage d'une diapositive à l'autre, en ms, et son glissement, en px d'écran. */
  slideMs: 620,
  slideShiftPx: 56,
  /** La diapositive qui part s'efface vite, et celle qui arrive attend un peu : leurs textes ne se superposent jamais. */
  slideOutMs: 240,
  slideInDelayMs: 160,
  /** Le glissé du doigt qui change de diapositive, en px. */
  swipePx: 48,
  /** La course des barres : une seconde mesurée dure tant de ms à l'écran, les deux barres à la même vitesse. */
  raceMsPerSecond: 10,
  /** Le trajet d'une impulsion sur une liaison du schéma, puis sa pause avant la suivante, en ms. */
  pulseMs: 1900,
  pulsePauseMs: 900,
  /** Les tours d'impulsions avant que le schéma se repose. */
  pulseCycles: 6,
  /** Le temps de chaque repère de la vue groupe sous son projecteur, en ms. */
  spotlightMs: 1500,
  /** D'où viennent les quatre marques de la couverture : l'écart de départ, en px de diapositive. */
  convergePx: 260,
} as const;

// ——— Les établissements ——————————————————————————————————————————

export interface Venue {
  slug: string;
  name: string;
  address: string;
  /** L'accent de l'enseigne, lisible sur fond sombre ; utilisé avec retenue (filets, points, liserés). */
  color: string;
  /** L'emblème rond ; absent tant que l'établissement n'a pas de carte. */
  mark?: string;
  /** La démo de sa carte, à la table des démos ; absente tant qu'elle n'est pas capturée. */
  demo?: string;
}

/** La table des démos et des captures. */
const table = 12;

// Les cartes que le script de capture a trouvées en ligne : les autres sont « en préparation ».
const ready = new Set<string>(captures.cartes);

const venue = (slug: string, name: string, address: string, color: string, mark?: string): Venue => ({
  slug,
  name,
  address,
  color,
  mark: ready.has(slug) ? mark : undefined,
  demo: ready.has(slug) ? `${menuPrintUrl}/demo/${slug}?table=${table}` : undefined,
});

/*
 * Les quatre adresses, dans l'ordre et aux couleurs de la vue groupe, pour
 * que la présentation et sa capture parlent la même langue : le Victoria en
 * bleu (le rouge y signale les retards), la Brasserie Laissac en vert (l'or de
 * son écusson se confondait avec celui du Novelty).
 */
export const venues: Venue[] = [
  venue("cafe-des-arts", "Café des Arts", "3\u00a0rue Saint-Guilhem", "#f0379a", "/cafe-des-arts/icon.png"),
  venue("le-victoria", "Le Victoria", "3\u00a0place Castellane", "#5aa9ff", "/le-victoria/badge.webp"),
  venue("le-novelty", "Le Novelty", "10\u00a0rue Saint-Guilhem", "#e8c96a", "/le-novelty/logo.webp"),
  venue("brasserie-laissac", "Brasserie Laissac", "9\u00a0place Alexandre-Laissac", "#3fc79b", "/brasserie-laissac/icon.png"),
];

export const venueBySlug = (slug: string) => venues.find((candidate) => candidate.slug === slug)!;

// ——— Les faits ————————————————————————————————————————————————————

/** Les fiches Google Maps relevées le 15/10/2026 : nombre d'avis par adresse, thème « serveur » au Victoria. */
const google = { reviews: { victoria: 2_540, cafeDesArts: 4_268, novelty: 1_209, laissac: 279 }, serveurVictoria: 298 };
const totalReviews = Object.values(google.reviews).reduce((sum, count) => sum + count, 0);

/** Les distances à vol d'oiseau, d'après les coordonnées des fiches : le rayon des trois adresses de la place, et Laissac. */
const distances = { castellaneRadius: 30, laissac: 410 };

/** Les happy hours publiés : site du groupe (Victoria), site du Novelty, visuel de la Brasserie Laissac (mêmes heures). */
const happyHours = { victoria: "16\u00a0h\u00a0–\u00a01\u00a0h", noveltyLaissac: "17\u00a0h\u00a0–\u00a023\u00a0h" };

/** Le Mojito du Novelty, lu sur sa carte de démo : son prix et le supplément XXL. */
const noveltyMojito = (() => {
  const item = getRestaurant("le-novelty")?.categories.flatMap((category) => category.items).find((candidate) => candidate.id === "mojito");
  const xxl = item?.options?.flatMap((group) => group.choices).find((choice) => choice.name === "XXL");
  if (!item || !xxl) throw new Error("Mojito XXL absent de la carte du Novelty");
  return { price: item.price, xxl: xxl.supplement };
})();
/** Son prix de l'affiche happy hours (lenovelty-montpellier.fr). */
const noveltyMojitoHappyHour = 6;

/**
 * Le relevé terrain (ominin.com/r7k2), sur ses 16 soirs : la part des
 * commandes payées depuis la table avant la mise en service, puis le dernier
 * week-end de la période.
 */
const fieldNights = report.nights.slice(0, field.nights);
const share = (nights: typeof fieldNights) =>
  Math.round((nights.reduce((sum, night) => sum + night.online, 0) / nights.reduce((sum, night) => sum + night.orders, 0)) * 100);
const beforeLaunch = share(fieldNights.filter((night) => night.day < report.milestones.launch));
const lastWeekend = fieldNights.slice(-2);
const lastWeekendShare = share(lastWeekend);
// Compté jusqu'au dernier soir du week-end, comme les autres présentations (« neuf jours après le lancement »).
const daysAfterLaunch = Math.round((Date.parse(lastWeekend[1].day) - Date.parse(report.milestones.launch)) / 86_400_000);
const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const fieldWeekendLabel = `${new Date(lastWeekend[0].day).getUTCDate()} et ${dayMonth.format(new Date(lastWeekend[1].day))}`;

// ——— Sources ——————————————————————————————————————————————————————

const relevé = "relevé du 15/10/2026";

export const sources = {
  groupe: {
    short: "cafedesarts34.fr",
    full: "Site du Groupe CKL, cafedesarts34.fr\u00a0— pages Le Victoria («\u00a0capacité de 150 personnes\u00a0», happy hour), Le Café des Arts, Le Novelty («\u00a0jusqu’à 50 personnes\u00a0»), La Brasserie Laissac, Conseils et FAQ («\u00a0Le Groupe CKL réunit quatre établissements complémentaires\u00a0»), Contact\u00a0; consultées le 15/10/2026",
    url: "https://www.cafedesarts34.fr/conseils-et-faq-w1",
  },
  privateaser: {
    short: "Privateaser",
    full: "Privateaser\u00a0— fiches Café des Arts («\u00a0terrasse ombragée de 150 places\u00a0») et Brasserie Laissac («\u00a0100 personnes\u00a0», fiche rédigée sous l’exploitant précédent)\u00a0; consultées le 15/10/2026",
    url: "https://www.privateaser.com/lieu/50727-cafe-des-arts-montpellier",
  },
  google: {
    short: `Google Maps, ${relevé}`,
    full: `Fiches Google Maps des quatre établissements, ${relevé}\u00a0: ${thousands(google.reviews.cafeDesArts)} avis (Café des Arts), ${thousands(google.reviews.victoria)} (Le Victoria), ${thousands(google.reviews.novelty)} (Le Novelty), ${google.reviews.laissac} (Brasserie Laissac), soit ${thousands(totalReviews)}\u00a0; thème «\u00a0serveur\u00a0» dans ${google.serveurVictoria} avis du Victoria\u00a0; avis 1\u00a0★ du Novelty, visite d’avril 2026\u00a0; distances à vol d’oiseau d’après les coordonnées des fiches`,
  },
  sluurpy: {
    short: "Sluurpy",
    full: "Sluurpy\u00a0— avis Google du Café des Arts repris, 4\u00a0★, «\u00a0il y a 4 mois\u00a0» au 15/10/2026",
    url: "https://www.sluurpy.fr/montpellier/restaurant/1991675/le-cafe-des-arts",
  },
  wanderboat: {
    short: "WanderBoat",
    full: "WanderBoat, avis agrégés\u00a0— avis 5\u00a0★ du Victoria, «\u00a02 years ago\u00a0» au 15/10/2026",
    url: "https://wanderboat.ai/restaurants/france/montpellier/le-victoria/UjwhIq2GTMm6p8-6iXxzaw",
  },
  novelty: {
    short: "lenovelty-montpellier.fr",
    full: `Le Novelty, lenovelty-montpellier.fr\u00a0— carte et affiche des happy hours (${happyHours.noveltyLaissac}, Mojito ${euros(noveltyMojitoHappyHour)})\u00a0; consultées le 14/10/2026`,
    url: "https://lenovelty-montpellier.fr/",
  },
  laissac: {
    short: "Brasserie Laissac, Facebook et Instagram",
    full: "Brasserie Laissac\u00a0— visuel «\u00a0Happy Hour 17H - 23H\u00a0» au nouveau logo (Facebook, 09/09/2026)\u00a0; bio Instagram @brasserie.laissac («\u00a07j/7 • 9h-01h00\u00a0»), relevée le 15/10/2026",
    url: "https://www.instagram.com/brasserie.laissac/",
  },
  outils: {
    short: "relevé des outils en ligne",
    full: `Relevé Ominin des outils en ligne, 15/10/2026\u00a0— réservation par Jotform (Le Victoria), Formspree (Le Novelty), le formulaire de contact du site du groupe (Café des Arts), le téléphone (Brasserie Laissac)\u00a0; aucune commande ni aucun paiement en ligne trouvés`,
  },
  cartes: {
    short: "cartes des démos, relevées en ligne",
    full: "Cartes des démos\u00a0: Le Novelty sur son site et Le Victoria sur Deliveroo (14/10/2026), le Café des Arts sur son ancien site (archives 2021–2022), la Brasserie Laissac sur le panneau de sa façade (vidéo de réouverture, Facebook, 04/09/2026)\u00a0; à relire avec vous avant toute mise en service",
  },
  report: {
    ...commonSources.report,
    display: "ominin.com/r7k2",
    full: `Ominin\u00a0— relevé terrain d’un bar-restaurant toulousain équipé d’Ominin, ${field.nights} soirs de service du 18/09 au 03/10/2026, ${thousands(field.orders)} commandes payées\u00a0: temps médians de la commande au ticket cuisine sur ${field.online} commandes payées en ligne et ${thousands(field.counter)} au comptoir\u00a0; part des commandes payées depuis la table, soir par soir. Rapport public anonymisé`,
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof sources;

// ——— Démos et contact ——————————————————————————————————————————

export const groupDemo = `${menuPrintUrl}/demo/groupe/ckl`;
export const salleDemo = `${menuPrintUrl}/demo/le-victoria/salle`;
/** L'adresse telle qu'elle s'imprime, sans protocole. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, "");

export const presentationPath = "/groupe-ckl/presentation";
export const pdfHref = "/pitch/groupe-ckl/groupe-ckl-ominin.pdf";

export const contact = {
  email: contactEmail,
  mailto: `mailto:${contactEmail}?subject=${encodeURIComponent("Groupe CKL × Ominin")}`,
  signature: "Ambaka\u00a0Le\u00a0Grégam, fondateur d’Ominin",
};

// ——— Les captures ————————————————————————————————————————————————

const shot = (name: string) => `/pitch/groupe-ckl/${name}.jpg`;

export const screens = {
  carte: (slug: string) => shot(`carte-${slug}`),
  choisir: { src: shot("parcours-choisir"), alt: "La fiche du burger Café des Arts, cuisson à point choisie, 16 €" },
  panier: { src: shot("parcours-panier"), alt: `La commande de la table ${table}\u00a0: un burger et un mojito passion, 24,50 €, payer en ligne ou au comptoir, pourboire au choix` },
  paiement: { src: shot("parcours-paiement"), alt: "La feuille de paiement du Café des Arts, 24,50 € par carte (démo : rien n’est débité)" },
  suivi: { src: shot("parcours-suivi"), alt: `Le ticket de la table ${table}\u00a0: commande reçue, paiement accepté, elle part en préparation` },
  servi: { src: shot("parcours-servi"), alt: `Commande n°\u00a01, table ${table}\u00a0: «\u00a0Bon appétit\u00a0!\u00a0»` },
  happy: { src: shot("happy-novelty"), alt: "Le Mojito du Novelty en XXL : 12 € hors happy hour, « Happy hours 17h–23h : 6 € » sous sa description" },
  salle: { src: shot("salle-victoria"), alt: "L’écran de salle du Victoria un vendredi à 20 h 40 : dix tables à servir, ce qui reste à apporter, « Servi » d’un appui" },
  groupe: { src: shot("groupe"), alt: "La vue groupe : encaissé, commandes, tables en cours, à encaisser, délais de service, puis chaque adresse en direct" },
  heures: { src: shot("groupe-heures"), alt: "Les heures fortes de chaque adresse, heure par heure, rapportées à sa meilleure heure" },
};

/**
 * Ce que chaque étape du parcours montre de sa capture, en px CSS de
 * l'écran de 390 × 844 : une même hauteur pour les cinq, à partir du haut
 * utile de chacune (mesuré sur les captures) — la carte sous son bandeau, le
 * ticket sous la carte floutée ; une feuille posée en bas d'écran s'y
 * montre en entier, avec un peu de la carte floutée au-dessus.
 */
const stepHeight = 540;
const fromTop = (y: number) => ({ x: 0, y: Math.min(y, screenSizes.phone.height - stepHeight), width: screenSizes.phone.width, height: stepHeight });
const stepCrops = {
  carte: fromTop(62),
  choisir: fromTop(screenSizes.phone.height),
  panier: fromTop(282),
  suivi: fromTop(96),
  servi: fromTop(screenSizes.phone.height),
};

/** La feuille de paiement seule, de son bord haut (mesuré sur la capture) au bas de l'écran. */
const paymentSheetTop = 318;
export const paymentCrop = { x: 0, y: paymentSheetTop, width: screenSizes.phone.width, height: screenSizes.phone.height - paymentSheetTop };

export const groupBoxes = captures.groupe.boxes;
export const groupHours = captures.groupe.heures;
/** Sous la courbe d'encaissé des adresses, la marge avant la coupe de la capture, en px. */
const groupCropMargin = 28;
/** Le haut de la vue groupe, en px de sa capture : en-tête, indicateurs, alerte, puis l'encaissé de chaque adresse. */
export const groupCrop = {
  x: 0,
  y: 0,
  width: screenSizes.desktop.width,
  height: Math.min(screenSizes.desktop.height, groupBoxes.revenue.y + groupBoxes.revenue.height + groupCropMargin),
};

// ——— Le récit ——————————————————————————————————————————————————————

/** Les cartes en ligne, en toutes lettres (« Trois sur quatre »), et celles encore en préparation. */
const pending = venues.filter((candidate) => !candidate.demo);
const readyWords = ["Aucune", "Une", "Deux", "Trois"][venues.length - pending.length];

export const deck = {
  footer: "Groupe CKL × Ominin",
  /** Le nom d'une diapositive pour les lecteurs d'écran, que le mode présentation annonce aussi. */
  slideLabel: (index: number, total: number, title: string) => `Diapositive ${index} sur ${total}\u00a0: ${title}`,
  date: "Octobre 2026 · Montpellier",
  ui: {
    title: "Groupe CKL × Ominin",
    present: "Présenter",
    pdf: "PDF",
    pdfLabel: "Télécharger la présentation en PDF",
    exit: "Quitter la présentation",
    previous: "Diapositive précédente",
    next: "Diapositive suivante",
    hint: "Tournez votre téléphone, ou touchez «\u00a0Présenter\u00a0».",
    keys: "← → pour avancer, Échap pour quitter",
    /** La flèche entre deux parts, lue à voix haute. */
    then: "puis",
  },

  cover: {
    eyebrow: "Proposition pour le Groupe CKL",
    title: ["Quatre adresses,", "un seul écran."],
    lead: "Vos clients commandent et paient depuis leur table, le ticket part au bar et en cuisine, vos serveurs gardent l’accueil. Et vous suivez vos quatre établissements en direct, au même endroit.",
  },

  seen: {
    eyebrow: "Ce que nous avons vu",
    title: ["Des salles pleines,", "des happy hours qui durent."],
    capacities: [
      { value: "150", label: "personnes au Victoria", venue: "le-victoria" },
      { value: "150", label: "places sur la terrasse du Café des Arts, et trois salles", venue: "cafe-des-arts" },
      { value: "50", label: "personnes au Novelty, en réservation ou en privatisation", venue: "le-novelty" },
      { value: "≈\u00a0100", label: "personnes à la Brasserie Laissac, d’après sa fiche d’avant la reprise", venue: "brasserie-laissac" },
    ],
    hours: [
      { value: happyHours.victoria, label: "happy hour au Victoria" },
      { value: happyHours.noveltyLaissac, label: "happy hours au Novelty et à la Brasserie Laissac" },
      { value: thousands(totalReviews), label: "avis Google sur vos quatre fiches" },
    ],
    quotes: [
      {
        text: "nous avons dû nous déplacer pour passer la commande",
        stars: 4,
        venue: "cafe-des-arts",
        meta: "avis Google, il y a 4 mois",
      },
      {
        text: "un peu long par rapport au nombre qu’ils sont",
        stars: 5,
        venue: "le-victoria",
        meta: "avis WanderBoat, il y a 2 ans",
      },
    ] as const,
    respect: `Vos équipes sont saluées\u00a0: «\u00a0serveur\u00a0» revient dans ${google.serveurVictoria} avis du Victoria. À l’heure de pointe, c’est le temps qui leur manque.`,
    sources: ["groupe", "privateaser", "laissac", "google", "sluurpy", "wanderboat"] as SourceId[],
  },

  how: {
    eyebrow: "Ominin, côté client",
    title: { text: "Le client commande", accent: "depuis sa table." },
    note: "Rien à installer\u00a0: le QR de la table ouvre la carte de l’établissement, à ses couleurs.",
    steps: [
      { title: "Scanner", text: `Le QR de la table ${table} ouvre la carte du Café des Arts.`, screen: { src: screens.carte("cafe-des-arts"), alt: `La carte du Café des Arts, à la table ${table}` }, crop: stepCrops.carte },
      { title: "Choisir", text: "Cuisson, déclinaison, supplément\u00a0: le client choisit lui-même.", screen: screens.choisir, crop: stepCrops.choisir },
      { title: "Payer", text: "En ligne sur la page (carte, Apple\u00a0Pay, Google\u00a0Pay), ou «\u00a0Payer au comptoir\u00a0».", screen: screens.panier, crop: stepCrops.panier },
      { title: "Envoyée", text: "Payée, la commande part aussitôt au bar et en cuisine\u00a0; le client garde son ticket.", screen: screens.suivi, crop: stepCrops.suivi },
      { title: "Servi", text: "Le client suit sa commande jusqu’au service\u00a0: «\u00a0Bon appétit\u00a0!\u00a0»", screen: screens.servi, crop: stepCrops.servi },
    ],
    demo: venueBySlug("cafe-des-arts").demo,
  },

  cartes: {
    eyebrow: "Prêtes à scanner",
    title: { text: "Vos cartes,", accent: "déjà en ligne." },
    lead: `${pending.length ? `${readyWords} sur quatre` : "Les quatre"}, chacune à ses couleurs, avec ses plats, ses prix et ses happy hours. Scannez\u00a0: vous êtes à la table ${table}.`,
    pendingLabel: "Carte en préparation",
    note: "Démos\u00a0: le paiement est imité, rien n’est envoyé ni débité.",
    sources: ["cartes"] as SourceId[],
  },

  staff: {
    eyebrow: "Côté équipe",
    title: { text: "Vos serveurs", accent: "gardent l’accueil." },
    lead: "Ominin prend la commande et l’encaissement\u00a0; la salle voit, table par table, ce qui reste à apporter.",
    points: [
      { title: "«\u00a0Servi\u00a0» d’un appui.", text: "Sur tablette ou téléphone\u00a0: chaque table, depuis quand elle attend, ce qui reste à servir." },
      { title: "La commande aussi sur le téléphone du serveur.", text: "Une table sans smartphone, un habitué qui préfère parler\u00a0: le serveur la prend dans Ominin, elle part au bar et en cuisine comme les autres." },
      { title: "Le client suit sans faire signe.", text: "Reçue, en préparation, servie\u00a0: il le voit sur son téléphone." },
    ],
    caption: "L’écran de salle d’Ominin\u00a0: démo du Victoria, un samedi à 19\u00a0h\u00a040",
    tips: "Au paiement en ligne, le client peut laisser un pourboire à l’équipe\u00a0: 5, 10, 15\u00a0% ou le montant de son choix.",
  },

  happy: {
    eyebrow: "Tarifs planifiés",
    title: { text: "Le happy hour", accent: "s’applique tout seul." },
    quote: "Lors du paiement, mon amie paye 12€ au lieu des 9€ indiqué précédemment",
    quoteMeta: "Le Novelty · avis Google 1\u00a0★ · avril 2026",
    explain: `Sur votre carte, un Mojito XXL\u00a0: ${euros(noveltyMojito.price)} + ${euros(noveltyMojito.xxl)} = ${euros(noveltyMojito.price + noveltyMojito.xxl)}. Au prix des happy hours, ${euros(noveltyMojitoHappyHour)} + ${euros(noveltyMojito.xxl)} = ${euros(noveltyMojitoHappyHour + noveltyMojito.xxl)}\u00a0: l’écart de cet avis.`,
    today: "Aujourd’hui, dans la démo, le prix du happy hour est écrit sous le cocktail.",
    rule: {
      where: "Dans l’espace de gestion",
      label: "Règle «\u00a0Happy hours\u00a0»",
      target: "Mojito",
      days: "tous les jours",
      terms: { target: "Article", days: "Jours", window: "Créneau", change: "Écart" },
      window: "17\u00a0h → 23\u00a0h",
      change: `−${euros(noveltyMojito.price - noveltyMojitoHappyHour)}`,
    },
    states: [
      { time: "16\u00a0h\u00a059", label: "Hors happy hour", price: euros(noveltyMojito.price + noveltyMojito.xxl), detail: `Mojito ${euros(noveltyMojito.price)} + XXL ${euros(noveltyMojito.xxl)}` },
      { time: "17\u00a0h\u00a000", label: "Happy hours", price: euros(noveltyMojitoHappyHour + noveltyMojito.xxl), detail: `Mojito ${euros(noveltyMojitoHappyHour)} + XXL ${euros(noveltyMojito.xxl)}`, struck: euros(noveltyMojito.price + noveltyMojito.xxl) },
    ],
    takeaway: "Réglé en tarif planifié, le prix du happy hour devient le prix lui-même\u00a0: la carte, le panier et le paiement lisent le même. Le prix affiché est celui qui est encaissé.",
    midnight: `Au Victoria, ${happyHours.victoria}\u00a0: un créneau qui passe minuit se règle de la même façon.`,
    sources: ["google", "novelty", "groupe"] as SourceId[],
  },

  connect: {
    eyebrow: "Avec vos outils",
    title: { text: "Branché sur ce que", accent: "vous avez déjà." },
    landing: featuresSection.features.find((feature) => feature.stat === "Caisse")!.description,
    order: `Table\u00a0${table} · payée`,
    hub: ["Commande", "Paiement", "Suivi"],
    till: { label: "Votre caisse", text: "Plus de 40 caisses compatibles, dont celles-ci.", partners: installSection.integrations.partners.filter((partner) => partner.kind === "caisse") },
    printers: { label: "Vos imprimantes tickets", text: "Avec le boîtier Omilink, le ticket sort au bar comme en cuisine.", stations: ["Bar", "Cuisine"] },
    accounts: { label: "Le compte de chaque établissement", text: "Chaque société encaisse sur son propre compte Stripe, versé sur sa banque. La vue groupe les additionne." },
    question: "Quelle caisse utilisez-vous\u00a0?",
    answer: "Elle n’apparaît nulle part en ligne. Dites-nous laquelle équipe chaque établissement\u00a0: nous vérifions le branchement avant toute chose.",
  },

  group: {
    eyebrow: "Pour vous",
    title: { text: "Tout le groupe, en direct,", accent: "sur un écran." },
    lead: `Trois adresses à ≈\u00a0${distances.castellaneRadius}\u00a0m de la place Castellane, la quatrième à ≈\u00a0${distances.laissac}\u00a0m, et aujourd’hui aucune commande ni aucun paiement en ligne. Ominin les réunit sur un écran, depuis votre téléphone ou votre bureau.`,
    callouts: [
      { id: "revenue", title: "L’encaissé TTC, adresse par adresse", text: "contre le même jour la semaine dernière, et la fin de journée estimée." },
      { id: "late", title: "À surveiller", text: "une commande en retard remonte aussitôt, avec son adresse." },
      { id: "open", title: "Les additions ouvertes", text: "commandé, pas encore réglé\u00a0: ce qui reste à payer au comptoir." },
      { id: "hours", title: "Les heures fortes", text: "de chaque adresse, heure par heure, pour caler les plannings." },
    ] as const,
    badge: "Démonstration",
    demoNote: "Démonstration\u00a0: une journée simulée, construite à partir de vos vraies cartes\u00a0; les montants affichés sont fictifs.",
    scan: "La vue groupe, en direct",
    sources: ["google", "outils"] as SourceId[],
  },

  proof: {
    eyebrow: "Mesuré chez un client",
    title: { text: "Payée depuis la table, en cuisine en", accent: `${field.onlineSeconds}\u00a0secondes.` },
    context: `Chez un client Ominin, un bar-restaurant toulousain\u00a0: ${thousands(field.orders)} commandes payées en ${field.nights}\u00a0soirs, du 18\u00a0septembre au 3\u00a0octobre 2026. Réglée au comptoir, la commande attend d’être encaissée\u00a0; payée sur le téléphone, elle part tout de suite.`,
    raceLabel: "De la commande au ticket cuisine, temps médian",
    race: [
      { label: "Payée en ligne, depuis la table", value: `${field.onlineSeconds}\u00a0s`, seconds: field.onlineSeconds },
      { label: "Payée au comptoir", value: minutesSeconds(field.counterSeconds), seconds: field.counterSeconds },
    ],
    shift: {
      from: percent(beforeLaunch),
      to: percent(lastWeekendShare),
      label: `des commandes payées depuis la table\u00a0: avant la mise en service, puis le week-end des ${fieldWeekendLabel}, ${daysAfterLaunch}\u00a0jours après.`,
    },
    takeaway: "Chez vous, les mêmes délais se mesureront dans chacun des quatre établissements.",
    sources: ["report"] as SourceId[],
  },

  start: {
    eyebrow: "La mise en route",
    title: { text: "Adresse par adresse,", accent: "à votre rythme." },
    lead: "On commence par l’établissement de votre choix\u00a0; les autres suivent quand il tourne.",
    order: "Une adresse après l’autre, dans l’ordre que vous choisissez\u00a0:",
    steps: [
      {
        title: "Vos cartes, déjà faites",
        text: pending.length
          ? `${readyWords} sont en ligne\u00a0; en préparation\u00a0: ${pending.map((candidate) => candidate.name).join(", ")}. On les relit avec vous\u00a0: prix, happy hours, plats du jour.`
          : "Les quatre sont en ligne. On les relit avec vous\u00a0: prix, happy hours, plats du jour.",
      },
      { title: "Un QR sur chaque table", text: "Un QR par table, à votre logo, imprimé et livré prêt à coller." },
      { title: "Le branchement", text: "Votre caisse, vos imprimantes (avec le boîtier Omilink si besoin), le compte Stripe de chaque société." },
      { title: "Une heure avec chaque équipe", text: "Avant un service\u00a0: prendre une commande sur son téléphone, marquer «\u00a0Servi\u00a0», encaisser au comptoir." },
    ],
  },

  next: {
    eyebrow: "Et maintenant",
    title: { text: "On commence par", accent: "quelle adresse\u00a0?" },
    steps: [
      "Un café ensemble\u00a0: vos cartes sur votre téléphone, la vue groupe en direct",
      "Vos caisses et vos imprimantes\u00a0: on vérifie le branchement dans chaque établissement",
      "La première adresse équipée, son équipe prise en main",
    ],
    mail: "Écrire à Ambaka",
    scan: "La vue groupe, sur votre téléphone",
    page: `${siteUrl}${presentationPath}`,
  },

  sourcesTitle: "Sources",
  sourcesNote: "Captures des démos du 15/10/2026\u00a0: les cartes de démonstration (paiement imité, rien n’est débité), l’écran de salle et la vue groupe, sur une soirée simulée.",
};

/** Les sources d'une diapositive, dédoublonnées, dans l'ordre. */
export const footnote = (ids: readonly SourceId[]) => [...new Set(ids)].map((id) => sources[id].short).join(" · ");

