import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Stripe Connect pour le paiement à table : chaque restaurant relie son
 * compte Express (l'argent des additions lui revient directement).
 * GET  → état du compte (rafraîchi depuis Stripe).
 * POST → crée le compte si besoin puis renvoie un lien d'onboarding.
 * La table payment_accounts n'est écrite que par la clé service.
 */

async function requireGerant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise.", status: 401 as const };
  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    return {
      error: "Seul le gérant peut configurer le paiement en ligne.",
      status: 403 as const,
    };
  }
  return { etablissementId: membership.etablissement_id, email: user.email };
}

interface AccountRow {
  stripe_account_id: string;
  charges_enabled: boolean;
}

// payment_accounts arrive avec la migration 20260709000002 ; les types
// Supabase seront régénérés après application — accès non typé en attendant.
function paymentAccounts(admin: ReturnType<typeof createAdminClient>) {
  return (admin as unknown as {
    from: (table: string) => ReturnType<typeof admin.from>;
  }).from("payment_accounts");
}

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const { data } = (await paymentAccounts(admin)
    .select("stripe_account_id, charges_enabled")
    .eq("etablissement_id", auth.etablissementId)
    .maybeSingle()) as { data: AccountRow | null };
  if (!data) return NextResponse.json({ connected: false, chargesEnabled: false });

  // Rafraîchit charges_enabled depuis Stripe (l'onboarding vient d'avoir lieu).
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(data.stripe_account_id);
  const chargesEnabled = Boolean(account.charges_enabled);
  if (chargesEnabled !== data.charges_enabled) {
    await paymentAccounts(admin)
      .update({ charges_enabled: chargesEnabled, updated_at: new Date().toISOString() })
      .eq("etablissement_id", auth.etablissementId);
  }
  return NextResponse.json({ connected: true, chargesEnabled });
}

export async function POST(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: existing } = (await paymentAccounts(admin)
    .select("stripe_account_id, charges_enabled")
    .eq("etablissement_id", auth.etablissementId)
    .maybeSingle()) as { data: AccountRow | null };

  let accountId = existing?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: auth.email,
      metadata: { etablissement_id: auth.etablissementId },
    });
    accountId = account.id;
    const { error } = await paymentAccounts(admin).insert({
      etablissement_id: auth.etablissementId,
      stripe_account_id: accountId,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const origin = new URL(request.url).origin;
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${origin}/gestion/etablissement?stripe=recommencer`,
    return_url: `${origin}/gestion/etablissement?stripe=retour`,
  });
  return NextResponse.json({ url: link.url });
}
