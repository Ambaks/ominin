import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Multiline } from "@/components/shop/store/ui";
import { getShopBySlug } from "@/lib/shop/server";
import type { Shop } from "@/lib/shop/types";

/* Pages légales et pratiques : contenu saisi dans l'espace de gestion. */
const PAGES: Record<string, { title: string; kicker: string; field: keyof Shop }> = {
  cgv: { title: "Conditions générales de vente", kicker: "Le cadre", field: "cgv" },
  "mentions-legales": { title: "Mentions légales", kicker: "Informations", field: "mentions_legales" },
  confidentialite: { title: "Politique de confidentialité", kicker: "Tes données", field: "confidentialite" },
  "livraison-retours": { title: "Livraison et retours", kicker: "En pratique", field: "livraison_retours" },
};

export async function generateMetadata({ params }: PageProps<"/shop/[slug]/[page]">): Promise<Metadata> {
  const { page } = await params;
  return { title: PAGES[page]?.title ?? "Page introuvable" };
}

export default async function LegalPage({ params }: PageProps<"/shop/[slug]/[page]">) {
  const { slug, page } = await params;
  const def = PAGES[page];
  if (!def) notFound();
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const text = shop[def.field] as string | null;
  return (
    <section className="shop-container py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="shop-kicker">{def.kicker}</span>
          <h1 className="text-4xl md:text-[44px]">{def.title}</h1>
        </div>
        {text ? <Multiline text={text} /> : <p className="text-sm text-shop-ink-soft">Ce contenu sera bientôt disponible.</p>}
      </div>
    </section>
  );
}
