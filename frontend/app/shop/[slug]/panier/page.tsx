import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartView } from "@/components/shop/store/cart-view";
import { getShopBySlug } from "@/lib/shop/server";

export const metadata: Metadata = { title: "Mon panier", robots: { index: false } };

export default async function CartPage({ params }: PageProps<"/shop/[slug]/panier">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  return (
    <section className="shop-container flex flex-col gap-8 py-12 md:py-16">
      <div className="flex flex-col gap-2">
        <span className="shop-kicker">Presque prête</span>
        <h1 className="text-4xl md:text-[44px]">Mon panier</h1>
      </div>
      <CartView freeShippingThreshold={shop.free_shipping_threshold_cents} />
    </section>
  );
}
