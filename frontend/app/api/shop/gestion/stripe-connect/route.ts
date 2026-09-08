import { NextResponse } from "next/server";
import { requestOrigin, requireShopMember } from "@/lib/shop/api-auth";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Stripe Connect d'une boutique (compte Express, comme les restaurants) :
 * GET → état rafraîchi depuis Stripe ; POST → crée le compte si besoin et
 * renvoie un lien d'onboarding. shop_payment_accounts n'est écrite que par
 * la clé service.
 */
export async function GET() {
  const session = await requireShopMember({ ownerOnly: true });
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  const { data } = await admin.from("shop_payment_accounts").select("*").eq("shop_id", session.shop.id).maybeSingle();
  if (!data) return NextResponse.json({ connected: false, chargesEnabled: false });

  const account = await getStripe().accounts.retrieve(data.stripe_account_id);
  const patch = {
    details_submitted: Boolean(account.details_submitted),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
  };
  if (patch.charges_enabled !== data.charges_enabled || patch.details_submitted !== data.details_submitted || patch.payouts_enabled !== data.payouts_enabled) {
    await admin.from("shop_payment_accounts").update({ ...patch, updated_at: new Date().toISOString() }).eq("shop_id", session.shop.id);
  }
  return NextResponse.json({ connected: true, chargesEnabled: patch.charges_enabled });
}

export async function POST(request: Request) {
  const session = await requireShopMember({ ownerOnly: true });
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: existing } = await admin.from("shop_payment_accounts").select("stripe_account_id").eq("shop_id", session.shop.id).maybeSingle();
  let accountId = existing?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: session.shop.contact_email ?? session.email ?? undefined,
      business_profile: { name: session.shop.name },
      metadata: { shop_id: session.shop.id, product: "shop" },
    });
    accountId = account.id;
    const { error } = await admin.from("shop_payment_accounts").insert({ shop_id: session.shop.id, stripe_account_id: accountId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = requestOrigin(request);
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${origin}/gestion/boutique?stripe=recommencer`,
    return_url: `${origin}/gestion/boutique?stripe=retour`,
  });
  return NextResponse.json({ url: link.url });
}
