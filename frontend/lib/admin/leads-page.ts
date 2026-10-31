import { createClient } from "@/lib/supabase/client";
import { must, type ListPage } from "@/lib/supabase/result";
import { CATEGORY_LABELS, STATUS_ORDER } from "./constants";
import { addDays, dayStart, normalizeText } from "./format";
import { rowToLeadLite } from "./mappers";
import type { LeadSortKey, LeadSummary } from "./selectors";
import type { Product } from "./products";
import type { Filters, LeadLite } from "./types";

/* Les fiches du CRM, lues par pages : la base filtre, trie, cherche et compte. */

export interface LeadQuery {
  filters: Filters;
  product: Product | null;
  /** Restaurants ayant un RDV à venir (déjà dans le store). */
  appointmentIds: string[];
  sort: LeadSortKey;
  descending: boolean;
}

const list = <T>(values: Set<T>): T[] | null => (values.size > 0 ? [...values] : null);

const CATEGORIES_BY_LABEL = Object.entries(CATEGORY_LABELS)
  .sort(([, a], [, b]) => a.localeCompare(b, "fr"))
  .map(([category]) => category);

export async function fetchLeadsPage(
  { filters, product, appointmentIds, sort, descending }: LeadQuery,
  limit: number,
  offset: number
): Promise<ListPage<LeadLite>> {
  const rows = must(
    await createClient().rpc("crm_leads_page", {
      p_product: product,
      p_statuses: list(filters.statuses),
      p_categories: list(filters.categories),
      p_cities: list(filters.cities),
      p_has_email: filters.hasEmail,
      p_has_phone: filters.hasPhone,
      p_has_website: filters.hasWebsite,
      p_has_follow_up: filters.hasFollowUp,
      p_restaurant_ids: filters.hasAppointment ? appointmentIds : null,
      p_contact_before:
        filters.noContactDays !== null
          ? new Date(Date.now() - filters.noContactDays * 86_400_000).toISOString()
          : null,
      p_tokens: normalizeText(filters.q.trim()).split(/\s+/).filter(Boolean),
      p_sort: sort,
      p_order: sort === "status" ? [...STATUS_ORDER] : CATEGORIES_BY_LABEL,
      p_desc: descending,
      p_limit: limit,
      p_offset: offset,
    })
  );
  return {
    rows: rows.flatMap(
      (row) =>
        rowToLeadLite({
          ...row,
          lead: {
            id: row.lead_id,
            status: row.status,
            priority: row.priority,
            last_contact_at: row.last_contact_at,
            next_follow_up_at: row.next_follow_up_at,
            target_products: row.target_products,
          },
        } as Parameters<typeof rowToLeadLite>[0]) ?? []
    ),
    total: rows[0]?.total ?? 0,
  };
}

export async function fetchLeadSummary(product: Product | null): Promise<LeadSummary> {
  const today = dayStart();
  const rows = must(
    await createClient().rpc("crm_lead_summary", {
      p_product: product,
      p_today: today.toISOString(),
      p_tomorrow: addDays(today, 1).toISOString(),
      p_week_end: addDays(today, 8).toISOString(),
    })
  );
  return rows.map((row) => ({
    status: row.status as LeadSummary[number]["status"],
    leads: row.leads,
    overdue: row.overdue,
    dueToday: row.due_today,
    upcoming: row.upcoming,
  }));
}

export async function fetchLeadCities(product: Product | null): Promise<string[]> {
  return must(await createClient().rpc("crm_cities", { p_product: product }));
}

/** Plafond de réponse de PostgREST : un export complet se lit par tranches. */
const EXPORT_BATCH = 1000;

/** Toutes les fiches de la requête, dans son ordre : pour l'export demandé. */
export async function fetchAllLeadIds(query: LeadQuery): Promise<string[]> {
  const ids: string[] = [];
  for (;;) {
    const page = await fetchLeadsPage(query, EXPORT_BATCH, ids.length);
    ids.push(...page.rows.map((lead) => lead.restaurantId));
    if (page.rows.length < EXPORT_BATCH) return ids;
  }
}
