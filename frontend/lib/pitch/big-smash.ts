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
 * Le pitch au siège de Big Smash (groupe NSup, Toulouse) : la présentation
 * (/big-smash/presentation, exportée en PDF) et la page privée (/big-smash)
 * lisent toutes deux ce module. Chaque chiffre y vient de
 * demos/big-smash/pitch/research/, avec sa source. Le récit suit celui
 * d'O'Crousti Poulet ; l'angle change avec le réseau : Big Smash prend déjà
 * ses commandes aux bornes, et ses avis montrent que la promesse de rapidité
 * se joue après la commande — prête sans être annoncée, remise au mauvais
 * client, seconde file pour payer. L'offre et le calcul sont ceux de tous les
 * réseaux (lib/pitch/kit).
 */

// ——— Choix du propriétaire ————————————————————————————————————

/** Signataire du pitch : la phrase d'ouverture et le contact sont les siens. */
const founder = { name: "Ambaka\u00a0Le\u00a0Grégam", role: "cofondateur d’Ominin" };

/** Le pilote : sa durée et l'assistance, telles que le propriétaire les a fixées. */
const pilot = { days: 30 };

/**
 * L'illustration du chiffre d'affaires, hypothèses affichées : un panier
 * supposé (le réseau ne publie pas le sien) de 15 €, celui de la vue réseau
 * (des paniers types sur sa carte, menus de 8,90 à 14,90 €), et le CA moyen
 * annoncé par le franchiseur, « 3K CA moyen/jour », sur une année. Trois
 * clients retenus par jour, et non deux comme pour O'Crousti : deux ne
 * couvrent le surcoût qu'à 62 % de marge brute, trois à 46 % (hors TVA de
 * 10 %, redevances de 5 + 2 % comprises, fiche Kapp Retail).
 */
const illustration: Illustration = {
  customersPerDay: 5,
  basket: 15,
  daysPerYear: 365,
  announcedYearlyRevenue: 3000 * 365,
  onlineShare: 10,
  coveringCustomers: 3,
  vatPercent: 10,
  royaltyPercent: 7,
};

const { exampleOrder, monthlyExample, revenueIllustration } = offerMath(illustration);

// ——— Démos en ligne ——————————————————————————————————————————————

const demoBase = `${menuSiteUrl}/demo/big-smash`;

const demos = [
  {
    id: "carte",
    label: "Côté client",
    title: "La carte, sur le téléphone",
    description: "Composer son menu, payer, suivre son numéro.",
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
    description: "Commandes, paniers et délais, restaurant par restaurant.",
    href: `${demoBase}/reseau?heure=12:55`,
  },
] as const;

// ——— Captures des démos (public/pitch/big-smash) ——————————————————

const shot = (file: string) => `/pitch/big-smash/${file}.webp`;

const screens = {
  menu: { src: shot("phone-menu"), alt: "La carte Big Smash ouverte sur un téléphone" },
  composer: { src: shot("phone-composer"), alt: "Le Menu Smash Bacon composé par le client : frites, boisson, ingrédients retirés" },
  commande: { src: shot("phone-commande"), alt: "La commande, réglée en ligne ou au comptoir" },
  suivi: { src: shot("phone-suivi"), alt: "Le ticket n°\u00a039\u00a0: la commande est en cuisine" },
  prete: { src: shot("phone-prete"), alt: "Le ticket N° 39 : c’est prêt, venez au comptoir" },
  comptoir: { src: shot("comptoir-service"), alt: "L’écran du comptoir : les commandes du coup de feu, les boutons Marquer prête et Remettre" },
  reseau: { src: shot("reseau-siege"), alt: "La vue réseau du siège : restaurants en rush, commandes en direct et classement des 10 restaurants" },
  poster: { src: shot("film-poster"), alt: "Big Smash × Ominin : le film" },
  posterVertical: { src: shot("film-poster-vertical"), alt: "Big Smash × Ominin : le film" },
};

// ——— Sources ——————————————————————————————————————————————————————

