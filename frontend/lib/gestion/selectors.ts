import type { MenuItem } from "@/lib/menu-data";
import { TOP_VENTES_COUNT } from "./constants";
import type {
  ActiveProducts,
  GestionState,
  Order,
  OrderItem,
  Table,
} from "./types";

/**
 * Produits réellement payés. Les capacités en découlent — pas de la seule
 * colonne offre : depuis le click & collect autonome, un établissement peut
 * porter une offre jamais activée, ou aucune offre du tout.
 */
export function activeProducts(state: GestionState | null): ActiveProducts {
  return {
    offre:
      state?.subscriptionStatus === "active" ? state.etablissement.offre : null,
    collect: state?.collectSubscriptionStatus === "active",
  };
}

/** unitPrice est figé suppléments inclus par place_order : rien à rajouter. */
export function lineTotal(line: OrderItem): number {
  return line.quantity * line.unitPrice;
}

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, line) => sum + lineTotal(line), 0);
}

/** Close : servie (sur place), retirée (collect) ou annulée. */
export function isHistoryStatus(status: Order["status"]): boolean {
  return status === "servie" || status === "annulee" || status === "retiree";
}

/** Encaissée : payée sur place (servie ou non), ou retirée (collect, payée en ligne). */
export function isPaidStatus(status: Order["status"]): boolean {
  return status === "payee" || status === "servie" || status === "retiree";
}

/** À encaisser : commande sur place en attente de son règlement. */
export function awaitsPayment(order: Order): boolean {
  return (
    order.type === "sur_place" &&
    order.status === "en_attente" &&
    !order.paidOnline
  );
}

/**
 * À servir : commande sur place payée (partie en cuisine) dont il reste des
 * lignes à apporter, ou commande collect encore en cours.
 */
export function awaitsService(order: Order): boolean {
  if (order.type === "collect") {
    return (
      order.status === "en_attente" ||
      order.status === "en_preparation" ||
      order.status === "prete"
    );
  }
  return order.status === "payee";
}

/** Commandes encore ouvertes : à encaisser ou à servir. */
export function openOrders(state: GestionState): Order[] {
  return state.orders.filter(
    (order) => awaitsPayment(order) || awaitsService(order)
  );
}

/** Part de la commande réglée en espèces (addition mixte : d'après ses lignes). */
export function cashTotal(order: Order): number {
  if (order.paymentMode === "especes") return orderTotal(order);
  if (order.paymentMode !== "mixte") return 0;
  return order.items
    .filter((line) => line.paidMode === "especes")
    .reduce((sum, line) => sum + lineTotal(line), 0);
}

export interface TableService {
  table: Table;
  /** Commandes ouvertes de la table, de la plus ancienne à la plus récente. */
  orders: Order[];
  /** Reste dû sur les commandes en attente d'encaissement. */
  toPay: number;
  /** Lignes payées pas encore arrivées à table. */
  toServe: number;
}

/** Tables en service (au moins une commande ouverte), par numéro croissant. */
export function activeTables(state: GestionState): TableService[] {
  const byTable = new Map<string, Order[]>();
  for (const order of state.orders) {
    if (!order.tableId || !(awaitsPayment(order) || awaitsService(order))) {
      continue;
    }
    const list = byTable.get(order.tableId) ?? [];
    list.push(order);
    byTable.set(order.tableId, list);
  }
  return state.tables
    .filter((table) => byTable.has(table.id))
    .sort((a, b) => a.number - b.number)
    .map((table) => {
      const orders = byTable
        .get(table.id)!
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        table,
        orders,
        toPay: orders
          .filter(awaitsPayment)
          .flatMap((order) => order.items.filter((line) => !line.paidMode))
          .reduce((sum, line) => sum + lineTotal(line), 0),
        toServe: orders
          .filter(awaitsService)
          .flatMap((order) => order.items)
          .filter((line) => !line.servedAt).length,
      };
    });
}

