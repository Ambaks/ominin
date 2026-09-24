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
}

export interface LoyaltyData {
  settings: LoyaltySettings;
  tiers: LoyaltyTier[];
  customers: LoyaltyCustomer[];
}

export async function loadLoyalty(etablissementId: string): Promise<LoyaltyData> {
  const supabase = createClient();
  const [etab, tiers, customers] = await Promise.all([
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
    supabase.rpc("loyalty_customers_summary", {
      p_etablissement_id: etablissementId,
    }),
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
    customers: must(customers).map((customer) => ({
      id: customer.id,
      contact: customer.contact,
      points: customer.points,
      lastActivity: customer.last_activity,
    })),
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
