import { parisDate, shiftDay } from "@/lib/collect/hours";
import {
  awaitsAcknowledgement,
  awaitsOnlinePayment,
  isPaid,
  orderTotal,
  paidThroughSite,
} from "./selectors";
import type { Order } from "./types";

/*
 * Retraits : le click & collect lu jour par jour, à l'heure de Paris — celle
 * des créneaux. Une tentative de paiement en ligne en cours n'est pas encore
 * une commande : elle n'y figure pas.
 */

/** Jour de retrait (AAAA-MM-JJ) ; « dès que possible », le jour de la commande. */
export function pickupDay(order: Order): string {
  return parisDate(new Date(order.pickupAt ?? order.createdAt));
}

const pickupTime = (order: Order) => Date.parse(order.pickupAt ?? order.createdAt);

/** Les commandes à emporter réelles : payées en ligne ou prises par l'équipe. */
export function pickupOrders(orders: Order[]): Order[] {
  return orders.filter(
    (order) => order.type === "collect" && !awaitsOnlinePayment(order)
  );
}

export function isPickupOpen(order: Order): boolean {
  return order.status !== "retiree" && order.status !== "annulee";
}

/** Ce qu'il reste à encaisser quand le client passe. */
export function amountDue(order: Order): number {
  return isPaid(order) || order.status === "annulee" ? 0 : orderTotal(order);
}

/** Les retraits d'un jour, dans l'ordre des créneaux. */
export function ordersOfDay(orders: Order[], day: string): Order[] {
  return orders
    .filter((order) => pickupDay(order) === day)
    .sort((a, b) => pickupTime(a) - pickupTime(b));
}

/** Pas encore remises alors que leur jour est passé : elles attendent en boutique. */
export function overdueOrders(orders: Order[], today: string): Order[] {
  return orders
    .filter((order) => isPickupOpen(order) && pickupDay(order) < today)
    .sort((a, b) => pickupTime(a) - pickupTime(b));
}

function countByDay(orders: Order[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const day = pickupDay(order);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/** Retraits restant à remettre, par jour : les pastilles du calendrier. */
export function openCountByDay(orders: Order[]): Map<string, number> {
  return countByDay(orders.filter(isPickupOpen));
}

/** Commandes du site pas encore prises en charge, par jour : les points du calendrier. */
export function newCountByDay(orders: Order[]): Map<string, number> {
  return countByDay(orders.filter(awaitsAcknowledgement));
}

export interface ProductionLine {
  key: string;
  name: string;
  /** Les choix qui changent ce qu'on fabrique : « Taille : 6 parts ». */
  choices: string;
  quantity: number;
  /** Une commande « dès que possible » l'attend : la ligne passe en tête. */
  asap: boolean;
  /** Le premier retrait programmé qui l'attend (ISO). */
  firstPickup?: string;
}

/** Encore à sortir du laboratoire : ni prête, ni remise, ni annulée. */
export function toProduce(order: Order): boolean {
  return order.status === "en_attente" || order.status === "en_preparation";
}

/**
 * À produire : les quantités d'un jour, par article et par choix d'options,
 * pour les commandes pas encore prêtes — rangées par premier retrait, pour
 * sortir d'abord ce qui part le plus tôt.
 */
export function productionLines(orders: Order[]): ProductionLine[] {
  const lines = new Map<string, ProductionLine>();
  for (const order of orders) {
    if (!toProduce(order)) continue;
    for (const item of order.items) {
      const choices = (item.options ?? [])
        .map((option) => `${option.groupName} : ${option.choiceName}`)
        .join(" · ");
      const key = `${item.name}\n${choices}`;
      const line = lines.get(key);
      if (!line) {
        lines.set(key, {
          key,
          name: item.name,
          choices,
          quantity: item.quantity,
          asap: !order.pickupAt,
          firstPickup: order.pickupAt,
        });
        continue;
      }
      line.quantity += item.quantity;
      line.asap ||= !order.pickupAt;
      if (order.pickupAt && (!line.firstPickup || order.pickupAt < line.firstPickup)) {
        line.firstPickup = order.pickupAt;
      }
    }
  }
  return [...lines.values()].sort(
    (a, b) =>
      Number(b.asap) - Number(a.asap) ||
      (a.firstPickup ?? "").localeCompare(b.firstPickup ?? "") ||
      a.name.localeCompare(b.name, "fr") ||
      a.choices.localeCompare(b.choices, "fr")
  );
}

export interface DaySummary {
  count: number;
  /** Ce que valent les retraits du jour, quel que soit le jour du paiement. */
  total: number;
  paidOnline: number;
  paidAtCounter: number;
  due: number;
}

/**
 * Les retraits d'un jour en chiffres, pour le gérant, annulées exclues :
 * payé en ligne + encaissé au comptoir + reste à encaisser = total.
 */
export function daySummary(orders: Order[]): DaySummary {
  const kept = orders.filter((order) => order.status !== "annulee");
  const sum = (list: Order[]) => list.reduce((total, order) => total + orderTotal(order), 0);
  return {
    count: kept.length,
    total: sum(kept),
    paidOnline: sum(kept.filter(paidThroughSite)),
    paidAtCounter: sum(kept.filter((order) => !paidThroughSite(order) && order.paymentMode)),
    due: kept.reduce((total, order) => total + amountDue(order), 0),
  };
}

/** La pastille d'un jour : « Auj. », « Dem. » ou « Mer. », et son quantième. */
export function dayTile(day: string, today: string): { weekday: string; date: number } {
  const at = new Date(`${day}T12:00:00Z`);
  const weekday =
    day === today
      ? "Auj."
      : day === shiftDay(today, 1)
        ? "Dem."
        : at.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" });
  return { weekday, date: at.getUTCDate() };
}

