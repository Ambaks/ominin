import { NextResponse } from "next/server";
import { confirmOrderPaid, verifyWebhookSignature } from "@/lib/square/server";
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
      payment?: { order_id?: string };
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
  const squareOrderId =
    event.data?.object?.payment?.order_id ??
    event.data?.object?.order_updated?.order_id;
  if (!squareOrderId) return NextResponse.json({ received: true });

  // Par la commande Square : son identifiant est enregistré avant tout débit,
  // et c'est elle qui porte le règlement — y compris celui dont nous n'avons
  // pas pu enregistrer le paiement, le cas que ce webhook existe pour
  // rattraper.
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("orders")
    .select("id, etablissement_id, paid_online")
    .eq("square_order_id", squareOrderId)
    .maybeSingle();
  if (!target || target.paid_online) {
    return NextResponse.json({ received: true });
  }

  try {
    await confirmOrderPaid(admin, {
      id: target.id,
      etablissement_id: target.etablissement_id,
      square_order_id: squareOrderId,
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
