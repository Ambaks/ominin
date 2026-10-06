import { contactEmail } from "@/lib/landing-data";
import { editor } from "@/lib/legal/constants";
import {
  cardFees,
  commissionRange,
  commonSources,
  counterCardPercent,
  euros,
  maxRate,
  offerMath,
  percent,
  setupFeeLabel,
  setupFeeTotal,
  stripeSource,
  thousands,
  uberPickupPercent,
  type Illustration,
} from "@/lib/pitch/kit";
import type { Pitch, Source } from "@/lib/pitch/types";
import { menuSiteUrl } from "@/lib/site";

/*
 * Le pitch au siège de Chicken Street (CS DEVELOPPEMENT, Saint-Denis) : la
 * présentation (/chicken-street/presentation, exportée en PDF) et la page
 * privée (/chicken-street) lisent toutes deux ce module. Chaque chiffre vient
 * de demos/chicken-street/pitch/research/, avec sa source. Le récit suit
 * celui d’O’Crousti Poulet, avec deux pièces en plus : l'estimateur IA de l'heure
 * de retrait, et les chiffres mesurés chez un client Ominin (ominin.com/r7k2).
 * Chicken Street fait déjà commander sur le téléphone, par WhatsApp ; ses
 * avis mettent l'attente et les articles oubliés à égalité.
 */

// ——— Choix du propriétaire ————————————————————————————————————

/** Signataire du pitch : la phrase d'ouverture et le contact sont les siens. */
const founder = { name: "Ambaka\u00a0Le\u00a0Grégam", role: "cofondateur d’Ominin" };

/** Le pilote : sa durée et l'assistance, telles que le propriétaire les a fixées. */
const pilot = { days: 30 };

/**
 * L'illustration du chiffre d'affaires, hypothèses affichées : le panier
 * déduit de la plaquette franchise 2026 (1,1 M€ par restaurant, 5 millions
 * de commandes pour ≈ 100 restaurants, soit ≈ 22 €), et ce CA moyen sur une
 * année. Deux clients retenus par jour couvrent le surcoût à 42 % de marge
 * brute (hors TVA de 10 %, redevances de 5 + 2 % comprises).
 */
const illustration: Illustration = {
  customersPerDay: 5,
  basket: 22,
  daysPerYear: 365,
  announcedYearlyRevenue: 1_100_000,
  onlineShare: 10,
  coveringCustomers: 2,
  vatPercent: 10,
  royaltyPercent: 7,
};

const { exampleOrder, monthlyExample, revenueIllustration } = offerMath(illustration);

/**
 * Relevé terrain d'un client Ominin (ominin.com/r7k2) : soirs de service,
 * commandes payées (dont en ligne et au comptoir), médianes commande → ticket
 * cuisine en secondes.
 */
const field = { nights: 16, orders: 2_002, online: 435, counter: 1_545, onlineSeconds: 18, counterSeconds: 279 };

/** « 4 min 39 » : une durée en secondes, telle que la course l'affiche. */
const minutesSeconds = (seconds: number) => `${Math.floor(seconds / 60)}\u00a0min\u00a0${String(seconds % 60).padStart(2, "0")}`;

/** Le relevé Ominin des avis Google : avis des cinq fiches, avis lus, dont à une ou deux étoiles. */
const reviewSample = { ratings: 4_016, read: 750, negative: 168 };

// ——— Démos en ligne ——————————————————————————————————————————————

const demoBase = `${menuSiteUrl}/demo/chicken-street`;

const demos = [
  {
    id: "carte",
    label: "Côté client",
    title: "La carte, sur le téléphone",
    description: "Composer son menu, payer, suivre son numéro et l’heure annoncée.",
    href: `${demoBase}?service=fast-food`,
  },
  {
    id: "comptoir",
    label: "Côté comptoir",
    title: "Les commandes, au coup\u00a0de\u00a0feu",
    description: "Un appui sur «\u00a0Marquer prête\u00a0»\u00a0: le client est prévenu.",
    href: `${demoBase}/comptoir`,
  },
  {
    id: "reseau",
    label: "Côté siège",
    title: "Toutes les commandes QR du réseau, en direct",
    description: "Commandes, délais et heures tenues, restaurant par restaurant.",
    href: `${demoBase}/reseau?heure=12:55`,
  },
] as const;

