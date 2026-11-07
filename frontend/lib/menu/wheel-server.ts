import { createAdminClient } from "@/lib/supabase/admin";
import { buildWheel, type LoyaltyWheelConfig, type WheelSettings } from "./wheel";

/** La roue d'une maison telle que son gérant l'a réglée ; null sans roue allumée. */
export async function loadWheel(slug: string): Promise<LoyaltyWheelConfig | null> {
  const { data, error } = await createAdminClient().rpc("loyalty_wheel_config", { p_slug: slug });
  if (error) throw new Error(error.message);
  return data ? buildWheel(data as unknown as WheelSettings) : null;
}