const sources = {
  shop: {
    short: "shop.bigsmash.fr",
    full: "shop.bigsmash.fr\u00a0— commande à retirer par créneau de 15\u00a0minutes, sans délai affiché, consulté le 03/10/2026",
    url: "https://shop.bigsmash.fr/toulouse-matabiau/produits",
  },
  site: {
    short: "bigsmash.fr",
    full: "bigsmash.fr\u00a0— Accueil, La carte, Franchise («\u00a03K CA moyen/jour\u00a0»), consulté le 03/10/2026",
    url: "https://www.bigsmash.fr/franchise",
  },
  reviews: {
    short: "Relevé Ominin des avis Google, 03/10/2026",
    full: `Relevé Ominin des fiches Google Maps des 10 restaurants, 03/10/2026\u00a0— note et nombre d’avis (${thousands(11_780)} avis)\u00a0; lecture des 5 avis «\u00a0les plus pertinents\u00a0» par restaurant (50 avis)\u00a0; recherche par mots-clés dans les avis (attente, prête, borne, comptoir, numéro…)`,
  },
  franchise: {
    short: "Kapp Retail, fiche Big Smash",
    full: "Kapp Retail\u00a0— fiche franchise Big Smash, 02/10/2026 (redevance métier 5\u00a0%, redevance marketing 2\u00a0%, chiffre d’affaires annoncé par le franchiseur)",
    url: "https://kapp-retail.com/enseignes/big-smash",
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
  bmo: commonSources.bmo,
  sumup: commonSources.sumup,
  stripe: stripeSource(),
  uber: commonSources.uber,
  kiosks: commonSources.kiosks,
  saas: commonSources.saas,
} satisfies Record<string, Source>;

type SourceId = keyof typeof sources;

type Section<K extends keyof Pitch<SourceId>> = Pitch<SourceId>[K];

// ——— Le récit ——————————————————————————————————————————————————————

/* « 1,2,3 ... SMASH ! », la signature du site, en trois temps : les trois
   gestes du client. */
const cover: Section<"cover"> = {
  eyebrow: "Proposition au siège",
  title: { first: "1, 2, 3…", second: { text: "Commandé, payé,", accent: "prévenu." } },
  lead: "Vos clients commandent et paient depuis leur table ou la file\u00a0; «\u00a0C’est prêt\u00a0!\u00a0» s’affiche sur leur téléphone. En plus de vos bornes, sans changer de caisse.",
};

const promise: Section<"promise"> = {
  eyebrow: "Votre promesse",
  slogan: ["Un service", "rapide."],
  sloganSource: "bigsmash.fr\u00a0: «\u00a0un service rapide centré sur la satisfaction client\u00a0»",
  rating: { value: "4,67", label: `de moyenne sur ${thousands(11_780)} avis Google de vos 10\u00a0restaurants` },
  speed: {
    value: "22\u00a0%",
    label: "des avis étudiés saluent la rapidité, près de trois fois plus que ceux qui se plaignent d’attendre.",
    detail: "11 avis sur 50, contre 4",
  },
  closing: "Chaque rush, et chaque ouverture, mettent cette promesse à l’épreuve.",
  sources: ["site", "reviews"],
};

const walkAway: Section<"walkAway"> = {
  eyebrow: "Après la commande",
  quote: ["La rapidité, l’atout clé de la restauration rapide", "est remis en cause."],
  attribution: "AKTO / Toluna-Harris Interactive, étude 2024 sur les clients de la restauration rapide",
  followUp: "Dans vos avis, quelques cas précis\u00a0: une commande prête restée près de 15\u00a0min au comptoir, un sac remis au mauvais client. Le pilote mesurera le délai entre «\u00a0prête\u00a0» et la remise.",
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
    { title: "Scanner", text: "Un QR code sur chaque table, dans la file, au comptoir. Aucune application.", screen: "menu" },
    { title: "Commander", text: "Le client compose son menu et paie en ligne. Espèces, titres-restaurant\u00a0: il règle au comptoir.", screen: "commande" },
    { title: "Suivre", text: "Son numéro et l’avancement de sa commande, en direct (heure estimée\u00a0: en développement).", screen: "suivi" },
    { title: "Récupérer", text: "«\u00a0C’est prêt\u00a0!\u00a0» s’affiche sur sa page\u00a0: il montre son numéro au comptoir et repart avec la bonne commande.", screen: "prete" },
  ],
  note: "Chaque téléphone devient une borne, et le ticket suit le client jusqu’au comptoir.",
};

