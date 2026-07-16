import type { Metadata } from "next";
import { clipBrand, seo } from "@/lib/clip-landing-data";
import { clipSiteUrl } from "@/lib/site";
import { ClipNav } from "@/components/clip/nav";
import { ClipHero } from "@/components/clip/hero";
import { ClipDemoShowcase } from "@/components/clip/demo-showcase";
import { ClipHowItWorks } from "@/components/clip/how-it-works";
import { ClipFeatures } from "@/components/clip/features";
import { ClipScale } from "@/components/clip/scale";
import { ClipPricing } from "@/components/clip/pricing";
import { ClipFinalCta } from "@/components/clip/final-cta";
import { ClipFaq } from "@/components/clip/faq";
import { ClipFooter } from "@/components/clip/footer";

// Canonical absolu : la réécriture du proxy rend cette page accessible à la
// fois sur clip.ominin.com et ominin.com/clip — une seule URL fait foi.
export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: clipSiteUrl },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    siteName: clipBrand,
    locale: "fr_FR",
    url: clipSiteUrl,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: clipBrand }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: ["/logo.png"],
  },
};

export default function ClipHome() {
  return (
    <>
      <ClipNav />
      <main>
        <ClipHero />
        <ClipDemoShowcase />
        <ClipHowItWorks />
        <ClipFeatures />
        <ClipScale />
        <ClipPricing />
        <ClipFinalCta />
        <ClipFaq />
      </main>
      <ClipFooter />
    </>
  );
}
