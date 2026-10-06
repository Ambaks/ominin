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
 * Le pitch au siège d'O'Crousti Poulet Original : la présentation
 * (/o-crousti-poulet/presentation, exportée en PDF) et la page privée
 * (/o-crousti-poulet) lisent toutes deux ce module. Chaque chiffre y vient de
 * demos/o-crousti-poulet/pitch/research/, avec sa source ; ce qui reste à
 * fixer par le propriétaire est regroupé juste en dessous. L'offre et le
 * calcul sont ceux de tous les réseaux (lib/pitch/kit).
 */

// ——— Choix du propriétaire ————————————————————————————————————

/** Signataire du pitch : la phrase d'ouverture et le contact sont les siens. */
const founder = { name: "Ambaka\u00a0Le\u00a0Grégam", role: "cofondateur d’Ominin" };

/** Le pilote : sa durée et l'assistance, telles que le propriétaire les a fixées. */
const pilot = { days: 30 };

/** Carte suisse sur un compte Stripe suisse (le restaurant de Lausanne), en CHF. */
const swissCardFee = "2,9\u00a0% + 0,30\u00a0CHF";

/**
 * L'illustration du chiffre d'affaires, hypothèses affichées : un panier
 * supposé (le réseau ne publie pas le sien), et le CA moyen annoncé par le
 * franchiseur pour situer ces clients dans une journée.
 */
const illustration: Illustration = {
  customersPerDay: 5,
  basket: 15,
  daysPerYear: 365,
  announcedYearlyRevenue: 800_000,
  onlineShare: 10,
  coveringCustomers: 2,
};

const { exampleOrder, monthlyExample, revenueIllustration } = offerMath(illustration);

// ——— Démos en ligne ——————————————————————————————————————————————

const demoBase = `${menuSiteUrl}/demo/o-crousti-poulet`;

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
    title: "Toutes les commandes mobiles du réseau, en direct",
    description: "Commandes, paniers et attente, restaurant par restaurant.",
    href: `${demoBase}/reseau?heure=12:34`,
  },
] as const;

// ——— Captures des démos (public/pitch/o-crousti-poulet) ——————————————

const shot = (file: string) => `/pitch/o-crousti-poulet/${file}.webp`;

const screens = {
  menu: { src: shot("phone-menu"), alt: "La carte O’Crousti Poulet ouverte sur un téléphone" },
  composer: { src: shot("phone-composer"), alt: "Le Menu Solo composé par le client : viande, accompagnement, canette" },
  commande: { src: shot("phone-commande"), alt: "La commande, réglée en ligne ou au comptoir" },
  suivi: { src: shot("phone-suivi"), alt: "Le ticket n°\u00a042\u00a0: la commande est en cuisine" },
  prete: { src: shot("phone-prete"), alt: "Le ticket N° 42 : c’est prêt, venez au comptoir" },
  comptoir: { src: shot("comptoir-service"), alt: "L’écran du comptoir : les commandes du coup de feu, les boutons Marquer prête et Remettre" },
  reseau: { src: shot("reseau-siege"), alt: "La vue réseau du siège : restaurants en rush, commandes en direct et classement des 40 restaurants" },
  poster: { src: shot("film-poster"), alt: "12:30. Et la file s’allonge." },
  posterVertical: { src: shot("film-poster-vertical"), alt: "12:30. Et la file s’allonge." },
};

// ——— Sources ——————————————————————————————————————————————————————

