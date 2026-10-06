import { starterKit } from "@/lib/landing-data";
import type { Source } from "@/lib/pitch/types";

/*
 * Ce que les pitchs aux réseaux partagent : l'offre faite aux enseignes, les
 * tarifs de paiement relevés, les formats et le calcul affiché, les sources
 * sectorielles et les libellés d'interface. Le récit propre à chaque enseigne
 * est dans son module, lib/pitch/<slug>.ts.
 *
 * Typographie : espace insécable (\u00a0) avant « : ; ! ? », à l'intérieur
 * des guillemets, avant « € » et « % » et entre les milliers.
 */

// ——— L'offre ———————————————————————————————————————————————————

/*
 * Offre aux réseaux, décidée par le propriétaire : ni abonnement ni plafond,
 * une commission sur les commandes payées en ligne, dégressive selon le
 * chiffre d'affaires du restaurant (paliers fixés avec le réseau, non
 * publiés), un pilote entièrement fourni. Les calculs affichés prennent le
 * taux maximal : ce qu'un restaurant paie au plus. Au déploiement, chaque
 * restaurant règle sa mise en place : le boîtier et la livraison de la
 * commande de démarrage (starterKit) ; les supports QR se chiffrent avec le
 * réseau.
 */
export const offer = {
  commissionPercent: { min: 1, max: 3 },
  setupFee: [starterKit.omilink, starterKit.shipping],
} as const;

/** Tarif Stripe public en France (stripe.com/fr/pricing, relevé le 29/09/2026). */
export const cardFees = {
  standard: { percent: 1.5, fixed: 0.25 },
  premium: { percent: 2.8, fixed: 0.25 },
} as const;

/** Carte au comptoir (SumUp, sans abonnement) : ce que coûte vraiment le passage à la commande mobile. */
export const counterCardPercent = 1.75;

/** Commission Uber Eats à emporter, mesurée (Restaurenta, 20 587 commandes). */
export const uberPickupPercent = 15;

/** Dimensions en pixels CSS des captures (téléphone à 3×, le reste à 2×). */
export const screenSizes = {
  phone: { width: 390, height: 844 },
  tablet: { width: 1180, height: 820 },
  desktop: { width: 1600, height: 1000 },
} as const;

// ——— Formats ——————————————————————————————————————————————————

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneyWhole = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** « 89 € », « 0,45 € », « 1 700 € » : les centimes seulement quand il y en a. */
export const euros = (amount: number) =>
  (Number.isInteger(amount) ? moneyWhole : money).format(amount).replace(/\u202f/g, "\u00a0");

/*
 * Espace insécable pleine, et non fine, avant « % » et entre les milliers :
 * la fine de Poppins est presque nulle, « 3 % » se lisait « 3% » et
 * « 97 100 » se lisait « 97100 ».
 */

/** « 1,5 % », « 3 % ». */
export const percent = (value: number) => `${value.toLocaleString("fr-FR")}\u00a0%`;

export const thousands = (value: number) => value.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");

/** « 1 à 3 % » : la commission, du palier le plus bas au plus haut. */
export const commissionRange = `${offer.commissionPercent.min.toLocaleString("fr-FR")}\u00a0à\u00a0${percent(offer.commissionPercent.max)}`;

/** « 3 % », le taux de tous les calculs affichés. */
export const maxRate = percent(offer.commissionPercent.max);

/** « boîtier Omilink 89 € + livraison 20 € », lu dans le prolongement d'une phrase. */
export const setupFeeLabel = offer.setupFee
  .map((line) => `${line.name[0].toLowerCase()}${line.name.slice(1)} ${euros(line.price)}`)
  .join(" + ");

/** Le boîtier livré, réglé une fois par restaurant. */
export const setupFeeTotal = offer.setupFee.reduce((sum, line) => sum + line.price, 0);

// ——— Le calcul affiché ———————————————————————————————————————————

/**
 * L'illustration du chiffre d'affaires d'un restaurant, hypothèses affichées :
 * un panier supposé, le CA moyen annoncé par l'enseigne pour situer ces
 * clients dans une journée, la part du CA passée en ligne dans l'exemple
 * mensuel, en %, et les clients retenus par jour qui en couvrent le surcoût.
 */
