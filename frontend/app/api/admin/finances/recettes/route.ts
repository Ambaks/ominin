import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import type { RevenueLine, RevenueMonth } from "@/lib/admin/finances";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Les recettes par mois : commissions, par encaisseur, et saisies hors Stripe
 * depuis la base, factures d'Ominin depuis Stripe, qui seul les connaît toutes
 * depuis le début. Stripe indisponible, le reste du chiffre s'affiche et
 * l'écran le signale.
 */

const parisMonth = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_revenue_months");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const months = new Map<string, RevenueMonth>();
  const monthOf = (key: string) => {
    let month = months.get(key);
    if (!month) {
      month = { key, lines: [] };
      months.set(key, month);
    }
    return month;
  };
  for (const row of data) {
    monthOf(row.month.slice(0, 7)).lines.push({
      source: row.source as RevenueLine["source"],
      provider: row.provider,
      payments: row.payments,
      volumeCents: row.volume_cents,
      feeCents: row.fee_cents,
    });
  }

  let stripeError: string | null = null;
  try {
    for await (const invoice of getStripe().invoices.list({ status: "paid" })) {
      const paidAt = invoice.status_transitions.paid_at ?? invoice.created;
      const { lines } = monthOf(parisMonth.format(new Date(paidAt * 1000)).slice(0, 7));
      const amount = invoice.amount_paid - invoice.post_payment_credit_notes_amount;
      const line = lines.find((candidate) => candidate.source === "invoice");
      if (line) {
        line.payments += 1;
        line.volumeCents += amount;
        line.feeCents += amount;
      } else {
        lines.push({ source: "invoice", provider: "stripe", payments: 1, volumeCents: amount, feeCents: amount });
      }
    }
  } catch (cause) {
    stripeError = cause instanceof Error ? cause.message : "Stripe ne répond pas.";
  }

  return NextResponse.json({
    months: [...months.values()].sort((a, b) => a.key.localeCompare(b.key)),
    stripeError,
  });
}