const sources = {
  site: {
    short: "ocroustipouletoriginal.com",
    full: "ocroustipouletoriginal.com\u00a0— Nos restaurants, Notre histoire, Devenir franchisé (consulté le 29/09/2026)",
    url: "https://ocroustipouletoriginal.com/nos-restaurants",
  },
  linkedinAbout: {
    short: "LinkedIn, O’Crousti Poulet Original (page «\u00a0À propos\u00a0»)",
    full: "LinkedIn\u00a0— O’Crousti Poulet Original, page «\u00a0À propos\u00a0», consultée le 29/09/2026",
    url: "https://www.linkedin.com/company/o-crousti-poulet-original/about/",
  },
  franchise: {
    short: "Toute la Franchise, 20/05/2026",
    full: "Toute la Franchise\u00a0— O’Crousti Poulet Original, entretien vidéo du 20/05/2026 (CA moyen annoncé\u00a0: 800\u00a0000\u00a0€ par an\u00a0; redevance fixe\u00a0: 2\u00a0000\u00a0€ HT par mois)",
    url: "https://www.toute-la-franchise.com/video-ocrousti-poulet-original-un-modele-de-franchise-pense-pour-maximiser-la-rentabilite-des-franchises",
  },
  reviews: {
    short: "Relevé Ominin des avis Google, 29/09/2026",
    full: "Relevé Ominin des fiches Google Maps du réseau, 29/09/2026\u00a0— note et nombre d’avis de 35 restaurants (Lyon Vaise et Toulouse exclus\u00a0: avis hérités d’un commerce précédent)\u00a0; lecture d’au plus 5 avis «\u00a0les plus pertinents\u00a0» par restaurant (3 à Mâcon et Palavas), 34 restaurants\u00a0: 166 avis",
  },
  akto: commonSources.akto,
  lu: commonSources.lu,
  bmo: commonSources.bmo,
  sumup: commonSources.sumup,
  stripe: stripeSource(`\u00a0; à Lausanne, compte Stripe suisse\u00a0: ${swissCardFee} par carte suisse`),
  uber: commonSources.uber,
  kiosks: commonSources.kiosks,
  saas: commonSources.saas,
} satisfies Record<string, Source>;

type SourceId = keyof typeof sources;

type Section<K extends keyof Pitch<SourceId>> = Pitch<SourceId>[K];

// ——— Le récit ——————————————————————————————————————————————————————

const cover: Section<"cover"> = {
  eyebrow: "Proposition au siège",
  title: { first: "Ça défile.", second: { text: "Personne ne", accent: "repart." } },
  lead: "Vos clients commandent et paient depuis la file\u00a0; le ticket sort en cuisine. Sans changer de caisse.",
};

const promise: Section<"promise"> = {
  eyebrow: "Votre promesse",
  slogan: ["Vite, oui.", "Mais bien."],
  sloganSource: "Votre signature, ocroustipouletoriginal.com",
  rating: { value: "4,67", label: `de moyenne sur ${thousands(6841)} avis Google (35\u00a0fiches relevées)` },
  speed: {
    value: "18\u00a0%",
    label: "des avis étudiés saluent la rapidité.",
    detail: "30 avis sur 166",
  },
  closing: "Le rush met cette promesse à l’épreuve.",
  sources: ["site", "reviews"],
};

const walkAway: Section<"walkAway"> = {
  eyebrow: "Ce que les avis ne disent pas",
  quote: [
    "Un midi, la file débordait sur le trottoir. Je suis reparti.",
    "Ceux qui repartent n’écrivent pas d’avis.",
  ],
  attribution: `${founder.name}, ${founder.role}`,
  followUp: "Le pilote comptera ceux qui repartent\u00a0: relevés sur place aux heures de rush, avant et\u00a0après.",
  facts: [
    {
      value: "10\u00a0%",
      text: "d’achats en moins quand la file passe de 10 à 15 personnes (étude sur un rayon traiteur).",
      source: "lu",
    },
    {
      value: "34\u00a0%",
      text: "seulement des clients à emporter se disent très satisfaits de la gestion du rush en restauration rapide.",
      source: "akto",
    },
  ],
};

const solution: Section<"solution"> = {
  eyebrow: "La solution",
  title: { text: "Commander depuis", accent: "la\u00a0file." },
  steps: [
    { title: "Scanner", text: "Un QR code en vitrine, dans la file, au comptoir. Aucune application.", screen: "menu" },
    { title: "Commander", text: "Le client compose son menu et paie en ligne. Espèces, titres-restaurant\u00a0: au comptoir.", screen: "commande" },
    { title: "Suivre", text: "Son numéro et l’avancement de sa commande.", screen: "suivi" },
    { title: "Récupérer", text: "«\u00a0C’est prêt\u00a0!\u00a0» s’affiche sur sa page\u00a0: il récupère sa commande au comptoir, sans refaire la file.", screen: "prete" },
  ],
  note: "Le temps passé dans la file devient du temps de préparation.",
};