// ——— Captures des démos (public/pitch/chicken-street) ——————————————

const shot = (file: string) => `/pitch/chicken-street/${file}.webp`;

const screens = {
  menu: { src: shot("phone-menu"), alt: "La carte Chicken Street ouverte sur un téléphone" },
  composer: { src: shot("phone-composer"), alt: "Le Menu Naan Tenders composé par le client : frites, boisson, deux sauces" },
  commande: { src: shot("phone-commande"), alt: "La commande, réglée en ligne ou au comptoir" },
  suivi: { src: shot("phone-suivi"), alt: "Le ticket n°\u00a042\u00a0: en cuisine, prête vers 12\u00a0h\u00a052 selon l’estimateur IA" },
  prete: { src: shot("phone-prete"), alt: "Le ticket N° 42 : c’est prêt, venez au comptoir" },
  comptoir: { src: shot("comptoir-service"), alt: "L’écran du comptoir : les commandes du coup de feu, les boutons Marquer prête et Remettre" },
  reseau: { src: shot("reseau-siege"), alt: "La vue réseau du siège : restaurants en rush, commandes en direct et classement des restaurants" },
  poster: { src: "/pitch/ominin/film-poster.webp", alt: "Ominin : la commande en ligne et l’IA, le film" },
  posterVertical: { src: "/pitch/ominin/film-poster-vertical.webp", alt: "Ominin : la commande en ligne et l’IA, le film" },
};

// ——— Sources ——————————————————————————————————————————————————————

const sources = {
  site: {
    short: "chickenstreet.fr",
    full: "chickenstreet.fr\u00a0— accueil («\u00a0La faim n’attend pas\u00a0!\u00a0», bouton «\u00a0Commander\u00a0» vers WhatsApp), consulté le 06/10/2026",
    url: "https://www.chickenstreet.fr/",
  },
  brochure: {
    short: "Plaquette franchise Chicken Street 2026",
    full: "Plaquette franchise Chicken Street 2026\u00a0— 1,1\u00a0M€ de CA moyen par restaurant, 5\u00a0millions de commandes par an, redevance 5\u00a0% et fonds marketing 2\u00a0%, formation «\u00a0comptoir, bornes et gestion de la livraison à domicile\u00a0»",
    url: "https://www.chickenstreet.fr/wp-content/uploads/2026/03/PLAQUETTE-CHICKEN-STREET-v.2026_web.pdf",
  },
  network: {
    short: "Instagram @chickenstreetofficiel, octobre 2026",
    full: "Publications Chicken Street d’octobre 2026 («\u00a0+118 restaurants\u00a0», «\u00a037 ouvertures à venir\u00a0») et localisateur restaurants.chickenstreet.fr (108 restaurants en France, dont Corbeil-Essonnes, qui ouvre le 10 octobre), relevés le 06/10/2026",
    url: "https://restaurants.chickenstreet.fr/",
  },
  reviews: {
    short: "Relevé Ominin des avis Google, 07/10/2026",
    full: `Relevé Ominin des fiches Google Maps de 5 restaurants (Gare de l’Est, Marseille Belsunce, Lille Flandres, Paris 18 La Chapelle, Ivry-sur-Seine), 07/10/2026\u00a0— note et nombre d’avis (${thousands(reviewSample.ratings)} avis)\u00a0; lecture des 150 avis les plus récents par restaurant (${reviewSample.read} avis, dont ${reviewSample.negative} à une ou deux étoiles)`,
  },
  whatsapp: {
    short: "Affiche «\u00a0Scannez pour commander\u00a0», 2026",
    full: "Chicken Street\u00a0— affiche en restaurant «\u00a0Scannez pour commander\u00a0» et fenêtre du site (juillet 2026)\u00a0: commande sur WhatsApp, −25\u00a0% sur la première commande",
    url: "https://www.chickenstreet.fr/",
  },
  app: {
    short: "App Store, Chicken Street France",
    full: "Application «\u00a0Chicken Street France\u00a0» (éditeur DISHOP)\u00a0— click & collect et livraison, consultée le 06/10/2026",
    url: "https://apps.apple.com/fr/app/id1635374624",
  },
  report: {
    short: "Ominin, relevé terrain (ominin.com/r7k2)",
    full: `Ominin\u00a0— relevé terrain d’un bar-restaurant toulousain équipé d’Ominin, ${field.nights} soirs de service du 18/09 au 03/10/2026, ${thousands(field.orders)} commandes payées\u00a0: médianes commande → ticket cuisine sur ${field.online} commandes en ligne et ${thousands(field.counter)} au comptoir`,
    url: "https://www.ominin.com/r7k2?lang=fr",
  },
  burgerKing: {
    short: "Snacking, 17/04/2024 (Burger King)",
    full: "Snacking\u00a0— Burger King généralise la commande à table, 17/04/2024",
    url: "https://www.snacking.fr/actualites/6904-Burger-King-generalise-la-commande-a-table/",
  },
  mcdo: {
    short: "McDo+, App Store",
    full: "McDo+ (App Store)\u00a0— «\u00a0Service à Table\u00a0», commande par QR code depuis le mobile, consulté le 03/10/2026",
    url: "https://apps.apple.com/fr/app/mcdo-faites-vous-livrer/id324887734",
  },
  opinionway: {
    short: "OpinionWay pour Lyf, 2025",
    full: "OpinionWay pour Lyf (application de paiement)\u00a0— Les Français et les services de paiement mobile, 27–28 février 2025, n\u00a0=\u00a02\u00a0000, 16–65 ans",
    url: "https://www.opinion-way.com/wp-content/uploads/2025/03/OpinionWay-pour-Lyf-Pay-Les-Francais-et-les-services-de-paiement-mobile-24-mars.pdf",
  },
  akto: commonSources.akto,
  lu: commonSources.lu,
  sumup: commonSources.sumup,
  stripe: stripeSource(),
  uber: commonSources.uber,
  kiosks: commonSources.kiosks,
  saas: commonSources.saas,
} satisfies Record<string, Source>;

