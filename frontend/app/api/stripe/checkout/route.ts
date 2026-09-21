import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { planTrial, starterKit } from "@/lib/landing-data";
import { quotePlan } from "@/lib/quote";
import { getStripe } from "@/lib/stripe/server";
import {
  MissingPriceError,
  STARTER_FLAG,
  starterLineItems,
} from "@/lib/stripe/starter";
import { createAdminClient } from "@/lib/supabase/admin";
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
 *
 * La première activation d'une offre porte aussi la commande de démarrage
 * (lib/stripe/starter.ts) : un Cachet imprimé par table — recompté en base,
 * jamais lu du client —, la livraison, et le boîtier Omilink si { omilink }.
 * Une offre à mois offerts n'a pas d'abonnement tant qu'ils courent : sa
 * session est un paiement unique (mode 'payment'), que le webhook tient pour
 * activation. { square } voyage en métadonnée : le webhook présélectionne
 * l'encaisseur. Les mois offerts échus sans exonération (fee_exempt = false)
 * ramènent l'offre au cas général : un abonnement mensuel.
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
    omilink?: boolean;
    square?: boolean;
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
    .select(
      "product, status, stripe_customer_id, stripe_subscription_id, fee_exempt"
    )
    .eq("etablissement_id", etablissement.id);
  // Un abonnement existant qui n'est pas dans un état terminal (annulé /
  // incomplet expiré) reste vivant côté Stripe — en créer un nouveau pour le
  // même produit facturerait deux fois. Seuls ces états terminaux autorisent
  // un nouveau checkout (réabonnement après résiliation). Une ligne sans
  // abonnement Stripe ne facture rien : l'offre ouverte sur ses mois offerts
  // est active sans être facturée, et c'est précisément ce qu'on vient
  // souscrire quand ils s'achèvent.
  if (
    subscriptions?.some(
      (row) =>
        products.includes(row.product) &&
        !isTerminal(row.status) &&
        row.stripe_subscription_id
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
   * Mois offerts : l'offre s'ouvre sur sa seule commande de démarrage, sans
   * abonnement Stripe, et ils courent jusqu'à leur verdict (lib/offre/trial).
   * Rendu et défavorable (fee_exempt = false), l'offre se facture comme les
   * autres, au tarif de son palier.
   */
  const offreState = subscriptions?.find((row) => row.product === "offre");
  const freeMonths =
    choice === "offre" &&
    planTrial(etablissement.offre) !== undefined &&
    offreState?.fee_exempt !== false;
  // La commande de démarrage n'est due qu'une fois : un réabonnement après
  // résiliation ne rachète ni Cachets ni livraison. Une ancienne offre, plus
  // publiée, garde son parcours d'origine — son devis n'existe pas.
  const firstActivation =
    choice === "offre" &&
    quotePlan(etablissement.offre!) !== undefined &&
    !offreState;

  /*
   * Formule groupée. Connect et le click & collect pris ensemble valent le
   * tarif groupé annoncé sur la landing, pas la somme des deux : le produit
   * qui arrive rejoint l'abonnement déjà en cours (proratisé) au lieu d'en
   * ouvrir un second — le click & collect ajouté à Connect, comme les
   * mensualités de Connect dues alors que le click & collect tourne déjà.
   * Rien à ressaisir — d'où une réponse sans URL de checkout. Le webhook
   * customer.subscription.updated écrit les deux lignes d'abonnement à partir
   * de metadata.products.
   */
  const liveRow = (product: Product) =>
    subscriptions?.find(
      (row) => row.product === product && !isTerminal(row.status)
    );
  const bundleFrom =
    etablissement.offre !== BUNDLE_OFFRE
      ? undefined
      : choice === "collect"
        ? liveRow("offre")
        : choice === "offre" && !freeMonths
          ? liveRow("collect")
          : undefined;
  if (bundleFrom?.stripe_subscription_id) {
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
      bundleFrom.stripe_subscription_id
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

  // Offre en mois offerts déjà ouverte (exonération acquise, ou réouverture
  // après résiliation) : rien à facturer, l'accès est rendu tel quel.
  if (freeMonths && !firstActivation) {
    const { error } = await createAdminClient()
      .from("subscriptions")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("etablissement_id", etablissement.id)
      .eq("product", "offre");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ activated: true });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (!freeMonths) {
    const lookupKey = choice === "offre" ? etablissement.offre! : choice;
    const price = await priceByLookupKey(lookupKey);
    if (!price) {
      return NextResponse.json(
        { error: new MissingPriceError(lookupKey).message },
        { status: 500 }
      );
    }
    lineItems.push({ price: price.id, quantity: 1 });
  }

  const omilink = freeMonths && body.omilink === true;
  let tables = 0;
  if (firstActivation) {
    const { count } = await supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("etablissement_id", etablissement.id);
    tables = count ?? 0;
    if (tables < 1) {
      return NextResponse.json(
        { error: "Indiquez votre nombre de tables pour commander vos Cachets." },
        { status: 409 }
      );
    }
    try {
      lineItems.push(...(await starterLineItems(stripe, { tables, omilink })));
    } catch (cause) {
      if (cause instanceof MissingPriceError) {
        return NextResponse.json({ error: cause.message }, { status: 500 });
      }
      throw cause;
    }
  }

  const metadata: Record<string, string> = {
    etablissement_id: etablissement.id,
    products: products.join(","),
    ...(firstActivation && {
      starter: STARTER_FLAG,
      tables: String(tables),
      omilink: omilink ? "1" : "0",
      square: freeMonths && body.square === true ? "1" : "0",
    }),
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
    line_items: lineItems,
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    client_reference_id: etablissement.id,
    metadata,
    ...(freeMonths
      ? {
          mode: "payment" as const,
          // Le client Stripe sert aux achats suivants (click & collect…).
          customer_creation: customerId ? undefined : ("always" as const),
          payment_intent_data: { metadata },
        }
      : { mode: "subscription" as const, subscription_data: { metadata } }),
    ...(firstActivation && {
      shipping_address_collection: {
        allowed_countries: [...starterKit.shippingCountries],
      },
    }),
    locale: "fr",
    success_url: `${origin}${returnPath}?checkout=succes`,
    cancel_url: `${origin}${returnPath}?checkout=annule`,
  });

  return NextResponse.json({ url: session.url });
}
