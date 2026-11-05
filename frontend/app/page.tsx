import type { Metadata } from "next";
import { Mesh } from "@/components/gestion/ui";
import { kitFont } from "@/components/landing-kit/font";
import "@/components/landing-kit/kit.css";
import "@/components/portal/portal.css";
import { PortalFinalCta } from "@/components/portal/final-cta";
import { PortalFooter } from "@/components/portal/footer";
import { PortalHero } from "@/components/portal/hero";
import { PortalMarquee } from "@/components/portal/marquee";
import { PortalNav } from "@/components/portal/nav";
import { PortalProducts } from "@/components/portal/products";
import { PortalWhy } from "@/components/portal/why";
import { LanguageProvider } from "@/lib/portal/language";
import { seo } from "@/lib/portal-data";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: siteUrl },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    siteName: "Ominin",
    locale: "fr_FR",
    url: siteUrl,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Ominin" }],
  },
};

/*
 * Portail ominin.com, sur le kit des landings produit posé sur le verre de
 * gestion (Mesh, .g-glass) : le message, puis une rangée de produits dont
 * chacun se raconte en quelques écrans avant d'envoyer vers son
 * sous-domaine. Le contenu est bilingue et la langue est un état client,
 * d'où le provider ici — les sections sont donc des composants client, à la
 * différence des landings produits qui sont entièrement serveur.
 */
export default function Portal() {
  return (
    <LanguageProvider>
      <div className={`kit-landing g-titres ${kitFont.variable}`}>
        <Mesh />
        <div className="relative z-1">
          <PortalNav />
          <main className="overflow-x-clip">
            <PortalHero />
            <PortalMarquee />
            <PortalProducts />
            <PortalWhy />
            <PortalFinalCta />
          </main>
          <PortalFooter />
        </div>
      </div>
    </LanguageProvider>
  );
}
