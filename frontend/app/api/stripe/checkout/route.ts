import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { collectOffer, planTrial, starterKit } from "@/lib/landing-data";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import {
  LegalVersionError,
  acceptContract,
  assertPublished,
  assertVersionsMatch,
  linkCheckoutSession,
} from "@/lib/legal/server";
import type { AcceptedTerms } from "@/lib/legal/types";
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
    /** Versions des documents affichées à l'écran au moment de la case cochée. */
    versions?: Record<string, string>;
    /** Opposition cochée sous la même case, quand l'écran la proposait. */
    trainingOptOut?: boolean;
  };

  /*
   * Aucune session Stripe sans contrat signé. Les versions vues à l'écran
   * sont vérifiées ici : un texte changé entre l'affichage et le clic rendrait
   * la signature sans objet, et le client doit relire.
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
    .select("id, slug, offre")
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
  /*
   * Signature du contrat. Elle précède l'action qu'elle autorise — ouverture
   * d'une session Checkout, bascule sur la formule groupée, réouverture d'une
   * offre en mois offerts : trois chemins par lesquels le client s'engage, et
   * aucun ne doit pouvoir être pris sans la ligne qui le prouve. Le relevé
   * porte les chiffres du chemin emprunté, pas ceux de la grille du jour.
   */
  const admin = createAdminClient();
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
  /*
   * Choix de licence. Quand l'écran de signature l'a proposé, c'est celui-là
   * qui fait foi et il est enregistré avant d'être recopié dans le relevé :
   * lire la base sans l'écrire aurait fait signer l'inverse de la case cochée.
   * Absent du corps, l'écran ne le proposait pas, et l'état en base vaut.
   */
  if (typeof body.trainingOptOut === "boolean") {
    const { error } = await admin
      .from("etablissement_data_licence")
      .upsert(
        {
          etablissement_id: etablissement.id,
          training_opt_out: body.trainingOptOut,
        },
        { onConflict: "etablissement_id" }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  // Le choix tel qu'il vient d'être posé, sinon tel qu'il est en base. Une
  // lecture en échec ne se remplace pas par un défaut : le relevé omet alors
  // la licence plutôt que d'y graver un choix que personne n'a fait.
  const { data: licence, error: licenceError } =
    typeof body.trainingOptOut === "boolean"
      ? { data: { training_opt_out: body.trainingOptOut }, error: null }
      : await admin
          .from("etablissement_data_licence")
          .select("training_opt_out")
          .eq("etablissement_id", etablissement.id)
          .maybeSingle();
  const sign = (terms: Omit<AcceptedTerms, "context" | "versions">) =>
    acceptContract(admin, {
      userId: user.id,
      signatoryEmail: user.email || user.id,
      publishedVersions,
      scope: {
        kind: "etablissement",
        id: etablissement.id,
        label: etablissement.slug,
      },
      terms: {
        context: "checkout",
        versions,
        // Sans ligne, l'établissement n'a jamais exercé l'opposition : c'est
        // le régime par défaut que les CGV appliquent, et c'est lui qu'on
        // relève — non un choix inventé.
        ...(!licenceError && {
          trainingOptOut: licence?.training_opt_out ?? false,
        }),
        ...terms,
      },
      request,
    });

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
    await sign({
      product: BUNDLE_CHOICE,
      monthly: collectOffer.bundle.price,
      commission: quotePlan(BUNDLE_OFFRE)?.commission,
    });
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
    await sign({
      product: choice,
      monthly: 0,
      commission: quotePlan(etablissement.offre!)?.commission,
    });
    const { error } = await admin
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

  /*
   * Relevé de ce qui est engagé : la mensualité du chemin emprunté, la
   * commission de l'offre, et les lignes réglées tout de suite. Reconstruit
   * ici et non repris du client — le nombre de tables a été recompté en base,
   * c'est celui-là qui est facturé, donc celui-là qui est signé.
   */
  const signedPlan = choice === "offre" ? quotePlan(etablissement.offre!) : undefined;
  const monthly = freeMonths
    ? 0
    : choice === "collect"
      ? collectOffer.price
      : (signedPlan?.price ?? 0);
  const signedLines: { label: string; amount: number }[] = [];
  if (!freeMonths) {
    signedLines.push({
      label: signedPlan ? `Ominin ${signedPlan.name}` : collectOffer.name,
      amount: monthly,
    });
  }
  if (firstActivation) {
    signedLines.push({
      label: `${starterKit.cachet.name} × ${tables}`,
      amount: tables * starterKit.cachet.price,
    });
    if (omilink) {
      signedLines.push({
        label: starterKit.omilink.name,
        amount: starterKit.omilink.price,
      });
    }
    signedLines.push({
      label: starterKit.shipping.name,
      amount: starterKit.shipping.price,
    });
  }
  const acceptanceIds = await sign({
    product: choice,
    monthly,
    commission: signedPlan?.commission,
    lines: signedLines,
    total: signedLines.reduce((sum, line) => sum + line.amount, 0),
  });

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
    /*
     * Second recueil du consentement, tenu par Stripe cette fois : la session
     * porte alors consent.terms_of_service = 'accepted', une preuve qu'Ominin
     * ne détient pas elle-même. Conditionné à une variable d'environnement
     * parce que Stripe exige une URL de CGV renseignée dans le Dashboard
     * (Paramètres → Informations publiques) : sans elle, l'appel échoue et
     * c'est tout l'encaissement qui tombe.
     */
    ...(process.env.STRIPE_TOS_CONSENT === "1" && {
      consent_collection: { terms_of_service: "required" as const },
      custom_text: {
        terms_of_service_acceptance: {
          message: `J'ai lu et j'accepte les [conditions générales de vente](${origin}${LEGAL_PATHS.cgv}) et l'[accord de sous-traitance](${origin}${LEGAL_PATHS.dpa}) d'Ominin.`,
        },
      },
    }),
    success_url: `${origin}${returnPath}?checkout=succes`,
    cancel_url: `${origin}${returnPath}?checkout=annule`,
  });

  // La signature précède la session : on la rattache une fois l'identifiant
  // connu, pour relier un contrat à son paiement dans les deux sens.
  await linkCheckoutSession(admin, acceptanceIds, session.id);

  return NextResponse.json({ url: session.url });
}
