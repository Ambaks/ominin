import type { Metadata } from "next";
import { CollectComparison } from "@/components/collect/landing/comparison";
import { CollectDemoShowcase } from "@/components/collect/landing/demo-showcase";
import { CollectFaq } from "@/components/collect/landing/faq";
import { CollectFeatures } from "@/components/collect/landing/features";
import { CollectFinalCta } from "@/components/collect/landing/final-cta";
import { CollectFooter } from "@/components/collect/landing/footer";
import { CollectHero } from "@/components/collect/landing/hero";
import { CollectHowItWorks } from "@/components/collect/landing/how-it-works";
import { CollectModes } from "@/components/collect/landing/modes";
import { CollectNav } from "@/components/collect/landing/nav";
import { CollectPricing } from "@/components/collect/landing/pricing";
import { CollectUseCases } from "@/components/collect/landing/use-cases";
import { collectBrand, seo } from "@/lib/collect-landing-data";
import { collectSiteUrl } from "@/lib/site";

// Canonical absolu : la réécriture du proxy rend cette page accessible à la
// fois sur collect.ominin.com et ominin.com/collect — une seule URL fait foi.
export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: collectSiteUrl },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    siteName: collectBrand,
    locale: "fr_FR",
    url: collectSiteUrl,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: collectBrand }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: ["/logo.png"],
  },
};

/*
 * Ordre : le besoin d'abord (à qui ça sert, ce que comprend l'offre), la
 * démo pour le voir, le comparatif pour le chiffrer, puis le déroulé, les
 * fonctionnalités, le tarif, l'appel et les objections.
 */
export default function CollectHome() {
  return (
    <>
      <CollectNav />
      <main>
        <CollectHero />
        <CollectUseCases />
        <CollectModes />
        <CollectDemoShowcase />
        <CollectComparison />
        <CollectHowItWorks />
        <CollectFeatures />
        <CollectPricing />
        <CollectFinalCta />
        <CollectFaq />
      </main>
      <CollectFooter />
    </>
  );
}