/** L'heure estimée : montrée dans les captures, pas encore livrée. */
const etaNotice: Section<"etaNotice"> = {
  tag: "En développement",
  text: "L’heure de retrait estimée («\u00a0prête vers 12\u00a0h\u00a051\u00a0»)\u00a0: son calcul apprendra le rythme de chaque cuisine à partir de ses vraies commandes.",
};

const forCustomers: Section<"forCustomers"> = {
  eyebrow: "Pour vos clients",
  title: ["Ni malentendu", "ni\u00a0attente à\u00a0l’aveugle."],
  points: [
    {
      title: "Rien de mal compris.",
      text: "Le client compose son burger lui-⁠même\u00a0— frites, sauce, sans tomate\u00a0; le ticket sort tel quel.",
      fact: "Exactitude des commandes\u00a0: 44\u00a0% seulement des clients à emporter s’en disent très satisfaits, contre 60\u00a0% en livraison, où l’on commande dans une appli.",
    },
    {
      title: "Son numéro, et «\u00a0C’est prêt\u00a0!\u00a0» à l’écran.",
      fact: "70\u00a0% des clients de la restauration rapide jugent important, pour choisir leur restaurant, d’être prévenus quand leur commande est prête (un bipper, dans l’étude)\u00a0: ici, c’est leur téléphone, page ouverte.",
      eta: true,
    },
  ],
  scan: {
    question: "Et vos clients scanneront-ils\u00a0?",
    answer: "Burger King a généralisé la commande à table dans tout son réseau en France en 2024, McDonald’s la propose avec McDo+. 65\u00a0% des 16–24 ans disent déjà commander ou payer à table au restaurant.",
    pilot: "Le pilote le mesurera chez vous\u00a0: la part des commandes passées par QR.",
    sources: ["burgerKing", "mcdo", "opinionway"],
  },
  sources: ["akto"],
};

const forTeams: Section<"forTeams"> = {
  eyebrow: "Pour vos équipes",
  title: { text: "Commande prête\u00a0?", accent: "Un\u00a0appui." },
  points: [
    {
      title: "Le client est prévenu, la\u00a0remise\u00a0confirmée.",
      text: "«\u00a0Marquer prête\u00a0» fait passer sa page à «\u00a0C’est prêt\u00a0!\u00a0»\u00a0; «\u00a0Remettre N°\u00a037\u00a0» clôt la commande, numéro à l’appui. Sur une tablette ou un téléphone du restaurant.",
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
  simple: `Deux boutons, pensés pour s’apprendre en un service\u00a0: près de 40\u00a0% des ${thousands(97_100)} projets de recrutement d’aides de cuisine et d’employés polyvalents sont saisonniers.`,
  caption: "L’espace de gestion Ominin, au comptoir",
  sources: ["bmo"],
};

const forRevenue: Section<"forRevenue"> = {
  eyebrow: "Le calcul, pour un franchisé",
  title: `Si ${percent(illustration.onlineShare)} des ventes se paient sur le téléphone, trois\u00a0clients retenus par\u00a0jour couvrent le\u00a0surcoût.`,
  mechanism:
    "On reste ou on repart selon la longueur de la file (Lu et al., 2013). Celui qui a commandé depuis sa table n’est plus dans la file\u00a0: elle paraît plus courte à celui qui arrive.",
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
      text: `sur ces ventes hors TVA, pour couvrir le surcoût, leurs propres frais en ligne et vos ${percent(illustration.royaltyPercent ?? 0)} de redevances. À comparer à votre marge.`,
    },
  ],
  beyond: `Au-delà\u00a0: à ${illustration.customersPerDay}\u00a0clients par jour (≈\u00a01 sur ${revenueIllustration.oneIn} des ≈\u00a0${revenueIllustration.ordersPerDay} commandes d’une journée moyenne), ≈\u00a0${euros(revenueIllustration.monthly)} de ventes en plus par mois, soit ≈\u00a0${euros(revenueIllustration.revenue)} par an. Hypothèses\u00a0: panier de ${euros(illustration.basket)} TTC supposé (le réseau ne publie pas le sien), chiffre d’affaires moyen annoncé de ${euros(illustration.announcedYearlyRevenue / illustration.daysPerYear)} par jour, supposé TTC.`,
  sources: ["lu", "site", "franchise"],
};

