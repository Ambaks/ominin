import { DEFAULT_DAY_END_HOUR, FEATURES } from "@/lib/gestion/constants";
import { orderTotal } from "@/lib/gestion/selectors";
import type {
  GestionState,
  Order,
  OrderItem,
  OrderItemOption,
} from "@/lib/gestion/types";
import { getRestaurant, type MenuItem } from "@/lib/menu-data";

/*
 * Un coup de feu au comptoir, joué sans base : les commandes payées en ligne
 * d'un restaurant fast food, telles que l'espace de gestion les reçoit. Les
 * articles sont désignés par leur nom sur la carte (lib/menu-data) et leurs
 * choix par libellé : chaque libellé va au premier groupe de l'article qui
 * le propose, un groupe obligatoire sans libellé prend son premier choix, et
 * une ligne dont l'article a quitté la carte disparaît de la commande.
 */

/**
 * rush : le coup de feu commence, la file se remplit sous les yeux ; fige :
 * la file pleine, rien n'arrive.
 */
export const SCENARIOS = ["rush", "fige"] as const;
export type Scenario = (typeof SCENARIOS)[number];

/** Article par son nom sur la carte, quantité, libellés des choix voulus. */
type Line = readonly [name: string, quantity: number, ...choices: string[]];

interface Ticket {
  number: number;
  /** Passée il y a tant de minutes, à l'ouverture de l'écran. */
  minutesAgo: number;
  status: "servie" | "prete" | "payee";
  lines: Line[];
}

interface Service {
  /** Le restaurant que montre l'écran, quand la carte est celle de tout un réseau. */
  site?: string;
  /** Le service jusqu'ici, numéros consécutifs : remises, prêtes, en préparation. */
  tickets: Ticket[];
  /**
   * Commandes ouvertes déjà là quand le coup de feu commence (rush) ; les
   * suivantes arrivent. Assez peu pour que l'arrivée se voie à l'écran.
   */
  openAtStart: number;
  /** Payées ensuite, dans cet ordre, reprises en boucle sous les numéros suivants. */
  arrivals: Line[][];
  /** Secondes avant chaque arrivée, reprises en boucle. */
  cadenceS: number[];
  /** Commandes ouvertes au-delà desquelles l'arrivée suivante attend une remise. */
  maxOpen: number;
}

