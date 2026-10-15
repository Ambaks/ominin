import type { Owner } from "@/lib/admin/owners";
import type { PushPayload } from "@/lib/push/events";
import { sendToSubscriptions } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Notifications de l'admin : chacun choisit sur son appareil qui il est
 * (Marwan ou Ambaka) et reçoit ce qui le concerne. Celui qui a fait le
 * geste n'est jamais notifié de son propre geste.
 */

export async function notifyOwners(
  owners: readonly Owner[],
  payload: Omit<PushPayload, "event">,
  exceptUserId?: string,
): Promise<void> {
  if (!owners.length) return;
  let query = createAdminClient()
    .from("admin_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("owner", owners);
  if (exceptUserId) query = query.neq("user_id", exceptUserId);
  const { data } = await query;
  await sendToSubscriptions(
    data ?? [],
    { ...payload, event: "projet" },
    "admin_push_subscriptions",
  );
}
