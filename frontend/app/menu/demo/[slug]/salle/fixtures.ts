import { awaitsService } from "@/lib/gestion/selectors";
import type { GestionState, PaymentLeg } from "@/lib/gestion/types";
import { getRestaurant } from "@/lib/menu-data";
import { demoState, paidOrder, type Line, type ServiceDemo } from "../_service/fixtures";

/*
 * Un coup de feu en salle, joué sans base : les commandes réglées depuis les
 * tables (menu QR, paiement en ligne) ou au comptoir, telles que l'onglet
 * « À servir » d'un restaurant les reçoit — une carte par table, un
 * « Servi » par ligne. Leurs lignes se désignent comme dans
 * ../_service/fixtures.
 */

interface TableOrder {
  table: number;
  /** Passée il y a tant de minutes, à l'heure du service (clock). */
  minutesAgo: number;
  lines: Line[];
  /** Réglée au comptoir, par ce mode ; sinon en ligne, depuis la table. */
  paidBy?: Exclude<PaymentLeg, "en_ligne">;
  /**
   * Lignes déjà apportées, dans l'ordre — les boissons d'abord, elles partent
   * du bar sans attendre la cuisine ; toutes ⇒ la commande est servie. Elles
   * l'ont été à mi-chemin de la commande et de l'heure de l'écran.
   */
  served?: number;
}

interface Service {
  /** Les tables de la salle, numérotées à partir de 1. */
  tables: number;
  /** L'heure du service à l'ouverture de l'écran, quelle que soit celle de l'appareil. */
  clock: { hours: number; minutes: number };
  /** Minutes après son dernier service au-delà desquelles une table, que ses clients ont quittée, en reçoit d'autres. */
  turnoverMin: number;
  /** Le service jusqu'ici, la même salle figée ou en direct : servies, puis en cours, dans l'ordre d'arrivée. */
  orders: TableOrder[];
  /**
   * Passées ensuite, réglées en ligne : un repas de meals (ses boissons
   * comprises, une formule ayant la sienne) et un à-côté de sides, chaque
   * liste reprise en boucle à son rythme — des longueurs premières entre
   * elles font des tables toujours différentes.
   */
  arrivals: { meals: Line[][]; sides: Line[][] };
  /** Secondes avant chaque arrivée, reprises en boucle. */
  cadenceS: number[];
  /** Tables à servir au-delà desquelles l'arrivée suivante attend qu'une se libère. */
  maxOpen: number;
}

