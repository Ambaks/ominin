import type { MenuItem } from "@/lib/menu-data";
import { TOP_VENTES_COUNT } from "./constants";
import type { GestionState, Order, OrderItem, Table } from "./types";

export function lineTotal(line: OrderItem): number {
  const supplements =
    line.options?.reduce((sum, option) => sum + option.supplement, 0) ?? 0;
  return line.quantity * (line.unitPrice + supplements);
}

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function isHistoryStatus(status: Order["status"]): boolean {
  return status === "payee" || status === "annulee";
}

/** Commandes à traiter : en attente, en préparation ou prêtes. */
export function inProgressOrders(state: GestionState): Order[] {
  return state.orders.filter(
    (order) =>
      order.status === "en_attente" ||
      order.status === "en_preparation" ||
      order.status === "prete"
  );
}

export function revenueToday(state: GestionState): number {
  const today = new Date().toDateString();
  return state.orders
    .filter(
      (order) =>
        order.status === "payee" &&
        new Date(order.createdAt).toDateString() === today
    )
    .reduce((sum, order) => sum + orderTotal(order), 0);
}

/** Minuit local, il y a `daysAgo` jours. */
function dayStart(daysAgo: number): Date {
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
    if (order.status !== "payee") continue;
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
  const paid = ordersInPeriod(state, days).filter(
    (order) => order.status === "payee"
  );
  const revenue = paid.reduce((sum, order) => sum + orderTotal(order), 0);
  return {
    revenue,
    orders: paid.length,
    avgTicket: paid.length ? revenue / paid.length : 0,
  };
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

export function freeTables(state: GestionState): Table[] {
  const taken = new Set(state.groups.flatMap((group) => group.tableIds));
  return state.tables.filter((table) => !taken.has(table.id));
}

export function tableNumber(state: GestionState, tableId: string): number {
  return state.tables.find((table) => table.id === tableId)?.number ?? 0;
}

export function groupTableNumbers(
  state: GestionState,
  tableIds: string[]
): number[] {
  return tableIds
    .map((id) => tableNumber(state, id))
    .sort((a, b) => a - b);
}
