import { NextResponse } from "next/server";
import { isShareToken } from "@/lib/club/links";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { cleanContact, onlineBookable, rpcMessage } from "@/lib/club/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Un ami paie sa part d'une table partagée, par le lien de l'organisateur.
 * Le montant est libre entre la part minimale et ce qui reste, bornes
 * vérifiées en base (contribuer_table) ; la part est tenue le temps de
 * payer, comme une table.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    shareToken?: unknown;
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    amountCents?: unknown;
    accepted?: unknown;
  } | null;
  const shareToken = typeof body?.shareToken === "string" ? body.shareToken : "";
  const amount =
    typeof body?.amountCents === "number" && Number.isFinite(body.amountCents)
      ? Math.round(body.amountCents)
      : 0;
  const contact = body ? cleanContact(body) : null;
  if (!isShareToken(shareToken) || !contact || amount <= 0) {
    return NextResponse.json({ error: "Coordonnées incomplètes." }, { status: 400 });
  }
  if (body?.accepted !== true) {
    return NextResponse.json({ error: "Acceptez les conditions du club." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("club_bookings")
    .select("etablissement_id")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: "Lien de partage introuvable." }, { status: 404 });
  }
  const online = await onlineBookable(admin, booking.etablissement_id);
  if (!online) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas ouvert pour ce club." },
      { status: 409 }
    );
  }

  const { data, error } = await admin.rpc("contribuer_table", {
    p_share_token: shareToken,
    p_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_amount: amount,
    p_hold_seconds: TABLE_HOLD_S,
  });
  const share = data?.[0];
  if (error || !share) {
    const message = error ? rpcMessage(error) : null;
    if (!message) console.error("[club] contribuer_table", error);
    return NextResponse.json(
      { error: message ?? "Paiement impossible pour le moment." },
      { status: message ? 409 : 500 }
    );
  }
  return NextResponse.json({
    paymentId: share.payment_id,
    totalCents: share.total_cents,
    holdExpiresAt: share.hold_expires_at,
    provider: online.provider,
  });
}
