import { DEMO_SLUG, formatPrice } from "@/lib/menu/format";
import { unsplash } from "@/lib/menu/images";

export interface Cta {
  label: string;
  href: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface Feature {
  stat: string;
  title: string;
  description: string;
}

export interface PlanCommission {
  percent: number;
  /** Assiette, à lire après le taux : « 1 % des commandes payées… ». */
  basis: string;
}

/**
 * Mois offerts à l'ouverture d'une offre. À leur terme, le chiffre d'affaires
 * passé par Ominin sur la période tranche une fois pour toutes : au-dessus du
 * seuil, la commission a payé le service et l'abonnement reste à 0 € ; en
 * dessous, le prix mensuel de l'offre commence à courir.
 */
export interface PlanTrial {
  months: number;
  /** CA via Ominin sur les mois offerts qui dispense de l'abonnement. */
  exemptionRevenue: number;
}

export interface Plan {
  id: string;
  name: string;
  /** Prix mensuel — sur une offre à mois offerts, dû seulement à leur terme. */
  price: number;
  /** Offre à commission : Ominin se rémunère aussi sur les paiements en ligne. */
  commission?: PlanCommission;
  trial?: PlanTrial;
  tagline: string;
  featuresLabel: string;
  features: string[];
  badge?: string;
}

export interface BillLine {
  label: string;
  value: string;
}

export interface InstallPath {
  id: "omilink" | "caisse";
  label: string;
  title: string;
  lead: string;
  points: QrShowcasePoint[];
  /** La ligne de l'addition propre à ce chemin ; les autres sont communes. */
  cost: BillLine;
  /** Un lien sous les points, pour qui ne s'y retrouve pas. */
  cta?: { label: string; action: string; href: string };
}

export interface QrShowcasePoint {
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const brand = "Ominin";

/** Plancher du nombre de caisses compatibles : le texte dit « plus de ». */
export const compatibleTills = 40;

export const contactEmail = "omininsupport@gmail.com";

export const demoCta: Cta = {
  label: "Voir un exemple maintenant",
  href: `/m/${DEMO_SLUG}`,
};

/** Toutes les invitations à agir de la page mènent au composeur Connect. */
export const composerCta: Cta = {
  label: "Composer mon offre",
  href: "/composer",
};

/** Montants à quatre chiffres : sans l'espace des milliers, on les lit mal. */
// Insécable : le montant ne se sépare jamais de son symbole.
const formatEuros = (amount: number) => `${amount.toLocaleString("fr-FR")}\u00a0€`;

export const connectCommission: PlanCommission = {
  percent: 3,
  basis: "des commandes payées en ligne par carte",
};

/** Connect est sans abonnement : Ominin se rémunère sur la seule commission. */
const connectPrice = 0;

export const featuresSection = {
  id: "fonctionnalites",
  eyebrow: "Fonctionnalités",
  title: "Pensé pour le coup de feu.",
  features: [
    {
      stat: "18\u00a0s",
      title: "Payée en ligne, en cuisine",
      description:
        "Mesuré en service chez un client : 18 secondes en médiane entre la commande payée en ligne et le ticket en cuisine. Au comptoir, 4 min 39 — plus de 10 min les soirs d'affluence, et une commande sur dix y attend plus d'un quart d'heure.",
      wide: true,
    },
    {
      stat: "Direct",
      title: "Votre carte à jour",
      description: "Un prix, un plat épuisé, le spécial du jour : depuis votre téléphone, sur toutes les tables.",
    },
    {
      stat: "3 vues",
      title: "Toute l'équipe connectée",
      description: "Serveur, cuisine, gérant : chacun voit ce dont il a besoin, rien de plus.",
    },
    {
      stat: "Cachet",
      title: "Un QR par table, à votre logo",
      description: "Conçus, imprimés et livrés prêts à coller. Abîmé ? Remplacé sous 48 h.",
    },
    {
      stat: "Caisse",
      title: "Votre caisse et/ou vos imprimantes",
      description: `La commande arrive dans votre caisse (Square, Zelty, Lightspeed… plus de ${compatibleTills} compatibles), et/ou sort sur vos imprimantes tickets avec le boîtier Omilink.`,
    },
  ],
};

/*
 * Commande de démarrage, commune aux offres : paiements uniques réglés une
 * fois, à la première activation. Comme pricingSection, ces montants sont la
 * source de vérité des prix Stripe (scripts/setup-stripe.ts, retrouvés par
 * lookup_key = id). Un Cachet imprimé par table et la livraison, toujours ;
 * le boîtier Omilink en option, sur les offres avec commande à table.
 */
export const starterKit = {
  cachet: {
    id: "cachet_card",
    name: "Cachet imprimé",
    price: 1.5,
    tagline: "Carte QR de table, imprimée à votre logo.",
  },
  omilink: {
    id: "omilink_box",
    name: "Boîtier Omilink",
    price: 89,
    tagline: "Relie Ominin à vos imprimantes tickets.",
  },
  shipping: {
    id: "starter_shipping",
    name: "Livraison",
    price: 20,
    tagline: "Expédition de la commande de démarrage au restaurant.",
  },
  /*
   * Proposés par le composeur Connect (/composer), facturés avec la commande
   * de démarrage. Imprimante et câble : prix Amazon arrondis à l'euro
   * supérieur (relevé du 2026-10-11). Prix null : « sur devis », la ligne
   * n'est pas facturée.
   */
  printer: {
    id: "network_printer",
    name: "Imprimante tickets réseau",
    price: 80,
    tagline: "80 mm, découpe automatique, 250 mm/s, en Wi-Fi ou en USB.",
    model: "Geon ZAZOO80BW",
    href: "https://www.amazon.fr/dp/B0FQW6DF8F",
  },
  ethernetCable: {
    id: "ethernet_cable",
    name: "Câble Ethernet",
    price: 5,
    tagline: "Relie le boîtier Omilink à votre box internet.",
    model: "Amazon Basics Cat-6, 3 m",
    href: "https://www.amazon.fr/dp/B089MGNQXF",
  },
  poster: {
    id: "poster_a3",
    name: "Affiche A3",
    price: 10,
    tagline: "Au comptoir, au mur ou en file d'attente.",
  },
  sticker: {
    id: "window_sticker",
    name: "Vitrophanie",
    price: null,
    tagline: "Sur la vitrine : on commande avant même d'entrer.",
  },
  /** Pays livrés (codes ISO, adresse saisie dans Stripe Checkout). */
  shippingCountries: ["FR"],
} as const;

const omilinkPrice = starterKit.omilink.price;

export const pricingSection = {
  id: "tarifs",
  eyebrow: "Tarifs",
  title: "Un prix simple. Aucun engagement.",
  subtitle: `Connect est sans abonnement, Ominin se rémunère à ${connectCommission.percent}\u00a0% sur les commandes payées en ligne.`,
  perMonth: "/mois",
  ctaLabel: "Choisir",
  installLabel: "Se branche sur votre salle",
  installLink: "Voir comment ça se branche",
  cardFeesNote: "Frais de carte de votre prestataire (Stripe ou Square) en sus.",
  plans: [
    {
      id: "connect",
      name: "Connect",
      price: connectPrice,
      commission: connectCommission,
      tagline: "Vos clients scannent, commandent et payent.",
      featuresLabel: "Inclus :",
      features: [
        "Menu digital par QR code",
        `Vos Cachets à votre logo — ${formatPrice(starterKit.cachet.price)} par table + ${formatPrice(starterKit.shipping.price)} de livraison, une fois`,
        "Mise à jour en temps réel",
        "Espace de gestion",
        "Commande à table",
        "Paiement à table par carte bancaire",
        "Gestion des tables",
        "Suivi des commandes en direct",
        "Vues serveur, cuisine et manager",
        "Connexion à votre caisse, et le boîtier Omilink si elle n'imprime pas en cuisine",
      ],
      badge: "Le plus choisi",
    },
  ] satisfies Plan[],
  guarantees: [
    `Cachets à votre logo\u00a0: ${formatPrice(starterKit.cachet.price)} par table + ${formatPrice(starterKit.shipping.price)} de livraison, une fois`,
    "Aucune installation technique",
    "Votre menu conçu par notre équipe",
    "Résiliable à tout moment",
  ],
};

/**
 * Mois offerts d'une offre, s'il y en a : elle s'ouvre alors sur sa commande
 * de démarrage (starterKit), sans abonnement Stripe, et n'en souscrit un
 * qu'au terme des mois offerts — si le CA ne l'en a pas dispensée.
 */
export const planTrial = (
  planId: string | null | undefined
): PlanTrial | undefined =>
  (pricingSection.plans as Plan[]).find((plan) => plan.id === planId)?.trial;

/** Ce qu'affiche une offre à mois offerts : le prix d'essai, puis sa suite. */
export function trialPricing(plan: Plan) {
  if (!plan.trial) return null;
  const { months } = plan.trial;
  const monthly = `${formatPrice(plan.price)}${pricingSection.perMonth}`;
  return {
    price: formatPrice(0),
    unit: `${pricingSection.perMonth} pendant ${months} mois`,
    /** La suite de l'offre, à lire aussi gros que le reste. */
    then: `puis ${monthly}`,
    /** La règle, le seuil chiffré en moins. */
    note: `Ou 0 €, définitivement, si ces ${months} premiers mois dépassent ${formatEuros(plan.trial.exemptionRevenue)} de commandes passées par Ominin (environ ${formatEuros(Math.round(plan.trial.exemptionRevenue / months / 1000) * 1000)} par mois).`,
  };
}

interface IntegrationPartner {
  name: string;
  /** Une caisse reçoit la commande ; un prestataire de paiement, l'encaissement. */
  kind: "caisse" | "paiement";
  /**
   * Icône officielle de la marque (public/partners), dans ses couleurs.
   * bleed : l'icône est déjà une tuile pleine, sans marge autour.
   */
  icon: { src: string; bleed?: boolean };
}

/** L'écran de la caisse illustrée ; sans statut propre, celui de la commande. */
interface TillScreen {
  list: string;
  status?: string;
}

/** Une caisse qu'Ominin ne nomme pas : la demande arrive au support. */
const tillContactHref = `mailto:${contactEmail}?subject=${encodeURIComponent("Intégration de ma caisse")}`;

/*
 * Les partenaires que le panneau caisse fait défiler (« Ominin × … »), un
 * toutes les installSection.integrations.intervalMs.
 */
export const integrationPartners: IntegrationPartner[] = [
  { name: "Square", kind: "caisse", icon: { src: "/partners/square.svg" } },
  { name: "Stripe", kind: "paiement", icon: { src: "/partners/stripe.svg", bleed: true } },
  { name: "Zelty", kind: "caisse", icon: { src: "/partners/zelty.png" } },
  { name: "Lightspeed", kind: "caisse", icon: { src: "/partners/lightspeed.svg" } },
  { name: "Popina", kind: "caisse", icon: { src: "/partners/popina.png", bleed: true } },
  { name: "Clyo Systems", kind: "caisse", icon: { src: "/partners/clyo.jpg", bleed: true } },
  // Pas d'icône Kezia publiée : celle de JDC, son éditeur.
  { name: "Kezia II", kind: "caisse", icon: { src: "/partners/kezia.svg" } },
  { name: "Tick'Eat", kind: "caisse", icon: { src: "/partners/tickeat.svg" } },
  { name: "CarréPOS", kind: "caisse", icon: { src: "/partners/carrepos.svg" } },
  { name: "Toporder", kind: "caisse", icon: { src: "/partners/toporder.svg" } },
];

/*
 * Caisses que le composeur propose sous « Une autre », en plus des
 * partenaires affichés en logos. compatible : caisse de l'annuaire HubRise
 * (catégorie « Logiciels de caisse », vendue en France, qui reçoit les
 * commandes — relevé du 2026-10-10) ; check : hors HubRise, à vérifier avec
 * le restaurant avant l'installation.
 */
export interface TillOption {
  name: string;
  support: "compatible" | "check";
}

export const otherTills: TillOption[] = [
  { name: "Adixon Caisse", support: "compatible" },
  { name: "Drive Eat", support: "compatible" },
  { name: "French Caisse", support: "compatible" },
  { name: "Jalia par JDC", support: "compatible" },
  { name: "LEO2 / Atoo", support: "compatible" },
  { name: "Lightspeed Restaurant (K-Series)", support: "compatible" },
  { name: "Mealenium", support: "compatible" },
  { name: "MiiPos", support: "compatible" },
  { name: "Nestor", support: "compatible" },
  { name: "OneTouch by JSONE", support: "compatible" },
  { name: "OrderLord POS", support: "compatible" },
  { name: "POS HELPER", support: "compatible" },
  { name: "Restaurant Manager", support: "compatible" },
  { name: "Restomax", support: "compatible" },
  { name: "restoPOS", support: "compatible" },
  { name: "Synapsy", support: "compatible" },
  { name: "T.A.L.C Informatique", support: "compatible" },
  { name: "UltimaPOS", support: "compatible" },
  { name: "Aloha (NCR)", support: "check" },
  { name: "Cashpad", support: "check" },
  { name: "Hiboutik", support: "check" },
  { name: "Innovorder", support: "check" },
  { name: "Loyverse", support: "check" },
  { name: "Merim", support: "check" },
  { name: "Odoo", support: "check" },
  { name: "Oracle Simphony", support: "check" },
  { name: "Revo XEF", support: "check" },
  { name: "SumUp POS (ex-Tiller)", support: "check" },
  { name: "Tactill", support: "check" },
  { name: "Zettle", support: "check" },
];

const tillScreens: Record<IntegrationPartner["kind"], TillScreen> = {
  caisse: { list: "Commandes" },
  paiement: { list: "Paiements", status: "Réussi" },
};

/*
 * Installation de l'offre Connect : deux branchements indépendants, pas une
 * alternative. Côté caisse, Ominin se connecte à plus de compatibleTills
 * caisses et encaisse par Stripe ou Square ; la connexion est incluse, sans
 * abonnement de plus. Côté imprimantes, le boîtier Omilink est une option à
 * l'achat pour qui a des imprimantes tickets. Le plan de base Square ne coûte
 * rien : ses options et son terminal, si le restaurant en veut, se règlent
 * chez Square.
 */
export const installSection = {
  id: "installation",
  eyebrow: "Installation",
  title: "Ominin se branche sur votre salle.",
  subtitle:
    `Côté caisse, Ominin se connecte à plus de ${compatibleTills} caisses\u00a0: Square, Zelty, Lightspeed, Popina… Côté cuisine, si votre caisse ne peut pas imprimer sur vos imprimantes tickets, le boîtier Omilink s'y branche directement. Aucun abonnement de plus\u00a0: la connexion à votre caisse est incluse, le boîtier s'achète une\u00a0fois, si besoin.`,
  sourceLabel: "Commande payée à table",
  integrations: {
    intervalMs: 2600,
    partners: integrationPartners,
    names: integrationPartners.map((partner) => partner.name),
    icons: integrationPartners.map((partner) => partner.icon),
    controls: {
      pause: "Mettre en pause le défilé des partenaires",
      play: "Reprendre le défilé des partenaires",
    },
    spoken: `${brand} se connecte à ${new Intl.ListFormat("fr", { type: "conjunction" }).format(integrationPartners.map((partner) => partner.name))}.`,
    screens: tillScreens,
  },
  joiner: "et/ou",
  billLabel: "L'addition",
  // Lignes communes aux deux additions, autour de la ligne propre au chemin.
  bill: {
    subscription: {
      label: "Abonnement Ominin",
      value: `${formatEuros(connectPrice)}/mois`,
    },
    commission: {
      label: "Commission",
      value: `${connectCommission.percent}\u00a0% en ligne`,
    },
  } satisfies Record<string, BillLine>,
  // Commande d'illustration, la même sur le ticket imprimé et l'écran de caisse.
  order: {
    table: "Table\u00a07",
    time: "20:42",
    origin: "Ominin",
    lines: [
      { quantity: 2, name: "Tagliatelle al ragù" },
      { quantity: 1, name: "Burrata, tomates anciennes" },
      { quantity: 2, name: "Tiramisu" },
    ],
    total: 61,
    paidLabel: "Payée · Carte",
    queue: ["Table 3", "Table 11"],
  },
  paths: [
    {
      id: "caisse",
      label: "La connexion caisse",
      title: "Vos commandes, dans votre caisse.",
      lead: "La commande payée à table arrive directement dans votre caisse, détaillée ligne par ligne et déjà réglée — et imprimée par votre caisse si elle a son imprimante. L'argent, lui, arrive sur votre compte Stripe ou Square.",
      points: [
        {
          title: `Plus de ${compatibleTills} caisses compatibles`,
          description:
            "Square, Zelty, Lightspeed, Popina, Clyo Systems, Kezia II, Tick'Eat, CarréPOS, Toporder…",
        },
        {
          title: "Une seule caisse",
          description:
            "Plus de double saisie ni de rapprochement à la clôture\u00a0: chaque commande Ominin y est déjà, marquée payée.",
        },
        {
          title: "Connexion incluse",
          description:
            "Nous relions votre caisse à Ominin avec vous\u00a0: ni abonnement de plus, ni matériel à installer.",
        },
        {
          title: "Pas encore de caisse\u00a0?",
          description:
            "Le plan de base Square est gratuit\u00a0: votre téléphone encaisse en sans-contact, et leur terminal reste une option, achetée chez eux.",
        },
      ],
      cost: { label: "Connexion à votre caisse", value: "Incluse" },
      cta: {
        label: "Votre caisse n'est pas dans la liste\u00a0?",
        action: "Dites-nous laquelle",
        href: tillContactHref,
      },
    },
    {
      id: "omilink",
      label: "Le boîtier Omilink",
      title: "Des imprimantes\u00a0? On s'y branche.",
      lead: "Votre caisse ne sait pas imprimer sur vos imprimantes tickets\u00a0? Le boîtier Omilink s'y connecte directement\u00a0: chaque commande sort en cuisine comme au bar. C'est son seul rôle — il ne sert que si besoin.",

      points: [
        {
          title: "Compatible avec votre matériel",
          description:
            "Il parle aux imprimantes tickets réseau (ESC/POS) — celles que vous avez déjà.",
        },
        {
          title: "Livré chez vous",
          description: `${formatPrice(omilinkPrice)}, une seule fois. Le boîtier est expédié directement à votre restaurant.`,
        },
        {
          title: "Cuisine, bar, comptoir",
          description:
            "Un seul boîtier pour toutes vos imprimantes\u00a0: chaque poste ne reçoit que ce qui le concerne.",
        },
        {
          title: "Deux câbles, c'est branché",
          description:
            "L'alimentation et le réseau\u00a0: il se connecte automatiquement, puis un clic dans votre espace de gestion.",
        },
      ],
      cost: {
        label: "Boîtier Omilink",
        value: `${formatPrice(omilinkPrice)}, une\u00a0fois`,
      },
    },
  ] satisfies InstallPath[],
  facts: [
    "Espèces et paiements au comptoir\u00a0: 0\u00a0% de commission",
    "Pas d'imprimante\u00a0? Les commandes s'affichent en direct sur tablette",
    "Résiliable à tout moment",
  ],
  footnote:
    "La commission Ominin s'ajoute aux frais de transaction de votre prestataire de paiement (Stripe ou Square). Le terminal Square et ses options, si vous en voulez, se règlent auprès de Square.",
};

/*
 * Page /devis et écran d'activation : le restaurateur compose sa commande de
 * démarrage (offre, tables, branchements) et voit son addition se mettre à
 * jour. Les montants viennent de pricingSection et starterKit.
 */
export const quotePage = {
  seoTitle: "Votre devis — Ominin",
  eyebrow: "Votre devis",
  title: "Composez votre démarrage.",
  subtitle:
    "Choisissez votre offre, indiquez vos tables : l'addition se met à jour sous vos yeux. Vous ne réglez qu'après avoir créé votre compte.",
  gateEyebrow: "Dernière étape",
  gateTitle: "Votre commande de démarrage",
  gateSubtitle:
    "Votre établissement est prêt. Réglez vos Cachets et leur livraison : votre espace s'ouvre aussitôt.",
  plan: { title: "Votre offre" },
  tables: {
    title: "Vos tables",
    unit: { one: "table", many: "tables" },
    hint: `Un Cachet imprimé par table, à votre logo — ${formatPrice(starterKit.cachet.price)} l'unité.`,
    inputLabel: "Nombre de tables",
    decrease: "Une table de moins",
    increase: "Une table de plus",
    sticker: "Le Cachet",
  },
  options: {
    title: "Vos branchements",
    subtitle: "Optionnels, selon ce que vous avez déjà en salle.",
    omilink: {
      title: starterKit.omilink.name,
      description:
        "Relie Ominin à vos imprimantes tickets. Livré chez vous : deux câbles, et c'est branché.",
    },
    square: {
      title: "Intégration Square",
      description:
        "Vos commandes payées arrivent directement dans votre caisse Square.",
      note: "Leur plan de base est gratuit ; seul le terminal, si vous en voulez un, s'achète chez eux.",
      price: "Inclus",
    },
    otherTill: {
      label: "Une autre caisse que Square\u00a0? Nous la connectons avec vous, sans frais",
      href: tillContactHref,
    },
  },
  bill: {
    label: "L'addition",
    today: "À régler aujourd'hui",
    then: "Ensuite",
    noCommitment: "sans engagement",
    squareLabel: "Abonnement Square",
    squareCost: "0\u00a0€/mois",
    squareNote: "réglé auprès de Square",
    empty: "Indiquez votre nombre de tables.",
  },
  /** Activation d'après les mois offerts : Cachets déjà réglés, reste l'abonnement. */
  trialEnded: {
    eyebrow: "Mois offerts terminés",
    lead: "Vos mois offerts sont écoulés, et les commandes passées par Ominin n'ont pas atteint le seuil prévu sur la période : l'abonnement commence maintenant, résiliable à tout moment.",
  },
  submit: { quote: "Continuer", gate: "Régler et ouvrir mon espace" },
  staffOnly: "Seul le gérant peut régler la commande de démarrage.",
  microcopy: [
    "Paiement sécurisé par Stripe",
    "Adresse de livraison demandée au paiement",
  ],
  /** Nombre de tables proposé à l'ouverture du devis. */
  defaultTables: 12,
};

/*
 * Composeur Connect (/composer) : quelques questions sur la salle, et l'offre
 * se compose à côté, chaque recommandation justifiée. La logique vit dans
 * lib/composer.ts ; ici, seulement les mots.
 */
export const composerPage = {
  seoTitle: "Composez votre Connect — Ominin",
  eyebrow: "Ominin Connect",
  title: "Composons votre Connect.",
  subtitle:
    "Quelques questions sur votre salle : on vous dit ce qu'il vous faut, et seulement ça.",
  progress: (index: number, count: number) => `Question ${index} sur ${count}`,
  back: "Retour",
  next: "Continuer",
  finish: "Voir mon offre",
  questions: {
    hasTill: {
      title: "Avez-vous une caisse enregistreuse ?",
      hint: "Si oui, les commandes payées à table y arrivent directement.",
      options: {
        yes: "Oui",
        no: "Non",
        soon: "Pas encore, j'en cherche une",
      },
    },
    till: {
      title: "Laquelle ?",
      other: "Une autre",
      search: "Rechercher votre caisse",
      compatible: "Compatible",
      check: "À vérifier",
      typed: (name: string) => `Ma caisse : « ${name} »`,
      typedHint: "Pas dans la liste ? On vérifie la connexion avec vous.",
    },
    tickets: {
      title: "Voulez-vous des tickets imprimés en cuisine ou au bar ?",
      hint: "Sinon, les commandes s'affichent sur une tablette ou un téléphone.",
      options: {
        yes: { label: "Oui, des tickets", detail: "La commande sort sur papier" },
        no: { label: "Non, un écran suffit", detail: "Tablette ou téléphone en cuisine" },
      },
    },
    hasPrinters: {
      title: "Avez-vous déjà des imprimantes tickets ?",
      options: { yes: "Oui", no: "Non" },
    },
    tillPrints: {
      title: (till: string | null) =>
        till
          ? `Votre caisse ${till} imprime-t-elle déjà vos tickets en cuisine ?`
          : "Votre caisse imprime-t-elle déjà vos tickets en cuisine ?",
      options: {
        yes: "Oui",
        no: "Non, les imprimantes sont à part",
        unsure: "Je ne sais pas",
      },
    },
    link: {
      title: "Comment votre imprimante est-elle branchée ?",
      hint: "Regardez à l'arrière : une prise comme celle de votre box internet, c'est un câble réseau.",
      options: {
        ethernet: { label: "Câble réseau", detail: "Relié à la box ou à un switch" },
        wifi: { label: "Wi-Fi", detail: "Aucun câble de données" },
        usb: { label: "Câble USB", detail: "Relié à la caisse ou à un ordinateur" },
        unsure: { label: "Je ne sais pas", detail: "On vérifiera ensemble" },
      },
    },
    printerOffer: {
      title: "On vous en fournit une ?",
      titleUsb: "On la remplace par une imprimante réseau ?",
      hint: "Livrée réglée, avec le boîtier Omilink : vous la branchez, les tickets sortent.",
      hintUsb:
        "Une imprimante USB ne parle qu'à l'appareil qui la porte. Une imprimante réseau reçoit les commandes d'Ominin directement.",
      productLink: "Voir la fiche produit",
      count: "Combien d'imprimantes ?",
      countHint: "Une par poste : cuisine, bar, pâtisserie…",
      options: {
        yes: "Ajouter à ma commande",
        no: "Non merci, un écran suffit",
      },
    },
    cable: {
      title: "Avez-vous un câble Ethernet pour le boîtier ?",
      hint: "Le boîtier Omilink se branche à votre box internet par un câble réseau.",
      options: {
        add: { label: "Non, ajoutez-en un", detail: "Livré avec le boîtier" },
        own: { label: "Oui, j'en ai un" },
      },
    },
    service: {
      title: "Comment vos clients commandent-ils ?",
      options: {
        restaurant: { label: "À table", detail: "Ils scannent le QR de leur table" },
        fast_food: { label: "Au comptoir", detail: "Fast food : un numéro par commande" },
        both: { label: "Les deux", detail: "Une salle, et un comptoir" },
      },
    },
    tables: {
      title: "Combien de tables avez-vous ?",
      titleFastFood: "Combien de tables en salle ?",
      hint: `Un Cachet à votre logo sur chaque table, ${formatPrice(starterKit.cachet.price)} l'unité.`,
      hintFastFood: "Aucune ? Mettez 0 : vos affiches suffiront.",
      decrease: "Une de moins",
      increase: "Une de plus",
    },
    supports: {
      title: "Où vos clients verront-ils votre QR ?",
      hint: "Tout est imprimé à votre logo. Touchez un support pour le voir en place.",
      cachetAuto: (tables: number) =>
        `${tables} ${tables > 1 ? "tables" : "table"}, un Cachet chacune`,
    },
  },
  recap: {
    label: "Votre Connect",
    today: "À régler aujourd'hui",
    pending: "sur devis",
    pendingTotal: "+ articles sur devis",
    then: "Ensuite",
    subscription: "Abonnement",
    subscriptionValue: "0 €/mois",
    commission: "Commission",
    understood: "Ce qu'on a compris",
    empty: "Répondez aux questions : votre offre se compose ici.",
    cta: "Créer mon compte et commander",
    doneTitle: "Votre Connect est prêt.",
    doneLead:
      "Votre commande est récapitulée : ce qu'il vous faut, et pourquoi. Il reste votre compte, le nom de votre restaurant, et le paiement.",
    restart: "Recommencer",
  },
  notes: {
    square:
      "Intégration Square incluse : les commandes payées arrivent dans votre caisse, et le paiement à table passe par Square.",
    till: (till: string) =>
      `Connexion à ${till} incluse : les commandes payées arrivent dans votre caisse.`,
    otherTill: (till: string) =>
      `${till || "Votre caisse"} : on vérifie la connexion avec vous avant l'installation.`,
    noTill:
      "Ominin devient votre prise de commande. Le paiement à table passe par Stripe.",
    soonTill:
      "Pas encore de caisse ? Le plan de base Square est gratuit, et Ominin s'y connecte.",
    screen:
      "Les commandes s'affichent en cuisine sur une tablette ou un téléphone. Aucun matériel.",
    tillPrints: "Votre caisse imprime déjà vos tickets : pas besoin de boîtier Omilink.",
    tillPrintsUnsure:
      "On vérifie avec vous si votre caisse imprime en cuisine. Si oui, on retire le boîtier.",
    omilink: "Le boîtier Omilink envoie les commandes à vos imprimantes, sur le réseau du restaurant.",
    linkUnsure:
      "Envoyez-nous une photo de l'arrière de votre imprimante : on vérifie avant d'expédier.",
    supplied: (count: number) =>
      `${count > 1 ? `${count} imprimantes réseau` : "Une imprimante réseau"} et le boîtier Omilink, livrés réglés.`,
    cable: "Un câble Ethernet pour brancher le boîtier à votre box internet.",
    usbDeclined:
      "Votre imprimante USB reste comme elle est : les commandes s'afficheront à l'écran.",
    fastFood: "Mode comptoir : chaque commande prend un numéro du jour.",
    both: "Salle et comptoir : un QR par table, et vos affiches au comptoir.",
  },
};

/*
 * Click & collect : produit indépendant des offres de menu (cumulable
 * avec chacune). Les montants ici sont la source de vérité des prix Stripe
 * (scripts/setup-stripe.ts) comme pour pricingSection. Le bundle regroupe
 * Connect + Click & collect en un seul abonnement.
 */
export const collectOffer = {
  id: "collect",
  name: "Click & collect",
  /** Sans abonnement : Ominin se rémunère sur la seule commission. */
  price: 0,
  /*
   * Commission sur les commandes à emporter. Structurée ici et non écrite en
   * toutes lettres ailleurs : la landing Collect, l'annexe tarifaire des CGV
   * et le taux posé à l'activation la lisent tous d'ici, et un contrat ne
   * doit pas pouvoir annoncer un taux que le produit a cessé d'appliquer.
   */
  commission: {
    percent: 5,
    basis: "des commandes à emporter payées en ligne",
  } satisfies PlanCommission,
  tagline: "L'emporter à 5 %, pas 30. Sans abonnement.",
  features: [
    "Votre page de commande à votre nom",
    "Retrait tout de suite ou à l'heure choisie",
    "Paiement en ligne, versé sur votre compte",
    "Commandes en temps réel dans votre espace de gestion",
    "Votre site web refait par nous, la commande intégrée",
  ],
  /*
   * Connect et le click & collect ensemble : plus d'abonnement, deux
   * commissions — celle du service à table remplace celle de Connect.
   */
  bundle: {
    id: "collect_connect",
    name: "Connect + Click & collect",
    price: 0,
    menuCommission: {
      percent: 3,
      basis: "des commandes à table payées en ligne",
    } satisfies PlanCommission,
    tagline: "Le service complet, sur place et à emporter.",
  },
};

export const qrShowcase = {
  label: "Le Cachet",
  title: "Le secret est à table.",
  lead: "Le Cachet, c'est votre QR code à votre logo, sur chaque table — prêt à servir. Vos clients le scannent, votre menu s'ouvre. Pas d'application, pas d'attente.",
  points: [
    {
      title: "À votre logo, prêts à coller",
      description:
        `Conçus et imprimés par notre équipe, livrés prêts à coller : ${formatPrice(starterKit.cachet.price)} par table + ${formatPrice(starterKit.shipping.price)} de livraison, réglés une fois à l'ouverture.`,
    },
    {
      title: "Abîmé ? Remplacé sous 48 h",
      description:
        "Un sticker déchiré ou taché, et de nouveaux partent sans frais.",
    },
    {
      title: "Réimprimables en un clic",
      description:
        "Téléchargez ou réimprimez chaque code vous-même, depuis votre espace de gestion.",
    },
  ] satisfies QrShowcasePoint[],
  scanHintStrong: "Ce Cachet est réel.",
  scanHint:
    "Scannez-le avec votre téléphone : le menu démo s'ouvre instantanément.",
  mobileCta: {
    label: "Sur mobile ? Ouvrir le menu démo",
    href: demoCta.href,
  } satisfies Cta,
  badge: "Scannez-moi",
  sticker: {
    brand: "Le Cachet",
    restaurant: "Trattoria Lucia",
    table: "Table 12",
    caption: "Scannez pour consulter le menu",
  },
  qrPath: `/m/${DEMO_SLUG}?table=12`,
  qrAlt: "QR code du menu démo Ominin",
  // Photo d'illustration (Unsplash) — à remplacer par une vraie photo de
  // table cliente avec sticker, ou une courte vidéo en boucle du geste de scan.
  photo: {
    src: unsplash("photo-1466978913421-dad2ebd01d17", 1400),
    alt: "Tablée au restaurant, le soir, plats partagés",
  },
};
