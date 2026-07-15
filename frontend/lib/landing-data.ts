import { DEMO_SLUG, unsplash } from "@/lib/menu-data";

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
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  tagline: string;
  featuresLabel: string;
  features: string[];
  badge?: string;
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

export const contactEmail = "ambakalgr@gmail.com";

export const demoCta: Cta = {
  label: "Voir un exemple maintenant",
  href: `/m/${DEMO_SLUG}`,
};

export const signupCta: Cta = {
  label: "Commencer",
  href: "/login",
};

/** CTA d'une carte tarif : l'offre choisie suit tout le funnel d'inscription. */
export const planSignupHref = (planId: string) =>
  `/login?plan=${encodeURIComponent(planId)}`;

export const seo = {
  title:
    "Ominin — Menu digital QR code, commande et paiement à table pour restaurants",
  description:
    "Menus digitaux par QR code, commande et paiement à table. Sans engagement, dès 59 €/mois. Vos clients scannent, commandent, payent — sans application.",
};

export const nav = {
  links: [
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "Clients", href: "#clients" },
    { label: "FAQ", href: "#faq" },
    { label: "Connexion", href: "/login" },
  ] satisfies NavLink[],
  cta: { label: "Voir la démo", href: `/m/${DEMO_SLUG}` } satisfies Cta,
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
  titleStart: "Ce que montrent les",
  titleAccent: "études du secteur",
  subtitle:
    "Les chiffres publiés par les acteurs de la restauration digitale.",
  disclaimer:
    "Chiffres issus d'études publiées par des acteurs du secteur. Ils illustrent des tendances observées dans la restauration digitale et ne constituent pas une garantie de résultats.",
  stats: [
    {
      stat: "+25%",
      title: "de commandes en moyenne",
      description:
        "Selon l'étude menée par Grubhub, les cartes avec photos augmentent le taux de commande de +25%.",
      source: "Source : Grubhub",
    },
    {
      stat: "85%",
      title: "des clients se décident grâce à la carte",
      description:
        "TouchBistro a démontré que 85% des clients choisissent un restaurant après avoir consulté leur menu en ligne.",
      source: "Source : TouchBistro",
    },
    {
      stat: "+20%",
      title: "sur l'addition finale en moyenne",
      description:
        "D'après Grubhub, le ticket moyen est 20% plus élevé sur une carte digitale que sur une carte papier.",
      source: "Source : Grubhub",
    },
  ] satisfies ProofStat[],
};

export const pricingSection = {
  id: "tarifs",
  eyebrow: "Tarifs",
  title: "Un prix simple. Aucun engagement.",
  subtitle:
    "Trois offres mensuelles, résiliables à tout moment. Vous changez d'offre quand vous voulez.",
  perMonth: "/mois",
  ctaLabel: "Choisir",
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
      id: "smart",
      name: "Smart",
      price: 79,
      tagline: "La salle qui tourne toute seule.",
      featuresLabel: "Tout Digital, plus :",
      features: [
        "Commande à table",
        "Gestion des tables",
        "Suivi des commandes en direct",
      ],
    },
    {
      id: "connect",
      name: "Connect",
      price: 99,
      tagline: "Le service de bout en bout.",
      featuresLabel: "Tout Smart, plus :",
      features: [
        "Paiement à table par carte bancaire",
        "Intégration caisse enregistreuse",
        "Vues serveur, cuisine et manager",
      ],
      badge: "Le plus choisi",
    },
  ] satisfies Plan[],
  guarantees: [
    "Vos Cachets fournis gratuitement",
    "Aucune installation technique",
    "Votre menu conçu par notre équipe",
    "Résiliable à tout moment",
  ],
};

/*
 * Click & collect : produit indépendant des trois offres de menu (cumulable
 * avec chacune). Les montants ici sont la source de vérité des prix Stripe
 * (scripts/setup-stripe.ts) comme pour pricingSection. Le bundle regroupe
 * Connect + Click & collect en un seul abonnement.
 */
export const collectOffer = {
  id: "collect",
  name: "Click & collect",
  price: 100,
  tagline: "La vente à emporter, sans commission.",
  features: [
    "Votre page de commande à emporter",
    "Paiement en ligne à la commande",
    "Commandes reçues dans votre espace de gestion",
    "Aucune commission sur les ventes",
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
      title: "À votre logo, fournis gratuitement",
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
        "L'offre Connect intègre votre caisse : les commandes passées à table s'y retrouvent directement. Écrivez-nous pour vérifier la compatibilité de votre matériel.",
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
