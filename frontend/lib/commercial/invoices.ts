import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Factures Ominin dans l'assiette des commerciaux (lot 3, section 4.4) : à
 * chaque invoice.paid, restaurants comme boutiques, la part hors taxes des
 * seules lignes dont le prix est un abonnement ou une commission facturée —
 * la liste des prix éligibles est réglée par l'admin. Le matériel de la
 * commande de démarrage, facturé dans la même facture, en est exclu. Une
 * facture annulée ensuite sort de l'assiette (régularisation automatique).
 */

async function owner(stripe: Stripe, invoice: Stripe.Invoice) {
  const details = invoice.parent?.subscription_details;
  let metadata = details?.metadata ?? null;
  if (!metadata?.etablissement_id && !metadata?.shop_id && details?.subscription) {
    const id = typeof details.subscription === "string" ? details.subscription : details.subscription.id;
    metadata = (await stripe.subscriptions.retrieve(id)).metadata;
  }
  return { etablissementId: metadata?.etablissement_id ?? null, shopId: metadata?.shop_id ?? null };
}

export async function recordInvoicePaid(stripe: Stripe, invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.id) return;
  const { etablissementId, shopId } = await owner(stripe, invoice);
  if (!etablissementId === !shopId) return;
  const db = createAdminClient();
  const { data: settings, error } = await db.from("commercial_settings").select("eligible_stripe_prices").single();
  if (error) throw new Error(error.message);
  const eligible = new Set(settings.eligible_stripe_prices);

  let cents = 0;
  for await (const line of stripe.invoices.listLineItems(invoice.id)) {
    const price = line.pricing?.price_details?.price;
    const priceId = typeof price === "string" ? price : price?.id;
    if (!priceId || !eligible.has(priceId)) continue;
    const inclusiveTax = (line.taxes ?? [])
      .filter((tax) => tax.tax_behavior === "inclusive")
      .reduce((sum, tax) => sum + tax.amount, 0);
    cents += line.amount - inclusiveTax;
  }
  const paidAt = invoice.status_transitions.paid_at;
  const { error: upsertError } = await db.from("ominin_invoice_payments").upsert(
    {
      etablissement_id: etablissementId,
      shop_id: shopId,
      stripe_invoice_id: invoice.id,
      eligible_ht_cents: Math.max(cents, 0),
      paid_at: new Date((paidAt ?? invoice.created) * 1000).toISOString(),
    },
    { onConflict: "stripe_invoice_id" }
  );
  if (upsertError) throw new Error(upsertError.message);
}

export async function recordInvoiceVoided(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.id) return;
  const { error } = await createAdminClient()
    .from("ominin_invoice_payments")
    .update({ voided_at: new Date().toISOString() })
    .eq("stripe_invoice_id", invoice.id)
    .is("voided_at", null);
  if (error) throw new Error(error.message);
}
