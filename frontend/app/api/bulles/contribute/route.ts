import { NextResponse } from "next/server";
import { isShareToken } from "@/lib/bulles/links";
import { bulleCheckout } from "@/lib/bulles/server";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { cleanContact, rpcMessage } from "@/lib/club/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Un ami de l'organisateur paie une ou plusieurs places par le lien de
 * partage. Sa part est tenue le temps de payer ; le nombre de places est
 * borné en base par ce qui reste (contribuer_bulle).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    shareToken?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    places?: unknown;
  } | null;
  const shareToken = typeof body?.shareToken === "string" ? body.shareToken : "";
  const places = typeof body?.places === "number" ? Math.trunc(body.places) : 0;
  const contact = body ? cleanContact(body) : null;
  if (!isShareToken(shareToken) || !contact || places < 1) {
    return NextResponse.json({ error: "Coordonnées incomplètes." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: reservation } = await admin
    .from("bulle_reservations")
    .select("etablissement_id")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!reservation) {
    return NextResponse.json({ error: "Lien de partage introuvable." }, { status: 404 });
  }
  const checkout = await bulleCheckout(admin, reservation.etablissement_id);
  if (!checkout) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas ouvert pour le moment." },
      { status: 409 }
    );
  }

  const { data, error } = await admin.rpc("contribuer_bulle", {
    p_share_token: shareToken,
    p_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_places: places,
    p_hold_seconds: TABLE_HOLD_S,
  });
  const part = data?.[0];
  if (error || !part) {
    const message = error ? rpcMessage(error) : null;
    if (!message) console.error("[bulles] contribuer_bulle", error);
    return NextResponse.json(
      { error: message ?? "Paiement impossible pour le moment." },
      { status: message ? 409 : 500 }
    );
  }
  return NextResponse.json({
    partId: part.part_id,
    amountCents: part.amount_cents,
    holdExpiresAt: part.hold_expires_at,
    checkout,
  });
}