export interface Illustration {
  customersPerDay: number;
  basket: number;
  daysPerYear: number;
  announcedYearlyRevenue: number;
  onlineShare: number;
  coveringCustomers: number;
  /**
   * TVA sur ces ventes et redevances du franchisé, en % : la marge brute se
   * compte hors taxes, et les redevances, proportionnelles aux ventes,
   * s'ajoutent à ce qu'elle doit couvrir. Absentes, le calcul les ignore.
   */
  vatPercent?: number;
  royaltyPercent?: number;
}

const cardFee = (ticket: number) => (ticket * cardFees.standard.percent) / 100 + cardFees.standard.fixed;

export function offerMath(illustration: Illustration) {
  const { customersPerDay, basket, daysPerYear, announcedYearlyRevenue, onlineShare, coveringCustomers, vatPercent = 0, royaltyPercent = 0 } = illustration;
  const rate = offer.commissionPercent.max;

  /** Une commande type payée en ligne : ce qu'elle coûte, ligne par ligne. */
  const exampleOrder = (() => {
    const ominin = (basket * rate) / 100;
    const card = Math.round(cardFee(basket) * 100) / 100;
    return {
      ticket: basket,
      ominin,
      card,
      total: Math.round((ominin + card) * 100) / 100,
      counter: Math.round(basket * counterCardPercent) / 100,
    };
  })();

  /** Ce que paie par mois un restaurant au CA annoncé, dont une part passe en ligne. */
  const monthlyExample = (() => {
    const online = (announcedYearlyRevenue * onlineShare) / 100 / 12;
    const orders = online / basket;
    const ominin = (online * rate) / 100;
    const card = orders * cardFee(basket);
    // Ce que la même somme aurait coûté par carte au comptoir : le vrai surcoût est la différence.
    const counter = (online * counterCardPercent) / 100;
    const extra = ominin + card - counter;
    const coveringOrders = (coveringCustomers * daysPerYear) / 12;
    const coveringSales = coveringOrders * basket;
    // Ces clients retenus paient peut-être en ligne eux aussi : leurs propres frais s'ajoutent au surcoût.
    const coveringFees = coveringOrders * (ominin / orders + cardFee(basket));
    const coveringNet = coveringSales / (1 + vatPercent / 100);
    const coveringRoyalties = (coveringNet * royaltyPercent) / 100;
    // Chaque terme arrondi à la dizaine, et la somme faite des termes affichés :
    // arrondie à part, elle pouvait s'écarter de 10 € de l'addition qu'on lit.
    const tens = (value: number) => Math.round(value / 10) * 10;
    return {
      share: onlineShare,
      ominin: tens(ominin),
      card: tens(card),
      counter: tens(counter),
      extra: tens(ominin) + tens(card) - tens(counter),
      coveringCustomers,
      coveringSales: tens(coveringSales),
      /** Marge brute (hors taxes) qui, sur ces ventes, couvre le surcoût, leurs propres frais en ligne et les redevances qu'elles paient. */
      breakEvenMargin: Math.round(((extra + coveringFees + coveringRoyalties) / coveringNet) * 100),
      /** Le surcoût, en part du chiffre d'affaires du restaurant. */
      extraOfRevenue: Math.round((extra / (announcedYearlyRevenue / 12)) * 1000) / 10,
    };
  })();

  /**
   * L'illustration chiffrée, arrondie comme il se doit d'une estimation : le
   * mois à la centaine, l'année faite de douze de ces mois (arrondis chacun
   * de son côté, « 2 300 € par mois, soit 27 000 € par an » ne se recoupaient pas).
   */
  const revenueIllustration = (() => {
    const monthly = Math.round((customersPerDay * daysPerYear * basket) / 12 / 100) * 100;
    const ordersPerDay = Math.round(announcedYearlyRevenue / daysPerYear / basket);
    return {
      revenue: monthly * 12,
      monthly,
      ordersPerDay,
      /** Ces clients en plus : « 1 sur N » des commandes d'une journée. */
      oneIn: Math.round(ordersPerDay / customersPerDay),
    };
  })();

  return { exampleOrder, monthlyExample, revenueIllustration };
}

/** La barre d'une durée, à l'échelle de la plus longue : jamais moins de 2 %, pour rester visible. */
export const raceBarWidth = (seconds: number, longest: number) => `${Math.max(2, (seconds / longest) * 100)}%`;

// ——— Sources sectorielles ——————————————————————————————————————————

