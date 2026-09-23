import { NextResponse } from "next/server";
import { connectedAccount, getStripe, requireGerant } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Ouvre l'espace Stripe Express du restaurant : ses encaissements, son solde,
 * ses virements et ce qui manque à sa vérification. Ce compte ne s'ouvre pas
 * sur dashboard.stripe.com — Stripe n'y donne accès que par un lien de
 * connexion à usage unique, créé ici à chaque clic.
 */
export async function POST() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const account = await connectedAccount(createAdminClient(), auth.etablissementId);
  if (!account) {
    return NextResponse.json(
      { error: "Aucun compte Stripe n'est relié à cet établissement." },
      { status: 404 }
    );
  }
  try {
    const link = await getStripe().accounts.createLoginLink(account.id);
    return NextResponse.json({ url: link.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe] lien vers l'espace Express impossible", {
      etablissementId: auth.etablissementId,
      message,
    });
    return NextResponse.json({ error: `Stripe : ${message}` }, { status: 500 });
  }
}
