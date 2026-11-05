import { NextResponse } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import { onlineMinimumError } from "@/lib/menu/online-minimum";
import { ONLINE_PAYMENT_TTL_S } from "@/lib/menu/online-payment-ttl";
import { publicRequestOrigin } from "@/lib/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkoutUrl,
  closeVivaOrder,
  createOrder,
  VIVA_TAKES_FEE,
  vivaAccount,
  vivaFee,
} from "@/lib/viva/server";

/*
 * Paiement Viva d'une commande passée depuis le menu QR (appelant anonyme,
 * pendant Viva de /api/square/pay). La carte se saisit sur la page hébergée
 * par Viva : cette route crée la commande Viva et rend l'URL où envoyer le
 * client. Le montant n'est JAMAIS fourni par le client : les lignes sont
 * relues en base, où place_order les a figées ; seul le pourboire vient du
 * navigateur, borné ici.
 *
 * Ordre des écritures : la commande Ominin est revendiquée (begin_viva_payment)
 * AVANT la création de la commande Viva, dont le code est enregistré AVANT
 * que l'URL ne parte. Une commande Viva créée sans trace ne peut donc pas
 * être payée : personne n'en connaît l'adresse. Une relance (double toucher,
 * retour arrière) clôt d'abord la commande Viva précédente — payée, la
 * commande Ominin l'est aussi et rien n'est redemandé.
 */

export async function POST(request: Request) {
  const { orderId, tipAmount, returnUrl } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    tipAmount?: unknown;
    returnUrl?: unknown;
  };
  if (!orderId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }
  // La page où le client reviendra : celle du menu d'où il part, sur NOTRE
  // hôte — l'appel vient d'elle. Toute autre adresse ferait de /api/viva/return
  // une redirection ouverte.
  const origin = publicRequestOrigin(request);
  const back = typeof returnUrl === "string" && URL.canParse(returnUrl) ? new URL(returnUrl) : null;
  if (!back || back.origin !== origin) {
    return NextResponse.json({ error: "Page de retour invalide." }, { status: 400 });
  }
  back.hash = "";
  back.searchParams.delete("paiement");
  back.searchParams.delete("commande");

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, etablissement_id, table_id, order_number, type, status, paid_online, viva_order_code, viva_tip")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.status !== "en_attente" || order.paid_online) {
    return NextResponse.json({ error: "Cette commande n'est plus à régler." }, { status: 409 });
  }

  const [{ data: etab }, { data: lines }, { data: table }, account] = await Promise.all([
    admin
      .from("etablissements")
      .select("name, online_payment, online_min_order, payment_provider, platform_fee_percent, collect_fee_percent, show_table_number")
      .eq("id", order.etablissement_id)
      .single(),
    admin.from("order_items").select("quantity, unit_price").eq("order_id", orderId),
    order.table_id
      ? admin.from("tables").select("number").eq("id", order.table_id).single()
      : Promise.resolve({ data: null }),
    vivaAccount(admin, order.etablissement_id),
  ]);

  if (!etab?.online_payment || etab.payment_provider !== "viva" || !account) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
      { status: 409 }
    );
  }
  if (!lines?.length) {
    return NextResponse.json({ error: "Commande vide." }, { status: 409 });
  }
  const belowMinimum = onlineMinimumError(lines, etab.online_min_order, order.type === "collect");
  if (belowMinimum) {
    return NextResponse.json({ error: belowMinimum }, { status: 409 });
  }

  const amount = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unit_price * 100), 0);
  if (amount <= 0) {
    return NextResponse.json({ error: "Commande vide." }, { status: 409 });
  }
  // La règle de /api/square/pay : jamais sur une commande à emporter, jamais
  // plus que la commande.
  const tip =
    order.type !== "collect" && typeof tipAmount === "number" && Number.isFinite(tipAmount) && tipAmount > 0
      ? Math.min(Math.round(tipAmount * 100), amount)
      : 0;
  const isvAmount = VIVA_TAKES_FEE
    ? vivaFee(amount, order.type === "collect" ? etab.collect_fee_percent : etab.platform_fee_percent)
    : 0;
  // « Table 7 », « N° 42 », « N° 42 · Table 7 » : ce que le client lit sur la
  // page de paiement et son relevé, et le restaurant dans son espace Viva.
  const ticketName =
    order.type === "collect"
      ? `À emporter — ${etab.name}`
      : order.order_number
        ? `N° ${order.order_number}${table && etab.show_table_number ? ` · Table ${table.number}` : ""}`
        : table
          ? `Table ${table.number}`
          : `Commande — ${etab.name}`;

  try {
    if (order.viva_order_code) {
      const previous = { ...order, viva_order_code: order.viva_order_code };
      if (await closeVivaOrder(admin, previous)) {
        return NextResponse.json({ paid: true });
      }
    }

    const { data: claimed, error: claimError } = await admin.rpc("begin_viva_payment", {
      p_order_id: orderId,
    });
    if (claimError) throw new Error(claimError.message);
    if (!claimed) {
      return NextResponse.json({ error: "Cette commande n'est plus à régler." }, { status: 409 });
    }

    const orderCode = await createOrder(account, {
      amount: amount + tip,
      tipAmount: tip,
      isvAmount,
      merchantTrns: orderId,
      customerTrns: ticketName,
      paymentTimeout: ONLINE_PAYMENT_TTL_S,
    });
    const { error } = await admin
      .from("orders")
      .update({
        viva_order_code: orderCode,
        viva_tip: tip / 100,
        viva_return_url: back.toString(),
      })
      .eq("id", orderId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ url: checkoutUrl(orderCode) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[viva] paiement impossible", { orderId, message });
    await raiseAlert("paiement", order.etablissement_id, {
      title: `${etab.name} : paiements Viva impossibles en série`,
      body: `Viva refuse de créer la commande de paiement. Dernière erreur : ${message.slice(0, 160)}`,
      url: "/clients",
      urgent: true,
    }).catch(() => false);
    // La commande reste valable : le menu la passe au comptoir (ou, à
    // emporter, laisse le panier pour réessayer).
    return NextResponse.json({ error: "Le paiement n'a pas pu démarrer." }, { status: 502 });
  }
}
