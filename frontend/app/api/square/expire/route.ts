import { NextResponse } from "next/server";
import { ONLINE_PAYMENT_TTL_S } from "@/lib/menu/online-payment-ttl";
import {
  getMerchantToken,
  retrieveOrder,
  settleFromOrder,
  withFreshToken,
} from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Tentatives de paiement Square abandonnées (workflow square-expire.yml).
 * Square n'a pas de session qui expire, comme Stripe : sans ce passage, une
 * commande dont le client a quitté le paiement en ligne restait en attente
 * pour toujours, hors de la caisse, son stock retenu.
 *
 * Passé la durée de vie d'une session Stripe, la tentative est écartée
 * (discard_stale_online_payment). Une tentative qui a atteint Square
 * (square_order_id) est d'abord relue auprès de Square : réglée, elle est
 * close comme par le webhook ; invérifiable (compte délié, API en panne),
 * elle est laissée en place et signalée, jamais supprimée à l'aveugle.
 */

type Admin = ReturnType<typeof createAdminClient>;

/** Vrai si Square porte un règlement abouti pour cette commande, qui est alors close. */
async function settledAtSquare(
  admin: Admin,
  order: { id: string; etablissement_id: string; square_order_id: string }
): Promise<boolean> {
  const merchant = await getMerchantToken(admin, order.etablissement_id);
  if (!merchant) throw new Error("Compte Square délié : règlement invérifiable.");
  const { order: squareOrder } = await withFreshToken(
    admin,
    order.etablissement_id,
    merchant,
    (token) => retrieveOrder(token, order.square_order_id)
  );
  return settleFromOrder(admin, order.id, squareOrder);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const startedBefore = new Date(Date.now() - ONLINE_PAYMENT_TTL_S * 1000).toISOString();
  const admin = createAdminClient();
  const { data: stale, error } = await admin
    .from("orders")
    .select("id, etablissement_id, square_order_id, etablissements!inner(payment_provider)")
    .eq("status", "en_attente")
    .eq("paid_online", false)
    .lt("online_payment_started_at", startedBefore)
    .eq("etablissements.payment_provider", "square");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let discarded = 0;
  let settled = 0;
  const failed: string[] = [];
  // En série : quelques commandes par passage, chacune relue puis écrite.
  for (const order of stale ?? []) {
    try {
      const { square_order_id: squareOrderId } = order;
      if (squareOrderId && (await settledAtSquare(admin, { ...order, square_order_id: squareOrderId }))) {
        settled += 1;
        continue;
      }
      const { data: gone, error: discardError } = await admin.rpc("discard_stale_online_payment", {
        p_order_id: order.id,
        p_started_before: startedBefore,
      });
      if (discardError) throw new Error(discardError.message);
      if (gone) discarded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[square] tentative abandonnée non traitée", { orderId: order.id, message });
      failed.push(order.id);
    }
  }

  return NextResponse.json({ discarded, settled, failed });
}