const forHeadOffice: Section<"forHeadOffice"> = {
  eyebrow: "Pour le siège",
  title: "Toutes vos commandes QR, en direct.",
  lead: "Le réseau sur un écran\u00a0: ce qui part, ce qui attend au comptoir, et qui est en rush, nouvelles ouvertures comprises.",
  badge: "Données de démonstration",
  rushKey: "Les pastilles numérotées\u00a0: les restaurants en rush (délai annoncé de 10\u00a0min ou plus\u00a0; l’heure estimée est en développement).",
  delayKey: "Délais annoncés\u00a0: l’heure estimée est en développement.",
  hypothesis: "Simulation, 30\u00a0% des commandes par QR.",
  areas: [
    { label: "Qui est en rush", x: 24 },
    { label: "Ce qui part", x: 808 },
    { label: "Le classement, maintenant", x: 1200 },
  ],
  panelsTop: 306,
};

const deployment: Section<"deployment"> = {
  eyebrow: "Déploiement",
  title: { text: "Rien à", accent: "remplacer." },
  lead: "Ominin s’ajoute à ce que chaque restaurant a déjà\u00a0: ses bornes, sa caisse, son click\u00a0&\u00a0collect, où le client réserve un créneau d’un quart d’heure\u00a0; Ominin sert tout de suite le client déjà là. Uber Eats et Deliveroo restent vos canaux de livraison.",
  sources: ["shop"],
  points: [
    {
      label: "Caisse",
      title: "Votre caisse reste la vôtre.",
      text: "Les ventes QR n’y entrent pas\u00a0: elles arrivent sur le compte Stripe du restaurant, exportables pour le comptable et vos redevances. Lien caisse et fidélité\u00a0: à voir avec votre éditeur.",
    },
    {
      label: "Cuisine",
      title: "Omilink, notre boîtier, en\u00a0cuisine.",
      text: "Deux câbles, alimentation et réseau\u00a0: il pilote la plupart des imprimantes à tickets. Nous vérifions les vôtres au premier appel.",
    },
    {
      label: "Bornes",
      title: "Rien ne change pour qui préfère la borne.",
      text: "Bornes, espèces et titres-restaurant\u00a0: comme aujourd’hui. Une commande QR «\u00a0à régler au comptoir\u00a0» ne part en cuisine qu’une fois encaissée\u00a0: pas de commande fantôme.",
    },
    {
      label: "Secours",
      title: "Un plan B en\u00a0plein\u00a0rush.",
      text: "Si le boîtier lâche, les commandes restent à l’écran du comptoir et une alerte prévient l’équipe. Rien ne se perd.",
    },
  ],
};