const SERVICES: Record<string, Service> = {
  "bai-ko": {
    tables: 16,
    clock: { hours: 12, minutes: 43 },
    turnoverMin: 10,
    orders: [
      { table: 3, minutesAgo: 41, served: 2, paidBy: "carte", lines: [["Menu Midi", 2, "Bibimbap Beef", "Coca"], ["Corn Dog", 1]] },
      { table: 9, minutesAgo: 38, served: 3, lines: [["Pad Thaï Beef", 1], ["Korean Fried Chicken", 1, "Spicy (épicé)"], ["Coca", 1, "Coca Zéro"]] },
      { table: 1, minutesAgo: 35, served: 2, lines: [["Volcano Cheese Beef Bulgogi", 1, "Rabokki"], ["Milkis", 2, "Melon"]] },
      { table: 15, minutesAgo: 29, served: 2, lines: [["Menu", 2, "Nems (x2)", "Pad Thaï Chicken", "Ice Tea"], ["Mango Rice", 1]] },
      { table: 4, minutesAgo: 33, served: 2, lines: [["Soda", 2, "Pastèque"], ["Kimchi", 1], ["Volcano Cheese Dakgalbi", 1, "Viande"]] },
      { table: 11, minutesAgo: 16, served: 1, paidBy: "carte", lines: [["Milkis", 2, "Fraise"], ["Korean Fried Chicken", 1, "Sweet (soja & miel)"], ["Tteokbokki", 1]] },
      { table: 2, minutesAgo: 12, served: 1, paidBy: "especes", lines: [["Coca", 2, "Coca Zéro"], ["Bulgogi Ramyeon", 1], ["Dak Ramyeon", 1], ["Kimchi", 1]] },
      { table: 10, minutesAgo: 7, served: 1, lines: [["Aloe Vera", 2], ["Cheese Chicken Katsu", 1], ["Corn Cheese", 1]] },
      { table: 5, minutesAgo: 5, served: 1, lines: [["Ice Tea", 2], ["Tofu Bap", 1, "Bol"], ["Beef Salad", 1]] },
      // 12:41 : la commande que suivent le téléphone, le deck et le film.
      { table: 7, minutesAgo: 2, lines: [["Dak Bap Spicy", 1, "Dolsot"], ["Kimchi", 1]] },
      // Des formules, boissons comprises : rien ne part avant elles, d'où une commande fraîche.
      { table: 14, minutesAgo: 1, lines: [["Menu Midi", 2, "Pad Thaï Chicken", "Evian"], ["Menu Midi", 1, "Bibimbap Tofu", "Ice Tea"]] },
      { table: 12, minutesAgo: 1, lines: [["Coca", 2, "Coca Cherry"], ["Volcano Cheese Mandu", 1], ["Corn Dog", 2]] },
    ],
    arrivals: {
      meals: [
        [["Menu Midi", 1, "Bibimbap Chicken sweet", "Coca"]],
        [["Tofu Bap", 1, "Dolsot"], ["Aloe Vera", 1]],
        [["Volcano Cheese Rabokki", 1, "Viande"], ["Coca", 2, "Coca Zéro"]],
        [["Beef Bulgogi Bap", 2, "Bol"], ["Milkis", 2, "Nature"]],
        [["Pad Thaï Shrimp", 1], ["Pad Thaï Chicken", 1], ["Ice Tea", 2]],
        [["Menu", 2, "Mandu (x3)", "Salade Bœuf bulgogi", "Evian"]],
        [["Dubu Ramyeon", 1], ["Soda", 1, "Raisin"]],
        [["Volcano Cheese Beef Bulgogi", 1], ["Sprit Coréen Chilsung", 1], ["Bongbong", 1]],
        [["Dak Bap Sweet", 1, "Dolsot"], ["Chicken Salad", 1], ["Coca", 1, "Coca Cherry"], ["Ice Tea", 1]],
      ],
      sides: [
        [["Mochi", 2, "Yuzu-citron"]],
        [["Korean Fried Chicken", 1, "Spicy (épicé)"]],
        [],
        [["Gamja Crispy", 1]],
        [["Kimchi Bomb", 2]],
        [["Mango Rice", 1]],
        [["Nem", 1]],
      ],
    },
    cadenceS: [7, 22, 30, 26, 34, 28],
    maxOpen: 8,
  },
  // Un samedi soir au Boho : entrecôtes et pizzas, cocktails et chichas.
  boho: {
    tables: 30,
    clock: { hours: 20, minutes: 35 },
    turnoverMin: 15,
    orders: [
      { table: 12, minutesAgo: 34, served: 3, lines: [["Mojito", 2], ["L'Entrecôte « La Fameuse »", 1], ["Pizza Chèvre Miel", 1]] },
      { table: 4, minutesAgo: 28, served: 2, paidBy: "carte", lines: [["Coca Cola", 2], ["Burger original Boho", 2], ["Tiramisu au café", 1]] },
      { table: 21, minutesAgo: 22, served: 2, lines: [["Sex on the Beach", 2], ["Assortiment BOHO", 1], ["Pizza Saumon Norvégienne", 1]] },
      { table: 9, minutesAgo: 15, served: 1, lines: [["Ice Tea", 2], ["Pièce de poulet grillée", 1], ["Salade César", 1]] },
      { table: 17, minutesAgo: 9, served: 1, paidBy: "especes", lines: [["Latina Passion", 2], ["Nems poulet (x4)", 1], ["Pizza Poulet Indienne", 1]] },
      { table: 6, minutesAgo: 5, lines: [["Coca Zero", 1], ["Magret de canard grillé", 1], ["Crème brûlée", 1]] },
      { table: 25, minutesAgo: 2, lines: [["Blue Lagoon", 2], ["Crevettes tempura (x2)", 2]] },
      { table: 14, minutesAgo: 1, lines: [["Classique", 1], ["Perrier", 2], ["Samoussas bœuf (x4)", 1]] },
    ],
    arrivals: {
      meals: [
        [["L'Entrecôte « La Fameuse »", 2], ["Coca Cola", 2]],
        [["Pizza Margarita", 1], ["Mojito", 1]],
        [["Burger original Boho", 1], ["Evian", 1]],
        [["Tomate burrata", 1], ["Escalope de saumon frais à la plancha", 1], ["Terracota", 2]],
        [["Premium", 1], ["Red Dragon", 2]],
      ],
      sides: [[], [["Crêpes Nutella", 1]], [["Espresso", 2]], [], [["Gaufre Nutella", 1]], [["Nems légumes (x4)", 1]], [["Fraise Tagada", 1]]],
    },
    cadenceS: [8, 24, 31, 27, 35, 29],
    maxOpen: 10,
  },
  // Un midi chez Caffè Panis : pizzas, pâtes et burratas.
  "caffe-panis": {
    tables: 20,
    clock: { hours: 12, minutes: 50 },
    turnoverMin: 12,
    orders: [
      { table: 5, minutesAgo: 31, served: 3, lines: [["Coca-Cola", 2], ["Pizza Margherita", 1], ["Pasta Carbonara Originale", 1]] },
      { table: 11, minutesAgo: 25, served: 2, paidBy: "carte", lines: [["Fuzetea Pêche", 2], ["Classic Burrata", 1], ["Pizza Mama King", 1]] },
      { table: 2, minutesAgo: 19, served: 2, lines: [["Coca-Cola Zéro", 1], ["Pasta Alla Bolognese", 1], ["Il Tiramisù", 1]] },
      { table: 16, minutesAgo: 12, served: 1, lines: [["Coca-Cola", 2], ["Pizza Truffle Suprême", 1], ["Trio d'arancini", 1]] },
      { table: 8, minutesAgo: 6, lines: [["Fuzetea Pêche", 1], ["Le Dwich Regina", 1], ["Deurty Cookie", 1]] },
      { table: 13, minutesAgo: 2, lines: [["Coca-Cola Zéro", 2], ["Pasta Al Tartufo", 1], ["Pizza Capo", 1]] },
    ],
    arrivals: {
      meals: [
        [["Pizza Puissance 4", 1], ["Coca-Cola", 1]],
        [["Pasta Con Il Pesto", 2], ["Fuzetea Pêche", 2]],
        [["Les Dwich du Gang", 1], ["Coca-Cola Zéro", 1]],
        [["Burrata Pesto Forever", 1], ["Pizza Green Circle", 1]],
        [["Pasta All'Amatriciana", 1], ["Coca-Cola", 1]],
      ],
      sides: [[], [["Mousse Big-love", 1]], [["Café Illy", 2]], [], [["Prosciutto", 1]], [["Il Tiramisù", 2]], [["Deurty Cookie", 1]]],
    },
    cadenceS: [8, 24, 31, 27, 35, 29],
    maxOpen: 8,
  },
  // Un samedi soir au Victoria, en plein happy hour (16h–1h), à l'heure de la
  // vue groupe : la terrasse boit, la cuisine sort tapas, burgers et pizzas.
  // Lignes de sa carte (lib/menu-data) ; 45 tables, l'hypothèse de la vue
  // groupe (lib/demo/groupe).
  "le-victoria": {
    tables: 45,
    clock: { hours: 19, minutes: 40 },
    turnoverMin: 15,
    orders: [
      { table: 14, minutesAgo: 18, served: 2, lines: [["Mojito", 2], ["Patatas bravas", 1], ["Pizza regina tomate", 1]] },
      { table: 3, minutesAgo: 16, served: 1, paidBy: "carte", lines: [["Kronenbourg", 3], ["Wings poulet", 1], ["Croquetas chorizo", 1]] },
      { table: 31, minutesAgo: 15, served: 2, lines: [["Sangria maison", 2], ["Frite maison", 1], ["Hamburger Le Chicken avec frite maison", 2, "Sans bacon", "Algérienne"]] },
      { table: 8, minutesAgo: 13, served: 1, paidBy: "especes", lines: [["Pietra", 2], ["Pizza 4 formaggi", 1], ["Salade César", 1]] },
      { table: 19, minutesAgo: 11, served: 1, lines: [["Cuba Libre", 2], ["Stick mozzarella", 1], ["Mini nems", 1]] },
      { table: 12, minutesAgo: 8, served: 1, lines: [["Punch maison", 4], ["Le classique avec frite maison", 2, "Bacon", "Mayonnaise"], ["Pizza spezzial", 1]] },
      { table: 27, minutesAgo: 5, lines: [["Monaco", 2], ["Frites patate douce", 1]] },
      { table: 6, minutesAgo: 3, paidBy: "carte", lines: [["Jagerbomb", 4]] },
      { table: 22, minutesAgo: 2, lines: [["Mojito", 2], ["Planteur", 1], ["Pizza chèvre miel", 1]] },
      { table: 40, minutesAgo: 1, lines: [["Desperados", 2], ["Fish and chips tapas", 1]] },
    ],
    arrivals: {
      meals: [
        [["Monaco", 2], ["Frite maison", 1]],
        [["Le classique avec frite maison", 1, "Bacon", "Ketchup"], ["Corona", 1]],
        [["Sex on the beach maison", 2], ["Mini samossas", 1]],
        [["Pizza Margherita", 1], ["Pizza au poulet", 1], ["Kronenbourg", 2]],
        [["Mojito", 3]],
        [["Salade de chèvre chaud", 1], ["Heineken", 1]],
        [["Cuba Libre", 2], ["Wings poulet", 1]],
      ],
      sides: [[], [["Patatas bravas", 1]], [["Tarte citron meringuée", 1]], [], [["Mini saucissons", 1]]],
    },
    cadenceS: [9, 24, 31, 27, 35, 29],
    maxOpen: 12,
  },
};