type SourceId = keyof typeof sources;

type Section<K extends keyof Pitch<SourceId>> = Pitch<SourceId>[K];

// ——— Le récit ——————————————————————————————————————————————————————

/* « La faim n'attend pas ! », la signature du site, retournée vers le client. */
const cover: Section<"cover"> = {
  eyebrow: "Proposition au siège",
  title: { first: "La faim n’attend\u00a0pas.", second: { text: "Vos clients", accent: "non\u00a0plus." } },
  lead: "Vos clients commandent et paient depuis leur table ou la file\u00a0; l’IA leur annonce l’heure où c’est prêt, et «\u00a0C’est prêt\u00a0!\u00a0» s’affiche sur leur téléphone. Sans changer de caisse.",
};

const promise: Section<"promise"> = {
  eyebrow: "Votre promesse",
  slogan: ["La faim", "n’attend\u00a0pas\u00a0!"],
  sloganSource: "chickenstreet.fr",
  rating: { value: "4,3", label: `de moyenne sur ${thousands(reviewSample.ratings)} avis Google de cinq fiches relevées à Paris, Ivry, Lille et Marseille, de 3,9 à 4,6` },
  speed: {
    value: "16\u00a0%",
    label: "des avis à une ou deux étoiles parlent d’attente\u00a0— autant que d’articles oubliés ou erronés.",
    detail: `27 avis sur ${reviewSample.negative} pour chacun, sur ${reviewSample.read} avis lus`,
  },
  closing: "À 118 restaurants, dont 107 ouverts en France, et 37 ouvertures annoncées, cette promesse se tient restaurant par restaurant, rush après rush.",
  sources: ["site", "reviews", "network"],
};

const walkAway: Section<"walkAway"> = {
  eyebrow: "Au comptoir",
  quote: ["La rapidité, l’atout clé de la restauration rapide", "est remis en cause."],
  attribution: "AKTO / Toluna-Harris Interactive, étude 2024 sur les clients de la restauration rapide",
  followUp: "Dans les avis Google\u00a0: «\u00a050\u00a0min d’attente pour un menu\u00a0», «\u00a0attendu 30\u00a0min pour trois articles\u00a0», quand d’autres saluent une attente «\u00a0très raisonnable même quand il y a du monde\u00a0». La même enseigne, des attentes très différentes d’un restaurant à l’autre.",
  followUpSources: ["reviews"],
  facts: [
    {
      value: "45\u00a0%",
      text: "seulement des clients du fast-food burger se disent très satisfaits du temps d’attente sur place.",
      source: "akto",
    },
    {
      value: "36\u00a0%",
      text: "seulement se disent très satisfaits de la gestion des heures d’affluence sur place (34\u00a0% à emporter).",
      source: "akto",
    },
  ],
};

