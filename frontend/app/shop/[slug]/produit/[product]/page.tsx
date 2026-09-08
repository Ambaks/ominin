import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ChevronDownIcon, GiftIcon, LockIcon, TruckIcon } from "@/components/shop/icons";
import { AddToCartForm } from "@/components/shop/store/add-to-cart-form";
import { shopHref } from "@/components/shop/store/href";
import { ProductGallery } from "@/components/shop/store/product-gallery";
import { ProductGrid, productImage } from "@/components/shop/store/product-card";
import { HeartBullet, Price, SectionHeading } from "@/components/shop/store/ui";
import { WITHDRAWAL_DAYS } from "@/lib/shop/constants";
import { formatPrice } from "@/lib/shop/format";
import { getProductBySlug, getRelatedProducts, getShopBySlug } from "@/lib/shop/server";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/shop/[slug]/produit/[product]">): Promise<Metadata> {
  const { slug, product: productSlug } = await params;
  const shop = await getShopBySlug(slug);
  const product = shop ? await getProductBySlug(shop.id, productSlug) : null;
  if (!product) return { title: "Article introuvable" };
  const image = productImage(product);
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.subtitle ?? product.description?.slice(0, 160) ?? undefined,
    openGraph: image ? { images: [{ url: image.url, alt: image.alt }] } : undefined,
  };
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center justify-between py-4 text-[14.5px] font-medium text-shop-ink">
        {title}
        <ChevronDownIcon className="size-[18px] text-shop-ink-soft transition-transform group-open:rotate-180" />
      </summary>
      <p className="pb-5 text-sm leading-relaxed text-shop-ink-soft">{children}</p>
    </details>
  );
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]/produit/[product]">) {
  const { slug, product: productSlug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const product = await getProductBySlug(shop.id, productSlug);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 4);
  const threshold = shop.free_shipping_threshold_cents;

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="shop-container flex items-center gap-2.5 pt-6 text-xs text-shop-ink-soft">
        <Link href={shopHref(slug)} className="hover:text-shop-ink">
          Accueil
        </Link>
        <span className="text-shop-ink-faint">/</span>
        <Link href={shopHref(slug, "/boutique")} className="hover:text-shop-ink">
          {shop.catalog_label}
        </Link>
        <span className="text-shop-ink-faint">/</span>
        <span className="font-medium text-shop-ink">{product.name}</span>
      </nav>

      <section className="shop-container grid gap-10 py-8 md:grid-cols-[1.05fr_1fr] md:gap-16 md:py-10 lg:gap-[72px]">
        <ProductGallery images={product.shop_product_images} name={product.name} badge={product.badge} />
        <div className="flex flex-col gap-6 md:pt-2">
          <div className="flex flex-col gap-3">
            {product.shop_categories && <span className="shop-kicker">{product.shop_categories.name}</span>}
            <h1 className="text-4xl md:text-[46px]">{product.name}</h1>
            <div className="flex flex-wrap items-baseline gap-3.5">
              <Price cents={product.price_cents} compareAtCents={product.compare_at_price_cents} size="lg" />
              <span className="text-xs text-shop-ink-soft">TTC · livraison calculée à l&apos;étape suivante</span>
            </div>
          </div>
          {product.description && <p className="text-base leading-relaxed text-shop-ink-soft">{product.description}</p>}
          {product.composition.length > 0 && (
            <div className="flex flex-col gap-3.5 rounded-[20px] border border-shop-line bg-shop-paper px-6 py-5">
              <span className="shop-label text-shop-ink">Composition</span>
              <ul className="flex flex-col gap-2.5">
                {product.composition.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-[14.5px] leading-snug text-shop-ink">
                    <HeartBullet className="mt-1" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <AddToCartForm product={product} />
          <ul className="grid grid-cols-1 gap-2.5 text-xs text-shop-ink-soft sm:grid-cols-3">
            <li className="flex items-center gap-2.5">
              <TruckIcon className="size-[18px] shrink-0 text-shop-accent-deep" /> Expédié avec suivi
            </li>
            <li className="flex items-center gap-2.5">
              <LockIcon className="size-[18px] shrink-0 text-shop-accent-deep" /> Paiement sécurisé Stripe
            </li>
            <li className="flex items-center gap-2.5">
              <GiftIcon className="size-[18px] shrink-0 text-shop-accent-deep" /> Emballage soigné
            </li>
          </ul>
          <div className="flex flex-col divide-y divide-shop-line border-t border-shop-line">
            <Accordion title="Livraison et retours">
              Chaque commande est préparée à la main puis expédiée avec un numéro de suivi.
              {threshold ? ` La livraison est offerte à partir de ${formatPrice(threshold)} d'achat.` : ""} Tu disposes de {WITHDRAWAL_DAYS} jours après réception pour changer d&apos;avis.{" "}
              <Link href={shopHref(slug, "/livraison-retours")} className="font-medium text-shop-accent-deep underline-offset-2 hover:underline">
                En savoir plus
              </Link>
            </Accordion>
            <Accordion title="Offrir cet article">
              Au moment de la commande, coche « C&apos;est un cadeau », écris ton mot doux et indique l&apos;adresse de la personne : elle recevra le colis directement, sans facture ni prix.
            </Accordion>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-shop-line-soft bg-shop-paper">
          <div className="shop-container flex flex-col gap-8 py-16 md:gap-9 md:py-20">
            <SectionHeading
              kicker="Pour continuer"
              title="Tu aimeras aussi"
              action={
                <Link href={shopHref(slug, "/boutique")} className="inline-flex items-center gap-2 border-b border-shop-accent-soft pb-0.5 text-sm font-medium text-shop-accent-deep hover:text-shop-accent">
                  Tout voir <ArrowRightIcon className="size-4" />
                </Link>
              }
            />
            <ProductGrid slug={slug} products={related} />
          </div>
        </section>
      )}
    </>
  );
}