export const commonSources = {
  akto: {
    short: "AKTO / Toluna-Harris Interactive, 2024",
    full: "AKTO / Toluna-Harris Interactive\u00a0— Les nouvelles attentes des clients de la restauration rapide, juillet 2024 (n\u00a0=\u00a01\u00a0084, France), p.\u00a020 à 32",
    url: "https://observatoire.akto.fr/content/uploads/sites/3/2024/10/Restauration-rapide-Etude-nouvelles-attentes-des-clients-2024-Rapport.pdf",
  },
  lu: {
    short: "Lu et al., Management Science, 2013 (rayon traiteur)",
    full: "Lu, Musalem, Olivares, Schilkrut\u00a0— Measuring the Effect of Queues on Customer Purchases, Management Science 59(8), 2013 (rayon traiteur d’un hypermarché)",
    url: "https://pubsonline.informs.org/doi/10.1287/mnsc.1120.1686",
  },
  bmo: {
    short: "France Travail, BMO 2026",
    full: "France Travail\u00a0— enquête Besoins en main-d’œuvre 2026, Éclairages & Synthèses nº\u00a087, avril 2026",
    url: "https://statistiques.francetravail.org/bmo",
  },
  sumup: {
    short: "SumUp, 2026",
    full: `SumUp\u00a0— tarif sans abonnement\u00a0: ${percent(counterCardPercent)} par paiement par carte au comptoir, consulté le 29/09/2026`,
    url: "https://www.sumup.com/fr-fr/tarifs/",
  },
  uber: {
    short: "Restaurenta, 20/06/2026",
    full: "Restaurenta\u00a0— commission Uber Eats à emporter mesurée sur 20\u00a0587 commandes, 20/06/2026",
    url: "https://restaurenta.fr/blogs/blog/commission-uber-eats-vraie-marge",
  },
  kiosks: {
    short: "Biborne, Innovorder, Tabesto",
    full: "Prix publiés des bornes de commande\u00a0— Biborne (16/04/2024), Innovorder (02/09/2026), Tabesto",
    url: "https://biborne.com/fr-blog/quel-prix-borne-de-commande/",
  },
  saas: {
    short: "Sunday, Obypay",
    full: "Tarifs publics des logiciels de commande\u00a0— Sunday (29 à 199\u00a0€ par\u00a0mois) et Obypay (49 à 199\u00a0€\u00a0HT par\u00a0mois), consultés le 29/09/2026",
    url: "https://sundayapp.com/fr/tarifs/",
  },
} satisfies Record<string, Source>;

/** Les tarifs Stripe relevés ; `extra` ajoute un cas propre au réseau (un compte hors de France). */
export const stripeSource = (extra = ""): Source => ({
  short: "Stripe, 29/09/2026",
  full: `Stripe\u00a0— tarifs France, relevés le 29/09/2026\u00a0: ${percent(cardFees.standard.percent)} + ${euros(cardFees.standard.fixed)} par carte européenne standard, ${percent(cardFees.premium.percent)} + ${euros(cardFees.premium.fixed)} par carte premium${extra}`,
  url: "https://stripe.com/fr/pricing",
});

// ——— Libellés d'interface ——————————————————————————————————————————

export const pitchUi = {
  tryDemo: "Essayer la démo",
  sourcesToggle: "Sources et méthode",
  sourcesTitle: "Sources",
  demoEyebrow: "Essayez la démo",
  demoScan: "Scannez avec votre téléphone",
  demoOpen: "Ouvrir la démo",
  demoLive: "Démos en ligne, sur données de démonstration\u00a0: chacune s’ouvre dans un nouvel onglet.",
  demoShort: "La démo",
  newTab: "(nouvel onglet)",
  ctaDeck: "Télécharger la présentation (PDF)",
  ctaDeckWeb: "Voir la présentation",
  /** Mention des captures cliquables : dans le PDF, chaque écran ouvre sa démo. */
  clickToOpen: "Démo en ligne\u00a0: cliquez sur l’écran.",
  /** Sous la conclusion du PDF : la page privée, pour qui le reçoit transféré. */
  filmAndDemos: "Le film et les démos\u00a0:",
  opener: {
    skip: "Passer",
    soundOn: "Activer le son",
    soundOff: "Couper le son",
    play: "Lancer le film",
  },
};

/** « Source : … » / « Sources : … » en pied de bloc. */
export const sourcesLabel = (count: number) => (count > 1 ? "Sources\u00a0: " : "Source\u00a0: ");
