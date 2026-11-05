import { NextResponse } from "next/server";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { onlineBookable, rpcMessage } from "@/lib/club/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le client paie l'acompte que le club lui a demandé, depuis sa page de
 * réservation (la clé du lien fait office d'accès). Le paiement est tenu le
 * temps de payer (TABLE_HOLD_S), puis réglé par /api/club/pay comme une table.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" && /^[0-9a-f]{32}$/.test(body.token) ? body.token : "";
  if (!token) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });

  const admin = createAdminClient();
  const { data: booking } = await admin.from("club_bookings").select("etablissement_id").eq("token", token).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  const online = await onlineBookable(admin, booking.etablissement_id);
  if (!online) {
    return NextResponse.json({ error: "Le paiement en ligne n'est pas ouvert pour ce club." }, { status: 409 });
  }

  const { data, error } = await admin.rpc("payer_acompte_demande", { p_token: token, p_hold_seconds: TABLE_HOLD_S });
  const held = data?.[0];
  if (error || !held) {
    const message = error ? rpcMessage(error) : null;
    if (!message) console.error("[club] payer_acompte_demande", error);
    return NextResponse.json({ error: message ?? "Paiement impossible pour le moment." }, { status: message ? 409 : 500 });
  }
  return NextResponse.json({
    paymentId: held.payment_id,
    totalCents: held.total_cents,
    holdExpiresAt: held.hold_expires_at,
    provider: online.provider,
  });
}
