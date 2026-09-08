import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeartIcon } from "@/components/shop/icons";
import { ClearCart } from "@/components/shop/store/cart-view";
import { shopHref } from "@/components/shop/store/href";
import { OrderCard, OrderTimeline } from "@/components/shop/store/order-summary";
import { Alert, ButtonLink } from "@/components/shop/store/ui";
import { markOrderPaidFromSession } from "@/lib/shop/orders";
import { getShopBySlug } from "@/lib/shop/server";
import type { OrderWithItems } from "@/lib/shop/types";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Merci pour ta commande", robots: { index: false } };

/*
 * Retour de Stripe Checkout. Le webhook fait foi, mais la cliente arrive
 * souvent avant lui : on relit la session sur le compte connecté et on
 * passe la commande en payée si besoin (idempotent).
 */
async function loadOrder(shopId: string, sessionId: string): Promise<{ order: OrderWithItems | null; paid: boolean }> {
  const admin = createAdminClient();
  const { data } = await admin.from("shop_orders").select("*, shop_order_items(*)").eq("shop_id", shopId).eq("stripe_checkout_session_id", sessionId).maybeSingle();
  let order = data;
  if (!order) return { order: null, paid: false };
  if (order.payment_status !== "paid" && order.stripe_account_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: order.stripe_account_id });
      if (session.payment_status === "paid") {
        await markOrderPaidFromSession(session, order.stripe_account_id);
        const { data: fresh } = await admin.from("shop_orders").select("*, shop_order_items(*)").eq("id", order.id).maybeSingle();
        order = fresh ?? order;
      }
    } catch (error) {
      console.error("[shop confirmation]", error);
    }
  }
  return { order, paid: order.payment_status === "paid" };
}

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/shop/[slug]/commande/confirmation">) {
  const [{ slug }, { session_id: sessionId }] = await Promise.all([params, searchParams]);
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const { order, paid } = typeof sessionId === "string" ? await loadOrder(shop.id, sessionId) : { order: null, paid: false };

  if (!order) {
    return (
      <section className="shop-container flex flex-col items-center gap-6 py-24 text-center">
        <h1 className="text-4xl">Commande introuvable</h1>
        <p className="max-w-md text-sm leading-relaxed text-shop-ink-soft">Nous ne retrouvons pas cette commande. Si tu as été débitée, écris-nous avec ton adresse e-mail et nous vérifierons tout de suite.</p>
        <ButtonLink href={shopHref(slug, "/contact")} variant="secondary">
          Nous écrire
        </ButtonLink>
      </section>
    );
  }

  return (
    <section className="shop-container flex flex-col gap-10 py-12 md:py-16">
      {paid && <ClearCart />}
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-shop-tint-strong text-shop-accent-deep">
          <HeartIcon className="size-7" strokeWidth={1.5} />
        </span>
        <span className="shop-kicker">{paid ? "Merci" : "Un instant"}</span>
        <h1 className="text-4xl md:text-[46px]">{paid ? `Ta commande est en préparation${order.first_name ? `, ${order.first_name}` : ""}` : "Paiement en cours de confirmation"}</h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-shop-ink-soft">
          {paid
            ? `Ta commande ${order.order_number} est confirmée. Un e-mail récapitulatif vient de partir à ${order.email}. On te prévient dès qu'elle est expédiée.`
            : "Stripe nous confirme le paiement dans quelques secondes. Tu peux rafraîchir cette page ou vérifier ta boîte mail."}
        </p>
        {!paid && (
          <Alert tone="info">
            <Link href={shopHref(slug, `/commande/confirmation?session_id=${sessionId}`)} className="font-medium underline-offset-2 hover:underline">
              Rafraîchir la page
            </Link>
          </Alert>
        )}
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {paid && (
          <div className="rounded-[24px] border border-shop-line bg-shop-paper px-6 py-6 md:px-10">
            <OrderTimeline order={order} />
          </div>
        )}
        <OrderCard order={order} />
        <div className="flex flex-col items-center gap-3 text-center text-sm text-shop-ink-soft">
          <p>
            Tu peux suivre ta commande à tout moment sur la page{" "}
            <Link href={shopHref(slug, `/suivi?commande=${order.order_number}&email=${encodeURIComponent(order.email)}`)} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline">
              Suivre ma commande
            </Link>
            .
          </p>
          <ButtonLink href={shopHref(slug, "/boutique")} variant="secondary">
            Continuer la visite
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
