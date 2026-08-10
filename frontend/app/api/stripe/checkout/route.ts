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

/** Formule groupée : le tarif unique, et l'offre qui y donne droit. */
const BUNDLE_CHOICE = "collect_connect";
const BUNDLE_OFFRE = "connect";

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
    .select("product, status, stripe_customer_id, stripe_subscription_id")
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

  // L'offre se facture au tarif de son palier ; les autres produits ont leur
  // propre lookup_key. Un établissement en click & collect seul n'a pas de
  // palier à facturer.
  if (choice === "offre" && !etablissement.offre) {
    return NextResponse.json(
      { error: "Aucune offre menu & salle à activer pour cet établissement." },
      { status: 409 }
    );
  }
  const stripe = getStripe();
  const priceByLookupKey = async (key: string) => {
    const prices = await stripe.prices.list({
      lookup_keys: [key],
      active: true,
      limit: 1,
    });
    return prices.data[0];
  };

  /*
   * Formule groupée. Un client Connect qui ajoute le click & collect doit
   * payer les 150 € annoncés sur la landing, pas 99 € + 100 € : on bascule
   * son abonnement existant sur le tarif groupé (proratisé) au lieu d'en
   * ouvrir un second. Rien à ressaisir — d'où une réponse sans URL de
   * checkout. Le webhook customer.subscription.updated écrit les deux lignes
   * d'abonnement à partir de metadata.products.
   */
  const offreRow = subscriptions?.find(
    (row) => row.product === "offre" && !isTerminal(row.status)
  );
  if (
    choice === "collect" &&
    etablissement.offre === BUNDLE_OFFRE &&
    offreRow?.stripe_subscription_id
  ) {
    const bundlePrice = await priceByLookupKey(BUNDLE_CHOICE);
    if (!bundlePrice) {
      return NextResponse.json(
        {
          error: `Tarif « ${BUNDLE_CHOICE} » introuvable dans Stripe — exécuter npm run setup:stripe.`,
        },
        { status: 500 }
      );
    }
    const current = await stripe.subscriptions.retrieve(
      offreRow.stripe_subscription_id
    );
    const metadata = {
      etablissement_id: etablissement.id,
      products: PRODUCTS_BY_CHOICE[BUNDLE_CHOICE].join(","),
    };
    await stripe.subscriptions.update(current.id, {
      items: [{ id: current.items.data[0].id, price: bundlePrice.id }],
      proration_behavior: "create_prorations",
      metadata,
    });
    return NextResponse.json({ bundled: true });
  }

  const lookupKey = choice === "offre" ? etablissement.offre! : choice;
  const price = await priceByLookupKey(lookupKey);
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
  // Retour Stripe sur la page qui a lancé le paiement : l'ajout du click &
  // collect part de la page Produits, l'ouverture de l'offre de l'espace.
  const returnPath = choice === "collect" ? "/gestion/produits" : "/gestion";
  // Retour sur l'hôte qui a lancé le paiement : la session lui est attachée,
  // un retour sur un autre domaine y arriverait déconnecté. request.url peut
  // porter le host interne (routage Vercel), d'où l'en-tête transmis.
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const origin = `${requestUrl.protocol}//${host}`;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    client_reference_id: etablissement.id,
    metadata,
    subscription_data: { metadata },
    locale: "fr",
    success_url: `${origin}${returnPath}?checkout=succes`,
    cancel_url: `${origin}${returnPath}?checkout=annule`,
  });

  return NextResponse.json({ url: session.url });
}
