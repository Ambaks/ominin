import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftIcon, HeartIcon, MailIcon, TruckIcon } from "@/components/shop/icons";
import { shopHref } from "@/components/shop/store/href";
import { ProductGrid, productImage } from "@/components/shop/store/product-card";
import { ButtonLink, SectionHeading } from "@/components/shop/store/ui";
import { formatPrice } from "@/lib/shop/format";
import { getProducts, getShopBySlug } from "@/lib/shop/server";

export const revalidate = 60;
export const metadata: Metadata = { title: "Offrir", description: "Un mot doux glissé dans le colis, aucun prix apparent, livraison directement chez la personne." };

const STEPS = [
  { icon: GiftIcon, title: "Choisis l'article", text: "Il y en a pour tous les budgets et toutes les occasions." },
  { icon: HeartIcon, title: "Écris ton mot doux", text: "Au moment de la commande, coche « C'est un cadeau » et écris quelques lignes. Aucun prix n'apparaîtra dans le colis." },
  { icon: TruckIcon, title: "Fais livrer chez elle", text: "Indique directement son adresse ou son point relais. Elle reçoit le colis, toi tu reçois le suivi." },
  { icon: MailIcon, title: "Ou garde la surprise", text: "Fais-toi livrer et offre-le en main propre : l'emballage fait déjà tout l'effet." },
];

export default async function GiftPage({ params }: PageProps<"/shop/[slug]/offrir">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const products = await getProducts(shop.id, { featured: true, limit: 4 });
  const showcase = products.length ? products : await getProducts(shop.id, { limit: 4 });
  const hero = showcase[0] ? productImage(showcase[0]) : null;
  const prices = showcase.map((p) => p.price_cents);

  return (
    <>
      <section className="shop-container grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-20">
        <div className="flex flex-col gap-6">
          <span className="shop-kicker">Offrir</span>
          <h1 className="text-4xl leading-[1.08] md:text-[52px]">Une attention qui fait toute la différence</h1>
          <p className="max-w-lg text-base leading-relaxed text-shop-ink-soft">
            Anniversaire, remerciement, naissance, envie de dire « je pense à toi » : un colis {shop.name}, c&apos;est un cadeau qu&apos;on ouvre comme un écrin, avec ton mot doux glissé dedans.
            {prices.length > 0 && ` À partir de ${formatPrice(Math.min(...prices))}.`}
          </p>
          <ButtonLink href={shopHref(slug, "/boutique")} size="lg" className="w-fit">
            Choisir un cadeau
          </ButtonLink>
        </div>
        {hero && (
          <div className="aspect-[4/5] max-h-[560px] overflow-hidden rounded-[28px] bg-shop-tint-strong">
            <img src={hero.url} alt={hero.alt} className="size-full object-cover object-[50%_55%]" />
          </div>
        )}
      </section>
      <section className="border-y border-shop-line-soft bg-shop-paper">
        <div className="shop-container grid gap-8 py-16 sm:grid-cols-2 lg:grid-cols-4 md:py-20">
          {STEPS.map((step) => (
            <div key={step.title} className="flex flex-col gap-4">
              <span className="flex size-12 items-center justify-center rounded-full bg-shop-tint-strong text-shop-accent-deep">
                <step.icon className="size-[22px]" strokeWidth={1.5} />
              </span>
              <span className="text-base font-semibold text-shop-ink">{step.title}</span>
              <p className="text-sm leading-relaxed text-shop-ink-soft">{step.text}</p>
            </div>
          ))}
        </div>
      </section>
      {showcase.length > 0 && (
        <section className="shop-container flex flex-col gap-9 py-16 md:py-24">
          <SectionHeading kicker="Nos préférés" title="Ceux qui font toujours plaisir" />
          <ProductGrid slug={slug} products={showcase} />
        </section>
      )}
    </>
  );
}
