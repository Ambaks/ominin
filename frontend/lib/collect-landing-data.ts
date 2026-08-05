import type { Cta, FaqItem, Feature, NavLink, Step } from "@/lib/landing-data";
import { collectOffer } from "@/lib/landing-data";
import { siteUrl } from "@/lib/site";

/*
 * Copy de la landing Ominin Collect (collect.ominin.com). Comme les autres
 * landings, aucun texte dans les composants : tout vit ici. Les prix ne sont
 * PAS redéfinis — collectOffer (lib/landing-data.ts) reste la source de
 * vérité des tarifs Stripe.
 *
 * La page est servie sur deux hôtes (collect.ominin.com et ominin.com/collect,
 * réécriture du proxy) : les liens de section sont des ancres, les CTA de
 * conversion sont absolus vers ominin.com — il n'existe pas de /login sous
 * le sous-domaine collect.
 */

export const collectBrand = "Ominin Collect";

/** CTA de conversion : l'espace de gestion vit sur le domaine principal. */
export const signupCta: Cta = {
  label: "Commencer",
  href: `${siteUrl}/login`,
};

export const seo = {
  title: "Ominin Collect — Click & collect sans commission pour restaurants",
  description:
    "Votre page de commande à emporter : vos clients commandent et payent en ligne, vous préparez, ils passent récupérer. Zéro commission, commandes reçues en temps réel dans votre espace de gestion.",
};

export const nav = {
  links: [
    { label: "Démo", href: "#demo" },
    { label: "Comment ça marche", href: "#comment" },
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Tarif", href: "#tarif" },
    { label: "FAQ", href: "#faq" },
    { label: "Connexion", href: `${siteUrl}/login` },
  ] satisfies NavLink[],
  cta: { label: "Essayer la démo", href: "#demo" } satisfies Cta,
};

export const hero = {
  eyebrow: "Click & collect · Paiement en ligne · 0 % de commission",
  titleStart: "Ils commandent.",
  titleAccent: "Vous préparez.",
  subtitle:
    "Votre page de commande à emporter, à votre nom : vos clients choisissent, payent en ligne et passent récupérer à l'heure annoncée. La commande tombe directement dans votre espace de gestion — sans commission, sans matériel en plus.",
  primaryCta: { label: "Essayer la démo", href: "#demo" } satisfies Cta,
  secondaryCta: { label: "Découvrir le tarif", href: "#tarif" } satisfies Cta,
  trustline: [
    "0 % de commission",
    "Sans engagement",
    "Aucune application requise",
  ],
};

/** Maquette produit du hero : le relais téléphone → cuisine → retrait. */
export const heroShowcase = {
  phoneChip: {
    title: "Commande passée",
    detail: "Payée en ligne · 24,50 €",
  },
  relayLine: "La commande part en cuisine",
  kitchenChip: {
    title: "Reçue dans votre espace",
    detail: "Camille · Emporter · 12:04",
  },
  readyChip: {
    title: "Client prévenu",
    detail: "Prête vers 12:25 · Itinéraire",
  },
};

export const demoSection = {
  id: "demo",
  eyebrow: "Démo interactive",
  title: "Jouez les deux rôles.",
  subtitle:
    "À gauche, le téléphone de votre client. À droite, votre espace de gestion. Passez une commande, acceptez-la, préparez-la : tout est jouable, rien n'est réel.",
  customerLabel: "Côté client",
  restaurantLabel: "Côté restaurant",
  fullscreenLabel: "Ouvrir la démo en plein écran",
  mobileTitle: "Essayez la démo",
  mobileHint:
    "Le téléphone du client et votre espace de gestion, dans une démo jouable — données fictives.",
  badge: "Démo · données fictives",
  backLabel: "Retour à la présentation",
};

export const howItWorks = {
  id: "comment",
  eyebrow: "Comment ça marche",
  title: "De la commande au retrait, sans un coup de fil.",
  steps: [
    {
      title: "Votre client ouvre votre page",
      description:
        "Un lien à votre nom, à partager sur Google, Instagram ou votre vitrine. Rien à installer, ni pour lui, ni pour vous.",
    },
    {
      title: "Il commande et paye en ligne",
      description:
        "Plats, options, heure de retrait : il compose sa commande et règle par carte. Vous êtes payé avant de lancer la cuisine.",
    },
    {
      title: "Vous acceptez et annoncez un délai",
      description:
        "La commande apparaît dans votre espace. Un geste pour l'accepter, un autre pour annoncer 5, 15, 25 ou 40 minutes.",
    },
    {
      title: "Il récupère, la salle continue",
      description:
        "Votre client suit la préparation en direct, l'itinéraire en poche, et arrive à l'heure. Pas de téléphone qui sonne, pas de file au comptoir.",
    },
  ] satisfies Step[],
};

