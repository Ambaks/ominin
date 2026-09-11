import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon } from "@/components/shop/icons";
import { shopHref } from "@/components/shop/store/href";
import { ProductGrid, productImage } from "@/components/shop/store/product-card";
import { AboutTeaser, CollectionChips, CollectionTiles, GiftBand, HeroBanner, HowItWorks, QuoteBand, Reassurance } from "@/components/shop/store/sections";
import { SectionHeading } from "@/components/shop/store/ui";
import { getCategories, getProducts, getShopBySlug } from "@/lib/shop/server";

export const revalidate = 60;

export default async function ShopHomePage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const [all, categories] = await Promise.all([getProducts(shop.id), getCategories(shop.id)]);
  const highlighted = categories.filter((c) => c.is_highlighted);
  const featured = all.filter((p) => p.is_featured).slice(0, 4);
  const showcase = featured.length ? featured : all.slice(0, 4);
  const images = all.map(productImage).filter((i): i is NonNullable<typeof i> => i !== null);

  return (
    <>
      <HeroBanner shop={shop} />
      {highlighted.length > 0 && <CollectionTiles slug={slug} title={shop.catalog_label} categories={highlighted} />}
      {shop.hero_title && <QuoteBand text={shop.hero_title} />}

      <Reassurance />

      <section className="shop-container flex flex-col gap-8 py-16 md:gap-10 md:py-24">
        <SectionHeading
          kicker={shop.catalog_label}
          title="Choisis ton coup de cœur"
          intro={shop.hero_subtitle ?? undefined}
          action={
            <Link href={shopHref(slug, "/boutique")} className="inline-flex items-center gap-2 border-b border-shop-accent-soft pb-0.5 text-sm font-medium text-shop-accent-deep hover:text-shop-accent">
              Tout voir <ArrowRightIcon className="size-4" />
            </Link>
          }
        />
        {categories.length > 0 && <CollectionChips slug={slug} categories={categories} />}
        <ProductGrid slug={slug} products={showcase} priorityCount={2} />
      </section>

      <HowItWorks />
      {shop.about_text && <AboutTeaser shop={shop} image={images[0] ?? null} />}
      <div className="pb-16 md:pb-24">
        <GiftBand slug={slug} images={images.slice(1, 3)} />
      </div>
    </>
  );
}
