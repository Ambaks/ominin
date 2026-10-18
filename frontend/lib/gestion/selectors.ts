import { parisDate } from "@/lib/collect/hours";
import { hasBlockedRequiredGroup, type MenuItem } from "@/lib/menu-data";
import {
  ORDER_TAB_LABELS,
  PICKUP_ROLE_LABELS,
  ROLE_LABELS,
  TOP_VENTES_COUNT,
} from "./constants";
import type {
  ActiveProducts,
  GestionState,
  Order,
  OrderItem,
  OrderTab,
  PaymentLeg,
  Role,
  Staff,
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
      state?.subscriptionStatus === "active" && !offreFeeDue(state)
        ? state.etablissement.offre
        : null,
    collect: state?.collectSubscriptionStatus === "active",
  };
}

/**
 * Boutique en click & collect seul, sans service à table : Retraits est
 * l'accueil de son équipe, laboratoire compris ; seul le gérant a un aperçu.
 */
export function isPickupShop(state: GestionState | null): boolean {
  return state !== null && activeProducts(state).offre === null && state.features.retraits;
}

/**
 * Club sur Ominin Club seul, sans offre ni click & collect : ni carte ni
 * service à table, son espace tient dans ses soirées.
 */
export function isClubOnly(state: GestionState | null): boolean {
  if (!state) return false;
  const products = activeProducts(state);
  return products.offre === null && !products.collect && state.features.soirees;
}

/** Les noms des rôles à l'écran ; en base, les rôles restent les mêmes. */
export function roleLabels(state: GestionState | null): Record<Role, string> {
  return state && isPickupShop(state) ? PICKUP_ROLE_LABELS : ROLE_LABELS;
}

/**
 * Mois offerts échus sans exonération et sans abonnement souscrit : l'offre
 * reste ouverte côté carte, mais l'espace de gestion attend le paiement.
 */
export function offreFeeDue(state: GestionState | null): boolean {
  const trial = state?.offreTrial;
  return trial?.feeExempt === false && !trial.subscribed;
}

/** unitPrice est figé suppléments inclus par place_order : rien à rajouter. */
export function lineTotal(line: OrderItem): number {
  return line.quantity * line.unitPrice;
}

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, line) => sum + lineTotal(line), 0);
}

/** L'heure où la dernière ligne d'une commande est arrivée à table, si elle l'est. */
export function lastServedAt(order: Order): string | undefined {
  return order.items.reduce<string | undefined>(
    (last, line) => (line.servedAt && (!last || line.servedAt > last) ? line.servedAt : last),
    undefined
  );
}

/** Close : servie (sur place), retirée (collect) ou annulée. */
export function isHistoryStatus(status: Order["status"]): boolean {
  return status === "servie" || status === "annulee" || status === "retiree";
}

/**
 * Payée en ligne : par le paiement intégré (à table ou sur le site), ou par
 * l'ancien tunnel Stripe Checkout du click & collect (payment_mode
 * « en_ligne » d'avant le 7 octobre 2026, sans paid_online).
 */
export function paidThroughSite(order: Order): boolean {
  return Boolean(order.paidOnline) || order.paymentMode === "en_ligne";
}

/**
 * Encaissée : payée sur place (servie ou non ; prête au comptoir en fast
 * food), ou à emporter réglée — en ligne à la commande, même retirée dans
 * plusieurs jours, ou au comptoir à son retrait.
 */
export function isPaid(order: Order): boolean {
  if (order.type === "collect") {
    return order.status !== "annulee" && Boolean(order.paidOnline || order.paymentMode);
  }
  return (
    order.status === "payee" ||
    order.status === "servie" ||
    (order.orderNumber !== undefined && order.status === "prete")
  );
}

/**
 * Quand l'argent est entré : le dernier règlement enregistré, ou la commande
 * elle-même faute de règlement. Une précommande payée au retrait compte le
 * jour où elle est réglée, pas celui où elle a été prise.
 */
