import { NextResponse } from "next/server";
import { PUSH_EVENTS, type DispatchBody } from "@/lib/push/events";
import { dispatchOrderEvent } from "@/lib/push/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Signale un événement de commande aux appareils abonnés. Route publique :
 * le menu QR (client anonyme) l'appelle après place_order, l'espace de
 * gestion après un changement de statut. Elle est inoffensive sans
 * authentification — l'envoi ne part que si l'événement correspond au statut
 * réel de la commande, et push_notified borne à un envoi par (commande,
 * événement) ; rejouer la requête n'envoie rien. La réponse ne révèle jamais
 * si la commande existe.
 */

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DispatchBody | null;
  if (
    !body?.orderId ||
    typeof body.orderId !== "string" ||
    !PUSH_EVENTS.includes(body.event)
  ) {
    return NextResponse.json(
      { error: "Champs requis : orderId, event." },
      { status: 400 }
    );
  }

  // Nouvelle commande : tout le personnel doit être prévenu, même si le
  // navigateur a une session gestion (gérant qui commande pour tester).
  // Changement de statut (prête, annulée) : on écarte l'auteur du geste.
  let skipUserId: string | undefined;
  if (body.event !== "nouvelle_commande") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    skipUserId = user?.id;
  }

  await dispatchOrderEvent(body.orderId, body.event, { skipUserId });

  return NextResponse.json({ ok: true }, { status: 202 });
}
