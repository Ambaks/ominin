import { LIVE_SESSION_WINDOW_S } from "@/lib/admin/constants";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { must } from "@/lib/supabase/result";

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
