import { DEMO_SLUG } from "@/lib/menu-data";

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

// Point this at the signup page once it exists — every "Commencer" CTA follows.
export const signupCta: Cta = {
  label: "Commencer",
  href: "#contact",
};

export const seo = {
  title:
    "Ominin — Menu digital QR code, commande et paiement à table pour restaurants",
  description:
    "Menus digitaux par QR code, commande et paiement à table. Sans engagement, dès 29 €/mois. Vos clients scannent, commandent, payent — sans application.",
};

export const nav = {
  links: [
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "Clients", href: "#clients" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  cta: { label: "Voir la démo", href: `/m/${DEMO_SLUG}` } satisfies Cta,
};

export const hero = {
  eyebrow: "Menus digitaux · Commande à table · Paiement",
  titleStart: "Reduisez vos depenses,",
  titleAccent: "facilitez votre vie.",
  subtitle:
    "Vos clients scannent le QR code de la table, consultent, commandent et payent — sans application, sans attente. Vous mettez votre menu à jour en 30 secondes, votre équipe respire, vos coûts baissent.",
  secondaryCta: { label: "Découvrir les tarifs", href: "#tarifs" } satisfies Cta,
  trustline: [
    "Sans engagement",
    "Résiliable à tout moment",
    "Aucune application requise",
  ],
  clientsLabel: "Ils servent déjà avec Ominin",
};

export const howItWorks = {
  eyebrow: "Comment ça marche",
  title: "De l'assise à la commande, en moins d'une minute.",
  steps: [
    {
      title: "Le client scanne le QR code",
      description:
        "Un scan du QR code collé sur la table. Rien à installer, rien à expliquer.",
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
      stat: "30 s",
      title: "Menu à jour en 30 secondes",
      description:
        "Changez un prix, retirez un plat épuisé, ajoutez le spécial du jour — depuis votre téléphone, effet immédiat sur toutes les tables.",
    },
    {
      stat: "QR",
      title: "Un sticker par table, c'est tout",
      description:
        "On vous fournit vos QR codes personnalisés, prêts à coller. Pas de matériel, pas de formation, opérationnel en quelques minutes.",
    },
    {
      stat: "0",
      title: "Application à installer",
      description:
        "Le menu s'ouvre dans le navigateur, sur iPhone comme sur Android. Aucun téléchargement, aucun compte à créer.",
    },
    {
      stat: "1",
      title: "Espace de gestion unique",
      description:
        "Menus, tables, commandes : tout se pilote depuis un seul tableau de bord, sans formation.",
    },
    {
      stat: "3",
      title: "Vues pour votre équipe",
      description:
        "Serveur, cuisine, manager : chacun voit exactement ce dont il a besoin, rien de plus.",
    },
  ] satisfies Feature[],
};

export const demoSection = {
  eyebrow: "La démo",
  title: "Ne nous croyez pas sur parole. Goûtez.",
  subtitle:
    "Voici le menu d'un restaurant propulsé par Ominin. Faites défiler : c'est le vrai produit, exactement ce que vos clients verront à table.",
  fullscreenLabel: "Ouvrir la démo en plein écran",
  iframeTitle: "Démo — menu digital Ominin",
};

export const pricingSection = {
  id: "tarifs",
  eyebrow: "Tarifs",
  title: "Un prix simple. Aucun engagement.",
  subtitle:
    "Trois offres mensuelles, résiliables à tout moment. Vous changez d'offre quand vous voulez.",
  perMonth: "/mois",
  plans: [
    {
      id: "digital",
      name: "Digital",
      price: 29,
      tagline: "Votre carte, en digital.",
      featuresLabel: "Inclus :",
      features: [
        "Menu digital QR code",
        "QR codes personnalisés à votre logo",
        "Mise à jour en temps réel",
        "Espace de gestion",
      ],
    },
    {
      id: "smart",
      name: "Smart",
      price: 59,
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
    "QR codes fournis gratuitement",
    "Aucune installation technique",
    "Votre menu conçu par notre équipe",
    "Résiliable à tout moment",
  ],
};

export const clientsSection = {
  id: "clients",
  eyebrow: "Clients",
  title: "Fini les cartes papier.",
  sinceLabel: "Client depuis",
  clients: [
    {
      name: "L'Adresse",
      type: "Restaurant gastronomique",
      city: "Toulouse",
      since: 2024,
      quote:
        "L'installation a pris 10 minutes. Le lendemain, nos clients scannaient déjà.",
    },
    {
      name: "Chez l'Walida",
      type: "Restaurant traditionnel marocain",
      city: "Muret",
      since: 2025,
      quote:
        "Depuis qu'on a les QR codes, mes serveurs gèrent deux fois plus de tables.",
    },
    {
      name: "NERO",
      type: "Restaurant lounge",
      city: "Toulouse",
      since: 2026,
      quote:
        "Nos clients adorent — plus personne ne cherche la carte papier. Et on met à jour le menu en 30 secondes depuis notre téléphone.",
    },
  ] satisfies ClientRef[],
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Questions fréquentes.",
  items: [
    {
      question: "Mes clients doivent-ils installer une application ?",
      answer:
        "Non. Le menu s'ouvre directement dans le navigateur du téléphone, sur iPhone comme sur Android. Un scan du QR code sur la table suffit.",
    },
    {
      question: "Que se passe-t-il si un QR code est abîmé ?",
      answer:
        "Nous vous en renvoyons gratuitement. Prévenez-nous et de nouveaux stickers personnalisés partent sous 48 heures.",
    },
    {
      question: "Combien de temps pour être opérationnel ?",
      answer:
        "Quelques minutes. Notre équipe conçoit votre menu digital, vous recevez vos QR codes personnalisés à coller sur les tables. Aucune installation technique de votre côté.",
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
