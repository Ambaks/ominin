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

export async function fetchOverview(period: Period): Promise<ClientOverview[]> {
  return createClient()
    .rpc("admin_menu_overview", { p_from: period.from, p_to: period.to })
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