export function paidAt(order: Order): string {
  return (
    order.payments.reduce<string>((last, leg) => (leg.paidAt > last ? leg.paidAt : last), "") ||
    order.createdAt
  );
}

/**
 * Le client règle en ligne : la commande attend son paiement hors de la
 * caisse, et n'y revient que sur son geste (« Payer au comptoir », ou la
 * feuille de paiement refermée). Sans paiement ni geste (onglet fermé), la
 * tentative est écartée passé son délai (/api/square/expire) — elle ne
 * reparaît jamais, ni en caisse ni dans l'historique.
 */
export function awaitsOnlinePayment(order: Order): boolean {
  return (
    order.status === "en_attente" &&
    !order.paidOnline &&
    order.onlinePaymentStartedAt !== undefined
  );
}

/** À encaisser : commande sur place en attente de son règlement au comptoir. */
export function awaitsPayment(order: Order): boolean {
  return (
    order.type === "sur_place" &&
    order.status === "en_attente" &&
    !order.paidOnline &&
    !awaitsOnlinePayment(order)
  );
}

/**
 * Commande à emporter dont le retrait tombe un jour à venir (jour de Paris) :
 * elle se suit depuis Retraits, elle n'est pas encore du service du jour.
 */
export function pickupLater(order: Order): boolean {
  return (
    order.type === "collect" &&
    order.pickupAt !== undefined &&
    parisDate(new Date(order.pickupAt)) > parisDate(new Date())
  );
}

/**
 * À servir : commande sur place payée (partie en cuisine) dont il reste des
 * lignes à apporter, commande fast food pas encore remise, ou commande
 * collect du jour payée en ligne et encore en cours — en attente de son
 * paiement, elle n'existe pas pour la salle. Celle que l'équipe a prise,
 * réglée au retrait, se suit et s'encaisse depuis Retraits.
 */
export function awaitsService(order: Order): boolean {
  if (order.type === "collect") {
    if (!paidThroughSite(order) || pickupLater(order)) return false;
    return (
      order.status === "en_attente" ||
      order.status === "en_preparation" ||
      order.status === "prete"
    );
  }
  return (
    order.status === "payee" ||
    (order.orderNumber !== undefined && order.status === "prete")
  );
}

/**
 * Nom d'un onglet de Commandes : sans service à table, rien n'est « à
 * servir », c'est ce qui est en cours.
 */
export function orderTabLabel(state: GestionState, tab: OrderTab): string {
  return tab === "a_servir" && isPickupShop(state) ? "En cours" : ORDER_TAB_LABELS[tab];
}

/**
 * Onglets de Commandes affichés, dans l'ordre du restaurant. Le filet : une
 * assiette qui attend sans que son ticket soit sorti, ou un boîtier tombé,
 * rajoutent « À servir » même si le réglage l'exclut ; en fast food, c'est la
 * file du comptoir, l'onglet est toujours là. La cuisine n'encaisse pas : son
 * onglet d'addition n'a pas de sens. Un restaurant peut n'avoir gardé que
 * l'addition ; la cuisine se retrouve alors sans onglet, et l'historique
 * tient lieu de repli. Une boutique à emporter seule n'a pas d'addition :
 * ses commandes du comptoir s'encaissent depuis Retraits — sauf s'il en
 * reste d'avant (une offre à table échue garde sa carte ouverte).
 */
export function orderTabsShown(state: GestionState, printerOffline: boolean): OrderTab[] {
  const serviceNet =
    !state.orderTabs.includes("a_servir") &&
    (state.etablissement.serviceMode === "fast_food" ||
      printerOffline ||
      state.orders.some((order) => awaitsService(order)));
  const tabs = (serviceNet ? [...state.orderTabs, "a_servir" as OrderTab] : state.orderTabs).filter(
    (tab) =>
      tab !== "a_encaisser" ||
      (state.role !== "cuisinier" &&
        (!isPickupShop(state) || state.orders.some(awaitsPayment)))
  );
  return tabs.length > 0 ? tabs : ["historique"];
}