export function hasSalleDemo(slug: string): boolean {
  return Object.hasOwn(SERVICES, slug);
}

const demoTableId = (number: number) => `demo-table-${number}`;

/**
 * Le service en salle de slug, ouvert à openedAt (ms) sur l'appareil, à l'heure
 * de son service : la même salle, qu'elle reste figée ou que d'autres tables
 * y commandent.
 */
export function salleDemo(slug: string, openedAt: number): ServiceDemo | null {
  const restaurant = getRestaurant(slug);
  if (!restaurant || !hasSalleDemo(slug)) return null;
  const service = SERVICES[slug];
  const items = restaurant.categories.flatMap((category) => category.items);
  const now = new Date(openedAt).setHours(service.clock.hours, service.clock.minutes, 0, 0);

  const tableOrder = (id: string, { table, lines, paidBy, served = 0 }: Omit<TableOrder, "minutesAgo">, createdAt: string) =>
    paidOrder(
      items,
      id,
      lines,
      createdAt,
      { status: served >= lines.length ? "servie" : "payee", tableId: demoTableId(table) },
      paidBy,
      { lines: served, at: new Date((Date.parse(createdAt) + now) / 2).toISOString() }
    );
  /**
   * La table d'une arrivée, en comptant après celle de la dernière commande :
   * une table encore inoccupée de tout le service, sinon une table servie
   * depuis turnoverMin, que ses clients ont quittée. Aucune : l'arrivée n'a
   * pas lieu — on ne réinstalle pas une table servie il y a deux minutes —,
   * sauf dans une salle entièrement servie, qui reçoit la table servie depuis
   * le plus longtemps plutôt que de rester vide.
   */
  const freeTable = (state: GestionState, createdAt: string) => {
    const seen = new Map<string, { waiting: boolean; servedAt: string }>();
    for (const order of state.orders) {
      if (!order.tableId) continue;
      const table = seen.get(order.tableId) ?? { waiting: false, servedAt: "" };
      table.waiting ||= awaitsService(order);
      for (const item of order.items) if (item.servedAt && item.servedAt > table.servedAt) table.servedAt = item.servedAt;
      seen.set(order.tableId, table);
    }
    const last = state.tables.find((table) => table.id === state.orders.at(-1)?.tableId)?.number ?? 0;
    const inTurn = Array.from({ length: service.tables }, (_, step) => ((last + step) % service.tables) + 1);
    const left = (number: number) => {
      const table = seen.get(demoTableId(number));
      return table && !table.waiting && Date.parse(createdAt) - Date.parse(table.servedAt) >= service.turnoverMin * 60_000;
    };
    const free = inTurn.find((number) => !seen.has(demoTableId(number))) ?? inTurn.find(left);
    if (free !== undefined) return free;
    if ([...seen.values()].some((table) => table.waiting)) return null;
    const servedAt = (number: number) => seen.get(demoTableId(number))?.servedAt ?? "";
    return inTurn.reduce((oldest, number) => (servedAt(number) < servedAt(oldest) ? number : oldest));
  };

  return {
    state: demoState(
      restaurant,
      "restaurant",
      Array.from({ length: service.tables }, (_, i) => ({ id: demoTableId(i + 1), number: i + 1, staffId: null, groupId: null })),
      service.orders.flatMap((order, i) => tableOrder(`demo-${i}`, order, new Date(now - order.minutesAgo * 60_000).toISOString()) ?? [])
    ),
    arrival: (index, createdAt, state) => {
      const table = freeTable(state, createdAt);
      const { meals, sides } = service.arrivals;
      const lines = [...meals[index % meals.length], ...sides[index % sides.length]];
      return table === null ? null : tableOrder(`demo-arrivee-${index}`, { table, lines }, createdAt);
    },
    delayMs: (index) => service.cadenceS[index % service.cadenceS.length] * 1000,
    maxOpen: service.maxOpen,
    serviceStart: now,
  };
}
