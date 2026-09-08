import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, HeartIcon } from "@/components/shop/icons";
import { shopHref } from "@/components/shop/store/href";
import { ProductGrid, productImage, productTeaser } from "@/components/shop/store/product-card";
import { AboutTeaser, CollectionChips, GiftBand, HowItWorks, Reassurance } from "@/components/shop/store/sections";
import { ButtonLink, SectionHeading } from "@/components/shop/store/ui";
import { BADGE_LABELS } from "@/lib/shop/constants";
import { formatPrice } from "@/lib/shop/format";
import { getCategories, getProducts, getShopBySlug } from "@/lib/shop/server";

export const revalidate = 60;

export default async function ShopHomePage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const [all, categories] = await Promise.all([getProducts(shop.id), getCategories(shop.id)]);
  const featured = all.filter((p) => p.is_featured).slice(0, 4);
  const showcase = featured.length ? featured : all.slice(0, 4);
  const hero = showcase[0] ?? null;
  const heroImage = hero ? productImage(hero) : null;
  const prices = all.map((p) => p.price_cents);
  const aboutImage = all.map(productImage).find(Boolean) ?? null;
  const giftImages = all.filter((p) => p.id !== hero?.id).map(productImage).filter((i): i is NonNullable<typeof i> => i !== null).slice(0, 2);
  const title = shop.hero_title ?? shop.tagline ?? shop.name;
  const [titleStart, ...titleRest] = title.split(",");

  return (
    <>
      <section className="relative overflow-hidden bg-shop-tint">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(720px 480px at 82% 30%, var(--shop-tint-strong) 0%, transparent 70%)" }} />
        <div className="shop-container relative grid items-center gap-10 py-12 md:grid-cols-[1.05fr_1fr] md:gap-16 md:py-20">
          <div className="flex flex-col gap-6 md:gap-7">
            {shop.tagline && shop.hero_title && <span className="shop-kicker">{shop.tagline}</span>}
            <h1 className="text-[42px] leading-[1.05] md:text-[64px]">
              {titleStart}
              {titleRest.length > 0 && (
                <>
                  ,<br />
                  {/* Le cœur suit le dernier mot : il ne doit jamais tomber seul sur sa ligne. */}
                  <span className="font-normal italic text-shop-accent-deep">
                    {titleRest.join(",").trim().replace(/\s+\S+$/, "")}{" "}
                    <span className="whitespace-nowrap">
                      {titleRest.join(",").trim().match(/\S+$/)?.[0]}
                      <HeartIcon className="ml-2 inline-block size-6 align-baseline text-shop-accent md:size-8" />
                    </span>
                  </span>
                </>
              )}
            </h1>
            {shop.hero_subtitle && <p className="max-w-lg text-[15.5px] leading-relaxed text-shop-ink-soft md:text-lg">{shop.hero_subtitle}</p>}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
              <ButtonLink href={shopHref(slug, "/boutique")} size="lg">
                Découvrir {shop.catalog_label.toLowerCase()}
              </ButtonLink>
              <Link href={shopHref(slug, "/offrir")} className="inline-flex w-fit items-center gap-2 border-b border-shop-accent-soft pb-0.5 text-sm font-medium text-shop-accent-deep hover:text-shop-accent">
                Offrir <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            {prices.length > 0 && (
              <p className="flex flex-wrap items-center gap-3 text-xs text-shop-ink-soft">
                <span>Préparé à la main</span>
                <span className="size-1 rounded-full bg-shop-accent-soft" aria-hidden />
                <span>
                  {all.length} article{all.length > 1 ? "s" : ""} de {formatPrice(Math.min(...prices))} à {formatPrice(Math.max(...prices))}
                </span>
              </p>
            )}
          </div>
          {hero && heroImage && (
            <div className="relative">
              <div className="aspect-[4/5] max-h-[620px] overflow-hidden rounded-[24px] bg-shop-tint-strong shop-shadow-hover md:rounded-[32px]">
                <img src={heroImage.url} alt={heroImage.alt} className="size-full object-cover object-[50%_60%]" fetchPriority="high" />
              </div>
              <Link href={shopHref(slug, `/produit/${hero.slug}`)} className="absolute bottom-4 left-4 right-4 flex items-center gap-3.5 rounded-2xl bg-shop-paper/95 p-3 pr-4 shop-shadow transition hover:shop-shadow-hover md:bottom-7 md:left-7 md:right-auto md:gap-4 md:rounded-[18px] md:p-3.5 md:pr-5">
                <img src={heroImage.url} alt="" className="size-12 rounded-xl object-cover md:size-14" />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="font-shop-display text-[15px] text-shop-ink md:text-[17px]">{hero.name}</span>
                  <span className="text-[11px] text-shop-ink-soft md:text-xs">{productTeaser(hero)}</span>
                </span>
                <span className="text-[15px] font-semibold text-shop-ink">{formatPrice(hero.price_cents)}</span>
              </Link>
              {hero.badge && <span className="absolute right-5 top-5 inline-flex h-[30px] items-center rounded-full bg-shop-paper/92 px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-shop-accent-deep">{BADGE_LABELS[hero.badge]}</span>}
            </div>
          )}
        </div>
      </section>

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
      {shop.about_text && <AboutTeaser shop={shop} image={aboutImage} />}
      <div className="pb-16 md:pb-24">
        <GiftBand slug={slug} images={giftImages} />
      </div>
    </>
  );
}
