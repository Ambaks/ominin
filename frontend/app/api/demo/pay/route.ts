import { NextResponse } from "next/server";
import { isOrderId } from "@/lib/collect/shared";
import { dispatchOrderEvent } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Règlement de démonstration : marque payée en ligne une commande d'un
 * établissement dont le fournisseur est « demo », sans aucun prestataire ni
 * débit — la feuille de paiement est imitée dans la page. Toutes les
 * vérifications sont en base (mark_demo_order_paid, 20261015000005) : hors
 * démonstration, rien ne se passe.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    orderId?: unknown;
    tipAmount?: unknown;
  } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!isOrderId(orderId)) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
  const tip =
    typeof body?.tipAmount === "number" && Number.isFinite(body.tipAmount) && body.tipAmount > 0
      ? body.tipAmount
      : null;

  const { data: paid, error } = await createAdminClient().rpc("mark_demo_order_paid", {
    p_order_id: orderId,
    p_tip: tip,
  });
  if (error) return NextResponse.json({ paid: false }, { status: 500 });
  // Comme un vrai paiement : c'est maintenant que la commande arrive à
  // l'équipe (l'annonce ne part qu'une fois par commande).
  if (paid) await dispatchOrderEvent(orderId, "nouvelle_commande");
  return NextResponse.json({ paid: Boolean(paid) });
}