const solution: Section<"solution"> = {
  eyebrow: "La solution",
  title: { text: "Commander depuis", accent: "sa\u00a0table." },
  steps: [
    { title: "Scanner", text: "Un QR code sur chaque table, dans la file, au comptoir. Aucune application à installer.", screen: "menu" },
    { title: "Commander", text: "Le client compose son menu, sauces comprises, et paie en ligne. Espèces, titres-restaurant\u00a0: il règle au comptoir.", screen: "commande" },
    { title: "Suivre", text: "Son numéro, et l’heure où sa commande sera prête, calculée par l’IA.", screen: "suivi" },
    { title: "Récupérer", text: "«\u00a0C’est prêt\u00a0!\u00a0» s’affiche sur sa page\u00a0: il montre son numéro au comptoir et repart avec la bonne commande.", screen: "prete" },
  ],
  note: "Chaque téléphone devient une borne, et le ticket suit le client jusqu’au comptoir.",
};

const etaNotice: Section<"etaNotice"> = {
  tag: "Estimateur IA",
  text: "L’heure annoncée («\u00a0prête vers 12\u00a0h\u00a052\u00a0») suit le rythme réel de chaque cuisine, appris sur ses propres commandes.",
};

const estimator: Section<"estimator"> = {
  eyebrow: "Estimateur IA",
  title: { text: "L’heure exacte", accent: "où c’est prêt." },
  lead: "Dès le paiement, le client lit «\u00a0prête vers 12\u00a0h\u00a052\u00a0». L’estimateur apprend le rythme de chaque cuisine sur ses propres commandes\u00a0— la file en cours, la taille du panier, l’heure du service\u00a0— et ajuste l’heure en direct.",
  announced: { label: "Annoncée par l’IA", value: "12:52" },
  ready: { label: "Prête", value: "12:52" },
  verdict: "À la minute près, sur la commande N°\u00a042 de la démo.",
  points: [
    { title: "Le client attend où il veut.", text: "À table, dehors, sur son téléphone\u00a0: plus d’attroupement au comptoir pour demander «\u00a0c’est prêt quand\u00a0?\u00a0»." },
    { title: "Chaque cuisine, son rythme.", text: "Gare de l’Est n’est pas Ivry\u00a0: l’heure se calcule sur les commandes de chaque restaurant, pas sur une moyenne du réseau." },
    { title: "Le siège voit l’heure tenue.", text: "La part des commandes prêtes à l’heure annoncée, restaurant par restaurant, dans la vue réseau." },
  ],
  screen: "suivi",
};

const fieldProof: Section<"fieldProof"> = {
  eyebrow: "Sur le terrain",
  title: { text: "Payée depuis la table, en cuisine en", accent: `${field.onlineSeconds}\u00a0secondes.` },
  context: `Mesuré chez un client Ominin, un bar-restaurant toulousain\u00a0: ${thousands(field.orders)} commandes payées en ${field.nights} soirs de service, du 18\u00a0septembre au 3\u00a0octobre 2026. Ce chiffre mesure le temps entre le choix du client et le départ en cuisine\u00a0: au comptoir, la commande attend la file et le paiement\u00a0; payée sur le téléphone, elle part tout de suite.`,
  raceLabel: "De la commande au ticket cuisine, temps médian",
  race: [
    { label: "Payée en ligne, depuis la table", value: `${field.onlineSeconds}\u00a0s`, seconds: field.onlineSeconds },
    { label: "Payée au comptoir", value: minutesSeconds(field.counterSeconds), seconds: field.counterSeconds },
  ],
  facts: [
    { value: "47\u00a0%", label: "des commandes payées depuis la table le dernier week-end relevé, neuf jours après le lancement" },
    { value: "×2", label: "la part payée en ligne, le soir où «\u00a0Payer en ligne\u00a0» est devenu le choix par défaut\u00a0: de 15 à 32\u00a0%" },
    { value: `${((field.online * (field.counterSeconds - field.onlineSeconds)) / 3600).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}\u00a0h`, label: `de délai en moins avant le ticket cuisine, en ${field.nights} soirs\u00a0: ${field.online} commandes payées en ligne × l’écart médian` },
  ],
  takeaway: "Un bar n’est pas un fast-food\u00a0: chez vous, le pilote mesurera ce délai canal par canal, QR, bornes et comptoir.",
  sources: ["report"],
};

