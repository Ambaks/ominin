import {
  ITEM_RANKING_COUNT,
  LIVE_SESSION_WINDOW_S,
  PILOTAGE_READY_BATCH_SECONDS,
  PILOTAGE_RETURN_DAYS,
} from "@/lib/admin/constants";
import type { AccordSource } from "@/lib/menu/cart";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";

/*
 * Chiffres de l'onglet Clients. Tout passe par des fonctions SECURITY DEFINER
 * gardées par is_admin() : agréger dans Postgres évite de faire descendre les
 * commandes de tous les restaurants dans le navigateur, et évite surtout
 * d'ouvrir une policy transverse sur orders — la table la plus sollicitée de
 * la base — pour deux utilisateurs internes.
 */

type Fn = Database["public"]["Functions"];

export type ClientOverview = Fn["admin_menu_overview"]["Returns"][number];
export type SeriesPoint = Fn["admin_menu_series"]["Returns"][number];
export type Funnel = Fn["admin_menu_funnel"]["Returns"][number];
export type ItemRanking = Fn["admin_menu_items"]["Returns"][number];
export type Measures = Fn["admin_menu_measures"]["Returns"][number];
export type PaymentCardRow = Fn["admin_payment_cards"]["Returns"][number];
export type LiveRow = Fn["admin_menu_live"]["Returns"][number];
export type FeedRow = Fn["admin_menu_feed"]["Returns"][number];

/** Le générateur de types tient toute colonne renvoyée pour non nulle ; celles
 * qui viennent d'une jointure externe ne le sont pas. */
type WithNull<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

export type ShopClient = WithNull<
  Fn["admin_shop_overview"]["Returns"][number],
  "owner_email" | "subscription_status" | "last_paid_at"
>;
export type ClipClient = WithNull<
  Fn["admin_clip_overview"]["Returns"][number],
  "last_post_at"
>;
export type AgentsClient = WithNull<
  Fn["admin_agents_overview"]["Returns"][number],
  "activated_at" | "last_run_at" | "last_error" | "mailbox_email" | "mailbox_error"
>;

export interface Period {
  from: string;
  to: string;
}

/** Fenêtre glissante finissant maintenant : ce que « les 30 derniers jours »
 * veut dire pour quelqu'un qui regarde son tableau de bord un mardi. */
