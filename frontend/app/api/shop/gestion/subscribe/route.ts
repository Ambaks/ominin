import { NextResponse } from "next/server";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import {
  LegalVersionError,
  acceptContract,
  assertPublished,
  assertVersionsMatch,
  linkCheckoutSession,
} from "@/lib/legal/server";
import { requestOrigin, requireShopMember } from "@/lib/shop/api-auth";
import { shopOffer } from "@/lib/shop-landing-data";
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

  // Même règle que pour les restaurants : pas de session Stripe sans contrat
  // signé, et les versions vues à l'écran doivent être celles en vigueur.
  const body = (await request.json().catch(() => ({}))) as {
    versions?: Record<string, string>;
  };
  /*
   * Deux échecs distincts, deux réponses distinctes : des conditions périmées
   * sous les yeux du client se rattrapent en rechargeant (409), une
   * indisponibilité des textes est une panne d'Ominin (503). Les confondre
   * renverrait au client une consigne d'exploitation qu'il ne peut pas suivre.
   */
  let versions;
  try {
    versions = assertVersionsMatch(body.versions);
  } catch (cause) {
    if (cause instanceof LegalVersionError) {
      return NextResponse.json(
        { error: cause.message, code: "conditions" },
        { status: 409 }
      );
    }
    throw cause;
  }
  let publishedVersions;
  try {
    publishedVersions = await assertPublished(admin);
  } catch (cause) {
    if (cause instanceof LegalVersionError) {
      console.error("[legal]", cause.message);
      return NextResponse.json(
        { error: "Les conditions ne sont pas disponibles. Réessayez plus tard." },
        { status: 503 }
      );
    }
    throw cause;
  }

  const stripe = getStripe();

  const { data: current } = await admin.from("shop_subscriptions").select("*").eq("shop_id", session.shop.id).maybeSingle();
  if (current && !isTerminal(current.status)) return NextResponse.json({ error: "Un abonnement est déjà en cours pour cette boutique." }, { status: 409 });

  const { data: prices } = await stripe.prices.list({ lookup_keys: [SHOP_MONTHLY_LOOKUP_KEY, SHOP_SETUP_LOOKUP_KEY], active: true });
  const monthly = prices.find((p) => p.lookup_key === SHOP_MONTHLY_LOOKUP_KEY);
  const setup = prices.find((p) => p.lookup_key === SHOP_SETUP_LOOKUP_KEY);
  if (!monthly) return NextResponse.json({ error: "Tarif de l'offre Shop introuvable dans Stripe — exécuter npm run setup:stripe." }, { status: 500 });

  const origin = requestOrigin(request);
  const metadata = { shop_id: session.shop.id, product: "shop" };
  const setupDue = Boolean(setup && !current?.setup_paid_at);

  /*
   * Relevé signé : les montants viennent des prix Stripe qui vont être
   * facturés, pas de shopOffer. L'offre Shop se vend sur devis — ses montants
   * publics valent zéro tant qu'aucun tarif n'est arrêté —, et faire signer
   * « 0 € » à un client qui va être débité serait un relevé faux. Le prix
   * porté par le catalogue Stripe est celui de son devis.
   */
  const euros = (amount: number | null) => (amount ?? 0) / 100;
  const monthlyAmount = euros(monthly.unit_amount);
  const setupAmount = setupDue ? euros(setup!.unit_amount) : 0;
  const acceptanceIds = await acceptContract(admin, {
    userId: session.userId,
    // Le signataire est d'abord la personne connectée. L'adresse de contact
    // de la boutique ne vient qu'à défaut, puis l'identifiant du compte : une
    // preuve doit nommer quelqu'un, même imparfaitement.
    signatoryEmail: session.email || session.shop.contact_email || session.userId,
    scope: { kind: "shop", id: session.shop.id, label: session.shop.slug },
    publishedVersions,
    terms: {
      context: "checkout",
      versions,
      product: shopOffer.id,
      monthly: monthlyAmount,
      lines: [
        { label: shopOffer.name, amount: monthlyAmount },
        ...(setupDue
          ? [{ label: "Mise en place", amount: setupAmount }]
          : []),
      ],
      total: monthlyAmount + setupAmount,
    },
    request,
  });

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: monthly.id, quantity: 1 }, ...(setupDue ? [{ price: setup!.id, quantity: 1 }] : [])],
    customer: current?.stripe_customer_id ?? undefined,
    customer_email: current?.stripe_customer_id ? undefined : session.shop.contact_email ?? session.email ?? undefined,
    client_reference_id: session.shop.id,
    metadata,
    subscription_data: { metadata },
    locale: "fr",
    ...(process.env.STRIPE_TOS_CONSENT === "1" && {
      consent_collection: { terms_of_service: "required" as const },
      custom_text: {
        terms_of_service_acceptance: {
          message: `J'ai lu et j'accepte les [conditions générales de vente](${origin}${LEGAL_PATHS.cgv}) et l'[accord de sous-traitance](${origin}${LEGAL_PATHS.dpa}) d'Ominin.`,
        },
      },
    }),
    success_url: `${origin}/gestion/boutique?abonnement=succes`,
    cancel_url: `${origin}/gestion/boutique?abonnement=annule`,
  });
  await linkCheckoutSession(admin, acceptanceIds, checkout.id);
  return NextResponse.json({ url: checkout.url });
}