export function revenueToday(state: GestionState): number {
  const today = new Date().toDateString();
  return state.orders
    .filter(
      (order) =>
        isPaidStatus(order.status) &&
        new Date(order.createdAt).toDateString() === today
    )
    .reduce((sum, order) => sum + orderTotal(order), 0);
}

/** Minuit local, il y a `daysAgo` jours. */
export function dayStart(daysAgo: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/** Commandes créées dans les `days` derniers jours calendaires (annulées exclues). */
function ordersInPeriod(state: GestionState, days: number): Order[] {
  const from = dayStart(days - 1).getTime();
  return state.orders.filter(
    (order) =>
      order.status !== "annulee" && new Date(order.createdAt).getTime() >= from
  );
}

/** Plats les plus commandés sur la période, annulées exclues. */
export function topVentes(
  state: GestionState,
  days: number
): { name: string; quantity: number; revenue: number }[] {
  const totals = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  for (const order of ordersInPeriod(state, days)) {
    for (const line of order.items) {
      const key = line.itemId ?? line.name;
      const entry = totals.get(key);
      const revenue = lineTotal(line);
      if (entry) {
        entry.quantity += line.quantity;
        entry.revenue += revenue;
      } else {
        totals.set(key, { name: line.name, quantity: line.quantity, revenue });
      }
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, TOP_VENTES_COUNT);
}

export const topVentesToday = (state: GestionState) => topVentes(state, 1);

export interface DayPoint {
  /** Libellé court d'axe ("lun. 8"). */
  label: string;
  /** Numéro du jour, pour l'axe des périodes denses. */
  day: number;
  /** Date complète pour l'infobulle ("lundi 8 juillet"). */
  full: string;
  revenue: number;
  orders: number;
}

/** CA encaissé (commandes payées) par jour calendaire, du plus ancien à aujourd'hui. */
export function revenueByDay(state: GestionState, days: number): DayPoint[] {
  const buckets: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
    const date = dayStart(daysAgo);
    const point: DayPoint = {
      label: date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
      }),
      day: date.getDate(),
      full: date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      revenue: 0,
      orders: 0,
    };
    buckets.push(point);
    index.set(date.toDateString(), point);
  }
  for (const order of state.orders) {
    if (!isPaidStatus(order.status)) continue;
    const point = index.get(new Date(order.createdAt).toDateString());
    if (!point) continue;
    point.revenue += orderTotal(order);
    point.orders += 1;
  }
  return buckets;
}

/** Totaux de la période : CA encaissé, commandes payées, panier moyen. */
export function periodStats(
  state: GestionState,
  days: number
): { revenue: number; orders: number; avgTicket: number } {
  const paid = ordersInPeriod(state, days).filter((order) =>
    isPaidStatus(order.status)
  );
  const revenue = paid.reduce((sum, order) => sum + orderTotal(order), 0);
  return {
    revenue,
    orders: paid.length,
    avgTicket: paid.length ? revenue / paid.length : 0,
  };
}

/** Pourboires laissés sur la période (en ligne comme au comptoir). */
export function tipsTotal(state: GestionState, days: number): number {
  return ordersInPeriod(state, days).reduce(
    (sum, order) => sum + (order.tipAmount ?? 0),
    0
  );
}

/** Commandes par heure de la journée, agrégées sur la période (annulées exclues). */
export function ordersByHour(
  state: GestionState,
  days: number
): { hour: number; orders: number }[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  for (const order of ordersInPeriod(state, days)) {
    buckets[new Date(order.createdAt).getHours()].orders += 1;
  }
  return buckets;
}

export function isItemAvailable(item: MenuItem): boolean {
  return item.disponible !== false && item.stock !== 0;
}

export function unavailableItems(state: GestionState): MenuItem[] {
  return state.categories
    .flatMap((category) => category.items)
    .filter((item) => !isItemAvailable(item));
}

/** Nom d'affichage d'un membre (nom saisi, sinon email), ou null si inconnu. */
export function memberName(
  state: GestionState,
  userId: string | null | undefined
): string | null {
  if (!userId) return null;
  const member = state.members.find((m) => m.userId === userId);
  return member ? (member.displayName ?? member.email) : null;
}
