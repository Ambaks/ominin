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

/** Plats de la démo : un par famille, tous sans options (ajout en un tap). */
const DEMO_MENU_ITEM_IDS = [
  "planche-lucia",
  "burrata",
  "margherita",
  "carbonara",
  "tiramisu",
  "spritz",
];

export function buildDemoMenu(): MenuItem[] {
  const byId = new Map(
    restaurant.categories.flatMap((category) =>
      category.items.map((item) => [item.id, item] as const)
    )
  );
  return DEMO_MENU_ITEM_IDS.flatMap((id) => byId.get(id) ?? []);
}

export const COLLECT_DEMO = {
  restaurant: {
    name: restaurant.name,
    tagline: restaurant.tagline,
    address: restaurant.address,
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
