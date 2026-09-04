import { NextResponse } from "next/server";
import { confirmOrderPaid } from "@/lib/sumup/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhook SumUp (return_url des checkouts). SumUp ne signe pas ses webhooks :
 * le payload n'est jamais cru sur parole — on retrouve la commande par
 * sumup_checkout_id puis confirmOrderPaid relit le checkout auprès de l'API
 * avant de marquer quoi que ce soit. Toujours 200 : un checkout inconnu ne
 * doit ni fuiter d'information ni déclencher de tempête de retries.
 */

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    checkout_id?: string;
    payload?: { checkout_id?: string; id?: string };
  } | null;
  const checkoutId =
    payload?.payload?.checkout_id ??
    payload?.payload?.id ??
    payload?.checkout_id ??
    payload?.id;
  if (!checkoutId) return NextResponse.json({ received: true });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, etablissement_id, paid_online")
    .eq("sumup_checkout_id", checkoutId)
    .maybeSingle();

  if (order && !order.paid_online) {
    await confirmOrderPaid(admin, { ...order, sumup_checkout_id: checkoutId });
  }
  return NextResponse.json({ received: true });
}
