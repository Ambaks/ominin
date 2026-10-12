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
