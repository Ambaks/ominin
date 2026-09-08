import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRightIcon, PackageIcon } from "@/components/shop/icons";
import { shopHref } from "@/components/shop/store/href";
import { ButtonLink, EmptyState, StatusPill } from "@/components/shop/store/ui";
import { formatDate, formatPrice } from "@/lib/shop/format";
import { getCurrentUser, getShopBySlug, listOrdersForUser } from "@/lib/shop/server";

export const metadata: Metadata = { title: "Mes commandes", robots: { index: false } };

export default async function AccountOrdersPage({ params }: PageProps<"/shop/[slug]/compte/commandes">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(shopHref(slug, `/compte?next=${encodeURIComponent(shopHref(slug, "/compte/commandes"))}`));
  const orders = await listOrdersForUser(shop.id, user.id);

  return (
    <section className="shop-container py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <nav className="text-xs text-shop-ink-soft">
          <Link href={shopHref(slug, "/compte")} className="hover:text-shop-ink">
            Mon compte
          </Link>{" "}
          / <span className="text-shop-ink">Mes commandes</span>
        </nav>
        <h1 className="text-4xl">Mes commandes</h1>
        {orders.length === 0 ? (
          <EmptyState icon={<PackageIcon className="size-6" strokeWidth={1.5} />} title="Aucune commande pour le moment" description="Les commandes passées avec cette adresse e-mail après connexion apparaîtront ici." action={<ButtonLink href={shopHref(slug, "/boutique")}>Découvrir la boutique</ButtonLink>} />
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={shopHref(slug, `/compte/commandes/${order.id}`)} className="group flex items-center gap-4 rounded-[20px] border border-shop-line bg-shop-paper px-6 py-5 transition hover:border-shop-accent-soft hover:shop-shadow">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="font-shop-display text-lg text-shop-ink">{order.order_number}</span>
                    <span className="text-xs text-shop-ink-soft">
                      {formatDate(order.created_at)} · {order.shop_order_items.map((i) => i.product_name).join(", ")}
                    </span>
                  </div>
                  <StatusPill status={order.status} className="hidden sm:inline-flex" />
                  <span className="text-sm font-semibold text-shop-ink">{formatPrice(order.total_cents)}</span>
                  <ArrowRightIcon className="size-[18px] text-shop-ink-mute transition group-hover:text-shop-accent-deep" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
