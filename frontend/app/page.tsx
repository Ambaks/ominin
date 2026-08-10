import type { Metadata } from "next";
import { PortalFooter } from "@/components/portal/footer";
import { PortalHero } from "@/components/portal/hero";
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
 * Portail ominin.com : ce que fait l'entreprise, puis un cube par produit vers
 * son sous-domaine. Le contenu est bilingue et la langue est un état client,
 * d'où le provider ici — les sections sont donc des composants client, à la
 * différence des landings produits qui sont entièrement serveur.
 */
export default function Portal() {
  return (
    <LanguageProvider>
      <PortalNav />
      <main>
        <PortalHero />
        <PortalProducts />
      </main>
      <PortalFooter />
    </LanguageProvider>
  );
}