const SERVICES: Record<string, Service> = {
  "o-crousti-poulet": {
    tickets: [
      { number: 30, minutesAgo: 40, status: "servie", lines: [["Menu Solo", 1, "1 cuisse", "Potatoes", "Pepsi"]] },
      { number: 31, minutesAgo: 36, status: "servie", lines: [["Menu Duo", 1, "Riz Crousti", "Potatoes", "Pepsi", "Lipton"]] },
      { number: 32, minutesAgo: 33, status: "servie", lines: [["Poulet Entier", 1], ["Riz Crousti", 1], ["Bouteille", 1, "Pepsi"]] },
      { number: 33, minutesAgo: 29, status: "servie", lines: [["Menu Costaud", 1, "Patates Sautées", "7Up", "Sauce Piquante"]] },
      { number: 34, minutesAgo: 25, status: "servie", lines: [["Menu Solo", 2, "3 pilons", "Potatoes", "Lipton"]] },
      { number: 35, minutesAgo: 21, status: "servie", lines: [["Tenders croustillants", 2], ["Potatoes", 1], ["Canette", 1, "Pepsi"]] },
      { number: 36, minutesAgo: 16, status: "payee", lines: [["Menu Solo", 1, "4 ailes", "Potatoes", "Pepsi", "Sauce Piquante"], ["Donut Poulet & Cheese", 1]] },
      { number: 37, minutesAgo: 12, status: "prete", lines: [["Menu Costaud", 1, "Riz Oriental", "Lipton"]] },
      { number: 38, minutesAgo: 10, status: "prete", lines: [["Menu Solo", 2, "2 tenders", "Riz Crousti", "Pepsi"]] },
      { number: 39, minutesAgo: 9, status: "payee", lines: [["Menu Duo", 1, "Potatoes", "Pâtes Crémo", "Pepsi", "7Up", "Sauce Verte"], ["Tarte Daim", 1]] },
      { number: 40, minutesAgo: 6, status: "payee", lines: [["Demi Poulet", 1], ["Riz Crousti", 1], ["Canette", 1, "Lipton"]] },
      { number: 41, minutesAgo: 5, status: "payee", lines: [["Menu Solo", 1, "2 saucisses", "Patates Sautées", "7Up"]] },
      { number: 42, minutesAgo: 4, status: "payee", lines: [["Menu Gourmand", 1, "10 pilons", "Potatoes", "Alloco", "Pepsi", "Pepsi", "Sauce Piquante"]] },
      { number: 43, minutesAgo: 3, status: "payee", lines: [["Menu Family", 1, "2 poulets", "Riz Crousti", "Riz Crousti", "Potatoes", "Alloco", "Pepsi", "Sauce Oignons"]] },
      { number: 44, minutesAgo: 2, status: "payee", lines: [["Menu Costaud", 1, "Potatoes", "Pepsi", "Sauce Oignons"], ["Nems au Poulet", 4]] },
      { number: 45, minutesAgo: 1, status: "payee", lines: [["Menu Solo", 1, "1 cuisse", "Alloco", "Lipton"], ["Tiramisu", 1]] },
    ],
    openAtStart: 5,
    arrivals: [
      [["Ailes de Poulet", 2], ["Potatoes", 1], ["Canette", 1, "7Up"]],
      [["Menu Solo", 1, "1 cuisse", "Riz Oriental", "Lipton"]],
      [["Menu Duo", 1, "Potatoes", "Riz Crousti", "Pepsi", "Pepsi"], ["Donut Poulet & Cheese", 1]],
      [["Menu Costaud", 1, "Potatoes", "7Up", "Sauce Piquante"]],
      [["Poulet Entier", 1], ["Riz Crousti", 1], ["Pâtes Crémo", 1], ["Bouteille", 1, "Pepsi"]],
      [["Menu Solo", 3, "4 ailes", "Potatoes", "Pepsi"]],
      [["Menu Gourmand", 1, "4 cuisses", "Riz Crousti", "Patates Sautées", "Lipton", "7Up"], ["Tiramisu", 1]],
      [["Menu Solo", 1, "3 pilons", "Pâtes Crémo", "7Up"], ["Bricks au Poulet", 2]],
      [["Menu Family", 1, "4 cuisses", "Potatoes", "Potatoes", "Riz Crousti", "Alloco", "Pepsi", "Sauce Verte"]],
    ],
    cadenceS: [6, 14, 11, 18, 9, 15, 21, 12],
    maxOpen: 14,
  },
  "chicken-street": {
    site: "Paris Gare de l’Est",
    tickets: [
      { number: 33, minutesAgo: 41, status: "servie", lines: [["Menu Naan Mix", 1, "Frites", "Coca-Cola", "Sauce Algérienne"]] },
      { number: 34, minutesAgo: 37, status: "servie", lines: [["Family Tenders", 1, "Sauce Blanche"], ["Soda 33\u00a0cl", 2, "Coca-Cola"]] },
      { number: 35, minutesAgo: 34, status: "servie", lines: [["Menu Street B", 1, "Frites", "Fanta Orange", "Sauce Samouraï"]] },
      { number: 36, minutesAgo: 30, status: "servie", lines: [["Naan Tenders Steak", 2, "Sauce Blanche", "Cheddar"], ["Box Onion Rings", 1]] },
      { number: 37, minutesAgo: 26, status: "servie", lines: [["Menu Burger Naan Dynamite", 1, "Frites", "Sprite", "Sauce Dynamite"]] },
      { number: 38, minutesAgo: 22, status: "servie", lines: [["Menu Monster", 1, "Onion rings", "Coca-Cola Zero", "Sauce Monster"], ["Menu Enfant Nuggets", 1, "Oasis Tropical"]] },
      { number: 39, minutesAgo: 17, status: "payee", lines: [["Naan Curry", 1, "Sauce Blanche"], ["Tiramisu", 1]] },
      { number: 40, minutesAgo: 13, status: "prete", lines: [["Menu Tenders 5\u00a0pièces", 1, "Frites", "Fuze Tea", "Sauce Cheddar"]] },
      { number: 41, minutesAgo: 11, status: "prete", lines: [["Menu Naan Mix", 2, "Frites", "Coca-Cola", "Sauce Algérienne"]] },
      { number: 42, minutesAgo: 9, status: "payee", lines: [["Menu Naan Tenders", 1, "Frites", "Coca-Cola Cherry", "Sauce Algérienne", "Sauce Samouraï"], ["Ice Street", 1, "Caramel salé", "Oreo"]] },
      { number: 43, minutesAgo: 7, status: "payee", lines: [["Box Mix 16\u00a0pièces", 1, "Sauce Dynamite"], ["Soda 33\u00a0cl", 2, "Coca-Cola"]] },
      { number: 44, minutesAgo: 5, status: "payee", lines: [["Burger Naan Dynamite", 2, "Sauce Dynamite"], ["Box Onion Rings", 1]] },
      { number: 45, minutesAgo: 4, status: "payee", lines: [["Menu Monster", 1, "Frites", "Sprite", "Sauce Poivre"]] },
      { number: 46, minutesAgo: 3, status: "payee", lines: [["Naan Radikal", 1, "Sauce Algérienne", "Œuf"], ["Wings 3\u00a0pièces", 1, "Sauce Sweet Thaï"]] },
      { number: 47, minutesAgo: 2, status: "payee", lines: [["Family Mix", 1, "Sauce Blanche"]] },
      { number: 48, minutesAgo: 1, status: "payee", lines: [["Menu Naan Tenders", 1, "Frites", "Coca-Cola", "Sauce Blanche"], ["Ice Mix", 1, "Nutella", "Speculoos"]] },
    ],
    openAtStart: 5,
    arrivals: [
      [["Menu Street B", 1, "Frites", "Coca-Cola", "Sauce Algérienne"]],
      [["Naan Supreme", 1, "Sauce Blanche"], ["Tenders 3\u00a0pièces", 1, "Sauce Cheddar"]],
      [["Menu Tenders 5\u00a0pièces", 2, "Frites", "Coca-Cola Cherry", "Sauce Samouraï"]],
      [["Family Spicy", 1, "Sauce Dynamite"], ["Soda 33\u00a0cl", 3, "Fanta Orange"]],
      [["Menu Naan Mix", 1, "Onion rings", "Fuze Tea", "Sauce Blanche"], ["Menu Enfant Cheese", 1, "Oasis Tropical"]],
      [["Twice", 1, "Sauce Ketchup"], ["Box Mix Solo", 1, "Sauce Algérienne"]],
      [["Menu Burger Naan Dynamite", 1, "Frites", "Sprite", "Sauce Monster"]],
      [["Naan Thaï", 1, "Sauce Sweet Thaï"], ["Ice Street", 1, "Chocolat", "Daim"]],
    ],
    cadenceS: [6, 30, 38, 26, 44, 29, 36, 24],
    maxOpen: 14,
  },
};

