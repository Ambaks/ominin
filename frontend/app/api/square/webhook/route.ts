import { NextResponse } from "next/server";
import {
  confirmOrderPaid,
  getMerchantToken,
  retrieveOrder,
  verifyWebhookSignature,
  withFreshToken,
} from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhook Square : payment.updated et order.updated. Contrairement à SumUp,
 * Square signe ses notifications — la signature est vérifiée sur le corps
 * BRUT avant tout parse, et un événement non signé est refusé.
 *
 * C'est le filet durable du chemin de paiement : si /api/square/pay meurt
 * entre le débit et son enregistrement, c'est ici que la commande est
 * rattrapée (Square réessaie ses notifications de lui-même). Toujours 200 sur
 * un événement inconnu : ni fuite d'information, ni tempête de retries.
 */

interface SquareEvent {
  type?: string;
  data?: {
    object?: {
      payment?: { id?: string; order_id?: string };
      order_updated?: { order_id?: string; state?: string };
    };
  };
}

export async function POST(request: Request) {
  // Corps brut d'abord : la signature porte sur les octets reçus, pas sur
  // un objet re-sérialisé.
  const rawBody = await request.text();

  // L'URL signée est celle déclarée dans l'abonnement Square, au caractère
  // près. request.url peut porter le host interne (routage Vercel), d'où les
  // en-têtes transmis.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = forwardedProto ?? new URL(request.url).protocol.replace(":", "");
  const notificationUrl = `${protocol}://${host}/api/square/webhook`;

  if (
    !verifyWebhookSignature(
      rawBody,
      request.headers.get("x-square-hmacsha256-signature"),
      notificationUrl
    )
  ) {
    // L'URL est journalisée : une signature qui échoue systématiquement
    // signifie presque toujours qu'elle diffère de celle déclarée chez Square.
    console.error("[square] signature de webhook invalide", { notificationUrl });
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as SquareEvent;
  const payment = event.data?.object?.payment;
  const squareOrderId =
    payment?.order_id ?? event.data?.object?.order_updated?.order_id;
  if (!payment?.id && !squareOrderId) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const COLUMNS = "id, etablissement_id, square_payment_id, paid_online";
  const find = (column: string, value: string) =>
    admin.from("orders").select(COLUMNS).eq(column, value).maybeSingle();

  // Par le paiement d'abord ; sinon par la commande Square — c'est le cas que
  // ce webhook existe pour rattraper, celui d'un débit dont nous n'avons pas
  // pu enregistrer l'identifiant.
  let target = payment?.id ? (await find("square_payment_id", payment.id)).data : null;
  if (!target && squareOrderId) {
    target = (await find("square_order_id", squareOrderId)).data;
  }

  if (!target || target.paid_online) {
    return NextResponse.json({ received: true });
  }

  try {
    let paymentId = payment?.id ?? target.square_payment_id;
    if (!paymentId && squareOrderId) {
      // order.updated sans paiement en main : le tender de la commande
      // Square porte l'identifiant du règlement.
      const merchant = await getMerchantToken(admin, target.etablissement_id);
      if (!merchant) return NextResponse.json({ received: true });
      const { order: squareOrder } = await withFreshToken(
        admin,
        target.etablissement_id,
        merchant,
        (token) => retrieveOrder(token, squareOrderId)
      );
      paymentId =
        squareOrder.tenders?.find((tender) => tender.payment_id)?.payment_id ??
        null;
    }
    if (!paymentId) return NextResponse.json({ received: true });

    if (paymentId !== target.square_payment_id) {
      await admin
        .from("orders")
        .update({ square_payment_id: paymentId })
        .eq("id", target.id);
    }
    await confirmOrderPaid(admin, {
      id: target.id,
      etablissement_id: target.etablissement_id,
      square_payment_id: paymentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[square] webhook non traité", { orderId: target.id, message });
    // 500 : Square réessaiera, ce qui est exactement ce qu'on veut d'un
    // échec transitoire sur une commande qu'on sait payée.
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
