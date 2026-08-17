import { NextResponse } from "next/server";
import { confirmOrderPaid } from "@/lib/sumup/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Confirmation côté serveur d'un paiement SumUp, déclenchée par le widget
 * après un règlement réussi. Anonyme mais inoffensive : elle ne fait que
 * relire le checkout auprès de l'API SumUp (même marquage idempotent que le
 * webhook — les deux chemins sont redondants, ce qui couvre aussi le dev
 * local sans URL de webhook publique).
 */

export async function POST(request: Request) {
  const { orderId } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
  };
  if (!orderId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  // sumup_checkout_id arrive avec la migration 20260817000001 — accès non
  // typé en attendant la régénération des types.
  const { data: order } = (await (
    admin as unknown as {
      from: (t: string) => ReturnType<typeof admin.from>;
    }
  )
    .from("orders")
    .select("id, etablissement_id, sumup_checkout_id, paid_online")
    .eq("id", orderId)
    .maybeSingle()) as {
    data: {
      id: string;
      etablissement_id: string;
      sumup_checkout_id: string | null;
      paid_online: boolean;
    } | null;
  };
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.paid_online) return NextResponse.json({ paid: true });
  if (!order.sumup_checkout_id) return NextResponse.json({ paid: false });

  const paid = await confirmOrderPaid(admin, {
    id: order.id,
    etablissement_id: order.etablissement_id,
    sumup_checkout_id: order.sumup_checkout_id,
  });
  return NextResponse.json({ paid });
}