/** L'heure estimée : montrée dans les captures, pas encore livrée. */
const etaNotice: Section<"etaNotice"> = {
  tag: "En développement",
  text: "L’heure de retrait estimée («\u00a0prête vers 12\u00a0h\u00a041\u00a0»)\u00a0: son calcul apprendra le rythme de chaque cuisine à partir de ses vraies commandes.",
};

const forCustomers: Section<"forCustomers"> = {
  eyebrow: "Pour vos clients",
  title: ["Ni malentendu", "ni attente à\u00a0l’aveugle."],
  points: [
    {
      title: "Rien de mal compris.",
      text: "Le client compose son menu lui-\u2060même\u00a0; le ticket sort tel quel, rien à répéter.",
      fact: "Exactitude des commandes\u00a0: 44\u00a0% seulement des clients à emporter s’en disent très satisfaits, contre 60\u00a0% en livraison, où l’on commande dans une appli.",
    },
    {
      title: "Son numéro et l’alerte «\u00a0C’est prêt\u00a0!\u00a0»",
      fact: "70\u00a0% des clients de la restauration rapide jugent important d’être prévenus quand leur commande est prête.",
      eta: true,
    },
  ],
  scan: {
    question: "Et vos clients scanneront-ils\u00a0?",
    answer: "67\u00a0% des clients de la restauration rapide jugent important de pouvoir commander en ligne, en livraison ou à emporter, pour choisir où manger.",
    pilot: "Le pilote le mesurera chez vous\u00a0: la part des commandes passées depuis la file.",
  },
  sources: ["akto"],
};

const forTeams: Section<"forTeams"> = {
  eyebrow: "Pour vos équipes",
  title: { text: "Commande prête\u00a0?", accent: "Un\u00a0appui." },
  points: [
    {
      title: "Le client est prévenu, la\u00a0remise\u00a0confirmée.",
      text: "«\u00a0Marquer prête\u00a0» fait passer sa page à «\u00a0C’est prêt\u00a0!\u00a0»\u00a0; «\u00a0Remettre\u00a0» clôt la commande. Sur une tablette ou un téléphone du restaurant.",
    },
    {
      title: "Moins de temps en caisse au\u00a0rush.",
      text: "Chaque commande payée depuis la file, c’est une commande de moins à saisir et à encaisser.",
    },
    {
      title: "Un plat épuisé, retiré de la carte.",
      text: "Un appui le masque en ligne, un autre le rétablit.",
    },
  ],
  simple: `Deux boutons, pensés pour s’apprendre en un service\u00a0: près de 40\u00a0% des ${thousands(97_100)} projets de recrutement d’aides de cuisine et d’employés polyvalents sont saisonniers.`,
  caption: "L’espace de gestion Ominin, au comptoir",
  sources: ["bmo"],
};