export function hasCounterDemo(slug: string): boolean {
  return Object.hasOwn(SERVICES, slug);
}

/** « Chicken Street · Paris Gare de l’Est » : l'enseigne, et le restaurant s'il est précisé. */
export function counterTitle(slug: string, name: string): string {
  const site = SERVICES[slug]?.site;
  return site ? `${name} · ${site}` : name;
}

const sameLabel = (a: string, b: string) =>
  a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;

function orderLine(
  items: MenuItem[],
  [name, quantity, ...wanted]: Line,
  id: string
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
    // Le nom du ticket client : « Tenders x4 », pas « 2× Tenders ».
    name: item.detail ? `${item.name} ${item.detail}` : item.name,
    quantity,
    // Convention de place_order : suppléments inclus dans unitPrice.
    unitPrice: options.reduce((sum, option) => sum + option.supplement, item.price),
    options: options.length > 0 ? options : undefined,
    paidMode: "en_ligne",
  };
}

function paidOnline(
  items: MenuItem[],
  number: number,
  status: Order["status"],
  lines: readonly Line[],
  createdAt: string
): Order | null {
  const orderItems = lines.flatMap(
    (line, index) => orderLine(items, line, `demo-${number}-${index}`) ?? []
  );
  if (orderItems.length === 0) return null;
  const order: Order = {
    id: `demo-${number}`,
    type: "sur_place",
    tableId: null,
    orderNumber: number,
    status,
    createdAt,
    items: orderItems,
    paymentMode: "carte",
    paidOnline: true,
    payments: [],
  };
  order.payments = [{ mode: "en_ligne", amount: orderTotal(order), paidAt: createdAt }];
  return order;
}

