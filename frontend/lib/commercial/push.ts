import type { PushPayload } from "@/lib/push/events";
import { sendToSubscriptions } from "@/lib/push/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { PushEventKey } from "./api";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Notification sur les appareils du commercial, s'il ne l'a pas coupée. Un
 * à-côté : l'e-mail (preuve) et l'écran Aujourd'hui portent l'information.
 */
export async function notifyCommercial(
  admin: Admin,
  commercialId: string,
  event: PushEventKey,
  payload: Omit<PushPayload, "event">
): Promise<void> {
  const [{ data: commercial }, { data: subscriptions }] = await Promise.all([
    admin.from("commerciaux").select("push_prefs").eq("id", commercialId).single(),
    admin.from("commercial_push_subscriptions").select("id, endpoint, p256dh, auth").eq("commercial_id", commercialId),
  ]);
  const prefs = (commercial?.push_prefs ?? {}) as Partial<Record<PushEventKey, boolean>>;
  if (prefs[event] === false) return;
  await sendToSubscriptions(subscriptions ?? [], { ...payload, event: "commercial" }, "commercial_push_subscriptions");
}