const forRevenue: Section<"forRevenue"> = {
  eyebrow: "Le calcul, pour un franchisé",
  title: `Si ${percent(illustration.onlineShare)} des ventes passent en ligne, deux\u00a0clients retenus par\u00a0jour couvrent le\u00a0surcoût.`,
  mechanism:
    "On reste ou on repart selon la longueur de la file (Lu et al., 2013). Celui qui a commandé attend hors de la file\u00a0: elle paraît plus courte à celui qui arrive.",
  illustrationLabel: "Illustration, pas une promesse",
  rateNote: `Calculé au taux maximal (${maxRate})\u00a0: le taux baisse quand le chiffre d’affaires du restaurant augmente.`,
  /** Le calcul, posé en trois chiffres : tous par mois et par restaurant. */
  sum: [
    {
      value: `≈\u00a0${euros(monthlyExample.extra)}`,
      unit: "par mois",
      text: `de surcoût si ${percent(monthlyExample.share)} du chiffre d’affaires est payé en ligne\u00a0: ≈\u00a0${euros(monthlyExample.ominin)} au plus pour Ominin et ≈\u00a0${euros(monthlyExample.card)} de frais de carte, moins ≈\u00a0${euros(monthlyExample.counter)} que le TPE coûte déjà`,
    },
    {
      value: `≈\u00a0${euros(monthlyExample.coveringSales)}`,
      unit: "par mois",
      text: `de ventes\u00a0: ${monthlyExample.coveringCustomers}\u00a0clients retenus par jour, à ${euros(illustration.basket)}`,
    },
    {
      value: `≈\u00a0${percent(monthlyExample.breakEvenMargin)}`,
      unit: "de marge brute",
      text: "sur ces ventes suffisent à couvrir le surcoût, même si ces clients paient eux aussi en ligne",
    },
  ],
  beyond: `Au-delà\u00a0: à ${illustration.customersPerDay}\u00a0clients par jour (≈\u00a01 sur ${revenueIllustration.oneIn} de vos ≈\u00a0${revenueIllustration.ordersPerDay} commandes quotidiennes), ≈\u00a0${euros(revenueIllustration.monthly)} de ventes en plus par mois, soit ≈\u00a0${euros(revenueIllustration.revenue)} par an. Hypothèses\u00a0: panier de ${euros(illustration.basket)} supposé (le réseau ne publie pas le sien), chiffre d’affaires moyen annoncé de ${euros(illustration.announcedYearlyRevenue)} par an.`,
  sources: ["lu", "franchise"],
};

const forHeadOffice: Section<"forHeadOffice"> = {
  eyebrow: "Pour le siège",
  title: "Toutes vos commandes mobiles, en direct.",
  lead: "Le réseau sur un écran\u00a0: qui est en rush, ce qui part, maintenant.",
  badge: "Données de démonstration",
  rushKey: "①\u00a0à\u00a0⑤\u00a0: les restaurants en rush (délai annoncé de 10\u00a0min ou plus).",
  /** Les trois colonnes de la vue réseau ; x : leur bord gauche dans la capture, large de 1 600 px. */
  areas: [
    { label: "Qui est en rush", x: 24 },
    { label: "Ce qui part", x: 808 },
    { label: "Le classement, maintenant", x: 1200 },
  ],
  panelsTop: 344,
};

