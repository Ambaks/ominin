import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftIcon } from "@/components/shop/icons";
import { ProductGrid } from "@/components/shop/store/product-card";
import { CollectionChips, Reassurance } from "@/components/shop/store/sections";
import { EmptyState, SectionHeading } from "@/components/shop/store/ui";
import { getCategories, getProducts, getShopBySlug } from "@/lib/shop/server";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/shop/[slug]/boutique">): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  return { title: shop?.catalog_label ?? "Boutique" };
}

export default async function CatalogPage({ params, searchParams }: PageProps<"/shop/[slug]/boutique">) {
  const [{ slug }, { collection }] = await Promise.all([params, searchParams]);
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const collectionSlug = typeof collection === "string" ? collection : undefined;
  const [categories, products] = await Promise.all([getCategories(shop.id), getProducts(shop.id, { collection: collectionSlug })]);
  const current = categories.find((c) => c.slug === collectionSlug);

  return (
    <>
      <section className="shop-container flex flex-col gap-8 py-12 md:gap-10 md:py-16">
        <SectionHeading as="h1" kicker={shop.catalog_label} title={current ? current.name : shop.catalog_label} intro={current?.description ?? shop.hero_subtitle ?? undefined} />
        {categories.length > 0 && <CollectionChips slug={slug} categories={categories} active={collectionSlug} />}
        {products.length > 0 ? (
          <ProductGrid slug={slug} products={products} priorityCount={4} />
        ) : (
          <EmptyState icon={<GiftIcon className="size-6" strokeWidth={1.5} />} title="Rien dans cette collection pour le moment" description="Reviens bientôt, de nouveaux articles arrivent." />
        )}
      </section>
      <Reassurance compact />
    </>
  );
}
