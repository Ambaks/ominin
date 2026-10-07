import type { Metadata } from "next";
import { CollectComparison } from "@/components/collect/landing/comparison";
import "@/components/landing-kit/kit.css";
import { CollectDemoShowcase } from "@/components/collect/landing/demo-showcase";
import { CollectFaq } from "@/components/collect/landing/faq";
import { CollectFeatures } from "@/components/collect/landing/features";
import { CollectFinalCta } from "@/components/collect/landing/final-cta";
import { kitFont } from "@/components/landing-kit/font";
import { CollectFooter } from "@/components/collect/landing/footer";
import { CollectHero } from "@/components/collect/landing/hero";
import { CollectJourney } from "@/components/collect/landing/journey";
import { Marquee } from "@/components/landing-kit/marquee";
import { CollectNav } from "@/components/collect/landing/nav";
import { CollectPricing } from "@/components/collect/landing/pricing";
import { CollectUseCases } from "@/components/collect/landing/use-cases";
import { demoShowcaseOrder } from "@/lib/collect/demo/data";
import { collectBrand, marquee, seo } from "@/lib/collect-landing-data";
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
 * Ordre : la promesse (hero animé), à qui ça sert, le parcours raconté au
 * défilement, la démo pour le jouer, le comparatif pour le chiffrer, l'offre,
 * le tarif, les objections, puis l'appel.
 */
export default function CollectHome() {
  return (
    <div className={`kit-landing ${kitFont.variable}`}>
      <CollectNav />
      <main className="overflow-x-clip">
        <CollectHero />
        <Marquee words={marquee} />
        <CollectUseCases />
        <CollectJourney order={demoShowcaseOrder()} />
        <CollectDemoShowcase />
        <CollectComparison />
        <CollectFeatures />
        <CollectPricing />
        <CollectFaq />
        <CollectFinalCta />
      </main>
      <CollectFooter />
    </div>
  );
}
