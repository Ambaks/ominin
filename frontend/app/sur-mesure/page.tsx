import type { Metadata } from "next";
import { PortalFooter } from "@/components/portal/footer";
import { PortalNav } from "@/components/portal/nav";
import { SurMesure } from "@/components/portal/sur-mesure";
import { LanguageProvider } from "@/lib/portal/language";
import { surMesure } from "@/lib/portal-data";
import { siteUrl } from "@/lib/site";

const url = `${siteUrl}/sur-mesure`;

export const metadata: Metadata = {
  title: surMesure.seo.title,
  description: surMesure.seo.description,
  alternates: { canonical: url },
  openGraph: {
    title: surMesure.seo.title,
    description: surMesure.seo.description,
    type: "website",
    siteName: "Ominin",
    locale: "fr_FR",
    url,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Ominin" }],
  },
};

export default function SurMesurePage() {
  return (
    <LanguageProvider>
      <PortalNav />
      <SurMesure />
      <PortalFooter />
    </LanguageProvider>
  );
}
