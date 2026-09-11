import Link from "next/link";
import type { ProductWithImages } from "@/lib/shop/types";
import { GiftIcon } from "../icons";
import { shopHref } from "./href";
import { Price, ProductBadge } from "./ui";

export function productImage(product: ProductWithImages): { url: string; alt: string } | null {
  const image = product.shop_product_images[0];
  return image ? { url: image.url, alt: image.alt ?? product.name } : null;
}

export function productTeaser(product: ProductWithImages): string {
  return product.subtitle ?? product.composition.slice(0, 3).join(", ");
}

export function ProductCard({ slug, product, priority }: { slug: string; product: ProductWithImages; priority?: boolean }) {
  const image = productImage(product);
  const soldOut = product.stock != null && product.stock <= 0;
  return (
    <Link href={shopHref(slug, `/produit/${product.slug}`)} className="group flex flex-col gap-3.5" aria-label={`${product.name}, voir la fiche`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-shop-tint transition-shadow duration-300 group-hover:shop-shadow-hover">
        {image ? (
          <img src={image.url} alt={image.alt} loading={priority ? "eager" : "lazy"} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center text-shop-accent-soft">
            <GiftIcon className="size-12" strokeWidth={1.2} />
          </div>
        )}
        {product.badge && <ProductBadge badge={product.badge} className="absolute left-3.5 top-3.5" />}
        {soldOut && <span className="absolute right-3.5 top-3.5 inline-flex h-[26px] items-center rounded-full bg-shop-paper/95 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-shop-ink-soft">Épuisé</span>}
        <span className="pointer-events-none absolute inset-x-3.5 bottom-3.5 flex h-11 translate-y-3 items-center justify-center rounded-full bg-shop-paper/95 text-[12px] font-semibold uppercase tracking-[0.12em] text-shop-accent-deep opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Découvrir
        </span>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="font-shop-display text-xl text-shop-ink group-hover:text-shop-accent-deep">{product.name}</span>
        <Price cents={product.price_cents} compareAtCents={product.compare_at_price_cents} />
      </div>
      <p className="text-[13px] leading-relaxed text-shop-ink-soft">{productTeaser(product)}</p>
    </Link>
  );
}

export function ProductGrid({ slug, products, priorityCount = 0 }: { slug: string; products: ProductWithImages[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-7 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} slug={slug} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