const forCustomers: Section<"forCustomers"> = {
  eyebrow: "Pour vos clients",
  title: ["Rien d’oublié,", "ni\u00a0attente à\u00a0l’aveugle."],
  points: [
    {
      title: "Rien de mal compris.",
      text: "Le client compose sa commande lui-\u2060même\u00a0— sauces, suppléments, boisson\u00a0; le ticket sort tel quel en cuisine.",
      fact: "Exactitude des commandes\u00a0: 44\u00a0% seulement des clients à emporter s’en disent très satisfaits, contre 60\u00a0% en livraison, où l’on commande dans une appli.",
    },
    {
      title: "Son numéro, et l’heure où c’est prêt.",
      fact: "70\u00a0% des clients de la restauration rapide jugent important, pour choisir leur restaurant, d’être prévenus quand leur commande est prête (un bipper, dans l’étude)\u00a0: ici, c’est leur téléphone, page ouverte.",
      eta: true,
    },
  ],
  scan: {
    question: "Et vos clients scanneront-ils\u00a0?",
    answer: "Ils scannent déjà\u00a0: votre affiche «\u00a0Scannez pour commander\u00a0» mène à WhatsApp. Burger King a généralisé la commande à table en France en 2024, McDonald’s la propose avec McDo+, et 65\u00a0% des 16–24 ans disent commander ou payer à table au restaurant.",
    pilot: "Le pilote le mesurera chez vous\u00a0: la part des commandes passées par QR.",
    sources: ["whatsapp", "burgerKing", "mcdo", "opinionway"],
  },
  sources: ["akto"],
};

const forTeams: Section<"forTeams"> = {
  eyebrow: "Pour vos équipes",
  title: { text: "Commande prête\u00a0?", accent: "Un\u00a0appui." },
  points: [
    {
      title: "Le client est prévenu, la\u00a0remise\u00a0confirmée.",
      text: "«\u00a0Marquer prête\u00a0» fait passer sa page à «\u00a0C’est prêt\u00a0!\u00a0»\u00a0; «\u00a0Remettre N°\u00a040\u00a0» clôt la commande, numéro à l’appui. Sur une tablette ou un téléphone du restaurant.",
    },
    {
      title: "Moins de monde au\u00a0comptoir.",
      text: "Payée sur le téléphone, la commande part en cuisine sans repasser par le comptoir\u00a0; espèces et titres-restaurant s’y règlent comme aujourd’hui.",
    },
    {
      title: "Un produit épuisé, retiré de la carte.",
      text: "Un appui le masque en ligne, un autre le rétablit.",
    },
  ],
  simple: `Deux boutons, pensés pour s’apprendre en un service\u00a0: ils trouvent leur place dans le module «\u00a0comptoir, bornes et gestion de la livraison à domicile\u00a0» de votre formation franchisé.`,
  caption: "L’espace de gestion Ominin, au comptoir",
  sources: ["brochure"],
};

