import { contactEmail } from "@/lib/landing-data";
import { commissionRange, commonSources, thousands } from "@/lib/pitch/kit";
import type { Pitch, Source } from "@/lib/pitch/types";
import { menuSiteUrl } from "@/lib/site";

/*
 * Le pitch au siège de Big Smash (groupe NSup, Toulouse) : la présentation
 * (/big-smash/presentation, exportée en PDF) et la page privée (/big-smash)
 * lisent toutes deux ce module. Chaque chiffre y vient de
 * demos/big-smash/pitch/research/, avec sa source. Un récit resserré sur le
 * produit : la solution, l'estimateur IA pour les clients, le comptoir, la vue
 * du siège. Big Smash prend déjà ses commandes aux bornes, et ses avis
 * montrent que la promesse de rapidité se joue après la commande — prête sans
 * être annoncée, remise au mauvais client. L'offre tient dans la couverture.
 */

// ——— Choix du propriétaire ————————————————————————————————————

/** Signataire du pitch : la phrase d'ouverture et le contact sont les siens. */
const founder = { name: "Ambaka\u00a0Le\u00a0Grégam", role: "cofondateur d’Ominin" };

/** Le pilote : sa durée et l'assistance, telles que le propriétaire les a fixées. */
const pilot = { days: 30 };

/** La commande que suivent les captures et le film : le N° 39, payé à 12 h 45, prêt à l'heure annoncée. */
const order = { number: 39, readyAt: "12:51" };
const readyAtSpoken = order.readyAt.replace(":", "\u00a0h\u00a0");

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
  suivi: { src: shot("phone-suivi"), alt: `Le ticket n°\u00a0${order.number}\u00a0: en cuisine, prête vers ${readyAtSpoken} selon l’estimateur IA` },
  prete: { src: shot("phone-prete"), alt: `Le ticket N° ${order.number} : c’est prêt, venez au comptoir` },
  comptoir: { src: shot("comptoir-service"), alt: "L’écran du comptoir : les commandes du coup de feu, les boutons Marquer prête et Remettre" },
  reseau: { src: shot("reseau-siege"), alt: "La vue réseau du siège : restaurants en rush, commandes en direct et classement des 10 restaurants" },
  poster: { src: shot("film-poster"), alt: "Big Smash × Ominin : le film" },
  posterVertical: { src: shot("film-poster-vertical"), alt: "Big Smash × Ominin : le film" },
};

// ——— Sources ——————————————————————————————————————————————————————

const sources = {
  akto: commonSources.akto,
  bmo: commonSources.bmo,
} satisfies Record<string, Source>;

type SourceId = keyof typeof sources;

type Section<K extends keyof Pitch<SourceId>> = Pitch<SourceId>[K];

// ——— Le récit ——————————————————————————————————————————————————————

/* « 1,2,3 ... SMASH ! », la signature du site, en trois temps : les trois
   gestes du client. */
const cover: Section<"cover"> = {
  eyebrow: "Proposition au siège",
  title: { first: "1, 2, 3…", second: { text: "Commandé, payé,", accent: "prévenu." } },
  lead: "Vos clients commandent et paient depuis leur table ou la file, et l’IA leur annonce l’heure où c’est prêt. En plus de vos bornes, sans changer de caisse.",
};

const solution: Section<"solution"> = {
  eyebrow: "La solution",
  title: { text: "Commander depuis", accent: "sa\u00a0table." },
  steps: [
    { title: "Scanner", text: "Un QR code sur chaque table, dans la file, au comptoir. Aucune application.", screen: "menu" },
    { title: "Commander", text: "Le client compose son menu et paie en ligne. Espèces, titres-restaurant\u00a0: il règle au comptoir.", screen: "commande" },
    { title: "Suivre", text: "Son numéro, et l’heure où sa commande sera prête, calculée par l’IA.", screen: "suivi" },
    { title: "Récupérer", text: "«\u00a0C’est prêt\u00a0!\u00a0» s’affiche sur sa page\u00a0: il montre son numéro au comptoir et repart avec la bonne commande.", screen: "prete" },
  ],
  note: "Chaque téléphone devient une borne, et le ticket suit le client jusqu’au comptoir.",
};

