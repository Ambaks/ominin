import { NextResponse } from "next/server";
import {
  createOrder,
  createPayment,
  getMerchantToken,
  retrieveOrder,
  retrievePayment,
  settlePayment,
  withFreshToken,
  type SquareOrder,
} from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement Square d'une commande passée depuis le menu QR (appelant anonyme,
 * pendant Square de /api/stripe/pay). La carte ne touche jamais nos serveurs :
 * le SDK Web Payments la tokenise dans le navigateur et nous n'en recevons
 * qu'un jeton à usage unique. Le montant, lui, n'est JAMAIS fourni par le
 * client : les lignes sont relues en base, où place_order les a figées.
 *
 * Deux appels — CreateOrder puis CreatePayment — donc une fenêtre où l'on
 * pourrait débiter sans trace. Elle est fermée par : clé d'idempotence de
 * commande déterministe, clé de paiement persistée AVANT l'appel, jeton carte
 * à usage unique côté Square, et relecture de la commande Square avant toute
 * nouvelle tentative. Le webhook signé reste le filet durable.
 */

const CURRENCY = "EUR";

interface Line {
  name: string;
  quantity: number;
  unit_price: number;
  vat_rate: number | null;
}

/**
 * Lignes Ominin en commande Square. Les prix sont TTC : la TVA est déclarée
 * INCLUSIVE, groupée par taux au niveau commande et référencée par ligne —
 * c'est la forme qu'attend l'API Orders (une ligne n'a pas de taxes propres,
 * elle applique celles de la commande).
 */
function orderBody(
  lines: Line[],
  locationId: string,
  orderId: string,
  ticketName: string
) {
  const rates = [
    ...new Set(lines.map((line) => line.vat_rate).filter((rate) => rate != null)),
  ];
  const taxUid = (rate: number) => `tva-${String(rate).replace(".", "-")}`;

  return {
    location_id: locationId,
    reference_id: orderId,
    ticket_name: ticketName,
    source: { name: "Ominin" },
    taxes: rates.map((rate) => ({
      uid: taxUid(rate),
      name: `TVA ${rate} %`,
      percentage: String(rate),
      scope: "LINE_ITEM",
      type: "INCLUSIVE",
    })),
    line_items: lines.map((line, index) => ({
      uid: `l${index}`,
      name: line.name,
      quantity: String(line.quantity),
      base_price_money: {
        amount: Math.round(line.unit_price * 100),
        currency: CURRENCY,
      },
      ...(line.vat_rate != null
        ? { applied_taxes: [{ tax_uid: taxUid(line.vat_rate) }] }
        : {}),
    })),
    // Sans fulfillment, Square ne pousse pas la commande réglée vers la
    // caisse ni vers l'Order Manager : le restaurant ne la verrait jamais.
    fulfillments: [
      {
        type: "PICKUP",
        state: "PROPOSED",
        pickup_details: {
          recipient: { display_name: ticketName },
          schedule_type: "ASAP",
          note: ticketName,
        },
      },
    ],
  };
}

/** Une commande Square déjà encaissée porte un tender avec son paiement. */
function tenderPaymentId(order: SquareOrder): string | null {
  return order.tenders?.find((tender) => tender.payment_id)?.payment_id ?? null;
}

