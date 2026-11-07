import {
  compatibleTills,
  composerCta,
  connectCommission,
  contactEmail,
  installSection,
  integrationPartners,
  starterKit,
  type Cta,
  type FaqItem,
  type NavLink,
} from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu/format";

/*
 * Contenu de la landing Menu (menu.ominin.com), tiré de la plaquette
 * restaurant de l’espace commercial (marketing/plaquette-porte-a-porte) :
 * ses quatre piliers, ses écrans du Caffè Panis, le relevé de terrain, les
 * études, le comparatif Sunday et les étapes du démarrage. Les prix viennent
 * de lib/landing-data, d’où partent aussi le composeur et Stripe.
 */

export type PillarId = "satisfaction" | "couts" | "ventes" | "donnees";
export type Screen = "phone" | "tablet";

export interface Shot {
  src: string;
  alt: string;
  screen: Screen;
}

export interface StoryStep {
  kicker: string;
  title: string;
  description: string;
  shot: Shot;
}

export interface Pillar {
  id: PillarId;
  label: string;
  tile: string;
  title: string;
  body: string;
  steps: StoryStep[];
}

const formatPercent = (value: number) => `${value.toLocaleString("fr-FR")} %`;
const percent = formatPercent(connectCommission.percent);
/** Ce qu’Ominin prend : la commission, et les frais de carte de Stripe à côté. */
const commission = `${percent} + frais de carte`;

/*
 * Frais de carte d’une commande payée en ligne, tarif Stripe d’Ominin (IC+) :
 * le coût réseau (interchange et schémas) passe au coût réel et dépend de la
 * carte, d’où « environ » ; la part de Stripe est fixe. Le panier d’exemple
 * est le panier moyen en ligne relevé au BOHO (≈ 20 €).
 */
const cardFees = { networkPercent: 0.3, stripePercent: 0.15, stripeFixed: 0.08 };
const exampleBasket = 20;
const exampleOminin = (exampleBasket * connectCommission.percent) / 100;
const exampleCard = (exampleBasket * (cardFees.networkPercent + cardFees.stripePercent)) / 100 + cardFees.stripeFixed;
const stripeShare = `${formatPercent(cardFees.stripePercent)} + ${formatPrice(cardFees.stripeFixed)}`;

/*
 * Paiement au terminal (Stripe Terminal, tarif Ominin) : par paiement, 0,10 %
 * + 0,05 € et 0,025 € de services terminal ; 3 € par mois et par lecteur.
 * Ominin n’y prend rien au lancement, puis 0,2 % (décision du gérant,
 * 2026-11-07) ; le lecteur se vend au prix Stripe.
 */
const terminalFees = { stripePercent: 0.1, stripeFixed: 0.075, readerMonthly: 3, launchPercent: 0, laterPercent: 0.2 };
/** Le coût réseau (interchange et schémas) d’un paiement par carte, en ligne comme au terminal. */
const networkLine = { label: "Réseau de la carte", note: "au coût réel", value: `environ ${formatPercent(cardFees.networkPercent)}`, ours: false };
/**
 * Frais de carte d’un paiement au terminal sur le panier d’exemple, calculés
 * en centimes puis arrondis : 0,155 € s’écrit sinon 0,15499… et s’afficherait 0,15 €.
 */
const exampleTerminal = Math.round(exampleBasket * (cardFees.networkPercent + terminalFees.stripePercent) + terminalFees.stripeFixed * 100) / 100;
/** Montant fixe au millième, comme Stripe le facture (0,075 €). */
const formatFee = (euros: number) => `${euros.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} €`;
const tablePrice = formatPrice(starterKit.cachet.price);
const shippingPrice = formatPrice(starterKit.shipping.price);
const demoPath = "/demo/caffe-panis";

const phone = (name: string, alt: string): Shot => ({ src: `/menu-landing/${name}.webp`, alt, screen: "phone" });
const tablet = (name: string, alt: string): Shot => ({ src: `/menu-landing/${name}.webp`, alt, screen: "tablet" });

export const seo = {
  title: "Ominin Menu — commande et paiement à table, fidélité et analyses pour restaurants",
  description:
    "La carte QR à vos couleurs, la commande et le paiement à table, la fidélité, les recommandations et vos chiffres analysés. 0 € par mois, " +
    `${commission} sur les commandes payées en ligne, et une équipe avec vous du premier service au rapport du mois.`,
};