export function periodOf(days: number): Period {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** La période de même durée qui précède immédiatement. */
export function previousPeriod(period: Period): Period {
  const from = new Date(period.from);
  const length = new Date(period.to).getTime() - from.getTime();
  return {
    from: new Date(from.getTime() - length).toISOString(),
    to: period.from,
  };
}

export async function fetchOverview(period: Period): Promise<ClientOverview[]> {
  return createClient()
    .rpc("admin_menu_overview", { p_from: period.from, p_to: period.to })
    .then(must);
}

export async function fetchShopClients(period: Period): Promise<ShopClient[]> {
  return createClient()
    .rpc("admin_shop_overview", { p_from: period.from, p_to: period.to })
    .then(must);
}

export async function fetchClipClients(period: Period): Promise<ClipClient[]> {
  return createClient()
    .rpc("admin_clip_overview", { p_from: period.from, p_to: period.to })
    .then(must);
}

export async function fetchAgentsClients(
  period: Period
): Promise<AgentsClient[]> {
  return createClient()
    .rpc("admin_agents_overview", { p_from: period.from, p_to: period.to })
    .then(must);
}

export async function fetchSeries(
  etablissementId: string,
  period: Period
): Promise<SeriesPoint[]> {
  return createClient()
    .rpc("admin_menu_series", {
      p_etab: etablissementId,
      p_from: period.from,
      p_to: period.to,
    })
    .then(must);
}

const EMPTY_FUNNEL: Funnel = {
  sessions: 0,
  categories: 0,
  plats: 0,
  paniers: 0,
  commandes: 0,
  paiements: 0,
  item_clicks: 0,
};

export async function fetchFunnel(
  etablissementId: string,
  period: Period
): Promise<Funnel> {
  const rows = await createClient()
    .rpc("admin_menu_funnel", {
      p_etab: etablissementId,
      p_from: period.from,
      p_to: period.to,
    })
    .then(must);
  return rows[0] ?? EMPTY_FUNNEL;
}

export async function fetchItemRanking(
  etablissementId: string,
  period: Period
): Promise<ItemRanking[]> {
  return createClient()
    .rpc("admin_menu_items", {
      p_etab: etablissementId,
      p_from: period.from,
      p_to: period.to,
    })
    .then(must);
}

export interface ComboStats {
  revenue: number;
  lines: number;
  /** Chiffre de toutes les commandes de la période, suggestions comprises. */
  total: number;
  by_source: { source: AccordSource; lines: number; revenue: number }[];
  top: { name: string; quantity: number; revenue: number }[];
  /** Proposées et retenues par sorte, suite du repas comprise. */
  suggestions: Pilotage["suggestions"];
}

/** Sans établissement : toute la flotte, démos exclues. */
export async function fetchCombo(
  etablissementId: string | null,
  period: Period
): Promise<ComboStats> {
  const { data, error } = await createClient().rpc("admin_combo_parfait", {
    p_etab: etablissementId,
    p_from: period.from,
    p_to: period.to,
    p_top: ITEM_RANKING_COUNT,
  });
  if (error) throw new Error(error.message);
  return data as unknown as ComboStats;
}

/** Le document que renvoie admin_menu_pilotage. */
export interface Pilotage {
  venue: {
    bar_pickup: boolean;
    pilotage_from: string | null;
    from_at: string;
    first_visit_at: string | null;
  };
  till: { connected: boolean; sales: number; revenue: number; qr_revenue: number };
  reach: {
    visits: number;
    without_table: number;
    tables: { number: number; zone: string | null; visits: number; orders: number }[];
  };
  conversion: {
    median_to_order_s: number | null;
    hours: {
      hour: number;
      visits: number;
      baskets: number;
      converted: number;
      orders: number;
      revenue: number;
      basket: number | null;
    }[];
  };
  bar: {
    orders: number;
    with_ready: number;
    paid_to_ready_median_s: number | null;
    paid_to_ready_max_s: number | null;
    ready_to_handed_median_s: number | null;
    ready_to_handed_max_s: number | null;
    paid_to_handed_median_s: number | null;
    paid_to_handed_max_s: number | null;
    promised: number;
    promise_kept: number;
    closed_days_orders: number;
    never_handed: number;
    handed_without_ready: number;
    ready_batched: number;
    waiting_now: number;
    waiting_median_s: number | null;
    ready_never_collected: number;
  };
  bar_hours: {
    hour: number;
    orders: number;
    paid_to_ready_s: number | null;
    ready_to_handed_s: number | null;
    paid_to_handed_s: number | null;
  }[];
  bar_people: {
    name: string;
    marked_ready: number;
    paid_to_ready_s: number | null;
    handed_over: number;
    ready_to_handed_s: number | null;
  }[];
  sold_out: {
    name: string;
    times: number;
    seconds: number;
    still_out: boolean;
  }[];
  saturation: {
    open_orders: number;
    orders: number;
    paid_to_ready_s: number | null;
    paid_to_handed_s: number | null;
  }[];
  basket: {
    orders: number;
    average: number | null;
    quantity_average: number | null;
    several_lines: number;
    pairs: { first: string; second: string; orders: number }[];
  };
  menu: { items: number; sold: number };
  suggestions: {
    kind: Database["public"]["Enums"]["menu_suggestion_kind"];
    shown: number;
    orders: number;
    revenue: number;
  }[];
  loyalty: {
    signups: number;
    orders_with_member: number;
    cohort: number;
    returned: number;
    wheel_spins: number;
    redemptions: number;
  };
  payment: {
    online: number;
    at_bar: number;
    unpaid: number;
    online_revenue: number;
    at_bar_revenue: number;
    cancelled: number;
    refunded: number;
    tips: number;
  };
}

export async function fetchPilotage(
  etablissementId: string,
  period: Period
): Promise<Pilotage> {
  const data = await createClient()
    .rpc("admin_menu_pilotage", {
      p_etab: etablissementId,
      p_from: period.from,
      p_to: period.to,
      p_return_days: PILOTAGE_RETURN_DAYS,
      p_limit: ITEM_RANKING_COUNT,
      p_ready_batch_seconds: PILOTAGE_READY_BATCH_SECONDS,
    })
    .then(must);
  return data as unknown as Pilotage;
}

/** Le document que renvoie admin_after_meal_stats. */
export interface AfterMealStats {
  served_orders: number;
  appearances: number;
  by_event: Partial<
    Record<
      Database["public"]["Enums"]["after_meal_event"],
      { total: number; appearances: number; median_ms: number | null }
    >
  >;
  by_moment: { moment: string; appearances: number }[];
  orders: number;
  revenue: number;
  items: { name: string; shown: number; added: number; removed: number; sold: number }[];
}

export async function fetchAfterMealStats(
  etablissementId: string,
  period: Period
): Promise<AfterMealStats> {
  const data = await createClient()
    .rpc("admin_after_meal_stats", {
      p_etab: etablissementId,
      p_from: period.from,
      p_to: period.to,
    })
    .then(must);
  return data as unknown as AfterMealStats;
}

export async function savePilotageFrom(
  etablissementId: string,
  from: string | null
): Promise<void> {
  await createClient()
    .rpc("admin_set_pilotage_from", { p_etab: etablissementId, p_from: from })
    .then(check);
}

export async function fetchMeasures(
  etablissementId: string,
  period: Period
): Promise<Measures | null> {
  const rows = await createClient()
    .rpc("admin_menu_measures", {
      p_etab: etablissementId,
      p_from: period.from,
      p_to: period.to,
    })
    .then(must);
  return rows[0] ?? null;
}

export async function fetchPaymentCards(
  etablissementId: string,
  period: Period
): Promise<PaymentCardRow[]> {
  return createClient()
    .rpc("admin_payment_cards", {
      p_etab: etablissementId,
      p_from: period.from,
      p_to: period.to,
    })
    .then(must);
}

export async function fetchLive(): Promise<LiveRow[]> {
  return createClient()
    .rpc("admin_menu_live", { p_window_seconds: LIVE_SESSION_WINDOW_S })
    .then(must);
}

export async function fetchFeed(
  limit: number,
  etablissementId?: string
): Promise<FeedRow[]> {
  return createClient()
    .rpc("admin_menu_feed", { p_limit: limit, p_etab: etablissementId ?? null })
    .then(must);
}

/**
 * Ce que la commission aurait rapporté si tout passait en ligne. L'écart avec
 * la commission facturée, c'est l'encaissement en espèces et au comptoir :
 * le seul chiffre qui dise ce que vaudrait un client entièrement digitalisé.
 */
export function theoreticalCommission(row: ClientOverview): number {
  return (row.revenue * row.fee_percent) / 100;
}

export function conversionRate(sessions: number, converted: number): number {
  return sessions === 0 ? 0 : converted / sessions;
}

/**
 * Tentatives terminées sans paiement ni retour au comptoir. Une tentative en
 * cours n'a pas encore d'issue : elle n'entre pas dans le calcul.
 */
export function paymentFailure(measures: Measures): { failures: number; closed: number; rate: number } {
  const failures = measures.expired + measures.failed;
  const closed = measures.succeeded + measures.counter + failures;
  return { failures, closed, rate: closed === 0 ? 0 : failures / closed };
}