export interface CounterDemo {
  state: GestionState;
  /** La index-ième commande payée après l'ouverture, datée de createdAt. */
  arrival: (index: number, createdAt: string) => Order | null;
  /** Attente avant l'arrivée index, en millisecondes. */
  delayMs: (index: number) => number;
  maxOpen: number;
}

/** Le service au comptoir de slug, ouvert à openedAt (ms). */
export function counterDemo(
  slug: string,
  openedAt: number,
  scenario: Scenario
): CounterDemo | null {
  const restaurant = getRestaurant(slug);
  if (!restaurant || !hasCounterDemo(slug)) return null;
  const service = SERVICES[slug];
  const items = restaurant.categories.flatMap((category) => category.items);

  const closed = service.tickets.filter((ticket) => ticket.status === "servie");
  const open = service.tickets.filter((ticket) => ticket.status !== "servie");
  const deferred = scenario === "rush" ? open.slice(service.openAtStart) : [];
  const present = [...closed, ...open.slice(0, open.length - deferred.length)];
  const firstArrival =
    deferred[0]?.number ??
    Math.max(...service.tickets.map((ticket) => ticket.number)) + 1;
  const linesOf = (index: number) =>
    index < deferred.length
      ? deferred[index].lines
      : service.arrivals[(index - deferred.length) % service.arrivals.length];

  return {
    state: {
      etablissement: {
        id: `demo-${slug}`,
        slug,
        name: restaurant.name,
        tagline: restaurant.tagline,
        address: restaurant.address,
        phone: restaurant.phone,
        hours: restaurant.hours,
        offre: "connect",
        serviceMode: "fast_food",
        onlinePayment: true,
        paymentProvider: "stripe",
        collectSlotCapacity: 0,
        adminPinSet: false,
        paymentPinSet: false,
      },
      subscriptionStatus: "active",
      offreTrial: null,
      collectSubscriptionStatus: null,
      userId: "demo",
      role: "gerant",
      members: [],
      features: Object.fromEntries(
        FEATURES.map((feature) => [feature, true])
      ) as GestionState["features"],
      // Tout est réglé en ligne : pas d'addition à encaisser au comptoir.
      orderTabs: ["a_servir", "historique"],
      dayEndHour: DEFAULT_DAY_END_HOUR,
      orderNumberResetHour: null,
      staff: [],
      categories: restaurant.categories,
      formules: [],
      priceRules: [],
      tables: [],
      orders: present.flatMap(
        ({ number, minutesAgo, status, lines }) =>
          paidOnline(
            items,
            number,
            status,
            lines,
            new Date(openedAt - minutesAgo * 60_000).toISOString()
          ) ?? []
      ),
    },
    arrival: (index, createdAt) =>
      paidOnline(items, firstArrival + index, "payee", linesOf(index), createdAt),
    delayMs: (index) => service.cadenceS[index % service.cadenceS.length] * 1000,
    maxOpen: service.maxOpen,
  };
}
