import { NextResponse } from "next/server";
import { requestOrigin, requireShopMember } from "@/lib/shop/api-auth";
import { SHOP_MONTHLY_LOOKUP_KEY, SHOP_SETUP_LOOKUP_KEY } from "@/lib/shop/subscription";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Abonnement à l'offre Shop : une session Checkout en mode abonnement qui
 * porte le tarif mensuel et, en ligne unique, les frais de mise en place.
 * Prix créés par scripts/setup-stripe.ts (lookup_keys) — aucun montant ici.
 * metadata.shop_id fait reconnaître l'événement au webhook plateforme.
 */
const isTerminal = (status: string | null) => !status || status === "canceled" || status === "incomplete_expired";

export async function POST(request: Request) {
  const session = await requireShopMember({ ownerOnly: true });
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: current } = await admin.from("shop_subscriptions").select("*").eq("shop_id", session.shop.id).maybeSingle();
  if (current && !isTerminal(current.status)) return NextResponse.json({ error: "Un abonnement est déjà en cours pour cette boutique." }, { status: 409 });

  const { data: prices } = await stripe.prices.list({ lookup_keys: [SHOP_MONTHLY_LOOKUP_KEY, SHOP_SETUP_LOOKUP_KEY], active: true });
  const monthly = prices.find((p) => p.lookup_key === SHOP_MONTHLY_LOOKUP_KEY);
  const setup = prices.find((p) => p.lookup_key === SHOP_SETUP_LOOKUP_KEY);
  if (!monthly) return NextResponse.json({ error: "Tarif de l'offre Shop introuvable dans Stripe — exécuter npm run setup:stripe." }, { status: 500 });

  const origin = requestOrigin(request);
  const metadata = { shop_id: session.shop.id, product: "shop" };
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: monthly.id, quantity: 1 }, ...(setup && !current?.setup_paid_at ? [{ price: setup.id, quantity: 1 }] : [])],
    customer: current?.stripe_customer_id ?? undefined,
    customer_email: current?.stripe_customer_id ? undefined : session.shop.contact_email ?? session.email ?? undefined,
    client_reference_id: session.shop.id,
    metadata,
    subscription_data: { metadata },
    locale: "fr",
    success_url: `${origin}/gestion/boutique?abonnement=succes`,
    cancel_url: `${origin}/gestion/boutique?abonnement=annule`,
  });
  return NextResponse.json({ url: checkout.url });
}