export const nav = {
  wordmark: "Menu",
  links: [
    { label: "Le produit", href: "#produit" },
    { label: "Les chiffres", href: "#chiffres" },
    { label: "Accompagnement", href: "#accompagnement" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  login: { label: "Connexion", href: "/connexion" } satisfies Cta,
  cta: composerCta,
};

export const hero = {
  lines: [{ text: "Votre restaurant," }, { text: "sur chaque téléphone.", mark: true }],
  body:
    "Le système tout-en-un pour les restaurants : des clients plus satisfaits, moins de coûts et plus de ventes. " +
    "On monte tout, on forme votre équipe, et on reste avec vous chaque mois.",
  primaryCta: composerCta,
  secondaryCta: { label: "Voir la démo", href: demoPath } satisfies Cta,
  stats: [
    { value: "0 €", label: "d’abonnement" },
    { value: percent, label: "+ frais de carte" },
    { value: "1 contact", label: "direct, chez nous" },
  ],
};

/** L’éventail du hero : le téléphone du milieu est la carte. */
export const heroScene = [
  phone("roue", "La roue du jour du Caffè Panis"),
  phone("fidelite-panier", "Le panier, avec le combo parfait et les points de fidélité"),
  phone("menu", "La carte du Caffè Panis, ouverte depuis le QR de la table"),
  phone("paiement", "Le règlement : payer en ligne ou au comptoir"),
  phone("apres-repas", "Après le repas : un dessert ou un café"),
];

/** Notifications du hero : six, le rythme CSS (portal.css) est réglé pour six. */
export const heroFeed = {
  caption: "Exemples de ce qu’Ominin fait pendant un service.",
  items: [
    { pillar: "satisfaction", label: "Table 6", text: "Commandé et payé depuis la table : 21,80 €" },
    { pillar: "ventes", label: "Combo parfait", text: "+ Prosciutto avec la burrata, 7,90 €" },
    { pillar: "couts", label: "Carte", text: "Burrata épuisée : retirée de toutes les tables" },
    { pillar: "ventes", label: "Fidélité", text: "Giulia revient : 85 points cumulés" },
    { pillar: "donnees", label: "Votre rapport", text: "Le rapport du mois est prêt, on vous le présente" },
    { pillar: "satisfaction", label: "Après le repas", text: "Un avis Google laissé après le café" },
  ] satisfies { pillar: PillarId; label: string; text: string }[],
};

export const marquee = ["Restaurants", "Brasseries", "Pizzerias", "Bars", "Cafés", "Bistrots", "Fast-foods", "Lounges"];

export type StoryMode = "restaurant" | "fastFood";

export const storySection = {
  id: "produit",
  eyebrow: "Le produit",
  title: "Un seul système, quatre raisons de l’adopter.",
  rowLabel: "Les quatre piliers",
  toggleLabel: "Type d’établissement",
  /** Le mode fast-food a son lien profond : menu.ominin.com/#fast-food. */
  fastFoodHash: "fast-food",
  note: "Écrans réels du produit. Dans l’espace de gestion, les chiffres sont fictifs.",
};

const restaurantPillars: Pillar[] = [
  {
    id: "satisfaction",
    label: "Satisfaction",
    tile: "Des clients plus satisfaits",
    title: "Des clients plus satisfaits.",
    body: "Ils commandent et paient depuis leur table, sans attendre un serveur ni l’addition.",
    steps: [
      {
        kicker: "La carte",
        title: "Scanner, choisir, commander.",
        description:
          "Sans appli et sans compte. Le client scanne le QR de sa table et votre carte s’ouvre, avec vos photos, vos prix et vos allergènes.",
        shot: phone("menu", "La carte du Caffè Panis : les plats en photo, le prix et les points de fidélité de chacun"),
      },
      {
        kicker: "Le plat",
        title: "Tout savoir, sans avoir à demander.",
        description:
          "Une photo, une description et les allergènes sur chaque plat. Un plat épuisé disparaît d’un geste, sur toutes les tables.",
        shot: phone("plat", "La fiche de la Classic Burrata, avec ses allergènes et le bouton Ajouter"),
      },
      {
        kicker: "Le règlement",
        title: "Payer en ligne, ou au comptoir.",
        description:
          "Carte bancaire, Apple Pay ou Google Pay, sans quitter la carte. La commande part en cuisine avec le numéro de table, et personne ne court après l’addition.",
        shot: phone("paiement", "Le règlement : payer en ligne ou au comptoir, avec un pourboire pour l’équipe"),
      },
    ],
  },
  {
    id: "couts",
    label: "Coûts",
    tile: "Des coûts réduits",
    title: "Moins de coûts, moins de tâches.",
    body: "Les commandes arrivent seules en cuisine et l’encaissement se fait à table. Moins de tâches répétitives pour votre équipe.",
    steps: [
      {
        kicker: "Aujourd’hui",
        title: "Tout arrive au même endroit.",
        description:
          "Sur une tablette, un téléphone ou un ordinateur, vous suivez le service en direct. Le chiffre du jour se compare à la même heure la semaine d’avant.",
        shot: tablet("g-aujourdhui", "L’écran Aujourd’hui : chiffre du jour, commandes en cours et meilleures ventes"),
      },
      {
        kicker: "Commandes",
        title: "À encaisser, à servir. C’est tout.",
        description:
          "Une vue pour le gérant, le serveur et la cuisine. Un encaissement article par article, moins de commandes à saisir et moins d’allers-retours.",
        shot: tablet("g-commandes", "L’écran Commandes : les additions à encaisser, table par table"),
      },
      {
        kicker: "Carte",
        title: "Votre carte, depuis votre téléphone.",
        description: "Prix, photos, ruptures et happy hours : un changement apparaît sur toutes les tables à la minute.",
        shot: tablet("g-carte", "L’écran Carte : les plats, leur prix et leur mise en vente"),
      },
      {
        kicker: "Équipe",
        title: "Un planning calé sur vos commandes.",
        description: "Rôles, pointage, et un planning de la semaine proposé d’après les commandes prévues. Vous gardez la main.",
        shot: tablet("g-planning", "Le planning proposé pour la semaine prochaine"),
      },
    ],
  },
  {
    id: "ventes",
    label: "Ventes",
    tile: "Plus de ventes",
    title: "Plus de ventes, à chaque table.",
    body: "La fidélité fait revenir vos clients, et les recommandations complètent chaque commande.",
    steps: [
      {
        kicker: "Le combo parfait",
        title: "Le bon accord, au bon moment.",
        description:
          "Dans le panier, le combo parfait propose ce qui va avec le plat choisi, et dit pourquoi. Ce que ferait votre meilleur serveur, à chaque table, même un samedi soir.",
        shot: phone("fidelite-panier", "Le panier : le combo parfait propose un prosciutto, les points de fidélité s’ajoutent"),
      },
      {
        kicker: "La fidélité",
        title: "Une raison de revenir, chaque jour.",
        description:
          "Le client laisse son numéro une fois : ses points se cumulent tout seuls, sans carte à tamponner ni appli. Un tour de roue offert chaque jour, et vous choisissez les récompenses.",
        shot: phone("roue", "La roue du jour, un tour offert chaque jour"),
      },
      {
        kicker: "Après le repas",
        title: "Un dessert, un café, puis un avis.",
        description: "En fin de repas, la carte propose un dessert ou un café, puis invite à laisser un avis Google.",
        shot: phone("apres-repas", "Après le repas : un tiramisù ou un café pour finir"),
      },
      {
        kicker: "Vos fidèles",
        title: "Une clientèle que vous voyez enfin.",
        description: "Vos clients fidèles, leurs points et les résultats du programme en graphiques, dans votre espace de gestion.",
        shot: tablet("g-fidelite", "L’écran Fidélité : commandes avec carte et clients inscrits, en courbes"),
      },
    ],
  },
  {
    id: "donnees",
    label: "Données",
    tile: "Vos données, analysées",
    title: "Moins d’intuition, de meilleures décisions.",
    body: "Chaque commande devient une donnée : sur vos heures, vos équipes et votre carte. Chaque mois, on vous présente le rapport.",
    steps: [
      {
        kicker: "Analyses",
        title: "Ce qui se vend, quand, et ce que ça rapporte.",
        description:
          "Chiffre encaissé, passages, dépense par passage, marge estimée, et des pistes chiffrées : ajuster les heures creuses, pousser les desserts.",
        shot: tablet("g-analyses", "L’écran Analyses : chiffre encaissé, passages, marge estimée et pistes"),
      },
      {
        kicker: "Votre carte, plat par plat",
        title: "Vos vedettes, et ceux à retravailler.",
        description:
          "Les plats populaires à marge faible, les rentables qui se vendent peu : vous savez quoi mettre en avant, et quoi revoir.",
        shot: tablet("g-analytique", "L’analyse de la carte : vedettes, plats populaires à marge faible, rentables peu vendus"),
      },
    ],
  },
];

const ffPhone = (name: string, alt: string): Shot => ({ src: `/menu-landing/fast-food/${name}.webp`, alt, screen: "phone" });
const ffTablet = (name: string, alt: string): Shot => ({ src: `/menu-landing/fast-food/${name}.webp`, alt, screen: "tablet" });

/* Le fast-food (plaquette Fast-food) : pas de table ni de service, un numéro du jour et un comptoir. */
const fastFoodPillars: Pillar[] = [
  {
    id: "satisfaction",
    label: "Satisfaction",
    tile: "Des clients plus satisfaits",
    title: "Des clients plus satisfaits.",
    body: "Ils commandent et paient sur leur téléphone, l’IA leur annonce l’heure de retrait, et leur numéro se suit en direct jusqu’à « C’est prêt ».",
    steps: [
      {
        kicker: "La carte",
        title: "Scanner, choisir, payer.",
        description:
          "Sans appli et sans compte. Le client scanne un QR, à l’entrée, sur le comptoir ou sur une table, et votre carte s’ouvre avec vos menus, vos photos et vos allergènes.",
        shot: ffPhone("menu", "La carte d’un fast-food : les menus en photo, leur prix et le bouton Composer"),
      },
      {
        kicker: "L’heure annoncée par l’IA",
        title: "Il sait à quelle heure c’est prêt.",
        description:
          "Dès le paiement, l’IA annonce au client l’heure de retrait de sa commande, d’après le rythme de votre cuisine : la file, la taille de la commande, l’heure du service. Il s’assoit, sort, ou revient à l’heure.",
        shot: ffPhone("eta", "Le ticket du client : numéro 1, en cuisine, prête dans environ 6 minutes, estimation IA"),
      },
      {
        kicker: "Le ticket en direct",
        title: "Un numéro, et plus besoin d’attendre debout.",
        description:
          "Il reçoit un numéro du jour, et son téléphone suit la commande : commandée, en cuisine, prête. Pas de bipeur à acheter, pas de numéros à crier.",
        shot: ffPhone("prete", "Le ticket du client : numéro 2, commande réglée, « C’est prêt ! »"),
      },
    ],
  },
  {
    id: "couts",
    label: "Coûts",
    tile: "Des coûts réduits",
    title: "Moins de prise de commande, moins d’encaissement.",
    body: "La commande payée part toute seule en cuisine. Votre équipe prépare et remet, au lieu de saisir et d’encaisser.",
    steps: [
      {
        kicker: "Le comptoir",
        title: "Prête ? Un appui. Remise ? Un appui.",
        description:
          "Sur une tablette, l’équipe voit les numéros à préparer et à remettre. Marquer prête prévient le client sur son téléphone, et le ticket sort en cuisine avec le numéro en grand.",
        shot: ffTablet("g-comptoir", "L’écran du comptoir : les numéros prêts à remettre et ceux en préparation"),
      },
      {
        kicker: "Aujourd’hui",
        title: "Votre coup de feu, en direct.",
        description:
          "Le chiffre du jour, les commandes à encaisser et à servir, les meilleures ventes : comparés à la même heure la semaine d’avant.",
        shot: ffTablet("g-aujourdhui", "L’écran Aujourd’hui d’un fast-food : chiffre du jour, commandes en cours, top ventes"),
      },
      {
        kicker: "Carte",
        title: "Vos menus, depuis votre téléphone.",
        description: "Prix, photos, ruptures et formules : un produit épuisé disparaît de la carte d’un geste.",
        shot: ffTablet("g-carte", "L’écran Carte : les menus, leurs choix et leur mise en vente"),
      },
      {
        kicker: "Équipe",
        title: "Un planning calé sur vos midis et vos soirs.",
        description: "Rôles, pointage, et un planning de la semaine proposé d’après les commandes prévues. Vous gardez la main.",
        shot: ffTablet("g-planning", "Le planning proposé pour la semaine prochaine"),
      },
    ],
  },
  {
    id: "ventes",
    label: "Ventes",
    tile: "Plus de ventes",
    title: "Plus de ventes, même quand il y a la queue.",
    body: "Commander ne dépend plus de la file devant la caisse. Vos menus et options à chaque commande, et une fidélité qui fait revenir.",
    steps: [
      {
        kicker: "Le menu complet",
        title: "Le menu complet, sans oublier les options.",
        description:
          "Accompagnement, sauce, boisson : le client compose son menu lui-même, à son rythme, et les choix arrivent justes en cuisine. Rien à répéter, rien à mal entendre.",
        shot: ffPhone("compose", "La composition d’un menu : accompagnement et canette à choisir"),
      },
      {
        kicker: "La fidélité",
        title: "Une raison de revenir.",
        description:
          "Le client laisse son numéro une fois : ses points se cumulent tout seuls, sans carte à tamponner ni appli. Une boisson, un dessert ou un menu offert, aux paliers que vous fixez.",
        shot: ffPhone("panier", "Le panier : le menu choisi et les points de fidélité gagnés avec la commande"),
      },
      {
        kicker: "Vos fidèles",
        title: "Une clientèle que vous voyez enfin.",
        description: "Vos clients fidèles, leurs points et les résultats du programme en graphiques, dans votre espace de gestion.",
        shot: ffTablet("g-fidelite", "L’écran Fidélité : commandes avec carte et clients inscrits, en courbes"),
      },
    ],
  },
  {
    id: "donnees",
    label: "Données",
    tile: "Vos données, analysées",
    title: "Moins d’intuition, de meilleures décisions.",
    body: "Chaque commande devient une donnée : sur vos midis, vos soirs, vos équipes et votre carte. Chaque mois, on vous présente le rapport.",
    steps: [
      {
        kicker: "Analyses",
        title: "Ce qui se vend, quand, et ce que ça rapporte.",
        description: "Chiffre encaissé, passages, dépense par passage, marge estimée, et des pistes chiffrées pour vos heures creuses.",
        shot: ffTablet("g-analyses", "L’écran Analyses : chiffre encaissé, passages, marge estimée et pistes"),
      },
      {
        kicker: "Votre carte, produit par produit",
        title: "Vos vedettes, et ceux à retravailler.",
        description: "Les produits populaires à marge faible, les rentables qui se vendent peu : vous savez quoi mettre en avant, et quoi revoir.",
        shot: ffTablet("g-analytique", "L’analyse de la carte : vedettes, produits à marge faible, rentables peu vendus"),
      },
    ],
  },
];

export const storyModes: Record<StoryMode, { label: string; subtitle: string; pillars: Pillar[] }> = {
  restaurant: {
    label: "Restaurant",
    subtitle:
      "L’exemple de ces écrans, c’est le Caffè Panis, à Montpellier. Votre version reprend votre logo, vos couleurs, vos plats et vos photos.",
    pillars: restaurantPillars,
  },
  fastFood: {
    label: "Fast-food",
    subtitle:
      "Pas de service à table : un QR, un numéro du jour et un comptoir. Ces écrans viennent d’une carte de démonstration ; votre version reprend votre logo, vos couleurs, vos menus et vos photos.",
    pillars: fastFoodPillars,
  },
};

export const proofSection = {
  id: "chiffres",
  eyebrow: "Dans une vraie salle",
  title: "Ce que ça change, chiffres à l’appui.",
  field: [
    { value: "42,6 %", label: "du chiffre d’affaires payé depuis la table, le dernier week-end relevé" },
    { value: "67 %", label: "des tables commandent plus d’une fois dans la soirée" },
    { value: "29,3 %", label: "des commandes passées avec une carte de fidélité, sur sept jours" },
    { value: "241", label: "clients inscrits à la fidélité, dont 58 déjà revenus un autre soir" },
  ],
  peak: {
    eyebrow: "Heures de pointe",
    value: "×6",
    title: "Calez l’équipe sur vos vraies heures.",
    body: "À 23 h, un samedi fait six fois un mardi. Le planning peut le suivre.",
  },
  wait: {
    eyebrow: "Attente au comptoir",
    title: "Voyez où le service décroche.",
    axis: "Commandes des 15 dernières minutes",
    /** Attente médiane (secondes) selon la charge ; au-delà de 15, elle décolle. */
    bars: [
      { load: "1–3", seconds: 212 },
      { load: "4–6", seconds: 210 },
      { load: "7–10", seconds: 216 },
      { load: "11–15", seconds: 260 },
      { load: "16–25", seconds: 432, over: true },
      { load: "26+", seconds: 679, over: true },
    ],
    body: "Au-delà de 15 commandes en 15 minutes, l’attente décolle. Vous savez quand ajouter un renfort.",
  },
  hour: {
    eyebrow: "Une heure travaillée",
    title: "Sachez ce que rapporte chaque heure.",
    caption: "Chiffre d’affaires par heure de présence, 16 soirs pointés",
    rows: [
      { label: "Mercredi, jeudi", euros: 45 },
      { label: "Samedi", euros: 183 },
    ],
    body: "Avant 20 h, environ 4,5 heures de présence par soir ne faisaient que 2,4 % des ventes.",
  },
  studiesTitle: "Ce que disent les études",
  studies: [
    {
      value: "+11 %",
      body: "de ventes par minute de table, et des repas 10 % plus courts, à effectif égal, avec la commande et le paiement à table.",
      source: "Tan & Netessine, Management Science, 2020. 66 restaurants aux États-Unis.",
    },
    {
      value: "+15 %",
      body: "de chiffre d’affaires possible sans attente, d’après 12 mois d’observation de 94 404 clients d’un restaurant.",
      source: "De Vries, Roy & De Koster, Journal of Operations Management, 2018.",
    },
    {
      value: "5 à 25 ×",
      body: "Gagner un client coûte 5 à 25 fois plus cher qu’en garder un, tous secteurs confondus. C’est tout l’intérêt de la fidélité.",
      source: "Harvard Business Review, 2014, d’après Reichheld (Bain & Company).",
    },
  ],
  disclaimer: "Un seul établissement : ces chiffres ne garantissent pas les vôtres.",
};

export const accompanySection = {
  id: "accompagnement",
  eyebrow: "L’accompagnement",
  title: "Avec vous, du premier service à chaque fin de mois.",
  subtitle:
    "Un logiciel seul ne change pas un service. Une équipe qui connaît votre salle, si. Du jour où vous nous envoyez votre carte au rapport de chaque mois, vous avez quelqu’un chez nous, en direct.",
  photo: {
    src: "/menu-landing/cartes.webp",
    alt: "Les cartes de table du Caffè Panis, vertes à son logo, posées à côté d’un téléphone qui affiche sa carte",
    caption: "Les cartes de table du Caffè Panis, dessinées à ses couleurs.",
  },
  phases: [
    {
      label: "Le démarrage",
      steps: [
        { title: "Vous nous envoyez une photo de votre carte.", body: "C’est votre seul travail." },
        {
          title: "On monte votre carte, à vos couleurs.",
          body: "Votre logo, vos plats, vos photos, vos allergènes. Les recommandations sont écrites à partir de votre carte, puis relues avec vous.",
        },
        {
          title: "On dessine et on livre vos cartes de table.",
          body: `Une par table, chacune liée à son numéro, prêtes à poser : ${tablePrice} par table + ${shippingPrice} de livraison, une fois.`,
        },
        { title: "On est là au premier service.", body: "Sur place, on forme votre équipe : le gérant, la salle et la cuisine." },
      ],
    },
    {
      label: "Ensuite, tout le temps",
      steps: [
        {
          title: "Chaque mois, on vous présente le rapport.",
          body: "Ce qui s’est vendu, quand, ce qu’a rapporté chaque heure travaillée, et ce qu’on en tire ensemble.",
        },
        {
          title: "Pour changer quelque chose, un message suffit.",
          body: "Un lien direct avec un membre de l’équipe, pas un standard ni un ticket dans une file.",
        },
      ],
    },
  ],
};

const tills = integrationPartners.filter((partner) => partner.kind === "caisse" && partner.name !== "Square");

export const connectSection = {
  id: "branchement",
  /** La commande des deux scènes : la table 6 du hero, payée sur le téléphone, imprimée en cuisine, réglée en caisse. */
  order: {
    table: "Table 6",
    time: "20:42",
    origin: "Ominin",
    lines: [
      { quantity: 1, name: "Pasta Al Tartufo" },
      { quantity: 1, name: "Fuzetea Pêche" },
    ],
    total: 21.8,
    paid: "Payée · Carte",
    queue: ["Table 3", "Table 11"],
    sheet: "Règlement",
    pay: "Payer",
    done: "Payée",
    list: "Commandes",
  },
  eyebrow: "Paiement et caisse",
  title: "Stripe encaisse. HubRise vous relie à votre caisse.",
  subtitle: "Rien à installer de votre côté : on fait les branchements avec vous.",
  stripe: {
    logo: { src: "/partners/stripe.svg", bleed: true },
    pair: "Ominin × Stripe",
    title: "Le paiement, par Stripe.",
    body: "Carte bancaire, Apple Pay ou Google Pay, sans quitter la carte. L’argent arrive sur votre compte Stripe, et le ticket part en cuisine dès le paiement.",
    fees: {
      title: "Sur une commande payée en ligne",
      lines: [
        { label: "Ominin", value: percent, ours: true },
        networkLine,
        { label: "Stripe, par paiement", value: stripeShare, ours: false },
      ],
      example: `Sur ${formatPrice(exampleBasket)} : ${formatPrice(exampleOminin)} pour Ominin, environ ${formatPrice(exampleCard)} pour la carte.`,
    },
    points: ["0 % sur le comptoir et les espèces", "0 % sur les pourboires : tout va à l’équipe"],
  },
  hubrise: {
    logo: { src: "/partners/hubrise.png", bleed: false },
    pair: "Ominin × HubRise",
    title: "Votre caisse, par HubRise.",
    body: `HubRise relie Ominin à plus de ${compatibleTills} caisses. La commande payée à table arrive dans votre caisse, ligne par ligne et déjà réglée : plus de double saisie ni de rapprochement à la clôture.`,
    tills,
    points: ["Connexion incluse, faite avec vous", "Et sur vos imprimantes tickets, si besoin"],
    /** Le défilé des caisses dans la scène : même cadence et mêmes commandes que l’ancienne section Installation. */
    cycle: {
      lead: "Votre caisse :",
      names: tills.map((till) => till.name),
      icons: tills.map((till) => till.icon),
      spoken: `La commande payée à table arrive dans votre caisse : ${new Intl.ListFormat("fr", { type: "disjunction" }).format(tills.map((till) => till.name))}.`,
      intervalMs: installSection.integrations.intervalMs,
      controls: {
        pause: "Mettre en pause le défilé des caisses",
        play: "Reprendre le défilé des caisses",
      },
    },
  },
  terminal: {
    badge: "Nouveau",
    highlight: {
      value: formatPercent(terminalFees.launchPercent),
      label: `de frais Ominin sur chaque paiement au terminal, au lancement. Ensuite ${formatPercent(terminalFees.laterPercent)}.`,
    },
    pair: "Ominin × Stripe Terminal",
    title: "Au comptoir aussi : le terminal.",
    body: "Vos clients paient au comptoir, ou à table avec leur carte, sur un terminal Stripe relié à Ominin. Chaque paiement arrive au même endroit que vos commandes du QR, sur le même compte Stripe.",
    fees: {
      title: "Sur un paiement au terminal",
      lines: [
        { label: "Ominin", value: formatPercent(terminalFees.launchPercent), note: `offert au lancement, puis ${formatPercent(terminalFees.laterPercent)}`, ours: true },
        networkLine,
        { label: "Stripe, par paiement", value: `${formatPercent(terminalFees.stripePercent)} + ${formatFee(terminalFees.stripeFixed)}`, ours: false },
      ],
      total: {
        label: "Total par paiement",
        value: `environ ${formatPercent(cardFees.networkPercent + terminalFees.stripePercent)} + ${formatFee(terminalFees.stripeFixed)}`,
      },
      example: `Sur ${formatPrice(exampleBasket)} : rien pour Ominin au lancement, environ ${formatPrice(exampleTerminal)} de frais de carte.`,
      device: {
        title: "Le lecteur",
        lines: [
          { label: "Achat unique", value: "au prix Stripe, sans marge" },
          { label: "Abonnement Stripe", value: `${terminalFees.readerMonthly} € par lecteur et par mois` },
        ],
      },
    },
    data: {
      title: "Toutes vos ventes par carte, enfin au même endroit.",
      body: "Sans terminal, Ominin ne voit que les commandes du QR. Avec le terminal, il voit aussi le comptoir : vos analyses, votre planning et les estimations de l’IA reposent sur votre vrai chiffre.",
      contrast: [
        { label: "Sans terminal", sources: ["QR"] },
        { label: "Avec le terminal", sources: ["QR", "Comptoir"] },
      ],
      points: [
        "Vos vraies heures de pointe, comptoir compris : un planning plus juste.",
        "Le rythme réel de la cuisine : des heures de retrait plus justes.",
        "Le panier moyen et les cartes utilisées, du midi au soir.",
      ],
    },
    sceneCaption: "Animation : une carte se pose sur le terminal, le paiement est approuvé et rejoint le flux des paiements d’Ominin, à côté des commandes du QR.",
    scene: {
      prompt: "Présentez votre carte",
      approved: "Approuvé",
      feed: "Paiements",
      rows: [
        { source: "Comptoir", label: "Terminal", ref: "Table 6", amount: 21.8, fresh: true },
        { source: "QR", label: "En ligne", ref: "N° 41", amount: 12.4, fresh: false },
        { source: "QR", label: "En ligne", ref: "Table 3", amount: 34, fresh: false },
      ],
      waiting: "En attente",
      chart: "Aujourd’hui",
      /** Hauteurs décoratives du mini-graphique (% de la plus haute) ; la dernière barre monte avec le paiement. */
      bars: [42, 58, 36, 74, 64],
    },
  },
};

export const compareSection = {
  id: "tarifs",
  eyebrow: "Tarifs et comparatif",
  title: "0 € par mois. Vous payez quand ça marche.",
  subtitle: "Sans vente en ligne, vous ne nous devez rien. Chez Sunday, l’offre complète coûte 199 € par mois, avant sa commission.",
  totals: [
    { label: "Vos frais fixes par an avec Ominin", value: "0 €", ours: true },
    { label: "L’abonnement Sunday Premium par an, commission en plus", value: "2 388 €", ours: false },
  ],
  columns: { label: "", ours: "Ominin", theirs: "Sunday" },
  /** `ours` : [ce qui se lit en premier, la suite]. */
  rows: [
    { label: "Abonnement", ours: ["0 €", " par mois"], theirs: "29, 99 ou 199 € par mois" },
    {
      label: "Commission",
      ours: [commission, ", sur les commandes payées en ligne"],
      theirs: "Fixée au contrat, non publiée, due même sur les remboursements",
    },
    { label: "Pourboires de l’équipe", ours: ["0 %", " de commission"], theirs: "10 % de commission sur les pourboires des serveurs" },
    { label: "Frais pour vos clients", ours: ["0 €", ", jamais"], theirs: "Frais de service de 2 %" },
    { label: "Commande à table", ours: ["Incluse", ""], theirs: "À partir de l’offre à 99 € par mois, ou option à 49 € par mois" },
    { label: "Carte digitale", ours: ["Incluse", ", montée par nous à vos couleurs"], theirs: "Option à 25–29 € par mois (Menu IA), hors offre Premium" },
    { label: "Fidélité", ours: ["Incluse", ", avec la roue du jour"], theirs: "Offre Premium, ou option à 49 € par mois" },
    { label: "Recommandations", ours: ["Incluses", ", le combo parfait dans le panier"], theirs: "Pas de ligne dans sa grille tarifaire" },
    { label: "Installation et QR", ours: ["Comprise", `, ${tablePrice} la table`], theirs: "49 € à Paris, 299 € ailleurs, 3 € le QR" },
    { label: "Vos chiffres", ours: ["Un rapport présenté chaque mois", ", et ce qu’on en tire"], theirs: "Tableau de bord inclus" },
    { label: "Pour changer quelque chose", ours: ["Un lien direct", " avec un membre de l’équipe"], theirs: "Support général 24/7, en « meilleurs efforts »" },
  ] satisfies { label: string; ours: [string, string]; theirs: string }[],
  bill: [
    { value: "0 €", label: "par mois, sans engagement" },
    { value: commission, label: "sur les commandes payées en ligne, rien sur le comptoir" },
    { value: tablePrice, label: `par carte de table, + ${shippingPrice} de livraison, une fois` },
  ],
  cta: composerCta,
  sources:
    "Sunday : sundayapp.com/fr/tarifs (relevé le 31/10/2026) ; conditions de service marchands et serveurs (12/10/2026) ; frais de service : Entrepreneur Hero (05/05/2024). Ominin : frais de carte Stripe en sus.",
};

export const demoBand = {
  title: "Pour nous, la plus belle carte de France.",
  body: "Ne nous croyez pas sur parole. Scannez, et comparez avec ce que vous avez aujourd’hui.",
  path: demoPath,
  label: "Ouvrir la démo",
  qrAlt: "QR code de la carte de démonstration du Caffè Panis",
  qrCaption: "Scannez : la carte de démonstration s’ouvre.",
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Questions fréquentes.",
  items: [
    {
      question: "Mes clients doivent-ils installer une application ?",
      answer:
        "Non, ni appli ni compte. Le client scanne le QR de sa table et la carte s’ouvre dans le navigateur de son téléphone, sur iPhone comme sur Android.",
    },
    {
      question: "Et pour un fast-food, sans service à table ?",
      answer:
        "C’est le mode fast-food : un QR à l’entrée, sur le comptoir ou sur les tables. Le client commande et paie sur son téléphone, reçoit son numéro du jour et l’heure de retrait estimée par l’IA, puis son téléphone le prévient quand c’est prêt. Il s’active d’un réglage dans votre espace de gestion.",
    },
    {
      question: "Combien ça coûte ?",
      answer: `0 € par mois. Nous prenons ${percent} sur les commandes payées en ligne, auxquels s’ajoutent les frais de carte : environ ${formatPercent(cardFees.networkPercent)} pour le réseau de la carte et ${stripeShare} pour Stripe. Rien sur le comptoir, les espèces ni les pourboires. Au démarrage, vous réglez seulement vos cartes de table : ${tablePrice} par table et ${shippingPrice} de livraison, une fois.`,
    },
    {
      question: "Qui encaisse l’argent ?",
      answer:
        "Stripe. Le paiement se fait dans la carte, par carte bancaire, Apple Pay ou Google Pay, et l’argent arrive sur votre compte Stripe, puis sur votre compte bancaire.",
    },
    {
      question: "Est-ce compatible avec ma caisse ?",
      answer: `Ominin se connecte à plus de ${compatibleTills} caisses grâce à HubRise, dont Zelty, Lightspeed, Popina, Clyo Systems et Kezia II. La commande payée à table y arrive déjà réglée. Votre caisse n’est pas dans la liste ? Dites-nous laquelle : les commandes peuvent aussi sortir sur vos imprimantes tickets.`,
    },
    {
      question: "Qu’est-ce que je dois faire pour démarrer ?",
      answer:
        "Nous envoyer une photo de votre carte. On monte votre carte et vos cartes de table à vos couleurs, on vous les livre, et on est là au premier service pour former votre équipe.",
    },
    {
      question: "Puis-je modifier ma carte moi-même ?",
      answer:
        "Oui, à tout moment, depuis votre téléphone : un prix, une photo, un plat épuisé, une happy hour. Le changement apparaît sur toutes les tables à la minute.",
    },
    {
      question: "Et après l’installation, qui m’aide ?",
      answer:
        "Un membre de l’équipe, en direct. Chaque mois, on vous présente le rapport de votre établissement et ce qu’on en tire, et pour changer quelque chose, un message suffit.",
    },
    {
      question: "Y a-t-il un engagement ?",
      answer: "Aucun. Sans vente en ligne, vous ne nous devez rien, et vous arrêtez quand vous voulez.",
    },
  ] satisfies FaqItem[],
};

export const finalCta = {
  id: "contact",
  eyebrow: "Et maintenant",
  title: "On commence quand vous voulez.",
  subtitle: "Envoyez-nous une photo de votre carte : c’est votre seul travail. Le reste, on le fait avec vous, jusqu’au premier service.",
  primary: composerCta,
  secondary: { label: "Nous écrire", href: `mailto:${contactEmail}` } satisfies Cta,
  bill: {
    title: "L’addition",
    rows: [
      { label: "Abonnement", value: "0\u00a0€ par mois" },
      { label: "Commandes payées en ligne", value: commission, ours: true },
      { label: "Comptoir, espèces, pourboires", value: "0\u00a0%" },
      { label: "Cartes de table", value: `${tablePrice} l’unité, une fois` },
      { label: "Engagement", value: "Aucun" },
    ],
    note: `+ ${shippingPrice} de livraison des cartes de table.`,
  },
  contact: { label: "Une question ?", email: contactEmail },
};

export const footer = {
  tagline: "Ominin Menu : la carte, la commande et le paiement à table, la fidélité et vos chiffres, pour les restaurants.",
};
