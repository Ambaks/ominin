import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Product = Database["public"]["Enums"]["product"];

/*
 * Crée une session Stripe Checkout (abonnement mensuel, sans essai) pour
 * l'établissement du gérant connecté. Le corps optionnel { product } choisit
 * l'abonnement : 'offre' (défaut — prix retrouvé par lookup_key =
 * etablissements.offre), 'collect', ou 'collect_connect' (formule groupée,
 * réservée à l'offre Connect, qui active les deux produits en un seul
 * abonnement). Prix créés par scripts/setup-stripe.ts — aucun montant côté
 * code. metadata.products dit au webhook quelles lignes de subscriptions
 * écrire.
 */

const PRODUCTS_BY_CHOICE: Record<string, Product[]> = {
  offre: ["offre"],
  collect: ["collect"],
  collect_connect: ["offre", "collect"],
};

/** Statuts Stripe terminaux : seuls états autorisant un nouveau checkout. */
const isTerminal = (status: string | null) =>
  !status || status === "canceled" || status === "incomplete_expired";

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

  const body = (await request.json().catch(() => ({}))) as {
    product?: string;
  };
  const choice = body.product ?? "offre";
  const products = PRODUCTS_BY_CHOICE[choice];
  if (!products) {
    return NextResponse.json({ error: "Produit inconnu." }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .eq("user_id", user.id)
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
  if (choice === "collect_connect" && etablissement.offre !== "connect") {
    return NextResponse.json(
      { error: "La formule groupée est réservée à l'offre Connect." },
      { status: 409 }
    );
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("product, status, stripe_customer_id")
    .eq("etablissement_id", etablissement.id);
  // Un abonnement existant qui n'est pas dans un état terminal (annulé /
  // incomplet expiré) reste vivant côté Stripe — en créer un nouveau pour le
  // même produit facturerait deux fois. Seuls ces états terminaux autorisent
  // un nouveau checkout (réabonnement après résiliation).
  if (
    subscriptions?.some(
      (row) => products.includes(row.product) && !isTerminal(row.status)
    )
  ) {
    return NextResponse.json(
      { error: "Un abonnement est déjà en cours pour cet établissement." },
      { status: 409 }
    );
  }
  const customerId =
    subscriptions?.find((row) => row.stripe_customer_id)?.stripe_customer_id ??
    undefined;

  const lookupKey = choice === "offre" ? etablissement.offre : choice;
  const stripe = getStripe();
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    return NextResponse.json(
      {
        error: `Tarif « ${lookupKey} » introuvable dans Stripe — exécuter npm run setup:stripe.`,
      },
      { status: 500 }
    );
  }

  const metadata = {
    etablissement_id: etablissement.id,
    products: products.join(","),
  };
  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    client_reference_id: etablissement.id,
    metadata,
    subscription_data: { metadata },
    locale: "fr",
    success_url: `${origin}/gestion?checkout=succes`,
    cancel_url: `${origin}/gestion?checkout=annule`,
  });

  return NextResponse.json({ url: session.url });
}
