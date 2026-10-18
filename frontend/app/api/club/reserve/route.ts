import { NextResponse } from "next/server";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { cleanContact, rpcMessage } from "@/lib/club/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le client a choisi sa table et rempli le formulaire : la table lui est
 * tenue le temps de payer (TABLE_HOLD_S). Prix et frais sont fixés en base
 * par reserver_table, jamais repris du navigateur. Il faut avoir accepté
 * les conditions du club (âge, tenue, non-remboursement) pour réserver.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    eventId?: unknown;
    tableId?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    partySize?: unknown;
    accepted?: unknown;
  } | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  const tableId = typeof body?.tableId === "string" ? body.tableId : "";
  const party = typeof body?.partySize === "number" ? Math.trunc(body.partySize) : 0;
  const contact = body ? cleanContact(body) : null;
  if (!eventId || !tableId || !contact || party < 1) {
    return NextResponse.json({ error: "Coordonnées incomplètes." }, { status: 400 });
  }
  if (body?.accepted !== true) {
    return NextResponse.json({ error: "Acceptez les conditions du club." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("club_events")
    .select("etablissements(payment_provider, online_payment)")
    .eq("id", eventId)
    .maybeSingle();
  const etab = event?.etablissements;
  const bookable =
    etab?.payment_provider === "demo" ||
    (etab?.payment_provider === "stripe" && etab.online_payment);
  if (!bookable) {
    return NextResponse.json(
      { error: "La réservation en ligne n'est pas ouverte pour ce club." },
      { status: 409 }
    );
  }

  const { data: booking, error } = await admin.rpc("reserver_table", {
    p_event: eventId,
    p_table: tableId,
    p_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_party: party,
    p_hold_seconds: TABLE_HOLD_S,
  });
  if (error) {
    const message = rpcMessage(error);
    if (!message) console.error("[club] reserver_table", error);
    return NextResponse.json(
      { error: message ?? "Réservation impossible pour le moment." },
      { status: message ? 409 : 500 }
    );
  }
  return NextResponse.json({
    bookingId: booking.id,
    token: booking.token,
    totalCents: booking.total_cents,
    holdExpiresAt: booking.hold_expires_at,
    provider: etab.payment_provider,
  });
}
