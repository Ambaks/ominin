import { NextResponse } from "next/server";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { cleanContact, onlineBookable, rpcMessage } from "@/lib/club/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le client a choisi sa table et rempli le formulaire : la table lui est
 * tenue le temps de payer (TABLE_HOLD_S). Il paie la table entière, ou — en
 * la partageant — sa part (shareCents), bornée en base. Prix et frais sont
 * fixés par reserver_table, jamais repris du navigateur. Il faut avoir
 * accepté les conditions du club (âge, tenue, remboursement) pour réserver.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    eventId?: unknown;
    tableId?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    partySize?: unknown;
    shareCents?: unknown;
    accepted?: unknown;
  } | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  const tableId = typeof body?.tableId === "string" ? body.tableId : "";
  const party = typeof body?.partySize === "number" ? Math.trunc(body.partySize) : 0;
  const shareCents =
    typeof body?.shareCents === "number" && Number.isFinite(body.shareCents)
      ? Math.round(body.shareCents)
      : null;
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
    .select("etablissement_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Soirée introuvable." }, { status: 404 });
  }
  const online = await onlineBookable(admin, event.etablissement_id);
  if (!online) {
    return NextResponse.json(
      { error: "La réservation en ligne n'est pas ouverte pour ce club." },
      { status: 409 }
    );
  }

  const { data, error } = await admin.rpc("reserver_table", {
    p_event: eventId,
    p_table: tableId,
    p_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_party: party,
    p_hold_seconds: TABLE_HOLD_S,
    p_share_cents: shareCents,
  });
  const reserved = data?.[0];
  if (error || !reserved) {
    const message = error ? rpcMessage(error) : null;
    if (!message) console.error("[club] reserver_table", error);
    return NextResponse.json(
      { error: message ?? "Réservation impossible pour le moment." },
      { status: message ? 409 : 500 }
    );
  }
  return NextResponse.json({
    bookingId: reserved.booking_id,
    paymentId: reserved.payment_id,
    token: reserved.token,
    totalCents: reserved.total_cents,
    holdExpiresAt: reserved.hold_expires_at,
    provider: online.provider,
  });
}