const deployment: Section<"deployment"> = {
  eyebrow: "Déploiement",
  title: { text: "Rien à", accent: "remplacer." },
  lead: "Ominin s’ajoute à ce que chaque restaurant a déjà\u00a0: sa caisse, ses imprimantes, sa carte. Uber Eats reste votre canal de livraison.",
  points: [
    {
      label: "Caisse",
      title: "Votre caisse reste la vôtre.",
      text: "Rien à brancher dessus\u00a0: les ventes en ligne arrivent, numérotées, sur le compte Stripe du restaurant\u00a0; son relevé sert au comptable.",
    },
    {
      label: "Cuisine",
      title: "Omilink, notre boîtier, en\u00a0cuisine.",
      text: "Deux câbles, alimentation et réseau\u00a0: il pilote la plupart des imprimantes à tickets. Nous vérifions les vôtres au premier appel.",
    },
    {
      label: "Comptoir",
      title: "Le comptoir, pour qui le préfère.",
      text: "Titres-restaurant et espèces s’y règlent comme aujourd’hui. Aucun ticket en cuisine avant paiement\u00a0: pas de commande fantôme.",
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
    basis: "sur les commandes payées en ligne.",
  },
  lead: `Dégressif selon le chiffre d’affaires de chaque restaurant, paliers fixés ensemble. Le siège ne paie rien, et Ominin ne prend rien sur les ventes au comptoir. Votre redevance fixe ne bouge pas\u00a0: la commande mobile peut rejoindre votre «\u00a0Digital inclus\u00a0».`,
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
    { name: "Bornes de commande", model: "1\u00a0500 à 7\u00a0000\u00a0€ la borne, 40 à 200\u00a0€ par mois de logiciel, plus les frais de paiement et la place au sol" },
    { name: "Logiciels de commande", model: "29 à 199\u00a0€ par mois et par restaurant, dus même sans commande, plus les frais de paiement" },
  ],
  noOnline: "Sans commande en ligne, rien\u00a0à\u00a0payer.",
  vat: `Prix Ominin nets de taxe\u00a0: ${editor.vatMention.replace("art. 293 B", "art.\u00a0293\u00a0B")}.`,
  cardFees: `Frais de carte Stripe, à la charge du restaurant\u00a0: ${percent(cardFees.standard.percent)} + ${euros(cardFees.standard.fixed)} par carte européenne standard (carte premium\u00a0: ${percent(cardFees.premium.percent)} + ${euros(cardFees.premium.fixed)}\u00a0; Lausanne, compte suisse\u00a0: ${swissCardFee}).`,
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
      `De ${commissionRange} des commandes payées en ligne selon le chiffre d’affaires, plus les frais de carte.`,
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
      "Chaque ouverture équipée dès le premier jour, fidèle à votre «\u00a0ouvrir vite, opérer simplement\u00a0». Chaque restaurant garde ses propres prix de vente.",
      "Assistance aux franchisés\u00a0: canal et horaires définis avec vous avant le déploiement.",
    ],
  },
  measures: {
    title: "Ce que le pilote mesurera",
    lead: "Cinq chiffres, relevés ensemble.",
    sources: ["akto", "linkedinAbout"],
    points: [
      "Les clients qui renoncent et repartent, au rush.",
      "La part des commandes passées depuis la file.",
      "Le panier moyen, commande mobile et comptoir.",
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
  reference: "Ominin est déjà en service chez plusieurs restaurants clients, pour qui il génère du chiffre d’affaires\u00a0; nous l’ouvrons aujourd’hui aux réseaux.",
  scanTitle: "Votre carte, prête à tester.",
  scanPage: "Testez votre carte comme un client.",
  flourish: "Scannez.",
  signature: `${founder.name}, ${founder.role}`,
};

// ——— Le pitch ——————————————————————————————————————————————————————

export const oCroustiPoulet: Pitch<SourceId> = {
  path: "/o-crousti-poulet",
  ticketNumber: 42,
  brandName: "O’Crousti Poulet",
  filmSeenKey: "ocp-pitch-film-vu",
  // Le film (~70 s), servi depuis public/ : même origine, donc rien à ajouter à la CSP.
  filmSrc: "/pitch/o-crousti-poulet/film.mp4",
  // Le même film en 9:16, pour l'ouverture sur un téléphone tenu droit.
  filmVerticalSrc: "/pitch/o-crousti-poulet/film-vertical.mp4",
  deckPdfHref: "/pitch/o-crousti-poulet/o-crousti-poulet-ominin.pdf",
  // Le pied de chaque diapositive : une proposition, pas un partenariat déjà noué.
  deckFooter: "Ominin · proposition pour O’Crousti Poulet Original",
  pitchDate: "octobre 2026",
  demos,
  demoDisplayUrl: demoBase.replace(/^https?:\/\//, ""),
  contact: {
    email: contactEmail,
    mailto: `mailto:${contactEmail}?subject=${encodeURIComponent("O’Crousti Poulet × Ominin")}`,
  },
  screens,
  sources,
  sourcesNote: "Noms et nombre de restaurants\u00a0: d’après les publications du réseau. Relevés et captures du 29/09/2026.",
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
    heroEyebrow: "Pour le siège d’O’Crousti Poulet Original",
    heroLead: cover.lead,
    heroFacts: [
      { value: "0\u00a0€", label: "d’abonnement" },
      { value: commissionRange, label: "des commandes en ligne, dégressif selon le chiffre d’affaires du restaurant\u00a0; frais de carte en sus" },
      { value: "1", label: `restaurant pilote, ${pilot.days}\u00a0jours, matériel\u00a0fourni` },
    ],
    demoTitle: "Votre carte, prête à tester.",
    demoLead:
      "La carte nationale, vos menus, vos boissons PepsiCo\u00a0: ouvrez-la comme un client, puis passez de l’autre côté du comptoir.",
    openerLabel: "Le film d’O’Crousti Poulet × Ominin",
    footer: "Page privée, préparée pour le siège d’O’Crousti Poulet Original.",
  },
};