const forRevenue: Section<"forRevenue"> = {
  eyebrow: "Le calcul, pour un franchisé",
  title: "Si vous retenez deux\u00a0clients de plus par\u00a0jour, le\u00a0surcoût est couvert.",
  mechanism:
    "On reste ou on repart selon la longueur de la file (Lu et al., 2013, étude sur le rayon traiteur d’un hypermarché). Celui qui a commandé depuis sa table n’est plus dans la file\u00a0: elle paraît plus courte à celui qui arrive.",
  illustrationLabel: "Illustration, pas une promesse",
  rateNote: `Calculé au taux maximal (${maxRate})\u00a0: le taux baisse quand le chiffre d’affaires du restaurant augmente.`,
  sum: [
    {
      value: `≈\u00a0${euros(monthlyExample.extra)}`,
      unit: "par mois",
      text: `de surcoût si ${percent(monthlyExample.share)} du chiffre d’affaires est payé en ligne\u00a0: ≈\u00a0${euros(monthlyExample.ominin)} au plus pour Ominin et ≈\u00a0${euros(monthlyExample.card)} de frais de carte, moins ≈\u00a0${euros(monthlyExample.counter)} de TPE si ces ventes étaient réglées par carte, soit ≈\u00a0${percent(monthlyExample.extraOfRevenue)} du chiffre d’affaires`,
    },
    {
      value: `≈\u00a0${euros(monthlyExample.coveringSales)}`,
      unit: "par mois",
      text: `de ventes\u00a0: ${monthlyExample.coveringCustomers}\u00a0clients retenus par jour, à ${euros(illustration.basket)}`,
    },
    {
      value: `≈\u00a0${percent(monthlyExample.breakEvenMargin)}`,
      unit: "de marge brute suffisent",
      text: `sur ces ventes hors TVA, pour couvrir le surcoût, leurs propres frais en ligne et vos ${percent(illustration.royaltyPercent ?? 0)} de redevance et de fonds marketing. À comparer à votre marge.`,
    },
  ],
  beyond: `Au-delà\u00a0: à ${illustration.customersPerDay}\u00a0clients par jour (≈\u00a01 sur ${revenueIllustration.oneIn} des ≈\u00a0${revenueIllustration.ordersPerDay} commandes d’une journée moyenne), ≈\u00a0${euros(revenueIllustration.monthly)} de ventes en plus par mois, soit ≈\u00a0${euros(revenueIllustration.revenue)} par an. Hypothèses\u00a0: panier de ${euros(illustration.basket)} TTC déduit de votre plaquette (1,1\u00a0M€ par restaurant, 5\u00a0millions de commandes par an pour ≈\u00a0100 restaurants), ce chiffre d’affaires supposé TTC.`,
  sources: ["lu", "brochure"],
};

const forHeadOffice: Section<"forHeadOffice"> = {
  eyebrow: "Pour le siège",
  title: "Tout le réseau, en direct.",
  lead: "Le réseau sur un écran\u00a0: ce qui part, ce qui attend au comptoir, qui est en rush et si l’heure annoncée par l’IA est tenue, restaurant par restaurant, nouvelles ouvertures comprises.",
  badge: "Données de démonstration",
  rushKey: "Les pastilles numérotées\u00a0: les restaurants en rush (délai annoncé de 10\u00a0min ou plus).",
  delayKey: "Délais annoncés par l’estimateur IA.",
  hypothesis: "Simulation sur vos 107 restaurants ouverts en France, 30\u00a0% des commandes par QR.",
  areas: [
    { label: "Qui est en rush", x: 24 },
    { label: "Ce qui part", x: 808 },
    { label: "Le classement, maintenant", x: 1200 },
  ],
  panelsTop: 326,
};

const deployment: Section<"deployment"> = {
  eyebrow: "Déploiement",
  title: { text: "Ce que le QR", accent: "ajoute." },
  lead: "Vous avez déjà WhatsApp, votre application et des bornes dans une partie des restaurants. Le QR sert le client déjà sur place, à table ou dans la file, sans rien remplacer\u00a0; Uber Eats et Deliveroo restent vos canaux de livraison.",
  sources: ["app", "whatsapp", "brochure"],
  points: [
    {
      label: "Sur place",
      title: "Rien à installer.",
      text: "Le client scanne et commande, sans application ni compte, même s’il ne passe qu’une fois. Il paie sur son téléphone\u00a0; espèces et titres-restaurant se règlent au comptoir.",
    },
    {
      label: "Cuisine",
      title: "Le ticket sort en cuisine.",
      text: "Omilink, notre boîtier, pilote la plupart des imprimantes à tickets\u00a0: deux câbles. S’il lâche, les commandes restent à l’écran du comptoir et une alerte prévient l’équipe.",
    },
    {
      label: "Comptoir",
      title: "Un numéro et une heure.",
      text: "Le client suit sa commande jusqu’à «\u00a0C’est prêt\u00a0!\u00a0». Une commande «\u00a0à régler au comptoir\u00a0» ne part en cuisine qu’une fois encaissée\u00a0: pas de commande fantôme.",
    },
    {
      label: "Caisse",
      title: "Votre caisse reste la vôtre.",
      text: "Les ventes QR arrivent sur le compte Stripe du restaurant, exportables pour le comptable et vos redevances. Lien caisse et fidélité\u00a0: à voir avec votre éditeur.",
    },
  ],
};

