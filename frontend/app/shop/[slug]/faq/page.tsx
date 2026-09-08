import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { shopHref } from "@/components/shop/store/href";
import { FaqAccordion } from "@/components/shop/store/faq-accordion";
import { ButtonLink } from "@/components/shop/store/ui";
import { REPLY_DELAY_LABEL } from "@/lib/shop/constants";
import { getFaq, getShopBySlug } from "@/lib/shop/server";

export const revalidate = 60;
export const metadata: Metadata = { title: "Questions fréquentes" };

export default async function FaqPage({ params }: PageProps<"/shop/[slug]/faq">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const items = await getFaq(shop.id);
  return (
    <section className="shop-container grid gap-10 py-12 md:grid-cols-[1fr_1.6fr] md:gap-16 md:py-20">
      <div className="flex flex-col gap-5 md:sticky md:top-32 md:self-start">
        <span className="shop-kicker">On répond à tout</span>
        <h1 className="text-4xl md:text-[44px]">Questions fréquentes</h1>
        <p className="text-[15px] leading-relaxed text-shop-ink-soft">Tu ne trouves pas ta réponse ? Écris-nous, on te répond généralement {REPLY_DELAY_LABEL}.</p>
        <ButtonLink href={shopHref(slug, "/contact")} variant="secondary" className="w-fit">
          Nous écrire
        </ButtonLink>
      </div>
      <FaqAccordion items={items} />
    </section>
  );
}