/**
 * Le jour (« lun. 28 ») d'une commande numérotée d'un jour de numérotation
 * passé, jamais remise : son numéro a pu resservir depuis, le jour la
 * distingue de celle d'aujourd'hui. Null pour une commande du jour, ou quand
 * l'heure de remise à zéro est inconnue.
 */
export function earlierNumberingDay(order: Order, resetHour: number | null): string | null {
  if (resetHour === null || order.orderNumber === undefined) return null;
  if (serviceDayKey(order.createdAt, resetHour) === serviceDayKey(new Date().toISOString(), resetHour)) {
    return null;
  }
  return new Date(order.createdAt).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
  });
}

/** Une commande sur place à l'écran : sa table, ou son numéro du jour en fast food. */
export function placeLabel(order: Order, tables: Table[]): string {
  if (order.orderNumber !== undefined) return `N° ${order.orderNumber}`;
  const table = tables.find((candidate) => candidate.id === order.tableId);
  return `Table ${table?.number ?? "—"}`;
}

/**
 * Nombre de cartes que ces commandes occupent à l'écran Commandes : les
 * commandes sur place d'une même table s'y regroupent en une seule addition,
 * les autres (collect, sans table) restent chacune leur carte.
 */
export function cardCount(orders: Order[]): number {
  const tables = new Set<string>();
  let singles = 0;
  for (const order of orders) {
    if (order.type === "sur_place" && order.tableId) tables.add(order.tableId);
    else singles += 1;
  }
  return tables.size + singles;
}

/** Commande à emporter payée en ligne que personne n'a encore prise en charge. */
export function awaitsAcknowledgement(order: Order): boolean {
  return (
    order.type === "collect" &&
    order.status === "en_attente" &&
    !awaitsOnlinePayment(order)
  );
}

/**
 * Ce qui attend un geste de la salle : les additions à encaisser et les
 * commandes collect du jour pas encore prises en charge (celles des jours
 * suivants se signalent sur Retraits).
 */
export function needsAttention(order: Order): boolean {
  return (
    awaitsPayment(order) || (awaitsAcknowledgement(order) && !pickupLater(order))
  );
}

/** Commandes encore ouvertes : à encaisser ou à servir. */
export function openOrders(state: GestionState): Order[] {
  return state.orders.filter(
    (order) => awaitsPayment(order) || awaitsService(order)
  );
}

/** Ce qui rentre vraiment en caisse, par canal : le comptoir et la banque ne
 * se relèvent pas de la même façon, la carte au comptoir et le paiement en
 * ligne restent donc séparés. Chaque règlement a posé une jambe par mode —
 * deux quand le client a partagé son addition entre espèces et carte. */
export function totalsByMode(order: Order): Record<PaymentLeg, number> {
  const totals = { especes: 0, carte: 0, en_ligne: 0 };
  for (const leg of order.payments) totals[leg.mode] += leg.amount;
  return totals;
}

/** Montant réglé dans un mode donné, pourboire exclu. */
export function paidInMode(order: Order, mode: PaymentLeg): number {
  return order.payments.reduce(
    (sum, leg) => (leg.mode === mode ? sum + leg.amount : sum),
    0
  );
}

/** L'équipe qui travaille : une fiche masquée sort des écrans de service. */
export function visibleStaff(staff: Staff[]): Staff[] {
  return staff.filter((member) => !member.hidden);
}

export interface TableService {
  /** Table qui porte l'addition : la plus petite du groupe s'il y en a un. */
  table: Table;
  /** Tables réunies sous cette addition, celle-là comprise — une seule sinon. */
  tables: Table[];
  /** Commandes ouvertes de la table, de la plus ancienne à la plus récente. */
  orders: Order[];
  /** Reste dû sur les commandes en attente d'encaissement. */
  toPay: number;
  /** Lignes payées pas encore arrivées à table. */
  toServe: number;
}

