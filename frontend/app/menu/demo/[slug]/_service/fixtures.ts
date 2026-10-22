import {
  DEFAULT_COLLECT_SLOT_MINUTES,
  DEFAULT_DAY_END_HOUR,
  FEATURES,
} from "@/lib/gestion/constants";
import { orderTotal } from "@/lib/gestion/selectors";
import type {
  GestionState,
  Order,
  OrderItem,
  OrderItemOption,
  PaymentLeg,
  ServiceMode,
  Table,
} from "@/lib/gestion/types";
import type { MenuItem, Restaurant } from "@/lib/menu-data";

/*
 * Le socle des services de démonstration (../comptoir, ../salle), joués sans
 * base : l'espace de gestion d'un restaurant de la carte (lib/menu-data) et
 * ses commandes réglées, en ligne ou au comptoir. Les articles sont désignés par leur nom sur
 * la carte et leurs choix par libellé : chaque libellé va au premier groupe
 * de l'article qui le propose, un groupe obligatoire sans libellé prend son
 * premier choix, et une ligne dont l'article a quitté la carte disparaît de
 * la commande.
 */

/**
 * rush : le coup de feu commence, les commandes arrivent sous les yeux ;
 * fige : le service plein, rien n'arrive.
 */
export const SCENARIOS = ["rush", "fige"] as const;
export type Scenario = (typeof SCENARIOS)[number];

/** Article par son nom sur la carte, quantité, libellés des choix voulus. */
export type Line = readonly [name: string, quantity: number, ...choices: string[]];

const sameLabel = (a: string, b: string) =>
  a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;

function orderLine(
  items: MenuItem[],
  [name, quantity, ...wanted]: Line,
  id: string,
  paidMode: PaymentLeg
): OrderItem | null {
  const item = items.find((candidate) => sameLabel(candidate.name, name));
  if (!item) return null;
  const left = [...wanted];
  const options: OrderItemOption[] = [];
  for (const group of item.options ?? []) {
    const matches = left.flatMap((label) => {
      const choice = group.choices.find((candidate) => sameLabel(candidate.name, label));
      return choice ? [choice] : [];
    });
    const chosen = group.multiple ? matches : matches.slice(0, 1);
    if (chosen.length === 0 && group.obligatoire) chosen.push(group.choices[0]);
    for (const choice of chosen) {
      const index = left.findIndex((label) => sameLabel(label, choice.name));
      if (index !== -1) left.splice(index, 1);
      options.push({
        groupName: group.name,
        choiceName: choice.name,
        supplement: choice.supplement,
      });
    }
  }
  return {
    id,
    itemId: item.id,
    // Le format entre parenthèses, « Tenders (x4) » : sur l'écran du
    // personnel, la ligne commence par sa quantité (« 1× »), et « x4 » nu
    // s'y lirait comme une seconde. Jamais seul à la ligne (« pour / 2 »).
    name: item.detail ? `${item.name}\u00a0(${item.detail.replaceAll(" ", "\u00a0")})` : item.name,
    quantity,
    // Convention de place_order : suppléments inclus dans unitPrice.
    unitPrice: options.reduce((sum, option) => sum + option.supplement, item.price),
    options: options.length > 0 ? options : undefined,
    paidMode,
  };
}

/**
 * Une commande sur place réglée — en ligne depuis la table, ou au comptoir
 * (paidBy) —, ses `served.lines` premières lignes apportées à `served.at` ;
 * null quand aucune de ses lignes n'est plus à la carte.
 */
export function paidOrder(
  items: MenuItem[],
  id: string,
  lines: readonly Line[],
  createdAt: string,
  place: Pick<Order, "status" | "tableId" | "orderNumber">,
  paidBy: PaymentLeg = "en_ligne",
  served: { lines: number; at: string } = { lines: 0, at: createdAt }
): Order | null {
  const orderItems = lines.flatMap((line, index) => {
    const item = orderLine(items, line, `${id}-${index}`, paidBy);
    return item ? [index < served.lines ? { ...item, servedAt: served.at } : item] : [];
  });
  if (orderItems.length === 0) return null;
  const order: Order = {
    id,
    type: "sur_place",
    ...place,
    createdAt,
    items: orderItems,
    paymentMode: paidBy === "en_ligne" ? "carte" : paidBy,
    paidOnline: paidBy === "en_ligne",
    payments: [],
  };
  order.payments = [{ mode: paidBy, amount: orderTotal(order), paidAt: createdAt }];
  return order;
}

/** Un service de démonstration ouvert : l'espace amorcé, puis ce qui arrive. */
export interface ServiceDemo {
  state: GestionState;
  /** La index-ième commande passée après l'ouverture, datée de createdAt, dans l'espace tel qu'il est (state). */
  arrival: (index: number, createdAt: string, state: GestionState) => Order | null;
  /** Attente avant l'arrivée index, en millisecondes. */
  delayMs: (index: number) => number;
  /** Cartes à servir au-delà desquelles l'arrivée suivante attend un service. */
  maxOpen: number;
  /**
   * L'heure du service à l'ouverture (ms), quand ce n'est pas celle de
   * l'appareil : useServiceDemo la fait courir, la tient en fige, l'arrête
   * onglet caché.
   */
  serviceStart?: number;
}

/** L'espace de gestion du restaurant, sans base : chaque commande y arrive réglée, en ligne ou encaissée. */
export function demoState(
  restaurant: Restaurant,
  serviceMode: ServiceMode,
  tables: Table[],
  orders: Order[]
): GestionState {
  return {
    etablissement: {
      id: `demo-${restaurant.slug}`,
      slug: restaurant.slug,
      name: restaurant.name,
      tagline: restaurant.tagline,
      address: restaurant.address,
      phone: restaurant.phone,
      hours: restaurant.hours,
      openingHours: null,
      offre: "connect",
      serviceMode,
      showTableNumber: false,
      categoryLayout: restaurant.categoryLayout ?? "top",
      onlinePayment: true,
      paymentProvider: "stripe",
      collectSlotCapacity: 0,
      collectSlotMinutes: DEFAULT_COLLECT_SLOT_MINUTES,
      onlineMinOrder: null,
      adminPinSet: false,
      paymentPinSet: false,
    },
    subscriptionStatus: "active",
    offreTrial: null,
    collectSubscriptionStatus: null,
    userId: "demo",
    visitesVues: null,
    role: "gerant",
    members: [],
    features: Object.fromEntries(FEATURES.map((feature) => [feature, true])) as GestionState["features"],
    // Rien n'attend l'encaissement : pas d'onglet « À encaisser ».
    orderTabs: ["a_servir", "historique"],
    dayEndHour: DEFAULT_DAY_END_HOUR,
    orderNumberResetHour: null,
    staff: [],
    categories: restaurant.categories,
    formules: [],
    affiches: [],
    priceRules: [],
    closures: [],
    tables,
    orders,
  };
}
