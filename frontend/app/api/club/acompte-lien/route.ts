import { NextResponse } from "next/server";
import { sendDepositRequest } from "@/lib/club/mail";
import { rpcMessage } from "@/lib/club/server";
import { bookingMail } from "@/lib/club/settle";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Le club demande un acompte sur une réservation qu'il a saisie et en envoie
 * le lien au client : sa page de réservation, où il le paie. La demande passe
 * par la session du membre (club_demander_acompte vérifie son droit) ; seul
 * l'e-mail part d'ici. Renvoyer refait la demande et l'e-mail.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { bookingId?: unknown; amountCents?: unknown } | null;
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
  const amount = Number(body?.amountCents);
  if (!bookingId || !Number.isInteger(amount) || amount < 1) {
    return NextResponse.json({ error: "Montant de l'acompte invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { error } = await supabase.rpc("club_demander_acompte", { p_booking: bookingId, p_amount: amount });
  if (error) {
    const message = rpcMessage(error) ?? (error.code === "42501" ? "Votre poste ne permet pas ce geste." : null);
    if (!message) console.error("[club] club_demander_acompte", error);
    return NextResponse.json({ error: message ?? "Demande impossible pour le moment." }, { status: message ? 409 : 500 });
  }

  const mail = await bookingMail(createAdminClient(), bookingId);
  if (!mail) return NextResponse.json({ error: "Réservation sans e-mail." }, { status: 409 });
  await sendDepositRequest({ ...mail, amountCents: amount });
  return NextResponse.json({ sent: true });
}