/* Pour vos clients : l'estimateur IA, la pièce maîtresse. */
const estimator: Section<"estimator"> = {
  eyebrow: "Pour vos clients",
  title: { text: "L’heure exacte", accent: "où c’est prêt." },
  lead: `Dès le paiement, le client lit «\u00a0prête vers ${readyAtSpoken}\u00a0». L’estimateur IA d’Ominin apprend le rythme de chaque cuisine sur ses propres commandes\u00a0— la file en cours, la taille du panier, l’heure du service\u00a0— et ajuste l’heure en direct.`,
  announced: { label: "Annoncée", value: order.readyAt },
  ready: { label: "Prête", value: order.readyAt },
  verdict: `À la minute près, sur la commande N°\u00a0${order.number} de la démo.`,
  points: [
    { title: "Le client attend où il veut.", text: "À table, dehors, sur son téléphone\u00a0: plus d’attroupement au comptoir pour demander «\u00a0c’est prêt quand\u00a0?\u00a0»." },
    {
      title: "Prévenu dès que c’est prêt.",
      text: "«\u00a0C’est prêt\u00a0!\u00a0» s’affiche sur sa page\u00a0: 70\u00a0% des clients de la restauration rapide jugent important d’être prévenus (par un bipper, dans l’étude).",
    },
    { title: "Chaque cuisine, son rythme.", text: "Une ouverture n’est pas un restaurant rodé\u00a0: l’heure se calcule sur les commandes de chaque restaurant, pas sur une moyenne du réseau." },
  ],
  screen: "suivi",
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

const forHeadOffice: Section<"forHeadOffice"> = {
  eyebrow: "Pour le siège",
  title: "Toutes vos commandes QR, en direct.",
  lead: "Le réseau sur un écran\u00a0: ce qui part, ce qui attend au comptoir, et qui est en rush, nouvelles ouvertures comprises.",
  badge: "Données de démonstration",
  rushKey: "Les pastilles numérotées\u00a0: les restaurants en rush (délai annoncé de 10\u00a0min ou plus).",
  delayKey: "Délais annoncés par l’estimateur IA.",
  hypothesis: "Simulation, 30\u00a0% des commandes par QR.",
  areas: [
    { label: "Qui est en rush", x: 24 },
    { label: "Ce qui part", x: 808 },
    { label: "Le classement, maintenant", x: 1200 },
  ],
  panelsTop: 325,
};

const closing: Section<"closing"> = {
  eyebrow: "Et maintenant",
  title: ["Parlons-en", "30 minutes."],
  steps: ["Un appel\u00a0: vos imprimantes et votre carte", "Vous choisissez le restaurant pilote", `Un pilote de ${pilot.days}\u00a0jours\u00a0: nous installons, nous mesurons ensemble`],
  mail: "Écrire au cofondateur",
  interlocutor: `Votre interlocuteur direct\u00a0: ${founder.name}, ${founder.role}.`,
  company: "Nous concevons et exploitons des outils pour la restauration\u00a0: menu QR, commande et paiement, estimateur IA, impression en cuisine.",
  reference: "Ominin est déjà en service chez plusieurs restaurants indépendants\u00a0; nous l’ouvrons aujourd’hui aux réseaux.",
  scanTitle: "Votre carte, prête à tester.",
  scanPage: "Testez votre carte comme un client.",
  flourish: "Scannez.",
  signature: `${founder.name}, ${founder.role}`,
};

// ——— Le pitch ——————————————————————————————————————————————————————

export const bigSmash: Pitch<SourceId> = {
  path: "/big-smash",
  ticketNumber: order.number,
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
  cover,
  solution,
  estimator,
  forTeams,
  forHeadOffice,
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
