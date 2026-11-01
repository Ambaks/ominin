import type { Metadata } from "next";
import { kitFont } from "@/components/landing-kit/font";
import "@/components/landing-kit/kit.css";
import { PortalFinalCta } from "@/components/portal/final-cta";
import { PortalFooter } from "@/components/portal/footer";
import { PortalHero } from "@/components/portal/hero";
import { PortalMarquee } from "@/components/portal/marquee";
import { PortalNav } from "@/components/portal/nav";
import { PortalProducts } from "@/components/portal/products";
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
 * Portail ominin.com, sur le kit des landings produit : ce que fait
 * l'entreprise, puis un cube par produit vers son sous-domaine. Le contenu est bilingue et la langue est un état client,
 * d'où le provider ici — les sections sont donc des composants client, à la
 * différence des landings produits qui sont entièrement serveur.
 */
export default function Portal() {
  return (
    <LanguageProvider>
      <div className={`kit-landing ${kitFont.variable}`}>
        <PortalNav />
        <main className="overflow-x-clip">
          <PortalHero />
          <PortalMarquee />
          <PortalProducts />
          <PortalFinalCta />
        </main>
        <PortalFooter />
      </div>
    </LanguageProvider>
  );
}
