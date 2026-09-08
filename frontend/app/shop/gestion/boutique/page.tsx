import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { SettingsForm, StripePanel, SubscriptionPanel, ThemeEditor } from "@/components/shop/gestion/settings";
import { shopOffer } from "@/lib/shop-landing-data";
import { getPaymentAccount, getSubscription, requireShopSession } from "@/lib/shop/server";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ShopSettingsPage({ searchParams }: PageProps<"/shop/gestion/boutique">) {
  const { shop, role } = await requireShopSession();
  if (role !== "proprietaire") redirect("/gestion");
  const { stripe } = await searchParams;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  // Retour de l'onboarding Stripe : relecture de l'état du compte.
  if (stripe === "retour" && stripeConfigured) {
    const admin = createAdminClient();
    const { data } = await admin.from("shop_payment_accounts").select("stripe_account_id").eq("shop_id", shop.id).maybeSingle();
    if (data) {
      try {
        const account = await getStripe().accounts.retrieve(data.stripe_account_id);
        await admin
          .from("shop_payment_accounts")
          .update({ details_submitted: Boolean(account.details_submitted), charges_enabled: Boolean(account.charges_enabled), payouts_enabled: Boolean(account.payouts_enabled), updated_at: new Date().toISOString() })
          .eq("shop_id", shop.id);
      } catch (error) {
        console.error("[shop stripe]", error);
      }
    }
  }
  const [account, subscription] = await Promise.all([getPaymentAccount(shop.id), getSubscription(shop.id)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Boutique" description="Identité, contact, thème, paiements et abonnement." />
      {stripe === "recommencer" && <p className="rounded-xl border border-ember-2/40 bg-ember-2/10 px-4 py-3 text-sm">Le lien Stripe a expiré : cliquez à nouveau sur « Reprendre la configuration ».</p>}
      <StripePanel account={account} stripeConfigured={stripeConfigured} />
      <SubscriptionPanel subscription={subscription} pricesConfigured={shopOffer.published && shopOffer.monthlyPrice > 0} />
      <SettingsForm shop={shop} section="general" />
      <ThemeEditor shop={shop} />
      <SettingsForm shop={shop} section="legal" />
    </div>
  );
}