/**
 * Tables en service (au moins une commande ouverte), par numéro croissant.
 * Des tables réunies ne font qu'une entrée : leur addition est commune, et
 * c'est la plus petite qui la porte.
 */
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

  const services = new Map<string, TableService>();
  for (const table of [...state.tables].sort((a, b) => a.number - b.number)) {
    const orders = byTable.get(table.id);
    if (!orders) continue;
    const key = table.groupId ?? table.id;
    const service = services.get(key);
    if (service) {
      service.tables.push(table);
      service.orders.push(...orders);
      continue;
    }
    services.set(key, { table, tables: [table], orders: [...orders], toPay: 0, toServe: 0 });
  }

  return [...services.values()].map((service) => {
    const orders = service.orders.sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    return {
      ...service,
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

/** Date du jour de service : avant l'heure de bascule, c'est encore la veille. */
export function serviceDate(date: Date, dayEndHour: number): Date {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - dayEndHour);
  return shifted;
}

/** Clé du jour de service d'un instant, pour grouper ou comparer. */
export function serviceDayKey(iso: string, dayEndHour: number): string {
  return serviceDate(new Date(iso), dayEndHour).toDateString();
}

export function isServiceToday(iso: string, dayEndHour: number): boolean {
  return (
    serviceDayKey(iso, dayEndHour) ===
    serviceDate(new Date(), dayEndHour).toDateString()
  );
}

export function revenueToday(state: GestionState): number {
  return state.orders
    .filter(
      (order) =>
        isPaid(order) &&
        isServiceToday(paidAt(order), state.dayEndHour)
    )
    .reduce((sum, order) => sum + orderTotal(order), 0);
}

/** Début du jour de service (heure de bascule), il y a `daysAgo` jours. */
export function dayStart(daysAgo: number, dayEndHour: number): Date {
  const date = serviceDate(new Date(), dayEndHour);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(dayEndHour, 0, 0, 0);
  return date;
}

/** Commandes créées dans les `days` derniers jours de service (annulées exclues). */
function ordersInPeriod(state: GestionState, days: number): Order[] {
  const from = dayStart(days - 1, state.dayEndHour).getTime();
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

/** CA encaissé (commandes payées) par jour de service, du plus ancien à aujourd'hui. */
export function revenueByDay(state: GestionState, days: number): DayPoint[] {
  const buckets: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
    const date = dayStart(daysAgo, state.dayEndHour);
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
    if (!isPaid(order)) continue;
    const point = index.get(serviceDayKey(paidAt(order), state.dayEndHour));
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
  const from = dayStart(days - 1, state.dayEndHour).getTime();
  const paid = state.orders.filter(
    (order) => isPaid(order) && new Date(paidAt(order)).getTime() >= from
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

/**
 * Partage des pourboires : ce que chaque serveur a recueilli sur les tables
 * qu'il tenait. Une commande encaissée sur une table sans serveur affecté
 * n'entre dans aucune part — elle reste au total général.
 */
export function tipsByStaff(
  orders: Order[],
  staff: Staff[]
): { staff: Staff; tip: number }[] {
  const byStaff = new Map<string, number>();
  for (const order of orders) {
    if (!order.staffId || !order.tipAmount) continue;
    byStaff.set(order.staffId, (byStaff.get(order.staffId) ?? 0) + order.tipAmount);
  }
  return staff
    .filter((member) => byStaff.has(member.id))
    .map((member) => ({ staff: member, tip: byStaff.get(member.id)! }))
    .sort((a, b) => b.tip - a.tip);
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
  return (
    item.disponible !== false &&
    item.stock !== 0 &&
    !hasBlockedRequiredGroup(item.options)
  );
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
