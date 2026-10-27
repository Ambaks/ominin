import { NextResponse } from "next/server";
import { bulleCheckout } from "@/lib/bulles/server";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { cleanContact, rpcMessage } from "@/lib/club/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le client a choisi le soir, le créneau et une bulle libre, dit combien ils
 * seront et combien de places il paie maintenant. La réservation est posée
 * en attente et sa part tenue le temps de payer (TABLE_HOLD_S). Prix et
 * places sont bornés par reserver_bulle, jamais repris du navigateur.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    bulleId?: unknown;
    startsAt?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    partySize?: unknown;
    places?: unknown;
  } | null;
  const bulleId = typeof body?.bulleId === "string" ? body.bulleId : "";
  const startsAt = typeof body?.startsAt === "string" ? body.startsAt : "";
  const party = typeof body?.partySize === "number" ? Math.trunc(body.partySize) : 0;
  const places = typeof body?.places === "number" ? Math.trunc(body.places) : 0;
  const contact = body ? cleanContact(body) : null;
  if (!bulleId || !startsAt || Number.isNaN(Date.parse(startsAt)) || !contact || party < 1 || places < 1) {
    return NextResponse.json({ error: "Coordonnées incomplètes." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: bulle } = await admin
    .from("bulles")
    .select("etablissement_id")
    .eq("id", bulleId)
    .maybeSingle();
  if (!bulle) {
    return NextResponse.json({ error: "Bulle introuvable." }, { status: 404 });
  }
  const checkout = await bulleCheckout(admin, bulle.etablissement_id);
  if (!checkout) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas ouvert pour le moment." },
      { status: 409 }
    );
  }

  const { data, error } = await admin.rpc("reserver_bulle", {
    p_bulle: bulleId,
    p_starts_at: startsAt,
    p_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_party: party,
    p_places: places,
    p_hold_seconds: TABLE_HOLD_S,
  });
  const reserved = data?.[0];
  if (error || !reserved) {
    const message = error ? rpcMessage(error) : null;
    if (!message) console.error("[bulles] reserver_bulle", error);
    return NextResponse.json(
      { error: message ?? "Réservation impossible pour le moment." },
      { status: message ? 409 : 500 }
    );
  }
  return NextResponse.json({
    partId: reserved.part_id,
    token: reserved.token,
    amountCents: reserved.amount_cents,
    holdExpiresAt: reserved.hold_expires_at,
    checkout,
  });
}