const pricing: Section<"pricing"> = {
  eyebrow: "Le prix",
  headline: {
    subscription: "0\u00a0€ d’abonnement.",
    commission: commissionRange,
    basis: "sur les commandes QR payées en\u00a0ligne.",
  },
  lead: "Dégressif selon le chiffre d’affaires de chaque restaurant, paliers fixés ensemble. Rien à payer au niveau du siège. Chaque restaurant ne paie que sur ses commandes passées par Ominin et payées en ligne\u00a0: rien sur les bornes, le comptoir, votre application, WhatsApp ni la livraison.",
  example: {
    label: `Une commande de ${euros(exampleOrder.ticket)} payée en ligne`,
    rateNote: `Au taux maximal de ${maxRate}`,
    lines: [
      { label: `Ominin, ${maxRate}`, value: euros(exampleOrder.ominin) },
      { label: "Frais de carte Stripe", value: euros(exampleOrder.card) },
    ],
    totalLabel: "Total",
    total: euros(exampleOrder.total),
    share: `soit ${percent(Math.round((exampleOrder.total / exampleOrder.ticket) * 1000) / 10)} de la commande, carte comprise`,
    counter: { label: `Par carte au comptoir (${percent(counterCardPercent)})`, value: euros(exampleOrder.counter) },
    extra: { label: "Surcoût face au TPE", value: `≈\u00a0${euros(Math.round((exampleOrder.total - exampleOrder.counter) * 100) / 100)}` },
    compare: `Un peu plus si votre TPE vous coûte moins de ${percent(counterCardPercent)}\u00a0; face aux espèces, ${euros(exampleOrder.total)}.`,
  },
  comparisonTitle: "Ailleurs, la commande en ligne coûte",
  comparison: [
    { name: "Uber Eats, à emporter", model: `≈\u00a0${percent(uberPickupPercent)} de chaque commande` },
    { name: "Une borne de plus", model: "2\u00a0000 à 7\u00a0000\u00a0€\u00a0HT la borne, 40 à 200\u00a0€ par mois de logiciel, plus les frais de paiement et la place au sol" },
    { name: "Logiciels de commande", model: "29 à 199\u00a0€ par mois et par restaurant, dus même sans commande, plus les frais de paiement" },
  ],
  noOnline: "Sans commande en ligne, aucune\u00a0commission.",
  setup: `À l’installation, une fois par restaurant\u00a0: ${setupFeeLabel}.`,
  vat: `Prix Ominin nets de taxe\u00a0: ${editor.vatMention.replace("art. 293 B", "art.\u00a0293\u00a0B")}.`,
  cardFees: `Frais de carte Stripe, à la charge du restaurant\u00a0: ${percent(cardFees.standard.percent)} + ${euros(cardFees.standard.fixed)} par carte européenne standard (carte premium\u00a0: ${percent(cardFees.premium.percent)} + ${euros(cardFees.premium.fixed)}).`,
  sources: ["stripe", "sumup", "uber", "kiosks", "saas"],
};

const proposal: Section<"proposal"> = {
  eyebrow: "Notre proposition",
  title: "Commençons par un restaurant.",
  pilot: {
    title: "Le pilote",
    lead: `Le restaurant de votre choix, ${pilot.days}\u00a0jours.`,
    points: [
      "Matériel fourni et installé par Ominin, sans frais pour le restaurant pilote\u00a0: supports QR et boîtier Omilink pour imprimer en cuisine.",
      `De ${commissionRange} des commandes QR payées en ligne selon le chiffre d’affaires, plus les frais de carte.`,
      "Sans engagement\u00a0; paliers et objectifs chiffrés fixés ensemble avant le lancement.",
      "Assistance par e-mail et par téléphone\u00a0; la ligne directe vous est donnée au lancement.",
      "Côté restaurant\u00a0: ouvrir son compte Stripe, avec notre aide.",
    ],
  },
  network: {
    title: "Le réseau",
    lead: `Même tarif (${commissionRange}), plus ${euros(setupFeeTotal)} de boîtier livré, une seule fois.`,
    points: [
      `${setupFeeLabel[0].toUpperCase()}${setupFeeLabel.slice(1)}, réglés une fois par le restaurant, à l’installation.`,
      "Supports QR\u00a0: format et tarif à définir ensemble, selon la façon dont vous souhaitez afficher vos QR codes.",
      "Chaque ouverture équipée dès le premier jour\u00a0: Corbeil-Essonnes, puis les 37 ouvertures annoncées. Chaque restaurant garde ses propres prix de vente.",
      "Assistance aux franchisés\u00a0: canal et horaires définis avec vous avant le déploiement.",
    ],
  },
  measures: {
    title: "Ce que le pilote mesurera",
    lead: "Cinq chiffres, relevés ensemble.",
    sources: [],
    vendor: "Vous prenez déjà des commandes sur WhatsApp\u00a0? Au restaurant, le QR Ominin va plus loin\u00a0: paiement sur le téléphone, ticket imprimé en cuisine, numéro suivi jusqu’à «\u00a0C’est\u00a0prêt\u00a0!\u00a0» avec l’heure annoncée par l’IA, aucun abonnement.",
    points: [
      "La part des commandes passées par QR.",
      "Le délai entre la commande et le ticket cuisine.",
      "L’écart entre l’heure annoncée par l’IA et l’heure réelle.",
      "Le panier moyen, QR, bornes et comptoir.",
      "Les commandes erronées ou incomplètes.",
    ],
  },
};

