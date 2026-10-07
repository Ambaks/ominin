import type { Cta, FaqItem, NavLink } from "@/lib/landing-data";
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

/** Commission du click & collect, telle que l'annexe tarifaire l'écrit. */
const rate = `${collectOffer.commission.percent}\u00a0%`;

/** Borne haute des commissions livraison (grilles publiques, d'où « jusqu'à »). */
const platformRate = 0.3;
/** « 6× moins cher » : le rapport des deux taux, recalculé si l'un change. */
const times = Math.round((platformRate * 100) / collectOffer.commission.percent);

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
    `Click & collect à votre nom pour pizzerias, boulangeries-pâtisseries, traiteurs et restaurants : vos clients commandent et payent sur votre site, pour tout de suite ou pour un autre jour. Site web inclus. ${rate} par commande, sans abonnement, là où les plateformes prélèvent jusqu'à 30 %.`,
};

export const nav = {
  links: [
    { label: "Pour qui", href: "#pour-qui" },
    { label: "Parcours", href: "#parcours" },
    { label: "Démo", href: "#demo" },
    { label: "Tarif", href: "#tarif" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  demo: { label: "Démo", href: "#demo" } satisfies Cta,
  login: { label: "Connexion", href: signinHref } satisfies Cta,
};

export const hero = {
  eyebrow: "Click & collect à votre nom",
  /** Trois lignes ; la marquée reçoit le pavé braise. */
  lines: [
    { text: "À emporter." },
    { text: "Payé", mark: true, after: " avant" },
    { text: "d'arriver." },
  ],
  subtitle:
    "Votre page de commande, à votre nom : vos clients composent, payent par carte et choisissent leur heure de retrait. La commande tombe en cuisine, déjà réglée — vous préparez, ils passent la prendre.",
  stats: [
    { value: rate, label: "par commande, rien d'autre" },
    { value: "0\u00a0€", label: "d'abonnement, sans engagement" },
    { value: "15\u00a0min", label: "par créneau, dans vos horaires" },
  ],
  primaryCta: { label: "Jouer la démo", href: "#demo" } satisfies Cta,
};

/** Relais animé du hero : la commande de Camille (lib/collect/demo), du panier au comptoir. */
export const heroRelay = {
  stamp: "Payé",
  ticket: {
    label: "À emporter",
    customer: "Camille",
    pickup: "Retrait 12:30",
    printer: "Ticket cuisine",
  },
  ready: "C'est prêt ! Camille est prévenue.",
  phoneLabel: "Le téléphone du client",
  kitchenLabel: "Votre cuisine",
};

/** Bandeau défilant sous le hero. */
export const marquee = [
  "Pizzerias",
  "Boulangeries",
  "Snacks",
  "Pâtisseries",
  "Traiteurs",
  "Burgers",
  "Food trucks",
  "Restaurants",
];

/*
 * À qui ça sert : trois métiers, chacun avec le problème tel qu'il se vit
 * au comptoir et ce que la commande en ligne y change.
 */
export const useCasesSection = {
  id: "pour-qui",
  eyebrow: "Pour qui",
  title: "Le comptoir, sans le téléphone ni le carnet.",
  subtitle:
    "La livraison à 30 % n'est qu'une partie du problème. Le reste se joue au comptoir : le téléphone en plein coup de feu, les réservations sur un bout de papier.",
  problemLabel: "Aujourd'hui",
  solutionLabel: "Avec Ominin Collect",
  items: [
    {
      kicker: "Pizzeria · Snack",
      icon: "phone" as const,
      title: "Le téléphone sonne pendant le coup de feu.",
      problem:
        "Une main sur le four, l'autre sur le combiné : on note mal, on fait répéter, on perd la commande suivante.",
      solution:
        "Ils commandent sur votre page, payent, choisissent leur créneau. La commande tombe en cuisine, prête à lancer.",
    },
    {
      kicker: "Boulangerie · Pâtisserie",
      icon: "cake" as const,
      title: "Le fraisier du samedi, noté sur un post-it.",
      problem:
        "Les réservations s'écrivent sur un carnet, un post-it, une conversation — et se perdent, ou ne sont jamais retirées.",
      solution:
        "Ils réservent pour le jour et l'heure qu'ils veulent, et payent d'avance. Rien ne s'oublie, rien ne se prépare pour rien.",
    },
    {
      kicker: "Restaurant · Traiteur",
      icon: "bag" as const,
      title: "L'emporter qui enrichit les plateformes.",
      problem:
        "Jusqu'à 30 % de chaque commande livrée — et votre client qui commande dans leur app, à côté de vos concurrents.",
      solution:
        `Une page à votre nom, partagée sur Google, Instagram ou votre vitrine. ${rate} par commande, et le client reste le vôtre.`,
    },
  ],
};

/**
 * Comparatif interactif plateforme vs Collect. Taux plateforme : borne haute
 * des grilles publiques livraison (d'où « jusqu'à »). Collect : la seule
 * commission, prélevée sur chaque paiement en ligne.
 */
export const comparisonSection = {
  id: "comparatif",
  eyebrow: "Le comparatif",
  title: "Combien vous coûte une plateforme ?",
  subtitle:
    "Faites glisser les ventes que vous faites aujourd'hui sur une plateforme de livraison : voici sa commission chaque mois, et ce qu'elles vous coûteraient commandées chez vous, à emporter.",
  sliderLabel: "Vos ventes à emporter par mois",
  slider: { min: 1000, max: 15000, step: 500, initial: 4000 },
  platform: {
    label: "Plateforme de livraison",
    rate: platformRate,
    rateLabel: "jusqu'à 30 % par commande livrée",
  },
  ominin: {
    label: "Ominin Collect",
    rate: collectOffer.commission.percent / 100,
    monthlyFee: collectOffer.price,
    rateLabel: `${rate} par commande, 0 €/mois`,
  },
  savingsLabel: "d'économies par an",
  savingsHint: "Si ces clients commandaient chez vous plutôt que sur l'app de la plateforme.",
  disclaimer:
    "Sur la base des grilles publiques des plateformes de livraison en France en 2026 : commission jusqu'à 25–30 % par commande livrée, hors TVA sur commission et hors options payantes (mise en avant, publicité). Le retrait sur ces plateformes coûte moins cher que la livraison ; le comparatif suppose que vos clients commandent chez vous plutôt que sur leur app. Hors frais de carte de votre encaisseur.",
};

export const demoSection = {
  id: "demo",
  eyebrow: "Démo interactive",
  title: "Jouez les deux rôles.",
  subtitle:
    "Le téléphone de votre client, et votre espace de gestion. Passez une commande, lancez la préparation, remettez-la : tout est jouable, rien n'est réel.",
  customerLabel: "Côté client",
  restaurantLabel: "Côté restaurant",
  fullscreenLabel: "Ouvrir la démo en plein écran",
  badge: "Démo · données fictives",
  backLabel: "Retour à la présentation",
};

/** Le parcours, raconté au défilement : un écran par étape. */
export const journey = {
  id: "parcours",
  eyebrow: "Le parcours",
  title: "De la commande au retrait, sans un coup de fil.",
  steps: [
    {
      kicker: "01 · Le lien",
      title: "Votre client ouvre votre page.",
      description:
        "Un lien à votre nom, sur Google, Instagram ou votre vitrine. Votre carte, vos photos, vos formules — pas d'app à installer, pas de compte à créer.",
    },
    {
      kicker: "02 · Le créneau",
      title: "Il choisit quand il passe.",
      description:
        "Dès que possible si vous êtes ouvert, ou un créneau de 15 minutes, aujourd'hui ou un autre jour. Seuls vos horaires sont proposés, et un créneau plein disparaît.",
    },
    {
      kicker: "03 · Le paiement",
      title: "Il paye. Vous êtes réglé.",
      description:
        "Par carte, via Stripe ou Square, directement sur votre compte. Pas de commande fantôme : la cuisine ne lance que ce qui est payé.",
    },
    {
      kicker: "04 · La cuisine",
      title: "Le ticket sort, la préparation part.",
      description:
        "La commande apparaît en direct dans votre espace — et sur votre imprimante cuisine si vous en avez une. Un geste pour lancer la préparation et annoncer un délai.",
    },
    {
      kicker: "05 · Le retrait",
      title: "« C'est prêt ! » Il passe, il repart.",
      description:
        "Votre client suit l'avancement sur son téléphone, l'itinéraire en poche. Déjà payé : il récupère son sac et repart.",
    },
  ],
};

export const featuresSection = {
  id: "fonctionnalites",
  eyebrow: "Dans l'offre",
  title: "Tout ce qu'il faut. Rien à payer d'avance.",
  features: [
    {
      statPrefix: "jusqu'à",
      stat: `${times}×`,
      title: "Moins cher que la livraison",
      description:
        `${rate} par commande contre jusqu'à 30 % sur une commande livrée. Sur 1 000 € d'emporter : ${collectOffer.commission.percent * 10} €, pas 300.`,
      wide: true,
    },
    {
      stat: "Prépayé",
      title: "Zéro commande fantôme",
      description: "Le paiement précède la cuisine : plus de plats préparés pour rien.",
    },
    {
      stat: "15 min",
      title: "Des créneaux qui vous protègent",
      description: "Vous fixez combien de commandes par créneau. Plein, il disparaît.",
    },
    {
      stat: "Direct",
      title: "L'argent sur votre compte",
      description: "Stripe ou Square, versé chez vous. Nous ne touchons pas à votre argent.",
    },
    {
      stat: "Inclus",
      title: "Votre site, refait par nous",
      description:
        "La commande vit sur votre propre site, à vos couleurs. S'il date, on le refait ; s'il n'existe pas, on le crée.",
    },
  ],
};

export const pricingSection = {
  id: "tarif",
  eyebrow: "Tarif",
  title: `${rate} par commande. 0 € par mois.`,
  subtitle:
    `Pas d'abonnement, pas de paliers : une commission sur les commandes payées, jusqu'à ${times}\u00a0fois moins que la livraison, et votre site web compris. Ou le service complet avec Connect.`,
  perOrder: "par commande",
  bundleUnits: { table: "par commande à table", takeaway: "par commande à emporter" },
  commissionLabel: "0 € par mois · sans engagement · frais de carte de votre encaisseur en sus",
  bundleCommissionLabel: "0 € par mois · sans engagement · frais de carte en sus",
  orLabel: "ou",
  featuresLabel: "Inclus :",
  bundleBadge: "Le plus complet",
  bundleFeatures: [
    "Tout le Click & collect, à 5 %",
    "Commande et paiement à table, à 3 %",
    "Salle et emporter dans un seul espace",
    "Ticket cuisine et suivi en direct",
    "Votre site refait, aucun abonnement",
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
      question: "Vous refaites vraiment notre site web ?",
      answer:
        "Oui, c'est compris dans l'offre. Votre page de commande n'est pas un lien vers une plateforme : elle vit sur votre propre site, à votre nom et à vos couleurs. Si votre site date, on le refait ; s'il n'existe pas, on le crée.",
    },
    {
      question: "Quelle différence avec Uber Eats ou Deliveroo ?",
      answer:
        `Sur une commande livrée, les plateformes prélèvent jusqu'à 25–30 % (hors TVA sur la commission et options payantes) — et le client commande dans leur app, à côté de vos concurrents. Ici, la commande passe par votre site, à votre nom : ${rate} par commande, sans abonnement, et la relation client vous appartient.`,
    },
    {
      question: `Pourquoi ${rate}, et rien par mois ?`,
      answer:
        `Nous ne gagnons que quand vous vendez : pas d'abonnement à amortir les mois creux, une commission jusqu'à ${times}\u00a0fois plus basse qu'une commande livrée par une plateforme, quel que soit votre volume.`,
    },
    {
      question: "Mes clients doivent-ils installer une application ?",
      answer:
        "Non. Votre page de commande est un simple lien web : elle s'ouvre dans le navigateur du téléphone, sans compte ni téléchargement.",
    },
    {
      question: "Comment mes clients payent-ils ?",
      answer:
        "Par carte, en ligne, au moment de la commande — via Stripe ou Square, versé directement sur votre compte. La commande ne part en cuisine qu'une fois le paiement confirmé.",
    },
    {
      question: `Les ${rate} comprennent-ils les frais de carte ?`,
      answer:
        `Non : les ${rate} sont la seule rémunération d'Ominin. Les frais de votre encaisseur (Stripe ou Square) s'appliquent à part, comme sur tout paiement par carte — vous les retrouvez sur votre relevé, sans intermédiaire.`,
    },
    {
      question: "Comment les commandes arrivent-elles en cuisine ?",
      answer:
        "En temps réel, dans le même espace de gestion que vos commandes en salle. Vous lancez la préparation, annoncez un délai, et le client suit l'avancement en direct. Avec une imprimante en cuisine, le ticket sort dès le paiement.",
    },
    {
      question: "Puis-je refuser une commande ?",
      answer:
        "Non : une commande payée ne se refuse pas, votre client compte dessus. Vous restez maître de ce qui arrive — vos horaires, le nombre de commandes par créneau, et un plat épuisé se retire de la carte d'un geste.",
    },
    {
      question: "Et si je suis débordé ?",
      answer:
        "Vous fixez le nombre de commandes par créneau de 15 minutes : un créneau plein disparaît de la page de commande. Et seuls vos horaires d'ouverture sont proposés au retrait.",
    },
    {
      question: "Y a-t-il un engagement ?",
      answer:
        "Non. Il n'y a pas d'abonnement : vous arrêtez quand vous voulez, sans frais ni justification.",
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
    `Créez votre compte, ou écrivez-nous : votre page peut être en ligne en 48 heures, votre site refait dans la foulée — et chaque commande vous coûte jusqu'à ${times}\u00a0fois moins qu'en livraison.`,
  contactLabel: "Nous écrire",
  identity: "Ominin, entreprise française",
  microcopy: [`${rate} par commande — pas 30`, "Site web inclus", "Réponse sous 24 h"],
};

export const footer = {
  tagline:
    "Le click & collect à votre nom — pour des pizzerias, des pâtisseries et des restaurants qui gardent leurs marges, leurs clients et leur téléphone libre.",
  customerNotice:
    "Vous cherchez à commander ? Utilisez le lien communiqué par votre restaurant.",
};
