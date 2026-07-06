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

/** Plats les plus commandés aujourd'hui, commandes annulées exclues. */
export function topVentesToday(
  state: GestionState
): { name: string; quantity: number }[] {
  const today = new Date().toDateString();
  const totals = new Map<string, { name: string; quantity: number }>();
  for (const order of state.orders) {
    if (order.status === "annulee") continue;
    if (new Date(order.createdAt).toDateString() !== today) continue;
    for (const line of order.items) {
      const key = line.itemId ?? line.name;
      const entry = totals.get(key);
      if (entry) entry.quantity += line.quantity;
      else totals.set(key, { name: line.name, quantity: line.quantity });
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, TOP_VENTES_COUNT);
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