const closing: Section<"closing"> = {
  eyebrow: "Et maintenant",
  title: ["Parlons-en", "30 minutes."],
  steps: ["Un appel\u00a0: vos imprimantes et votre carte", "Vous choisissez le restaurant pilote", `Un pilote de ${pilot.days}\u00a0jours\u00a0: nous installons, nous mesurons ensemble`],
  mail: "Écrire au cofondateur",
  interlocutor: `Votre interlocuteur direct\u00a0: ${founder.name}, ${founder.role}.`,
  company: "Nous concevons et exploitons des outils pour la restauration\u00a0: commande et paiement en ligne, estimateur IA de l’heure de retrait, impression en cuisine.",
  reference: "Ominin est déjà en service chez plusieurs restaurants indépendants\u00a0; nous l’ouvrons aujourd’hui aux réseaux.",
  scanTitle: "Votre carte, prête à tester.",
  scanPage: "Testez votre carte comme un client.",
  flourish: "Scannez.",
  signature: `${founder.name}, ${founder.role}`,
};

// ——— Le pitch ——————————————————————————————————————————————————————

export const chickenStreet: Pitch<SourceId> = {
  path: "/chicken-street",
  ticketNumber: 42,
  brandName: "Chicken Street",
  filmSeenKey: "chickenstreet-pitch-film-vu",
  filmSrc: "/pitch/ominin/film.mp4",
  filmVerticalSrc: "/pitch/ominin/film-vertical.mp4",
  deckPdfHref: "/pitch/chicken-street/chicken-street-ominin.pdf",
  deckFooter: "Ominin · proposition pour Chicken Street",
  pitchDate: "octobre 2026",
  demos,
  demoDisplayUrl: demoBase.replace(/^https?:\/\//, ""),
  contact: {
    email: contactEmail,
    mailto: `mailto:${contactEmail}?subject=${encodeURIComponent("Chicken Street × Ominin")}`,
  },
  screens,
  sources,
  sourcesNote: "Restaurants, adresses et carte\u00a0: d’après chickenstreet.fr et restaurants.chickenstreet.fr\u00a0; prix et boissons de la démo indicatifs, relevés par un agrégateur. Relevés et captures du 06–07/10/2026.",
  cover,
  promise,
  walkAway,
  solution,
  etaNotice,
  estimator,
  fieldProof,
  forCustomers,
  forTeams,
  forRevenue,
  forHeadOffice,
  deployment,
  pricing,
  proposal,
  closing,
  page: {
    heroEyebrow: "Pour le siège de Chicken Street",
    heroLead: cover.lead,
    heroFacts: [
      { value: "0\u00a0€", label: "d’abonnement" },
      { value: commissionRange, label: "des commandes QR payées en ligne, dégressif selon le chiffre d’affaires du restaurant\u00a0; frais de carte en sus" },
      { value: "1", label: `restaurant pilote, ${pilot.days}\u00a0jours, matériel\u00a0fourni` },
    ],
    demoTitle: "Votre carte, prête à tester.",
    demoLead: "Votre carte, vos naans, vos boxes\u00a0: ouvrez-la comme un client, suivez l’heure annoncée par l’IA, puis passez de l’autre côté du comptoir.",
    openerLabel: "Le film Ominin",
    footer: "Page privée, préparée pour le siège de Chicken Street.",
  },
};
