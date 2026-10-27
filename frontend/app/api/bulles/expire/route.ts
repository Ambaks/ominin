import { NextResponse } from "next/server";
import { retryRefunds, settlePart } from "@/lib/bulles/settle";
import { ONLINE_PAYMENT_TTL_S } from "@/lib/menu/online-payment-ttl";
import { capturedTender, getMerchantToken, retrieveOrder, withFreshToken } from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Passage périodique des bulles (workflow bulles-expire.yml), qui ferme ce
 * qu'aucune action d'un client ne fermera :
 *
 * 1. Une part partie chez Square sans réponse enregistrée (onglet fermé,
 *    route coupée), en attente ou abandonnée depuis, est relue dans sa
 *    commande Square : réglée, elle est comptée (ou rendue si elle ne
 *    pouvait plus compter) ; sinon sa tentative est close.
 * 2. Les remboursements restés en route — parts payées d'une réservation
 *    fermée, ou marquées rendues sans réponse de Square — sont rejoués.
 * 3. Une réservation restée sans aucun paiement, ses parts expirées, est
 *    annulée (bulles_expirer). Celle qui a des places payées reste ouverte :
 *    le groupe paie le reste dans la bulle pour commander.
 *
 * Ce qui n'a pas pu être vérifié ou rendu est laissé en place et signalé :
 * l'échec du workflow est le canal d'alerte.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const admin = createAdminClient();
  const startedBefore = new Date(Date.now() - ONLINE_PAYMENT_TTL_S * 1000).toISOString();
  const { data: stale, error } = await admin
    .from("bulle_parts")
    .select("id, etablissement_id, status, square_order_id")
    .in("status", ["en_attente", "annulee"])
    .eq("method", "en_ligne")
    .not("square_order_id", "is", null)
    .not("square_idempotency_key", "is", null)
    .is("square_payment_id", null)
    .lt("created_at", startedBefore);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let settled = 0;
  let abandoned = 0;
  const failed: string[] = [];
  for (const part of stale) {
    try {
      const merchant = await getMerchantToken(admin, part.etablissement_id);
      if (!merchant) throw new Error("Compte Square délié : règlement invérifiable.");
      const squareOrderId = part.square_order_id as string;
      const { order } = await withFreshToken(admin, part.etablissement_id, merchant, (token) =>
        retrieveOrder(token, squareOrderId)
      );
      const tender = capturedTender(order);
      if (tender) {
        await settlePart(admin, part.id, tender.payment_id, tender.amount_money?.amount ?? 0);
        settled += 1;
        continue;
      }
      // Rien n'a été débité : la tentative est close, la part ne sera plus
      // relue (sans clé, elle ne peut plus être débitée par nous).
      const { error: abandonError } = await admin
        .from("bulle_parts")
        .update({ status: "annulee", square_idempotency_key: null })
        .eq("id", part.id)
        .in("status", ["en_attente", "annulee"]);
      if (abandonError) throw new Error(abandonError.message);
      abandoned += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[bulles] part en suspens non traitée", { partId: part.id, message });
      failed.push(part.id);
    }
  }

  try {
    failed.push(...(await retryRefunds(admin)));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: cancelled, error: expireError } = await admin.rpc("bulles_expirer");
  if (expireError) {
    return NextResponse.json({ error: expireError.message }, { status: 500 });
  }

  return NextResponse.json({ settled, abandoned, cancelled, failed });
}
