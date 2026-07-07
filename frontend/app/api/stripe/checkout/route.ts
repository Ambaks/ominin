import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Crée une session Stripe Checkout (abonnement mensuel, sans essai) pour
 * l'établissement du gérant connecté. Le prix est retrouvé par lookup_key
 * = offre ('digital' | 'smart' | 'connect'), créé par scripts/setup-stripe.ts
 * — aucun montant côté code.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 }
    );
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    return NextResponse.json(
      { error: "Seul le gérant peut gérer l'abonnement." },
      { status: 403 }
    );
  }

  const { data: etablissement } = await supabase
    .from("etablissements")
    .select("id, offre")
    .eq("id", membership.etablissement_id)
    .single();
  if (!etablissement) {
    return NextResponse.json(
      { error: "Établissement introuvable." },
      { status: 404 }
    );
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, status")
    .eq("etablissement_id", etablissement.id)
    .maybeSingle();
  if (subscription?.status === "active") {
    return NextResponse.json(
      { error: "L'abonnement est déjà actif." },
      { status: 409 }
    );
  }

  const stripe = getStripe();
  const prices = await stripe.prices.list({
    lookup_keys: [etablissement.offre],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    return NextResponse.json(
      {
        error: `Tarif « ${etablissement.offre} » introuvable dans Stripe — exécuter npm run setup:stripe.`,
      },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user.email,
    client_reference_id: etablissement.id,
    metadata: { etablissement_id: etablissement.id },
    subscription_data: { metadata: { etablissement_id: etablissement.id } },
    locale: "fr",
    success_url: `${origin}/gestion?checkout=succes`,
    cancel_url: `${origin}/gestion?checkout=annule`,
  });

  return NextResponse.json({ url: session.url });
}
