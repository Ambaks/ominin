import type { WheelPrize, WheelSettings } from "@/lib/menu/wheel";
import { WHEEL_DEFAULT_BUDGET, WHEEL_DEFAULT_GOLDEN, WHEEL_DEFAULT_MIN_ORDER } from "@/lib/menu/wheel-config";
import type { MenuItem } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";
import { check, must } from "@/lib/supabase/result";

/*
 * La roue de fidélité, côté gérant (Réglages › La roue) : ce qu'elle offre,
 * à quelles conditions, et ce qu'elle a donné. Un lot de la carte garde son
 * article : son prix suit la carte ; son nom et sa photo aussi, sauf un nom
 * court ou une photo posés pour la roue.
 */

/** Un lot tel que le gérant le règle. */
export interface PrizeDraft {
  itemId?: string;
  /** Le nom sur la roue ; vide pour un article, son nom à la carte. */
  label: string;
  /** La photo ; vide pour un article, la sienne à la carte. */
  image: string;
  /** La valeur d'un lot hors carte (€). */
  price?: number;
}

export interface WheelDraft {
  enabled: boolean;
  budget: number;
  minOrder: number;
  golden: { every: number; multiplier: number } | null;
  prizes: PrizeDraft[];
}

/** Une roue jamais réglée : éteinte, aux valeurs de départ. */
export const NEW_WHEEL: WheelDraft = {
  enabled: false,
  budget: WHEEL_DEFAULT_BUDGET,
  minOrder: WHEEL_DEFAULT_MIN_ORDER,
  golden: { ...WHEEL_DEFAULT_GOLDEN },
  prizes: [],
};

export async function loadWheel(etablissementId: string): Promise<WheelDraft> {
  const { data: row, error } = await createClient()
    .from("loyalty_wheels")
    .select("enabled, budget, min_order, golden_every, golden_multiplier, loyalty_wheel_prizes(item_id, label, image, price, position)")
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return NEW_WHEEL;
  return {
    enabled: row.enabled,
    budget: Number(row.budget),
    minOrder: Number(row.min_order),
    golden:
      row.golden_every && row.golden_multiplier
        ? { every: row.golden_every, multiplier: row.golden_multiplier }
        : null,
    prizes: [...row.loyalty_wheel_prizes]
      .sort((a, b) => a.position - b.position)
      .map((prize) => ({
        ...(prize.item_id && { itemId: prize.item_id }),
        label: prize.label ?? "",
        image: prize.image ?? "",
        ...(prize.price !== null && { price: Number(prize.price) }),
      })),
  };
}

export async function saveWheel(etablissementId: string, wheel: WheelDraft): Promise<void> {
  check(
    await createClient().rpc("loyalty_wheel_save", {
      p_etablissement_id: etablissementId,
      p_enabled: wheel.enabled,
      p_budget: wheel.budget,
      p_min_order: wheel.minOrder,
      p_golden_every: wheel.golden?.every ?? null,
      p_golden_multiplier: wheel.golden?.multiplier ?? null,
      p_prizes: wheel.prizes.map((prize) =>
        prize.itemId
          ? { item_id: prize.itemId, label: prize.label.trim(), image: prize.image.trim() }
          : { label: prize.label.trim(), image: prize.image.trim(), price: prize.price }
      ),
    })
  );
}

/**
 * Le lot tel que la roue le montre, avec l'article qu'il vise ; null quand
 * l'article a quitté la carte ou n'a pas de prix (il ne tourne plus).
 */
export function resolvePrize(prize: PrizeDraft, items: Map<string, MenuItem>): WheelPrize | null {
  if (!prize.itemId) {
    return prize.price ? { label: prize.label.trim(), image: prize.image.trim() || undefined, price: prize.price } : null;
  }
  const item = items.get(prize.itemId);
  if (!item || item.price <= 0) return null;
  return {
    itemId: item.id,
    label: prize.label.trim() || item.name,
    image: prize.image.trim() || item.image,
    price: item.price,
  };
}

/** La roue telle qu'elle tournera, pour en montrer les chances. */
export function wheelSettings(wheel: WheelDraft, items: Map<string, MenuItem>): WheelSettings {
  return {
    budget: wheel.budget,
    minOrder: wheel.minOrder,
    golden: wheel.golden,
    prizes: wheel.prizes.flatMap((prize) => resolvePrize(prize, items) ?? []),
  };
}

/** Ce que la roue a donné depuis son lancement. */
export interface WheelStats {
  spins: number;
  points: number;
  prizes: { label: string; won: number; used: number }[];
}

export async function loadWheelStats(etablissementId: string): Promise<WheelStats> {
  const data = must(
    await createClient().rpc("loyalty_wheel_stats", { p_etablissement_id: etablissementId })
  ) as unknown as WheelStats;
  return { spins: Number(data.spins), points: Number(data.points), prizes: data.prizes };
}