const pricing: Section<"pricing"> = {
  eyebrow: "Le prix",
  headline: {
    subscription: "0\u00a0€ d’abonnement.",
    commission: commissionRange,
    basis: "sur les commandes payées en\u00a0ligne.",
  },
  lead: "Dégressif selon le chiffre d’affaires de chaque restaurant, paliers fixés ensemble. Rien à payer au niveau du siège. Chaque restaurant, succursale comme franchisé, ne paie que sur ses commandes passées par Ominin et payées en ligne\u00a0: rien sur les bornes, le comptoir, votre click\u00a0&\u00a0collect ni la livraison.",
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
      "Chaque ouverture équipée dès le premier jour\u00a0: Nîmes, Le Havre, Carcassonne, Vienne… Chaque restaurant garde ses propres prix de vente.",
      "Assistance aux franchisés\u00a0: canal et horaires définis avec vous avant le déploiement.",
    ],
  },
  measures: {
    title: "Ce que le pilote mesurera",
    lead: "Cinq chiffres, relevés ensemble.",
    sources: [],
    vendor: "Votre éditeur de caisse vend aussi un QR à table\u00a0? Comparez les deux dans le même restaurant\u00a0: paiement sur le téléphone, numéro suivi jusqu’à «\u00a0C’est\u00a0prêt\u00a0!\u00a0», impression en cuisine, aucun abonnement.",
    points: [
      "La part des commandes passées par QR.",
      "Le délai entre «\u00a0prête\u00a0» et la remise au client.",
      "Le panier moyen, QR, bornes et comptoir.",
      "Le délai entre la commande et «\u00a0Marquer prête\u00a0».",
      "Les commandes erronées.",
    ],
  },
};

const closing: Section<"closing"> = {
  eyebrow: "Et maintenant",
  title: ["Parlons-en", "30 minutes."],
  steps: ["Un appel\u00a0: vos imprimantes et votre carte", "Vous choisissez le restaurant pilote", `Un pilote de ${pilot.days}\u00a0jours\u00a0: nous installons, nous mesurons ensemble`],
  mail: "Écrire au cofondateur",
  interlocutor: `Votre interlocuteur direct\u00a0: ${founder.name}, ${founder.role}.`,
  company: "Nous concevons et exploitons des outils pour la restauration\u00a0: menu QR, commande et paiement, impression en cuisine.",
  reference: "Ominin est déjà en service chez plusieurs restaurants indépendants\u00a0; nous l’ouvrons aujourd’hui aux réseaux.",
  scanTitle: "Votre carte, prête à tester.",
  scanPage: "Testez votre carte comme un client.",
  flourish: "Scannez.",
  signature: `${founder.name}, ${founder.role}`,
};

// ——— Le pitch ——————————————————————————————————————————————————————

export const bigSmash: Pitch<SourceId> = {
  path: "/big-smash",
  ticketNumber: 39,
  brandName: "Big Smash",
  filmSeenKey: "bigsmash-pitch-film-vu",
  filmSrc: "/pitch/big-smash/film.mp4",
  filmVerticalSrc: "/pitch/big-smash/film-vertical.mp4",
  deckPdfHref: "/pitch/big-smash/big-smash-ominin.pdf",
  // Le pied de chaque diapositive : une proposition, pas un partenariat déjà noué.
  deckFooter: "Ominin · proposition pour Big Smash",
  pitchDate: "octobre 2026",
  demos,
  demoDisplayUrl: demoBase.replace(/^https?:\/\//, ""),
  contact: {
    email: contactEmail,
    mailto: `mailto:${contactEmail}?subject=${encodeURIComponent("Big Smash × Ominin")}`,
  },
  screens,
  sources,
  sourcesNote: "Restaurants, adresses et carte\u00a0: d’après bigsmash.fr. Relevés et captures du 03/10/2026.",
  cover,
  promise,
  walkAway,
  solution,
  etaNotice,
  forCustomers,
  forTeams,
  forRevenue,
  forHeadOffice,
  deployment,
  pricing,
  proposal,
  closing,
  page: {
    heroEyebrow: "Pour le siège de Big Smash",
    heroLead: cover.lead,
    heroFacts: [
      { value: "0\u00a0€", label: "d’abonnement" },
      { value: commissionRange, label: "des commandes QR payées en ligne, dégressif selon le chiffre d’affaires du restaurant\u00a0; frais de carte en sus" },
      { value: "1", label: `restaurant pilote, ${pilot.days}\u00a0jours, matériel\u00a0fourni` },
    ],
    demoTitle: "Votre carte, prête à tester.",
    demoLead:
      "Votre carte, vos menus, vos boissons Coca-Cola\u00a0: ouvrez-la comme un client, puis passez de l’autre côté du comptoir.",
    openerLabel: "Le film de Big Smash × Ominin",
    footer: "Page privée, préparée pour le siège de Big Smash.",
  },
};
