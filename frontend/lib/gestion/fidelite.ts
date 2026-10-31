import { createClient } from "@/lib/supabase/client";
import { check, must } from "@/lib/supabase/result";

/*
 * Onglet Fidélité : réglages du programme, paliers et clients. Lecture
 * directe de Supabase (RLS, RPC réservées au gérant) : ces données ne vivent
 * pas dans le store de gestion, seul cet écran s'en sert.
 */

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerEuro: number;
}

export interface LoyaltyTier {
  id: string;
  label: string;
  points: number;
  itemIds: string[];
}

export interface LoyaltyTierInput {
  label: string;
  points: number;
  itemIds: string[];
}

export interface LoyaltyCustomer {
  id: string;
  contact: string;
  points: number;
  lastActivity: string;
  /** Son id chez HubRise, quand l'établissement y est relié. */
  hubriseCustomerId?: string;
}

export interface LoyaltyData {
  settings: LoyaltySettings;
  tiers: LoyaltyTier[];
}

export interface LoyaltyCustomersPage {
  customers: LoyaltyCustomer[];
  /** Tous ceux qui correspondent à la recherche, pas seulement cette page. */
  total: number;
}

export async function loadLoyalty(etablissementId: string): Promise<LoyaltyData> {
  const supabase = createClient();
  const [etab, tiers] = await Promise.all([
    supabase
      .from("etablissements")
      .select("loyalty_enabled, loyalty_points_per_euro")
      .eq("id", etablissementId)
      .single(),
    supabase
      .from("loyalty_rewards")
      .select("id, label, points, loyalty_reward_items(item_id)")
      .eq("etablissement_id", etablissementId)
      .order("points"),
  ]);
  const settings = must(etab);
  return {
    settings: {
      enabled: settings.loyalty_enabled,
      pointsPerEuro: Number(settings.loyalty_points_per_euro),
    },
    tiers: must(tiers).map((tier) => ({
      id: tier.id,
      label: tier.label,
      points: tier.points,
      itemIds: tier.loyalty_reward_items.map((link) => link.item_id),
    })),
  };
}

/** Une page de clients, les plus récemment actifs d'abord ; `search` est déjà normalisé. */
export async function loadLoyaltyCustomers(
  etablissementId: string,
  search: string,
  limit: number,
  offset: number
): Promise<LoyaltyCustomersPage> {
  const rows = must(
    await createClient().rpc("loyalty_customers_page", {
      p_etablissement_id: etablissementId,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    })
  );
  return {
    customers: rows.map((customer) => ({
      id: customer.id,
      contact: customer.contact,
      points: customer.points,
      lastActivity: customer.last_activity,
      hubriseCustomerId: customer.hubrise_customer_id ?? undefined,
    })),
    total: rows[0]?.total ?? 0,
  };
}

export async function saveLoyaltySettings(
  etablissementId: string,
  settings: LoyaltySettings
): Promise<void> {
  check(
    await createClient()
      .from("etablissements")
      .update({
        loyalty_enabled: settings.enabled,
        loyalty_points_per_euro: settings.pointsPerEuro,
      })
      .eq("id", etablissementId)
  );
}

/** Les articles d'un palier se réécrivent en bloc : c'est la liste cochée. */
async function setTierItems(tierId: string, itemIds: string[]): Promise<void> {
  const supabase = createClient();
  check(
    await supabase.from("loyalty_reward_items").delete().eq("reward_id", tierId)
  );
  if (itemIds.length) {
    check(
      await supabase
        .from("loyalty_reward_items")
        .insert(itemIds.map((itemId) => ({ reward_id: tierId, item_id: itemId })))
    );
  }
}

export async function createTier(
  etablissementId: string,
  input: LoyaltyTierInput
): Promise<void> {
  const tier = must(
    await createClient()
      .from("loyalty_rewards")
      .insert({
        etablissement_id: etablissementId,
        label: input.label,
        points: input.points,
      })
      .select("id")
      .single()
  );
  await setTierItems(tier.id, input.itemIds);
}

export async function updateTier(
  tierId: string,
  input: LoyaltyTierInput
): Promise<void> {
  check(
    await createClient()
      .from("loyalty_rewards")
      .update({ label: input.label, points: input.points })
      .eq("id", tierId)
  );
  await setTierItems(tierId, input.itemIds);
}

export async function deleteTier(tierId: string): Promise<void> {
  check(await createClient().from("loyalty_rewards").delete().eq("id", tierId));
}

/** Geste commercial : points en plus (positif) ou en moins (négatif). */
export async function adjustPoints(
  etablissementId: string,
  contact: string,
  points: number
): Promise<void> {
  check(
    await createClient().rpc("loyalty_adjust", {
      p_etablissement_id: etablissementId,
      p_contact: contact,
      p_points: points,
    })
  );
}

/**
 * Droit à l'effacement : la carte du client, et nom, téléphone et note de ses
 * commandes passées (loyalty_erase_customer) ; la caisse HubRise suit.
 */
export async function eraseCustomer(
  etablissementId: string,
  customerId: string
): Promise<void> {
  check(
    await createClient().rpc("loyalty_erase_customer", {
      p_etablissement_id: etablissementId,
      p_customer_id: customerId,
    })
  );
}

/** Une case de la série : un jour, ou une semaine (du lundi, heure de Paris). */
export interface LoyaltyBucket {
  /** Son premier jour, AAAA-MM-JJ. */
  bucket: string;
  /** Faux avant la première carte : il n'y avait pas encore de programme. */
  active: boolean;
  paidOrders: number;
  cardOrders: number;
  rewardsUsed: number;
  /** Clients avec carte à la fin de la case. */
  members: number;
  newMembers: number;
  /** Téléphones reconnus à la fin de la case. */
  phones: number;
  newPhones: number;
}

export interface LoyaltyStats {
  members: number;
  returningMembers: number;
  rememberedPhones: number;
  pointsOutstanding: number;
}

/** Les totaux du programme, en tête de l'onglet. */
export async function loadLoyaltyStats(etablissementId: string): Promise<LoyaltyStats> {
  const totals = must(
    await createClient().rpc("loyalty_stats_members", { p_etablissement_id: etablissementId })
  )[0];
  return {
    members: totals?.members ?? 0,
    returningMembers: totals?.returning_members ?? 0,
    rememberedPhones: totals?.remembered_phones ?? 0,
    pointsOutstanding: totals?.points_outstanding ?? 0,
  };
}

/** `days` : ces jours et ceux d'avant, du plus ancien au plus récent. Null : toutes les semaines. */
export async function loadLoyaltySeries(
  etablissementId: string,
  days: number | null
): Promise<LoyaltyBucket[]> {
  const rows = must(
    await createClient().rpc("loyalty_stats_series", {
      p_etablissement_id: etablissementId,
      p_days: days,
    })
  );
  return rows.map((row) => ({
    bucket: row.bucket,
    active: row.active,
    paidOrders: row.paid_orders,
    cardOrders: row.card_orders,
    rewardsUsed: row.rewards_used,
    members: row.members,
    newMembers: row.new_members,
    phones: row.phones,
    newPhones: row.new_phones,
  }));
}
