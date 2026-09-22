import { DEMO_SLUG, formatPrice, unsplash } from "@/lib/menu-data";

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

export interface ProofStat {
  stat: string;
  title: string;
  description: string;
  source: string;
  /** Source primaire, consultable : aucun chiffre n'entre ici sans son lien. */
  sourceUrl: string;
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
  id: "omilink" | "square";
  label: string;
  title: string;
  lead: string;
  points: QrShowcasePoint[];
  /** La ligne de l'addition propre à ce chemin ; les autres sont communes. */
  cost: BillLine;
}

export interface ClientRef {
  name: string;
  type: string;
  city: string;
  since: number;
  quote: string;
  image: string;
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

export const contactEmail = "omininsupport@gmail.com";

export const demoCta: Cta = {
  label: "Voir un exemple maintenant",
  href: `/m/${DEMO_SLUG}`,
};

export const signupCta: Cta = {
  label: "Commencer",
  href: "/inscription",
};

/** CTA d'une carte tarif : le devis, avec l'offre présélectionnée. */
export const planQuoteHref = (planId: string) =>
  `/devis?plan=${encodeURIComponent(planId)}`;

/** Montants à quatre chiffres : sans l'espace des milliers, on les lit mal. */
const formatEuros = (amount: number) => `${amount.toLocaleString("fr-FR")} €`;

const connectCommission: PlanCommission = {
  percent: 1,
  basis: "des commandes payées en ligne par carte",
};

/*
 * Connect s'ouvre sur des mois offerts, et le verdict tombe à leur terme :
 * au-dessus du seuil de CA, la commission a déjà payé le service et
 * l'abonnement reste à 0 € ; en dessous, les mensualités commencent. Rendu
 * une seule fois, puis figé (lib/offre/trial.ts).
 */
const connectTrial: PlanTrial = { months: 3, exemptionRevenue: 100_000 };

/** Mensualité de Connect, due seulement si les mois offerts n'en dispensent pas. */
const connectPrice = 100;

export const seo = {
  title:
    "Ominin — Menu digital QR code, commande et paiement à table pour restaurants",
  description:
    `Menus digitaux par QR code, commande et paiement à table, offerts ${connectTrial.months} mois et sans engagement. Vos clients scannent, commandent, payent — sans application.`,
};

export const nav = {
  links: [
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "Clients", href: "#clients" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  cta: { label: "Voir la démo", href: `/m/${DEMO_SLUG}` } satisfies Cta,
  login: { label: "Connexion", href: "/connexion" } satisfies Cta,
};

export const hero = {
  eyebrow: "Menus digitaux · Commande à table · Paiement",
  titleStart: "Vos tables prennent",
  titleAccent: "les commandes.",
  subtitle:
    "Vos clients scannent le QR code de la table, consultent, commandent et payent — sans application, sans attente. Vous mettez votre menu à jour en 30 secondes, votre équipe respire, vos coûts baissent.",
  secondaryCta: { label: "Découvrir les tarifs", href: "#tarifs" } satisfies Cta,
  trustline: [
    "Sans engagement",
    "Résiliable à tout moment",
    "Aucune application requise",
  ],
  clientsLabel: "Ils servent déjà avec Ominin",
  // Photo d'illustration (Unsplash) — à remplacer par une vraie photo de
  // salle cliente au service du soir.
  photo: {
    src: unsplash("photo-1552566626-52f8b828add9", 2000),
    alt: "Salle de restaurant chaleureuse, tables dressées pour le service",
  },
};

export const howItWorks = {
  eyebrow: "Comment ça marche",
  title: "De l'assise à la commande, en moins d'une minute.",
  steps: [
    {
      title: "Le client scanne le Cachet",
      description:
        "Le Cachet, c'est le QR code à votre logo collé sur la table. Un scan, rien à installer, rien à expliquer.",
    },
    {
      title: "Votre menu s'affiche",
      description:
        "Photos, descriptions, prix à jour — directement dans le navigateur, en deux secondes.",
    },
    {
      title: "Il commande depuis la table",
      description:
        "Plats, options, commentaires : la commande part sans lever la main ni attendre un serveur.",
    },
    {
      title: "Votre cuisine reçoit tout",
      description:
        "La commande arrive en cuisine en temps réel. Le service suit, la salle tourne.",
    },
  ] satisfies Step[],
};

export const featuresSection = {
  id: "fonctionnalites",
  eyebrow: "Fonctionnalités",
  title: "Pensé pour le service.",
  subtitle:
    "Chaque fonction répond à un vrai problème de salle : moins de pas, moins d'erreurs, moins de temps perdu.",
  features: [
    {
      stat: "Instantané",
      title: "Mettez votre menu à jour en un click",
      description:
        "Changez un prix, retirez un plat épuisé, ajoutez le spécial du jour — depuis votre téléphone, effet immédiat sur toutes les tables.",
    },
    {
      stat: "QR Codes",
      title: "Le Cachet : un par table",
      description:
        "Le Cachet, c'est votre QR code personnalisé à votre logo. On vous le fournit prêt à coller — pas de matériel, pas de formation, opérationnel en quelques minutes.",
    },
    {
      stat: "3 vues",
      title: "Toute l'équipe se connecte",
      description:
        "Serveur, cuisine, manager : chacun voit exactement ce dont il a besoin, rien de plus.",
    },
  ] satisfies Feature[],
};

export const demoSection = {
  eyebrow: "La démo",
  title: "Ne nous croyez pas sur parole. Essayez.",
  subtitle:
    "Voici le menu d'un restaurant propulsé par Ominin. Faites défiler : c'est le vrai produit, exactement ce que vos clients verront à table.",
  fullscreenLabel: "Ouvrir la démo en plein écran",
  mobileHint: "Ouvrez le menu exactement comme vos clients le verront.",
  iframeTitle: "Démo — menu digital Ominin",
  tableTag: "Table 12",
  sceneCaption:
    "Voilà exactement ce qui se passe à la table 12 de la Trattoria Lucia.",
  // Photo d'ambiance (Unsplash) derrière le téléphone — à remplacer par une
  // vraie photo de table cliente.
  photo: {
    src: unsplash("photo-1424847651672-bf20a4b0982b", 1600),
    alt: "Table de restaurant au service du soir",
  },
};

export const proofSection = {
  titleStart: "Ce que disent les",
  titleAccent: "chiffres publics",
  subtitle:
    "Pas de chiffre maison ni de plaquette d'éditeur : un institut de sondage et l'enquête annuelle de France Travail. Les deux sont en lien.",
  disclaimer:
    "Ces chiffres décrivent le marché français de la restauration, pas les résultats d'Ominin. Ils sont issus d'un institut de sondage indépendant et d'une enquête publique, consultables en un clic, et ne constituent pas une garantie de résultats.",
  stats: [
    {
      stat: "50 %",
      title: "commandent ou payent déjà à table",
      description:
        "Un Français sur deux a déjà commandé ou réglé son repas à table depuis son téléphone. Chez les 16-24 ans, c'est 65 %.",
      source: "OpinionWay pour Lyf, mars 2025 — 2 000 personnes",
      sourceUrl:
        "https://www.opinion-way.com/wp-content/uploads/2025/03/OpinionWay-pour-Lyf-Pay-Les-Francais-et-les-services-de-paiement-mobile-24-mars.pdf",
    },
    {
      stat: "+11 pts",
      title: "d'usage en quatre ans",
      description:
        "La commande et le paiement à table sont passés de 39 % d'utilisateurs en 2021 à 50 % en 2025, dans la même enquête reconduite chaque année.",
      source: "OpinionWay pour Lyf, baromètre 2021-2025",
      sourceUrl:
        "https://www.opinion-way.com/wp-content/uploads/2025/03/OpinionWay-pour-Lyf-Pay-Les-Francais-et-les-services-de-paiement-mobile-24-mars.pdf",
    },
    {
      stat: "44 %",
      title: "des recrutements en salle sont difficiles",
      description:
        "Sur 319 000 projets de recrutement en hôtellerie-restauration en 2026, 44 % sont jugés difficiles par les employeurs eux-mêmes.",
      source: "France Travail, enquête BMO 2026",
      sourceUrl:
        "https://www.francetravail.org/accueil/actualites/2026/enquete-bmo-2026-france-travail-deploie-sa-strategie-sectorielle-face-a-pres-de-2-3-millions-de-projets-de-recrutement.html",
    },
  ] satisfies ProofStat[],
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
  /** Pays livrés (codes ISO, adresse saisie dans Stripe Checkout). */
  shippingCountries: ["FR"],
} as const;

const omilinkPrice = starterKit.omilink.price;

export const pricingSection = {
  id: "tarifs",
  eyebrow: "Tarifs",
  title: "Un prix simple. Aucun engagement.",
  subtitle: `La carte seule, ou le service complet : Connect s'ouvre sur ${connectTrial.months} mois offerts, et reste à 0 € si vous passez ${formatEuros(connectTrial.exemptionRevenue)} de commandes sur ces ${connectTrial.months} mois.`,
  perMonth: "/mois",
  ctaLabel: "Choisir",
  installLabel: "Se branche sur votre salle",
  installLink: "Voir comment ça se branche",
  plans: [
    {
      id: "digital",
      name: "Digital",
      price: 59,
      tagline: "Votre carte, en digital.",
      featuresLabel: "Inclus :",
      features: [
        "Menu digital par QR code",
        "Vos Cachets personnalisés à votre logo",
        "Mise à jour en temps réel",
        "Espace de gestion",
      ],
    },
    {
      id: "connect",
      name: "Connect",
      price: connectPrice,
      commission: connectCommission,
      trial: connectTrial,
      tagline: "Vos clients scannent, commandent et payent.",
      featuresLabel: "Tout Digital, plus :",
      features: [
        "Commande à table",
        "Paiement à table par carte bancaire",
        "Gestion des tables",
        "Suivi des commandes en direct",
        "Vues serveur, cuisine et manager",
        "Intégration Square, impression sur vos imprimantes tickets",
      ],
      badge: "Le plus choisi",
    },
  ] satisfies Plan[],
  guarantees: [
    "Cachets imprimés à votre logo",
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
  pricingSection.plans.find((plan) => plan.id === planId)?.trial;

/** Ce qu'affiche une offre à mois offerts : le prix d'essai, puis sa suite. */
export function trialPricing(plan: Plan) {
  if (!plan.trial) return null;
  const { months } = plan.trial;
  const monthly = `${formatPrice(plan.price)}${pricingSection.perMonth}`;
  return {
    price: formatPrice(0),
    unit: `${pricingSection.perMonth} pendant ${months} mois`,
    /** La règle, le seuil chiffré en moins. */
    note: `Puis ${monthly} — ou 0 €, définitivement, si ces ${months} premiers mois dépassent un seuil de commandes passées par Ominin..`,
  };
}

/*
 * Installation de l'offre Connect : deux branchements indépendants, pas une
 * alternative. Côté caisse, l'intégration Square est prête ; pour une autre
 * caisse, l'intégration s'étudie au cas par cas, sans promesse. Côté
 * imprimantes, le boîtier Omilink est une option à l'achat pour qui a des
 * imprimantes tickets. Le plan de base Square ne coûte rien : ses options et
 * son terminal, si le restaurant en veut, se règlent chez Square.
 */
export const installSection = {
  id: "installation",
  eyebrow: "Installation",
  title: "Ominin se branche sur votre salle.",
  subtitle:
    "Côté caisse, l'intégration Square est prête — et pour une autre caisse, nous étudions l'intégration avec vous. Côté cuisine, si vous avez des imprimantes tickets, le boîtier Omilink s'y connecte directement. Aucun abonnement de plus : la caisse Square est gratuite, le boîtier s'achète une fois.",
  sourceLabel: "Commande payée à table",
  joiner: "et/ou",
  billLabel: "L'addition",
  // Lignes communes aux deux additions, autour de la ligne propre au chemin.
  bill: {
    subscription: {
      label: "Abonnement Ominin",
      value: `0 €/mois pendant ${connectTrial.months} mois`,
    },
    commission: {
      label: "Commission",
      value: `${connectCommission.percent} % en ligne`,
    },
  } satisfies Record<string, BillLine>,
  // Commande d'illustration, la même sur le ticket imprimé et l'écran de caisse.
  order: {
    table: "Table 7",
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
      id: "omilink",
      label: "Le boîtier Omilink",
      title: "Des imprimantes ? On s'y branche.",
      lead: "Le boîtier Omilink se connecte directement à vos imprimantes tickets : chaque commande sort en cuisine comme au bar. C'est son seul rôle — et il est optionnel.",
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
          title: "Deux câbles, c'est branché",
          description:
            "L'alimentation et le réseau : il se connecte automatiquement, puis un clic dans votre espace de gestion.",
        },
      ],
      cost: {
        label: "Boîtier Omilink",
        value: `${formatPrice(omilinkPrice)}, une fois`,
      },
    },
    {
      id: "square",
      label: "L'intégration Square",
      title: "Vos commandes, dans votre caisse.",
      lead: "Avec Square, la commande payée à table arrive directement dans votre caisse et votre gestionnaire de commandes — détaillée ligne par ligne, imprimée selon vos réglages.",
      points: [
        {
          title: "Relié en quelques clics",
          description:
            "Vous connectez votre compte Square depuis votre espace de gestion, c'est tout.",
        },
        {
          title: "Une seule caisse",
          description:
            "Plus de double saisie ni de rapprochement à la clôture : tout est déjà dans Square.",
        },
        {
          title: "Une caisse à 0 €",
          description:
            "Le plan de base Square est gratuit, sans abonnement : votre téléphone encaisse en sans-contact, et leur terminal reste une option, achetée chez eux.",
        },
        {
          title: "Une autre caisse ?",
          description:
            "Dites-nous laquelle : nous étudions l'intégration avec vous.",
        },
      ],
      cost: { label: "Abonnement Square", value: "0 €/mois" },
    },
  ] satisfies InstallPath[],
  facts: [
    "Espèces et paiements au comptoir : 0 % de commission",
    "Pas d'imprimante ? Les commandes s'affichent en direct sur tablette",
    "Résiliable à tout moment",
  ],
  footnote:
    "Le plan de base Square est gratuit ; son terminal et ses options se souscrivent auprès de Square, qui les facture directement. La commission Ominin s'ajoute aux frais de transaction de votre prestataire de paiement (Stripe ou Square).",
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
      label: "Une autre caisse ? Parlons-en",
      href: `mailto:${contactEmail}?subject=${encodeURIComponent("Intégration de ma caisse")}`,
    },
  },
  bill: {
    label: "L'addition",
    today: "À régler aujourd'hui",
    then: "Ensuite",
    noCommitment: "sans engagement",
    squareNote: "réglé auprès de Square",
    empty: "Indiquez votre nombre de tables.",
  },
  /** Activation d'après les mois offerts : Cachets déjà réglés, reste l'abonnement. */
  trialEnded: {
    eyebrow: "Mois offerts terminés",
    lead: `Vos ${connectTrial.months} mois offerts sont écoulés, et les commandes passées par Ominin n'ont pas atteint ${formatEuros(connectTrial.exemptionRevenue)} sur la période : l'abonnement commence maintenant, résiliable à tout moment.`,
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
 * Click & collect : produit indépendant des offres de menu (cumulable
 * avec chacune). Les montants ici sont la source de vérité des prix Stripe
 * (scripts/setup-stripe.ts) comme pour pricingSection. Le bundle regroupe
 * Connect + Click & collect en un seul abonnement.
 */
export const collectOffer = {
  id: "collect",
  name: "Click & collect",
  price: 100,
  tagline: "L'emporter à 10 %, pas 30.",
  features: [
    "Votre page de commande à votre nom",
    "Retrait tout de suite ou un autre jour",
    "Paiement en ligne à la commande",
    "Commandes en temps réel dans votre espace de gestion",
    "Votre site web refait par nous, la commande intégrée",
    "10 % par commande — 3× moins que la livraison",
  ],
  bundle: {
    id: "collect_connect",
    name: "Connect + Click & collect",
    price: 150,
    tagline: "Le service complet, sur place et à emporter.",
  },
};

export const clientsSection = {
  id: "clients",
  eyebrow: "Clients",
  title: "Fini les cartes papier.",
  sinceLabel: "Client depuis",
  // Photos d'illustration (Unsplash) — à remplacer par de vraies photos des
  // établissements clients.
  clients: [
    {
      name: "L'Adresse",
      type: "Restaurant gastronomique",
      city: "Toulouse",
      since: 2024,
      quote:
        "L'installation a pris 10 minutes. Le lendemain, nos clients scannaient déjà.",
      image: unsplash("photo-1550966871-3ed3cdb5ed0c", 200),
    },
    {
      name: "Chez l'Walida",
      type: "Restaurant traditionnel marocain",
      city: "Muret",
      since: 2025,
      quote:
        "Depuis qu'on a posé les Cachets, mes serveurs gèrent deux fois plus de tables.",
      image: unsplash("photo-1541518763669-27fef04b14ea", 200),
    },
    {
      name: "NERO",
      type: "Restaurant lounge",
      city: "Toulouse",
      since: 2026,
      quote:
        "Nos clients adorent — plus personne ne cherche la carte papier. Et on met à jour le menu en 30 secondes depuis notre téléphone.",
      image: unsplash("photo-1514933651103-005eec06c04b", 200),
    },
  ] satisfies ClientRef[],
};

export const qrShowcase = {
  label: "Le Cachet",
  title: "Le secret est collé sur la table.",
  lead: "Le Cachet, c'est votre QR code à votre logo, collé sur chaque table — prêt à coller, prêt à servir. Vos clients le scannent, votre menu s'ouvre. Pas d'application, pas d'attente.",
  points: [
    {
      title: "À votre logo, prêts à coller",
      description:
        "Conçus et imprimés par notre équipe, livrés prêts à coller sur vos tables.",
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

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Questions fréquentes.",
  items: [
    {
      question: "C'est quoi, « le Cachet » ?",
      answer:
        "Le Cachet, c'est le petit QR code personnalisé à votre logo qu'on colle sur chaque table. Vos clients le scannent avec leur téléphone et votre menu s'ouvre — sans application. C'est notre façon de remplacer la carte papier.",
    },
    {
      question: "Mes clients doivent-ils installer une application ?",
      answer:
        "Non. Le menu s'ouvre directement dans le navigateur du téléphone, sur iPhone comme sur Android. Un scan du Cachet sur la table suffit.",
    },
    {
      question: "Que se passe-t-il si un Cachet est abîmé ?",
      answer:
        "Nous vous en renvoyons gratuitement. Prévenez-nous et de nouveaux Cachets personnalisés partent sous 48 heures.",
    },
    {
      question: "Combien de temps pour être opérationnel ?",
      answer:
        "Quelques minutes. Notre équipe conçoit votre menu digital, vous recevez vos Cachets à coller sur les tables. Aucune installation technique de votre côté.",
    },
    {
      question: "Puis-je modifier mon menu moi-même ?",
      answer:
        "Oui, à tout moment, depuis votre espace de gestion : un prix, un plat épuisé, une nouvelle formule. Les changements sont visibles en temps réel sur toutes les tables.",
    },
    {
      question: "Est-ce compatible avec ma caisse enregistreuse ?",
      answer:
        "Avec Square, nativement : les commandes payées à table arrivent directement dans votre caisse — et leur plan de base est gratuit, sans abonnement. Avec une autre caisse, dites-nous laquelle : nous étudions l'intégration avec vous. Et si vous avez des imprimantes tickets, le boîtier Omilink s'y connecte directement.",
    },
    {
      question: `Connect est offert ${connectTrial.months} mois : et après ?`,
      answer: `Au terme des ${connectTrial.months} mois, nous regardons le chiffre d'affaires passé par Ominin. Au-delà de ${formatEuros(connectTrial.exemptionRevenue)} sur la période, la commission de ${connectCommission.percent} % ${connectCommission.basis} a déjà payé le service : votre abonnement reste à 0 €, définitivement. En dessous, il passe à ${formatPrice(connectPrice)}${pricingSection.perMonth}, résiliable à tout moment — la commission, elle, ne bouge pas, et nous ne prélevons toujours rien sur les espèces ni sur les paiements au comptoir. Au démarrage, vous réglez seulement vos Cachets imprimés (${formatPrice(starterKit.cachet.price)} par table) et leur livraison (${formatPrice(starterKit.shipping.price)}) ; le boîtier Omilink (${formatPrice(omilinkPrice)}, une seule fois) reste optionnel, et la caisse Square est gratuite.`,
    },
    {
      question: "Y a-t-il un engagement ?",
      answer:
        "Aucun. Les offres sont mensuelles et résiliables à tout moment, sans frais ni justification. Vous pouvez aussi changer d'offre quand vous voulez.",
    },
  ] satisfies FaqItem[],
};

export const finalCta = {
  id: "contact",
  title: "Prêt à moderniser votre service ?",
  subtitle:
    "Voyez ce que vos clients verront, ou écrivez-nous — on vous répond sous 24 heures.",
  contactLabel: "Nous écrire",
  microcopy: ["Réponse sous 24 h", "Installation en 48 h"],
};

export const footer = {
  tagline:
    "Solutions digitales pour restaurants — menus, commande et paiement à table.",
};
