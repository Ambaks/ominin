import { mapsDirectionsHref } from "@/lib/collect/shared";
import type { OrderStatus } from "@/lib/gestion/types";
import { DEMO_SLUG, getRestaurant, type MenuItem } from "@/lib/menu-data";

/*
 * Fixtures et réglages de la démo interactive Collect (landing). L'unique
 * endroit avec des nombres : minuteries, persona, sous-ensemble du menu.
 * Le menu vient de la Trattoria Lucia (lib/menu-data.ts), jamais dupliqué.
 */

/** Étapes de la démo : parcours client puis cycle de vie de la commande
 * (miroir du flux collect réel : en_attente → en_preparation → prete →
 * retiree, annulee en refus). */
export type DemoStep =
  | "menu"
  | "checkout"
  | "paiement"
  | "en_attente"
  | "en_preparation"
  | "prete"
  | "retiree"
  | "annulee";

const restaurant = getRestaurant(DEMO_SLUG)!;

/** Sections de la démo : catégories de la Trattoria, N plats chacune —
 * assez pour que la navigation par catégories ait du sens dans un écran
 * de téléphone, sans noyer le visiteur. */
const DEMO_MENU_CATEGORIES = [
  { id: "antipasti", take: 3 },
  { id: "pizzas", take: 3 },
  { id: "pates", take: 2 },
  { id: "desserts", take: 2 },
  { id: "cocktails", take: 2 },
];

export interface DemoMenuSection {
  id: string;
  name: string;
  items: MenuItem[];
}

export function buildDemoMenu(): DemoMenuSection[] {
  return DEMO_MENU_CATEGORIES.flatMap(({ id, take }) => {
    const category = restaurant.categories.find((entry) => entry.id === id);
    return category
      ? [{ id, name: category.name, items: category.items.slice(0, take) }]
      : [];
  });
}

export const COLLECT_DEMO = {
  restaurant: {
    name: restaurant.name,
    tagline: restaurant.tagline,
    address: restaurant.address,
    coverImage: restaurant.coverImage,
  },
  timings: {
    /** Faux paiement Stripe côté téléphone. */
    paymentMs: 1600,
    /** « Webhook » : différé avant l'apparition côté restaurant. */
    orderArrivalMs: 900,
    /** Inactivité avant que la puce guide fasse respirer le prochain bouton. */
    hintDelayMs: 3500,
    /** Tic du compte à rebours affiché sur le téléphone. */
    countdownTickMs: 1000,
  },
  customer: { name: "Camille", phone: "06 12 34 56 78" },
  itineraryUrl: mapsDirectionsHref(`${restaurant.name}, ${restaurant.address}`),
  /** Puce guide : la prochaine action, nommée — jamais d'auto-play. */
  hints: {
    menu: "Composez la commande sur le téléphone.",
    checkout: "Validez : le paiement est simulé, le parcours est le vrai.",
    paiement: "Paiement en cours…",
    en_attente: "À vous de jouer côté restaurant : acceptez la commande.",
    en_preparation: "Votre client suit tout en direct. Marquez la commande prête.",
    prete: "Le client est prévenu — marquez-la retirée au comptoir.",
    retiree: "Et voilà : commandée, payée, retirée. Rejouez quand vous voulez.",
    annulee: "Le client est prévenu du refus. Rejouez la démo.",
  } satisfies Record<DemoStep, string>,
  /** Annonces lecteur d'écran (région aria-live du stage). Vide = silence. */
  announcements: {
    menu: "",
    checkout: "",
    paiement: "Paiement simulé en cours.",
    en_attente: "Commande envoyée au restaurant.",
    en_preparation: "Commande acceptée, en préparation.",
    prete: "Commande prête.",
    retiree: "Commande retirée. Démo terminée.",
    annulee: "Commande refusée par le restaurant.",
  } satisfies Record<DemoStep, string>,
  /** Copy du suivi côté téléphone — miroir du vrai order-confirmation. */
  customerStatus: {
    en_attente: {
      title: "Commande reçue !",
      hint: "Le restaurant va la prendre en charge.",
    },
    en_preparation: {
      title: "En préparation",
      hint: "Votre commande est en cuisine.",
    },
    prete: {
      title: "C'est prêt !",
      hint: "Votre commande vous attend au comptoir.",
    },
    retiree: {
      title: "Commande retirée",
      hint: "Merci et à bientôt !",
    },
    annulee: {
      title: "Commande annulée",
      hint: "Le restaurant n'a pas pu honorer votre commande. Pour toute question — remboursement compris — contactez-le directement.",
    },
  } satisfies Partial<Record<OrderStatus, { title: string; hint: string }>>,
  /** Micro-copy sous le bouton Payer — la démo assume qu'elle simule. */
  paymentNotice:
    "Démo — paiement simulé. Dans le vrai parcours, paiement sécurisé par Stripe.",
} as const;