export async function POST(request: Request) {
  const { orderId, sourceId, tipAmount } = (await request
    .json()
    .catch(() => ({}))) as {
    orderId?: string;
    sourceId?: string;
    tipAmount?: unknown;
  };
  if (!orderId || !sourceId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, etablissement_id, table_id, status, paid_online, square_order_id, square_idempotency_key"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.status !== "en_attente" || order.paid_online) {
    return NextResponse.json(
      { error: "Cette commande n'est plus à régler." },
      { status: 409 }
    );
  }

  const [{ data: etab }, { data: lines }, { data: table }] = await Promise.all([
    admin
      .from("etablissements")
      .select("name, online_payment, payment_provider, square_location_id, platform_fee_percent")
      .eq("id", order.etablissement_id)
      .single(),
    admin
      .from("order_items")
      .select("name, quantity, unit_price, vat_rate")
      .eq("order_id", orderId),
    order.table_id
      ? admin.from("tables").select("number").eq("id", order.table_id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (
    !etab?.online_payment ||
    etab.payment_provider !== "square" ||
    !etab.square_location_id
  ) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
      { status: 409 }
    );
  }
  if (!lines?.length) {
    return NextResponse.json({ error: "Commande vide." }, { status: 409 });
  }

  const merchant = await getMerchantToken(admin, order.etablissement_id);
  if (!merchant) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
      { status: 409 }
    );
  }
  const call = <T>(fn: (token: string) => Promise<T>) =>
    withFreshToken(admin, order.etablissement_id, merchant, fn);

  const locationId = etab.square_location_id;
  const existingOrderId = order.square_order_id;
  // « Table 7 » : ce que le personnel doit voir d'un coup d'œil sur son
  // écran de caisse et sur le ticket imprimé.
  const ticketName = table ? `Table ${table.number}` : `Commande — ${etab.name}`;

  try {
    let placed: SquareOrder | null = null;

    // Une tentative précédente a-t-elle abouti sans que nous ayons pu
    // l'enregistrer ? La commande Square fait foi : déjà réglée, on clôt sans
    // débiter une seconde fois.
    if (existingOrderId) {
      const existing = await call((token) =>
        retrieveOrder(token, existingOrderId)
      );
      const paymentId = tenderPaymentId(existing.order);
      if (paymentId) {
        const { payment } = await call((token) =>
          retrievePayment(token, paymentId)
        );
        await admin
          .from("orders")
          .update({ square_payment_id: paymentId })
          .eq("id", orderId);
        const paid = await settlePayment(admin, orderId, payment);
        return NextResponse.json({ paid });
      }
      placed = existing.order;
    }

    if (!placed) {
      const created = await call((token) =>
        createOrder(token, {
          // Déterministe : une relance ne peut pas créer de doublon.
          idempotency_key: `sq-order-${orderId}`,
          order: orderBody(lines, locationId, orderId, ticketName),
        })
      );
      placed = created.order;
      const { error } = await admin
        .from("orders")
        .update({ square_order_id: placed.id })
        .eq("id", orderId);
      if (error) throw new Error(error.message);
    }

    const squareOrderId = placed.id;
    const amount = placed.total_money?.amount;
    if (!amount) {
      return NextResponse.json({ error: "Commande vide." }, { status: 409 });
    }
    const tip =
      typeof tipAmount === "number" && Number.isFinite(tipAmount) && tipAmount > 0
        ? Math.min(Math.round(tipAmount * 100), amount)
        : 0;

    const feePercent = etab.platform_fee_percent ?? 0;
    const feeCents =
      feePercent > 0 ? Math.round((amount * feePercent) / 100) : 0;

    // Clé persistée AVANT l'appel : une relance réseau la réutilise et ne
    // peut pas débiter deux fois. Renouvelée à chaque tentative du client,
    // qui arrive avec un jeton carte neuf (les jetons Square sont à usage
    // unique : le précédent ne peut de toute façon plus être débité).
    const idempotencyKey = crypto.randomUUID();
    const { error: keyError } = await admin
      .from("orders")
      .update({ square_idempotency_key: idempotencyKey })
      .eq("id", orderId);
    if (keyError) throw new Error(keyError.message);

    const { payment } = await call((token) =>
      createPayment(token, {
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        order_id: squareOrderId,
        location_id: locationId,
        amount_money: { amount, currency: CURRENCY },
        ...(tip ? { tip_money: { amount: tip, currency: CURRENCY } } : {}),
        ...(feeCents > 0 && {
          app_fee_money: { amount: feeCents, currency: CURRENCY },
        }),
        reference_id: orderId,
        note: ticketName,
      })
    );

    await admin
      .from("orders")
      .update({
        square_payment_id: payment.id,
        ...(feeCents > 0 && { platform_fee_cents: feeCents }),
      })
      .eq("id", orderId);

    const paid = await settlePayment(admin, orderId, payment);
    return NextResponse.json({ paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[square] paiement impossible", { orderId, message });
    // La commande reste valable et visible en salle : le client règle au
    // comptoir. Le webhook rattrape le cas — rare — d'un débit passé dont
    // l'enregistrement a échoué.
    return NextResponse.json(
      { error: "Le paiement n'a pas pu aboutir." },
      { status: 502 }
    );
  }
}
