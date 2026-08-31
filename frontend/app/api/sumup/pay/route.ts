import { NextResponse } from "next/server";
import { createCheckout, getMerchantToken } from "@/lib/sumup/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement SumUp d'une commande passée depuis le menu QR (appelant anonyme,
 * pendant SumUp de /api/stripe/pay). Le montant n'est JAMAIS fourni par le
 * client : les lignes sont relues en base (figées par place_order). Le
 * checkout est créé sur le compte marchand du restaurant ; le règlement se
 * fait dans la page via le widget SumUp. Un checkout refusé est mort côté
 * SumUp : chaque tentative en crée un neuf et écrase sumup_checkout_id.
 */

interface OrderLine {
  quantity: number;
  unit_price: number;
}

export async function POST(request: Request) {
  const { orderId, tipAmount } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    tipAmount?: unknown;
  };
  if (!orderId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, etablissement_id, table_id, status, paid_online")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.status === "payee" || order.status === "annulee" || order.paid_online) {
    return NextResponse.json(
      { error: "Cette commande n'est plus à régler." },
      { status: 409 }
    );
  }

  // payment_provider arrive avec la migration 20260817000001 — accès non typé
  // en attendant la régénération des types.
  const untyped = admin as unknown as {
    from: (t: string) => ReturnType<typeof admin.from>;
  };
  const [{ data: etab }, { data: lines }, { data: table }] = await Promise.all([
    untyped
      .from("etablissements")
      .select("name, online_payment, payment_provider")
      .eq("id", order.etablissement_id)
      .single(),
    admin
      .from("order_items")
      .select("quantity, unit_price")
      .eq("order_id", orderId),
    order.table_id
      ? admin.from("tables").select("number").eq("id", order.table_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const etabRow = etab as unknown as {
    name: string;
    online_payment: boolean;
    payment_provider: string | null;
  } | null;

  if (!etabRow?.online_payment || etabRow.payment_provider !== "sumup") {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
      { status: 409 }
    );
  }
  if (!lines?.length) {
    return NextResponse.json({ error: "Commande vide." }, { status: 409 });
  }

  const merchant = await getMerchantToken(admin, order.etablissement_id);
  if (!merchant) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
      { status: 409 }
    );
  }

  // Montant en euros décimaux (l'API SumUp n'utilise pas les centimes).
  const linesTotal =
    Math.round(
      (lines as OrderLine[]).reduce(
        (sum, line) => sum + line.unit_price * line.quantity,
        0
      ) * 100
    ) / 100;
  // Pourboire choisi par le client, borné au total de la commande. Encaissé
  // avec le checkout ; confirmOrderPaid le reconstitue au paiement effectif.
  const tip =
    typeof tipAmount === "number" && Number.isFinite(tipAmount) && tipAmount > 0
      ? Math.min(Math.round(tipAmount * 100) / 100, linesTotal)
      : 0;
  const amount = Math.round((linesTotal + tip) * 100) / 100;

  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const body = {
    checkout_reference: orderId,
    amount,
    currency: "EUR",
    merchant_code: merchant.merchantCode,
    description: table
      ? `Table ${table.number} — ${etabRow.name}`
      : `Commande — ${etabRow.name}`,
    return_url: `${requestUrl.protocol}//${host}/api/sumup/webhook`,
  };

  let checkout;
  try {
    checkout = await createCheckout(merchant.accessToken, body);
  } catch (error) {
    if ((error as Error & { status?: number }).status !== 401) throw error;
    const refreshed = await getMerchantToken(admin, order.etablissement_id, {
      forceRefresh: true,
    });
    if (!refreshed) {
      return NextResponse.json(
        { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
        { status: 409 }
      );
    }
    checkout = await createCheckout(refreshed.accessToken, body);
  }

  const { error: updateError } = await untyped
    .from("orders")
    .update({ sumup_checkout_id: checkout.id })
    .eq("id", orderId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ checkoutId: checkout.id });
}