export const featuresSection = {
  id: "fonctionnalites",
  eyebrow: "Fonctionnalités",
  title: "Pensé pour le comptoir.",
  subtitle:
    "L'emporter rapporte — à condition de ne pas le payer en commissions, en erreurs de commande et en appels pendant le service.",
  features: [
    {
      stat: "0 %",
      title: "Aucune commission sur vos ventes",
      description:
        "L'abonnement est fixe : chaque commande encaissée est entièrement pour vous, quel que soit votre volume.",
    },
    {
      stat: "Prépayé",
      title: "Fini les commandes fantômes",
      description:
        "Le paiement précède la cuisine : plus de plats préparés pour rien, plus d'impayés au comptoir.",
    },
    {
      stat: "Temps réel",
      title: "Tout dans votre espace de gestion",
      description:
        "Les commandes à emporter arrivent au même endroit que celles de vos tables. Un seul écran, un seul flux pour votre équipe.",
    },
  ] satisfies Feature[],
};

export const pricingSection = {
  id: "tarif",
  eyebrow: "Tarif",
  title: "Un abonnement fixe. Zéro commission.",
  subtitle:
    "Le Click & collect s'ajoute à n'importe quelle offre Ominin — ou se combine à Connect pour le service complet, sur place et à emporter.",
  perMonth: "/mois",
  orLabel: "ou",
  featuresLabel: "Inclus :",
  bundleBadge: "Le plus complet",
  bundleFeatures: [
    "Commande et paiement à table",
    "Votre page de commande à emporter",
    "Un seul abonnement, un seul espace",
  ],
  ctaLabel: "Commencer",
  guarantees: [
    "Sans engagement",
    "Aucune commission sur les ventes",
    "Réponse sous 24 h",
  ],
  // Prix et features rendus depuis collectOffer — jamais redéfinis ici.
  offer: collectOffer,
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Questions fréquentes.",
  items: [
    {
      question: "Mes clients doivent-ils installer une application ?",
      answer:
        "Non. Votre page de commande est un simple lien web : elle s'ouvre dans le navigateur du téléphone, sans compte ni téléchargement.",
    },
    {
      question: "Comment mes clients payent-ils ?",
      answer:
        "Par carte, en ligne, au moment de la commande — le paiement est opéré par Stripe. La commande ne part en cuisine qu'une fois le paiement confirmé.",
    },
    {
      question: "Y a-t-il une commission sur les ventes ?",
      answer:
        "Aucune. L'abonnement est fixe, quel que soit votre volume de commandes : tout ce que vous encaissez est pour vous.",
    },
    {
      question: "Comment les commandes arrivent-elles en cuisine ?",
      answer:
        "En temps réel, dans le même espace de gestion que vos commandes en salle. Vous acceptez, annoncez un délai, et le client suit l'avancement en direct.",
    },
    {
      question: "Puis-je refuser une commande ?",
      answer:
        "Oui, en un geste depuis votre espace. Le client est prévenu immédiatement sur sa page de suivi, avec vos coordonnées pour toute question.",
    },
    {
      question: "Y a-t-il un engagement ?",
      answer:
        "Non. L'abonnement est mensuel et résiliable à tout moment, sans frais ni justification.",
    },
    {
      question: "J'ai reçu un lien de commande d'un restaurant — que faire ?",
      answer:
        "Chaque établissement partenaire dispose de sa propre page de commande. Ouvrez le lien qu'il vous a communiqué pour commander directement chez lui.",
    },
  ] satisfies FaqItem[],
};

export const finalCta = {
  id: "contact",
  title: "Prêt à faire tourner l'emporter ?",
  subtitle:
    "Créez votre compte, ou écrivez-nous : votre page de commande peut être en ligne en 48 heures.",
  contactLabel: "Nous écrire",
  microcopy: ["0 % de commission", "Réponse sous 24 h"],
};

export const footer = {
  tagline:
    "Click & collect sans commission pour les restaurants — commande et paiement en ligne, retrait au comptoir.",
  customerNotice:
    "Vous cherchez à commander ? Utilisez le lien communiqué par votre restaurant.",
};
