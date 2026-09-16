import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopProvider } from "@/components/shop/store/context";
import { ShopFooter } from "@/components/shop/store/footer";
import { ShopHeader } from "@/components/shop/store/header";
import { ShopToastProvider } from "@/components/shop/store/toast";
import { CartProvider } from "@/lib/shop/cart";
import { FONT_VARIABLES, shopThemeStyle } from "@/lib/shop/fonts";
import { getShopBySlug } from "@/lib/shop/server";
import { resolveTheme } from "@/lib/shop/theme";
import { shopSiteUrl } from "@/lib/site";
import "../shop-store.css";

/*
 * Site public d'une boutique. Le thème (palette + préréglage de polices)
 * vient de la base et s'applique ici, en variables CSS ; l'espace de gestion
 * s'habille du même thème (lib/shop/fonts.ts).
 */

/*
 * La boutique se présente à son nom, pas à celui d'Ominin : son logo tient
 * lieu d'icône d'onglet — sans quoi chaque boutique hérite de celle du
 * portail, seule icône posée à la racine de l'application — et son image de
 * partage accompagne le lien sur Instagram ou WhatsApp.
 *
 * Next fusionne les métadonnées champ par champ : déclarer `openGraph` ici
 * remplace entièrement celui du portail, il faut donc y remettre une image,
 * sinon le lien partagé n'en a aucune. Les chemins restent relatifs : le
 * proxy laisse passer les fichiers du dossier public tels quels, et Next les
 * résout contre metadataBase pour les balises de partage.
 */
export async function generateMetadata({ params }: LayoutProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) return { title: "Boutique introuvable" };
  // Le logo rond dépanne, mais une image dédiée au format paysage vaut mieux :
  // l'aperçu est affiché en large et rognerait dedans.
  const share = shop.share_image_url ?? shop.logo_url;
  const images = share ? [{ url: share, alt: shop.name }] : undefined;
  return {
    title: { default: shop.name, template: `%s · ${shop.name}` },
    description: shop.tagline ?? undefined,
    robots: { index: true, follow: true },
    icons: shop.logo_url
      ? { icon: shop.logo_url, shortcut: shop.logo_url, apple: shop.logo_url }
      : undefined,
    openGraph: {
      siteName: shop.name,
      title: shop.name,
      description: shop.tagline ?? undefined,
      locale: "fr_FR",
      type: "website",
      url: `${shopSiteUrl}/${slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: shop.name,
      description: shop.tagline ?? undefined,
      images: images?.map((image) => image.url),
    },
    appleWebApp: { capable: false },
  };
}

export default async function ShopLayout({ params, children }: LayoutProps<"/shop/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const theme = resolveTheme(shop.theme);
  const style = shopThemeStyle(theme.palette, theme.fonts);

  return (
    <div className={`shop-root flex min-h-dvh flex-col ${FONT_VARIABLES}`} style={style}>
      <ShopProvider value={{ slug: shop.slug, name: shop.name, catalogLabel: shop.catalog_label }}>
        <CartProvider slug={shop.slug}>
          <ShopToastProvider>
            <ShopHeader announcement={shop.announcement} />
            <main className="flex-1">{children}</main>
            <ShopFooter shop={shop} />
          </ShopToastProvider>
        </CartProvider>
      </ShopProvider>
    </div>
  );
}
