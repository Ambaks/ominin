import type { Cta, FaqItem, Feature, NavLink, Step } from "@/lib/landing-data";
import { collectOffer } from "@/lib/landing-data";
import { collectSiteUrl } from "@/lib/site";

/*
 * Copy de la landing Ominin Collect (collect.ominin.com). Comme les autres
 * landings, aucun texte dans les composants : tout vit ici. Les prix ne sont
 * PAS redéfinis — collectOffer (lib/landing-data.ts) reste la source de
 * vérité du tarif d'abonnement Stripe.
 *
 * Positionnement : l'alternative aux plateformes de livraison. Chiffres
 * vérifiés (grilles publiques 2026) : les plateformes prélèvent jusqu'à
 * 25–30 % par commande livrée en France (hors TVA sur commission et hors
 * options payantes) ; leur retrait en boutique tourne autour de 7–12 %,
 * mais laisse le client dans leur app. Notre copy dit « jusqu'à 30 % » en
 * visant la livraison — ne pas durcir la formulation sans re-vérifier.
 *
 * La page est servie sur deux hôtes (collect.ominin.com et ominin.com/collect,
 * réécriture du proxy) : les liens de section sont des ancres, les CTA de
 * conversion sont absolus vers ominin.com — il n'existe pas de /login sous
 * le sous-domaine collect.
 */

export const collectBrand = "Ominin Collect";

/*
 * CTA de conversion : l'inscription click & collect vit sur ce sous-domaine
 * (trois champs, tarif du click & collect). Le lien est absolu parce que la
 * landing est aussi servie sur ominin.com/collect, d'où « /inscription »
 * mènerait au funnel des offres menu & salle — et à leur tarif.
 */
export const signupCta: Cta = {
  label: "Commencer",
  href: `${collectSiteUrl}/inscription`,
};

export const signinHref = `${collectSiteUrl}/connexion`;

export const seo = {
  title: "Ominin Collect — Le click & collect à 10 %, pas 30",
  description:
    "L'alternative aux plateformes de livraison : votre page de commande à emporter, à votre nom. 10 % par commande et 100 € par mois — contre jusqu'à 30 % prélevés par les plateformes. Vos clients restent les vôtres.",
};

export const nav = {
  links: [
    { label: "Démo", href: "#demo" },
    { label: "Comparatif", href: "#comparatif" },
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Tarif", href: "#tarif" },
    { label: "FAQ", href: "#faq" },
    { label: "Connexion", href: signinHref },
  ] satisfies NavLink[],
  cta: { label: "Essayer la démo", href: "#demo" } satisfies Cta,
};

