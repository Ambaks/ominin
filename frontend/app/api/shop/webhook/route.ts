import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyRefundFromCharge, markOrderPaidFromSession, markSessionExpired } from "@/lib/shop/orders";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhook Stripe des comptes CONNECTÉS des boutiques (paiements des
 * commandes, remboursements, état du compte). Endpoint distinct de ceux des
 * restaurants, avec son propre secret STRIPE_SHOP_WEBHOOK_SECRET : les
 * sessions des boutiques portent metadata.shop_id, celles des restaurants
 * non — chaque webhook ignore ce qui ne le concerne pas.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SHOP_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_SHOP_WEBHOOK_SECRET manquante." }, { status: 500 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature absente." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.metadata?.shop_id && session.payment_status === "paid") {
        await markOrderPaidFromSession(session, event.account ?? null);
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      if (session.metadata?.shop_id) await markSessionExpired(session);
      break;
    }
    case "charge.refunded": {
      // Remboursement depuis l'espace ou depuis le dashboard Stripe : la
      // commande est retrouvée par payment_intent, rien à faire sinon.
      await applyRefundFromCharge(event.data.object);
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      await createAdminClient()
        .from("shop_payment_accounts")
        .update({
          details_submitted: Boolean(account.details_submitted),
          charges_enabled: Boolean(account.charges_enabled),
          payouts_enabled: Boolean(account.payouts_enabled),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", account.id);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
