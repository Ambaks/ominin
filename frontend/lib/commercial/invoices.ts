import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Factures Ominin dans l'assiette des commerciaux (lot 3, section 4.4),
 * restaurants comme boutiques : la part hors taxes, remises et crédits
 * déduits, des seules lignes dont le prix est un abonnement ou une commission
 * facturée — la liste des prix éligibles est réglée par l'admin. Le matériel
 * de la commande de démarrage, facturé dans la même facture, en est exclu.
 * Les avoirs émis ensuite sur ces lignes (credit_note.*) en sont retranchés :
 * un mois déjà relevé se régularise de lui-même. Stripe n'annule jamais une
 * facture payée : l'avoir est la seule correction possible.
 */

type Line = Stripe.InvoiceLineItem | Stripe.CreditNoteLineItem;

/** Montant net hors taxes d'une ligne de facture ou d'avoir. */
function netHt(line: Line): number {
  const credits = line.pretax_credit_amounts ?? line.discount_amounts ?? [];
  const inclusiveTax = (line.taxes ?? []).filter((tax) => tax.tax_behavior === "inclusive");
  return (
    line.amount -
    credits.reduce((sum, credit) => sum + credit.amount, 0) -
    inclusiveTax.reduce((sum, tax) => sum + tax.amount, 0)
  );
}

async function owner(stripe: Stripe, invoice: Stripe.Invoice) {
  const details = invoice.parent?.subscription_details;
  let metadata = details?.metadata ?? null;
  if (!metadata?.etablissement_id && !metadata?.shop_id && details?.subscription) {
    const id = typeof details.subscription === "string" ? details.subscription : details.subscription.id;
    metadata = (await stripe.subscriptions.retrieve(id)).metadata;
  }
  return { etablissementId: metadata?.etablissement_id ?? null, shopId: metadata?.shop_id ?? null };
}

/**
 * Facture payée (invoice.paid) ou avoir émis, modifié, annulé (credit_note.*) :
 * la ligne de la facture est recalculée en entier depuis Stripe.
 */
export async function recordInvoice(stripe: Stripe, invoiceRef: string | Stripe.Invoice): Promise<void> {
  const invoice = typeof invoiceRef === "string" ? await stripe.invoices.retrieve(invoiceRef) : invoiceRef;
  if (!invoice.id || invoice.status !== "paid") return;
  const { etablissementId, shopId } = await owner(stripe, invoice);
  if (!etablissementId === !shopId) return;
  const db = createAdminClient();
  const { data: settings, error } = await db.from("commercial_settings").select("eligible_stripe_prices").single();
  if (error) throw new Error(error.message);
  const eligiblePrices = new Set(settings.eligible_stripe_prices);

  let invoiceHt = 0;
  let eligibleHt = 0;
  const eligibleLines = new Set<string>();
  for await (const line of stripe.invoices.listLineItems(invoice.id)) {
    const price = line.pricing?.price_details?.price;
    const priceId = typeof price === "string" ? price : price?.id;
    const ht = netHt(line);
    invoiceHt += ht;
    if (priceId && eligiblePrices.has(priceId)) {
      eligibleHt += ht;
      eligibleLines.add(line.id);
    }
  }
  eligibleHt = Math.max(eligibleHt, 0);

  // Une ligne d'avoir reprend une ligne de la facture ; un montant libre se
  // répartit au prorata de la part éligible de la facture.
  let credited = 0;
  for await (const note of stripe.creditNotes.list({ invoice: invoice.id })) {
    if (note.status === "void") continue;
    for await (const line of stripe.creditNotes.listLineItems(note.id)) {
      if (line.type === "invoice_line_item") {
        if (line.invoice_line_item && eligibleLines.has(line.invoice_line_item)) credited += netHt(line);
      } else if (invoiceHt > 0) {
        credited += (netHt(line) * eligibleHt) / invoiceHt;
      }
    }
  }

  const paidAt = invoice.status_transitions.paid_at;
  const { error: upsertError } = await db.from("ominin_invoice_payments").upsert(
    {
      etablissement_id: etablissementId,
      shop_id: shopId,
      stripe_invoice_id: invoice.id,
      eligible_ht_cents: eligibleHt,
      credited_cents: Math.min(Math.max(Math.round(credited), 0), eligibleHt),
      paid_at: new Date((paidAt ?? invoice.created) * 1000).toISOString(),
    },
    { onConflict: "stripe_invoice_id" }
  );
  if (upsertError) throw new Error(upsertError.message);
}