export const hero = {
  eyebrow: "Click & collect · 10 % par commande · 100 €/mois",
  titleStart: "Eux prennent 30 %.",
  titleAccent: "Nous, 10.",
  subtitle:
    "Les plateformes de livraison prélèvent jusqu'à 30 % de chaque commande — et gardent vos clients dans leur app. Ominin Collect met l'emporter à votre nom : vos clients commandent et payent sur votre page, vous encaissez, ils passent récupérer. 10 % par commande, 100 € par mois, point.",
  primaryCta: { label: "Essayer la démo", href: "#demo" } satisfies Cta,
  secondaryCta: { label: "Voir le comparatif", href: "#comparatif" } satisfies Cta,
  trustline: [
    "10 % par commande — pas 30",
    "100 €/mois, sans engagement",
    "Vos clients restent les vôtres",
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

/**
 * Comparatif interactif plateforme vs Collect. Taux plateforme : borne haute
 * des grilles publiques livraison (d'où « jusqu'à »). La commission de 10 %
 * est affichée en avance de phase : elle n'est pas encore prélevée dans le
 * flux Stripe — à brancher avant les premières commandes facturées.
 */
export const comparisonSection = {
  id: "comparatif",
  eyebrow: "Le comparatif",
  title: "Combien vous coûte une plateforme ?",
  subtitle:
    "Faites glisser vos ventes à emporter : voici ce qu'une plateforme de livraison prélève chaque mois, et ce que coûte Ominin Collect.",
  sliderLabel: "Vos ventes à emporter par mois",
  slider: { min: 1000, max: 15000, step: 500, initial: 4000 },
  platform: {
    label: "Plateforme de livraison",
    rate: 0.3,
    rateLabel: "jusqu'à 30 % par commande",
  },
  ominin: {
    label: "Ominin Collect",
    rate: 0.1,
    monthlyFee: collectOffer.price,
    rateLabel: "10 % par commande + 100 €/mois",
  },
  savingsLabel: "d'économies par an",
  savingsHint: "De la marge que vous gardez — ou réinvestissez en salle.",
  disclaimer:
    "Sur la base des grilles publiques des plateformes de livraison en France en 2026 : commission jusqu'à 25–30 % par commande livrée, hors TVA sur commission et hors options payantes (mise en avant, publicité).",
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
        "Un lien à votre nom, à partager sur Google, Instagram ou votre vitrine. Pas d'app de plateforme entre vous et lui.",
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
  title: "Pensé pour vos marges.",
  subtitle:
    "L'emporter rapporte — à condition de ne pas reverser jusqu'à 30 % de chaque commande à une plateforme de livraison qui, en plus, garde vos clients.",
  features: [
    {
      stat: "3×",
      title: "Moins cher que la livraison",
      description:
        "10 % par commande contre jusqu'à 30 % sur les plateformes : sur 1 000 € d'emporter, une plateforme de livraison prélèverait jusqu'à 300 € de commission — nous, 100 € d'abonnement compris.",
    },
    {
      stat: "Prépayé",
      title: "Fini les commandes fantômes",
      description:
        "Le paiement précède la cuisine : plus de plats préparés pour rien, plus d'impayés au comptoir.",
    },
    {
      stat: "À vous",
      title: "Vos clients restent les vôtres",
      description:
        "La commande passe par votre page, à votre nom — pas dans l'app d'une plateforme qui possède la relation et vous met en concurrence à chaque écran.",
    },
  ] satisfies Feature[],
};

export const pricingSection = {
  id: "tarif",
  eyebrow: "Tarif",
  title: "10 % par commande. 100 € par mois.",
  subtitle:
    "Pas de grille opaque, pas de paliers : un abonnement fixe, une commission claire — trois fois moins que la livraison. Ou le service complet avec Connect.",
  perMonth: "/mois",
  commissionLabel: "+ 10 % par commande",
  /** Le bundle inclut aussi le service à table (sans commission) : la
   * mention doit rester scopée à l'emporter. */
  bundleCommissionLabel: "+ 10 % par commande à emporter",
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
    "10 % par commande — pas 30",
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
      question: "Quelle différence avec Uber Eats ou Deliveroo ?",
      answer:
        "Sur une commande livrée, les plateformes prélèvent jusqu'à 25–30 % (hors TVA sur la commission et options payantes) — et le client commande dans leur app, à côté de vos concurrents. Ici, la commande passe par votre page, à votre nom : 10 % par commande, 100 € par mois, et la relation client vous appartient.",
    },
    {
      question: "Pourquoi une commission de 10 % ?",
      answer:
        "Elle couvre le paiement en ligne et la plateforme, et c'est tout : trois fois moins qu'une commande livrée par une plateforme. L'abonnement fixe nous permet de la garder basse, quel que soit votre volume.",
    },
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
  title: "Prêt à reprendre vos marges ?",
  subtitle:
    "Créez votre compte, ou écrivez-nous : votre page peut être en ligne en 48 heures — et chaque commande vous coûte trois fois moins qu'en livraison.",
  contactLabel: "Nous écrire",
  microcopy: ["10 % par commande — pas 30", "Réponse sous 24 h"],
};

export const footer = {
  tagline:
    "Le click & collect à 10 % — l'alternative aux plateformes de livraison, pour des restaurants qui gardent leurs marges et leurs clients.",
  customerNotice:
    "Vous cherchez à commander ? Utilisez le lien communiqué par votre restaurant.",
};
