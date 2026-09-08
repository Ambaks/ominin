import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { shopHref } from "@/components/shop/store/href";
import { productImage } from "@/components/shop/store/product-card";
import { ButtonLink, HeartDivider, Multiline } from "@/components/shop/store/ui";
import { getProducts, getShopBySlug } from "@/lib/shop/server";

export const revalidate = 60;
export const metadata: Metadata = { title: "À propos" };

export default async function AboutPage({ params }: PageProps<"/shop/[slug]/a-propos">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const products = await getProducts(shop.id, { limit: 3 });
  const images = products.map(productImage).filter((i): i is NonNullable<typeof i> => i !== null);

  return (
    <>
      <section className="shop-container flex flex-col items-center gap-6 py-16 text-center md:py-24">
        {shop.logo_url && <img src={shop.logo_url} alt={`Logo ${shop.name}`} className="size-32 rounded-full object-cover shop-shadow md:size-36" />}
        <span className="shop-kicker">Notre histoire</span>
        <h1 className="max-w-3xl text-4xl leading-[1.1] md:text-[52px]">{shop.tagline ?? shop.name}</h1>
        <HeartDivider />
        <div className="max-w-2xl text-left md:text-center">
          <Multiline text={shop.about_text ?? `${shop.name} prépare chaque commande à la main, avec des produits choisis et une attention particulière à l'emballage.`} className="text-base" />
        </div>
        <ButtonLink href={shopHref(slug, "/boutique")} className="mt-2">
          Découvrir {shop.catalog_label.toLowerCase()}
        </ButtonLink>
      </section>
      {images.length >= 3 && (
        <section className="shop-container grid grid-cols-3 gap-4 pb-16 md:gap-6 md:pb-24">
          {images.map((image, i) => (
            <div key={image.url} className={`aspect-[4/5] overflow-hidden rounded-[20px] bg-shop-tint md:rounded-[28px] ${i === 1 ? "md:-translate-y-6" : ""}`}>
              <img src={image.url} alt={image.alt} className="size-full object-cover" loading="lazy" />
            </div>
          ))}
        </section>
      )}
    </>
  );
}
