import { NextResponse } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import { bulleCheckout } from "@/lib/bulles/server";
import { settlePart } from "@/lib/bulles/settle";
import { formatHours, formatNightShort } from "@/lib/club/format";
import { DEFAULT_VAT_RATE } from "@/lib/gestion/constants";
import { SQUARE_CURRENCY as CURRENCY } from "@/lib/square/config";
import {
  capturedTender,
  createOrder,
  createPayment,
  getMerchantToken,
  retrieveOrder,
  SquareError,
  withFreshToken,
  type SquareOrder,
} from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement d'une part de bulle par la caisse Square du restaurant, comme une
 * commande du menu (/api/square/pay), avec la même commission Ominin
 * (platform_fee_percent) mais sans envoi en cuisine : une commande Square
 * sans fulfillment, puis son paiement. La
 * carte est tokenisée dans le navigateur ; le montant est relu en base.
 * Même garde contre le double débit : clé de commande déterministe, clé de
 * paiement persistée avant l'appel, relecture de la commande Square avant
 * toute nouvelle tentative. Le webhook Square et /api/bulles/expire
 * rattrapent un débit dont l'enregistrement aurait échoué.
 */
export async function POST(request: Request) {
  const { partId, sourceId } = (await request.json().catch(() => ({}))) as {
    partId?: string;
    sourceId?: string;
  };
  if (!partId) {
    return NextResponse.json({ error: "Paiement manquant." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: part } = await admin
    .from("bulle_parts")
    .select(
      "id, etablissement_id, method, status, places, amount_cents, hold_expires_at, square_order_id, bulle_reservations(starts_at, ends_at, place_cents, bulles(name)), etablissements(name, platform_fee_percent, bulle_reglages(vat_rate))"
    )
    .eq("id", partId)
    .maybeSingle();
  if (!part || part.method !== "en_ligne") {
    return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  }
  if (part.status === "payee") return NextResponse.json({ paid: true });
  if (part.status !== "en_attente") {
    return NextResponse.json({ error: "Ce paiement n'est plus en cours." }, { status: 409 });
  }

  const checkout = await bulleCheckout(admin, part.etablissement_id);
  if (!checkout) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas ouvert pour le moment." },
      { status: 409 }
    );
  }
  const expired = part.hold_expires_at !== null && Date.parse(part.hold_expires_at) <= Date.now();
  if (checkout.provider === "demo") {
    if (expired) {
      return NextResponse.json({ error: "Le délai de paiement est passé : recommencez." }, { status: 410 });
    }
    return NextResponse.json(await settlePart(admin, part.id, null, part.amount_cents));
  }
  if (!sourceId) {
    return NextResponse.json({ error: "Carte manquante." }, { status: 400 });
  }

  const merchant = await getMerchantToken(admin, part.etablissement_id);
  if (!merchant) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas ouvert pour le moment." },
      { status: 409 }
    );
  }
  const call = <T>(fn: (token: string) => Promise<T>) =>
    withFreshToken(admin, part.etablissement_id, merchant, fn);
  const reservation = part.bulle_reservations;
  const etabName = part.etablissements?.name ?? "";
  const vatRate = part.etablissements?.bulle_reglages?.vat_rate ?? DEFAULT_VAT_RATE;
  const label = reservation
    ? `${reservation.bulles?.name ?? "Bulle"} · ${formatNightShort(reservation.starts_at)} ${formatHours(reservation.starts_at, reservation.ends_at)}`
    : "Bulle";

  try {
    let placed: SquareOrder | null = null;
    // Une tentative précédente a-t-elle abouti sans être enregistrée ? La
    // commande Square fait foi : réglée, on compte sans débiter à nouveau.
    if (part.square_order_id) {
      const existingId = part.square_order_id;
      const existing = await call((token) => retrieveOrder(token, existingId));
      const tender = capturedTender(existing.order);
      if (tender) {
        return NextResponse.json(
          await settlePart(admin, part.id, tender.payment_id, tender.amount_money?.amount ?? 0)
        );
      }
      placed = existing.order;
    }
    // Le délai ne se rallonge pas : passé, la place peut être prise par un
    // autre — le client recommence.
    if (expired) {
      return NextResponse.json({ error: "Le délai de paiement est passé : recommencez." }, { status: 410 });
    }

    if (!placed) {
      const created = await call((token) =>
        createOrder(token, {
          idempotency_key: `sq-bulle-${part.id}`,
          order: {
            location_id: checkout.locationId,
            reference_id: part.id,
            ticket_name: label,
            source: { name: "Ominin" },
            // TVA comprise dans le prix, comme les lignes du menu
            // (/api/square/pay) : le total payé ne change pas.
            taxes: [
              {
                uid: "tva",
                name: `TVA ${vatRate} %`,
                percentage: String(vatRate),
                scope: "LINE_ITEM",
                type: "INCLUSIVE",
              },
            ],
            line_items: [
              {
                name: label,
                quantity: String(part.places),
                base_price_money: {
                  amount: reservation?.place_cents ?? part.amount_cents / part.places,
                  currency: CURRENCY,
                },
                applied_taxes: [{ tax_uid: "tva" }],
              },
            ],
          },
        })
      );
      placed = created.order;
    }
    if (placed.total_money?.amount !== part.amount_cents) {
      throw new Error(`Montant Square ${placed.total_money?.amount} ≠ part ${part.amount_cents}`);
    }

    const idempotencyKey = crypto.randomUUID();
    const { data: claimed, error: keyError } = await admin.rpc("commencer_part_square", {
      p_part: part.id,
      p_key: idempotencyKey,
      p_square_order: placed.id,
    });
    if (keyError) throw new Error(keyError.message);
    if (!claimed) {
      return NextResponse.json({ error: "Ce paiement n'est plus en cours." }, { status: 409 });
    }

    const feePercent = part.etablissements?.platform_fee_percent ?? 0;
    const feeCents = feePercent > 0 ? Math.round((part.amount_cents * feePercent) / 100) : 0;
    const { error: feeError } = await admin.from("bulle_parts").update({ fee_cents: feeCents }).eq("id", part.id);
    if (feeError) throw new Error(feeError.message);
    const squareOrderId = placed.id;
    const { payment } = await call((token) =>
      createPayment(token, {
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        order_id: squareOrderId,
        location_id: checkout.locationId,
        amount_money: { amount: part.amount_cents, currency: CURRENCY },
        ...(feeCents > 0 && {
          app_fee_money: { amount: feeCents, currency: CURRENCY },
        }),
        reference_id: part.id,
        note: label,
      })
    );
    if (payment.status !== "COMPLETED" && payment.status !== "APPROVED") {
      return NextResponse.json({ paid: false });
    }
    return NextResponse.json(
      await settlePart(admin, part.id, payment.id, payment.amount_money?.amount ?? 0)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[bulles] paiement impossible", { partId, message });
    // Des refus de Square en série (3 en 30 min) disent une carte, un TPE ou
    // 3-D Secure en panne : l'équipe est prévenue. Une autre erreur (base,
    // réseau) est journalisée ; le webhook et le passage périodique
    // rattrapent un débit passé.
    if (error instanceof SquareError) {
      await raiseAlert("paiement", part.etablissement_id, {
        title: `${etabName} : paiements de bulles refusés en série`,
        body: `Square refuse les paiements (carte, TPE ou 3-D Secure). Dernière erreur : ${message.slice(0, 160)}`,
        url: "/clients",
        urgent: true,
      }).catch(() => false);
    }
    return NextResponse.json({ error: "Le paiement n'a pas pu aboutir." }, { status: 502 });
  }
}
