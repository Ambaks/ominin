import { mapsDirectionsHref } from "@/lib/collect/shared";
import type { OrderStatus } from "@/lib/gestion/types";
import { DEMO_SLUG, getRestaurant, type MenuItem } from "@/lib/menu-data";

/*
 * Fixtures et réglages de la démo interactive Collect. L'unique endroit
 * avec des nombres : minuteries, persona, sous-ensemble du menu. Les menus
 * viennent de lib/menu-data.ts, jamais dupliqués. La même scène sert la
 * landing (Trattoria Lucia) et les démos client (/collect/demo/[slug]) :
 * tout ce qui dépend du restaurant passe par demoRestaurantInfo(slug) et
 * buildDemoMenu(slug), le reste (copy, minuteries) est partagé.
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

/** Sous-ensemble du menu par restaurant : la démo de la landing montre un
 * extrait de la Trattoria (assez pour que la navigation par catégories ait
 * du sens dans un écran de téléphone, sans noyer le visiteur). Un client
 * démo sans entrée ici joue sa carte complète. */
const DEMO_MENU_SPEC: Record<string, { id: string; take: number }[]> = {
  [DEMO_SLUG]: [
    { id: "antipasti", take: 3 },
    { id: "pizzas", take: 3 },
    { id: "pates", take: 2 },
    { id: "desserts", take: 2 },
    { id: "cocktails", take: 2 },
  ],
  boho: [
    { id: "a-partager", take: 3 },
    { id: "grillades", take: 3 },
    { id: "pizzas", take: 2 },
    { id: "desserts", take: 3 },
    { id: "cocktails", take: 3 },
  ],
};

export interface DemoMenuSection {
  id: string;
  name: string;
  items: MenuItem[];
}

export function buildDemoMenu(slug: string = DEMO_SLUG): DemoMenuSection[] {
  const restaurant = getRestaurant(slug);
  if (!restaurant) return [];
  const spec = DEMO_MENU_SPEC[slug];
  if (!spec) {
    return restaurant.categories.map(({ id, name, items }) => ({
      id,
      name,
      items,
    }));
  }
  return spec.flatMap(({ id, take }) => {
    const category = restaurant.categories.find((entry) => entry.id === id);
    return category
      ? [{ id, name: category.name, items: category.items.slice(0, take) }]
      : [];
  });
}

/** Identité du restaurant joué par la démo (volets client et restaurant). */
export interface DemoRestaurantInfo {
  name: string;
  tagline: string;
  address: string;
  coverImage?: string;
  itineraryUrl: string;
}

export function demoRestaurantInfo(slug: string = DEMO_SLUG): DemoRestaurantInfo {
  const restaurant = getRestaurant(slug)!;
  return {
    name: restaurant.name,
    tagline: restaurant.tagline,
    address: restaurant.address,
    coverImage: restaurant.coverImage,
    itineraryUrl: mapsDirectionsHref(`${restaurant.name}, ${restaurant.address}`),
  };
}

export const COLLECT_DEMO = {
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
  customer: { name: "Camille", phone: "06 12 34 56 78" } as const,
  /** Réglages des créneaux de retrait pour la démo. */
  slots: {
    /** Temps de préparation de base (minutes) — décale le premier créneau. */
    prepMinutes: 15,
    /** Intervalle entre chaque créneau (minutes). */
    intervalMinutes: 15,
    /** Nombre de créneaux proposés après « Dès que possible ». */
    count: 4,
    /** Capacité par créneau (commandes). */
    capacity: 5,
    /** Commandes déjà « prises » sur certains créneaux (index 0-based). */
    takenBySlot: [2, 4, 5, 1] as readonly number[],
  },
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
