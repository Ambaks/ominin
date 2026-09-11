import type { Cta, FaqItem, Feature, NavLink, Step } from "@/lib/landing-data";
import { collectOffer } from "@/lib/landing-data";
import { collectSiteUrl } from "@/lib/site";

/*
 * Copy de la landing Ominin Collect (collect.ominin.com). Comme les autres
 * landings, aucun texte dans les composants : tout vit ici. Les prix ne sont
 * PAS redéfinis — collectOffer (lib/landing-data.ts) reste la source de
 * vérité du tarif d'abonnement Stripe.
 *
 * Positionnement : le click & collect règle d'abord un problème de comptoir
 * — le téléphone qui sonne pendant le coup de feu (pizzeria), le gros gâteau
 * réservé sur un bout de papier (boulangerie-pâtisserie), les commandes à
 * noter entre deux clients — et seulement ensuite un problème de marge face
 * aux plateformes de livraison. L'offre comprend la refonte du site web de
 * l'établissement, la commande intégrée. Les deux entrées de commande (site
 * web pour les clients, saisie par l'équipe pour le comptoir et le
 * téléphone) sont présentées comme les deux volets de l'offre.
 *
 * Chiffres vérifiés (grilles publiques 2026) : les plateformes prélèvent
 * jusqu'à 25–30 % par commande livrée en France (hors TVA sur commission et
 * hors options payantes) ; leur retrait en boutique tourne autour de 7–12 %,
 * mais laisse le client dans leur app. Notre copy dit « jusqu'à 30 % » en
 * visant la livraison — ne pas durcir la formulation sans re-vérifier.
 *
 * La page est servie sur deux hôtes (collect.ominin.com et ominin.com/collect,
 * réécriture du proxy) : les liens de section sont des ancres, les CTA de
 * conversion sont absolus vers le sous-domaine.
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
  title: "Ominin Collect — Vos commandes à emporter en ligne, sans décrocher",
  description:
    "Click & collect à votre nom pour pizzerias, boulangeries-pâtisseries, traiteurs et restaurants : vos clients commandent et payent sur votre site, pour tout de suite ou pour un autre jour. Site web inclus. 10 % par commande et 100 € par mois, là où les plateformes prélèvent jusqu'à 30 %.",
};

export const nav = {
  links: [
    { label: "Pour qui", href: "#pour-qui" },
    { label: "Démo", href: "#demo" },
    { label: "Comparatif", href: "#comparatif" },
    { label: "Tarif", href: "#tarif" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  cta: { label: "Essayer la démo", href: "#demo" } satisfies Cta,
  login: { label: "Connexion", href: signinHref } satisfies Cta,
};

export const hero = {
  eyebrow: "Click & collect · Site web inclus · 10 % par commande",
  titleStart: "Vos commandes à emporter,",
  titleAccent: "sans décrocher.",
  subtitle:
    "Le téléphone qui sonne en plein coup de feu, le gâteau réservé sur un bout de papier, la plateforme qui prélève jusqu'à 30 % : Ominin Collect met la commande sur votre site, à votre nom. Vos clients composent, payent et choisissent quand ils passent — tout de suite ou un autre jour. La commande arrive en cuisine, vous préparez.",
  primaryCta: { label: "Essayer la démo", href: "#demo" } satisfies Cta,
  secondaryCta: { label: "Pour qui ?", href: "#pour-qui" } satisfies Cta,
  trustline: [
    "Site web à votre nom, refait par nous",
    "Retrait tout de suite ou un autre jour",
    "10 % par commande — pas 30",
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

/*
 * À qui ça sert : trois métiers, chacun avec le problème tel qu'il se vit
 * au comptoir et ce que la commande en ligne y change. La plateforme de
 * livraison n'est que le troisième cas.
 */
export const useCasesSection = {
  id: "pour-qui",
  eyebrow: "Pour qui",
  title: "Plus qu'une alternative aux plateformes.",
  subtitle:
    "La livraison à 30 % n'est qu'une partie du problème. Le reste se joue au comptoir : le téléphone, les bouts de papier, les commandes prises entre deux clients.",
  problemLabel: "Le problème",
  solutionLabel: "Avec Ominin Collect",
  items: [
    {
      kicker: "Pizzeria · Restauration rapide",
      title: "Le téléphone sonne pendant le coup de feu",
      problem:
        "Une main sur le four, l'autre sur le combiné : on note mal, on fait répéter, on perd la commande suivante — et parfois le client au bout du fil.",
      solution:
        "Vos clients commandent sur votre site, payent, choisissent leur heure. La commande tombe en cuisine, prête à lancer. Le téléphone sonne moins, la file avance.",
    },
    {
      kicker: "Boulangerie · Pâtisserie",
      title: "Le gros gâteau réservé sur un bout de papier",
      problem:
        "Un fraisier pour huit samedi, quarante macarons pour dimanche : les réservations s'écrivent sur un carnet, un post-it, une conversation — et se perdent.",
      solution:
        "Vos clients réservent en ligne pour le jour qu'ils veulent, à l'avance, et payent à la commande. Tout est au même endroit : rien ne s'oublie, rien ne se prépare pour rien.",
    },
    {
      kicker: "Restaurant · Traiteur",
      title: "L'emporter qui rapporte aux plateformes",
      problem:
        "Chaque commande livrée par une plateforme lui laisse jusqu'à 30 % — et lui laisse aussi votre client, qui commande dans son app, à côté de vos concurrents.",
      solution:
        "Votre page de commande à votre nom, partagée sur Google, Instagram ou votre vitrine. 10 % par commande, et la relation client vous appartient.",
    },
  ],
};

