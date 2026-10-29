import type Stripe from "stripe";
import { registerWalletDomains } from "@/lib/stripe/server";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Stripe Connect Express d'un établissement : l'argent des additions revient
 * directement au restaurant. Partagé par la gestion (le gérant connecté) et
 * l'inscription avec un commercial (le jeton de l'inscription).
 * payment_accounts n'est écrite que par la clé service.
 */

/** Crée le compte si besoin et rend le lien d'onboarding Stripe. */
export async function connectOnboardingLink(
  admin: Admin,
  stripe: Stripe,
  input: { etablissementId: string; email?: string; refreshUrl: string; returnUrl: string }
): Promise<string> {
  const { data: existing } = await admin
    .from("payment_accounts")
    .select("stripe_account_id")
    .eq("etablissement_id", input.etablissementId)
    .maybeSingle();
  let accountId = existing?.stripe_account_id;
  if (!accountId) {
    // Le nom du restaurant, prérempli : le libellé du relevé bancaire en
    // découle. Un compte de particulier laissé sans nom d'entreprise
    // n'avait aucun libellé (Caffè Panis) : le client ne reconnaît pas le
    // débit, et le conteste.
    const { data: etab } = await admin.from("etablissements").select("name").eq("id", input.etablissementId).single();
    const account = await stripe.accounts.create({
      type: "express",
      email: input.email,
      ...(etab && { business_profile: { name: etab.name } }),
      metadata: { etablissement_id: input.etablissementId },
    });
    accountId = account.id;
    const { error } = await admin
      .from("payment_accounts")
      .insert({ etablissement_id: input.etablissementId, stripe_account_id: accountId });
    if (error) throw new Error(error.message);
  }
  // À chaque lien d'onboarding : un compte relié avant que le menu ne
  // propose les portefeuilles se met à jour au passage. Un refus (domaine
  // de dev, panne) n'empêche pas l'onboarding : la carte reste possible.
  await registerWalletDomains(stripe, accountId).catch((error) =>
    console.error("[stripe] domaines Apple Pay / Google Pay non enregistrés", {
      accountId,
      message: error instanceof Error ? error.message : String(error),
    })
  );
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: input.refreshUrl,
    return_url: input.returnUrl,
  });
  return link.url;
}

/** L'état du compte, rafraîchi depuis Stripe (l'onboarding vient peut-être d'avoir lieu). */
export async function connectStatus(
  admin: Admin,
  stripe: Stripe,
  etablissementId: string
): Promise<{ connected: boolean; chargesEnabled: boolean }> {
  const { data } = await admin
    .from("payment_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  if (!data) return { connected: false, chargesEnabled: false };
  const account = await stripe.accounts.retrieve(data.stripe_account_id);
  const chargesEnabled = Boolean(account.charges_enabled);
  if (chargesEnabled !== data.charges_enabled) {
    await admin
      .from("payment_accounts")
      .update({ charges_enabled: chargesEnabled, updated_at: new Date().toISOString() })
      .eq("etablissement_id", etablissementId);
  }
  return { connected: true, chargesEnabled };
}
