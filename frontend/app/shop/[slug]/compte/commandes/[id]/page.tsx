import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { shopHref } from "@/components/shop/store/href";
import { OrderCard, OrderTimeline } from "@/components/shop/store/order-summary";
import { getCurrentUser, getOrderForUser, getShopBySlug } from "@/lib/shop/server";

export const metadata: Metadata = { title: "Ma commande", robots: { index: false } };

export default async function AccountOrderPage({ params }: PageProps<"/shop/[slug]/compte/commandes/[id]">) {
  const { slug, id } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(shopHref(slug, `/compte?next=${encodeURIComponent(shopHref(slug, `/compte/commandes/${id}`))}`));
  const order = await getOrderForUser(shop.id, user.id, id);
  if (!order) notFound();

  return (
    <section className="shop-container py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <nav className="text-xs text-shop-ink-soft">
          <Link href={shopHref(slug, "/compte")} className="hover:text-shop-ink">
            Mon compte
          </Link>{" "}
          /{" "}
          <Link href={shopHref(slug, "/compte/commandes")} className="hover:text-shop-ink">
            Mes commandes
          </Link>{" "}
          / <span className="text-shop-ink">{order.order_number}</span>
        </nav>
        <div className="rounded-[24px] border border-shop-line bg-shop-paper px-6 py-6 md:px-10">
          <OrderTimeline order={order} events={order.shop_order_events} />
        </div>
        <OrderCard order={order} />
        <p className="text-center text-sm text-shop-ink-soft">
          Une question sur cette commande ?{" "}
          <Link href={shopHref(slug, "/contact")} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline">
            Écris-nous
          </Link>{" "}
          en indiquant son numéro.
        </p>
      </div>
    </section>
  );
}