/*
 * Ce que comprend l'offre : les deux entrées de commande (le site pour les
 * clients, l'espace de gestion pour ce qui se prend au comptoir ou au
 * téléphone) et le site web, refait ou créé, la commande intégrée.
 */
export const modesSection = {
  id: "dans-l-offre",
  eyebrow: "Dans l'offre",
  title: "La commande arrive par votre site — ou par votre comptoir.",
  subtitle:
    "Selon votre établissement, on met en place l'un, l'autre, ou les deux. Dans tous les cas, tout atterrit dans le même espace, sans papier.",
  modes: [
    {
      label: "Click & collect externe",
      title: "Vos clients commandent sur votre site",
      body: "Pour tout de suite ou pour un autre jour. Ils composent, choisissent leur créneau, payent par carte. Vous n'avez rien à ressaisir.",
    },
    {
      label: "Click & collect interne",
      title: "Votre équipe note ce qui se prend au comptoir ou au téléphone",
      body: "La réservation d'un gâteau, la commande d'un habitué : saisies dans le même espace que les commandes du site, avec le nom, le jour et l'heure de retrait. Fini le carnet.",
    },
  ],
  website: {
    label: "Site web inclus",
    title: "Votre site, refait par nous, la commande intégrée",
    body: "Pas de lien vers une plateforme : la commande vit sur votre propre site, à votre nom et à vos couleurs. S'il date, on le refait ; s'il n'existe pas, on le crée — c'est compris dans l'offre.",
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
      title: "Votre client ouvre votre site",
      description:
        "Un lien à votre nom, à partager sur Google, Instagram ou votre vitrine. Pas d'app de plateforme entre vous et lui.",
    },
    {
      title: "Il commande et paye en ligne",
      description:
        "Plats, options, jour et heure de retrait — pour ce midi ou pour samedi. Il règle par carte : vous êtes payé avant de lancer la préparation.",
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
  title: "Pensé pour vos marges — et pour votre comptoir.",
  subtitle:
    "L'emporter rapporte, à condition de ne pas reverser jusqu'à 30 % de chaque commande à une plateforme qui garde vos clients — ni de perdre des commandes au téléphone.",
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
        "Le paiement précède la cuisine : plus de plats préparés pour rien, plus de gâteau réservé qu'on ne vient pas chercher, plus d'impayés au comptoir.",
    },
    {
      stat: "À vous",
      title: "Vos clients restent les vôtres",
      description:
        "La commande passe par votre site, à votre nom — pas dans l'app d'une plateforme qui possède la relation et vous met en concurrence à chaque écran.",
    },
  ] satisfies Feature[],
};

export const pricingSection = {
  id: "tarif",
  eyebrow: "Tarif",
  title: "10 % par commande. 100 € par mois.",
  subtitle:
    "Pas de grille opaque, pas de paliers : un abonnement fixe, une commission claire — trois fois moins que la livraison — et votre site web compris. Ou le service complet avec Connect.",
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
    "Site web inclus",
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
      question: "Mes clients peuvent-ils commander pour un autre jour ?",
      answer:
        "Oui. À la commande, ils choisissent « dès que possible », une heure aujourd'hui, ou un autre jour et une heure — pour ce soir comme pour samedi prochain. La commande s'affiche dans votre espace avec sa date, et vous la préparez au bon moment.",
    },
    {
      question: "Nous sommes une boulangerie-pâtisserie, pas un restaurant. Ça marche ?",
      answer:
        "C'est même l'un des cas où ça change le plus : les réservations de gâteaux et de grosses quantités arrivent en ligne, payées, avec le jour de retrait — plus rien sur un bout de papier. Votre catalogue se gère comme une carte : produits, options, quantités.",
    },
    {
      question: "Peut-on aussi noter les commandes prises au comptoir ou au téléphone ?",
      answer:
        "C'est le click & collect interne : votre équipe saisit la commande dans le même espace que celles du site — nom, téléphone, jour et heure de retrait. Une seule liste, sans carnet. On le met en place avec vous selon votre organisation.",
    },
    {
      question: "Vous refaites vraiment notre site web ?",
      answer:
        "Oui, c'est compris dans l'offre. Votre page de commande n'est pas un lien vers une plateforme : elle vit sur votre propre site, à votre nom et à vos couleurs. Si votre site date, on le refait ; s'il n'existe pas, on le crée.",
    },
    {
      question: "Quelle différence avec Uber Eats ou Deliveroo ?",
      answer:
        "Sur une commande livrée, les plateformes prélèvent jusqu'à 25–30 % (hors TVA sur la commission et options payantes) — et le client commande dans leur app, à côté de vos concurrents. Ici, la commande passe par votre site, à votre nom : 10 % par commande, 100 € par mois, et la relation client vous appartient.",
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
  title: "Prêt à reprendre vos commandes en main ?",
  subtitle:
    "Créez votre compte, ou écrivez-nous : votre page peut être en ligne en 48 heures, votre site refait dans la foulée — et chaque commande vous coûte trois fois moins qu'en livraison.",
  contactLabel: "Nous écrire",
  microcopy: ["10 % par commande — pas 30", "Site web inclus", "Réponse sous 24 h"],
};

export const footer = {
  tagline:
    "Le click & collect à votre nom — pour des pizzerias, des pâtisseries et des restaurants qui gardent leurs marges, leurs clients et leur téléphone libre.",
  customerNotice:
    "Vous cherchez à commander ? Utilisez le lien communiqué par votre restaurant.",
};
