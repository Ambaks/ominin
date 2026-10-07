import type { Metadata } from "next";
import { marquee, seo } from "@/lib/landing-data";
import { menuSiteUrl } from "@/lib/site";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FastFood } from "@/components/landing/fast-food";
import { QrShowcase } from "@/components/landing/qr-showcase";
import { Features } from "@/components/landing/features";
import { DemoShowcase } from "@/components/landing/demo-showcase";
import { Proof } from "@/components/landing/proof";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Install } from "@/components/landing/install";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { kitFont } from "@/components/landing-kit/font";
import "@/components/landing-kit/kit.css";
import { Marquee } from "@/components/landing-kit/marquee";

// Canonical absolu : la réécriture du proxy rend cette page accessible à la
// fois sur menu.ominin.com et ominin.com/menu — une seule URL fait foi.
export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: menuSiteUrl },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    siteName: "Ominin",
    locale: "fr_FR",
    url: menuSiteUrl,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Ominin" }],
  },
};

export default function Home() {
  return (
    <div className={`kit-landing ${kitFont.variable}`}>
      <LandingNav />
      <main className="overflow-x-clip">
        <Hero />
        <Marquee words={marquee} />
        <HowItWorks />
        <FastFood />
        <QrShowcase />
        <Features />
        <DemoShowcase />
        <Install />
        <Pricing />
        <Proof />
        <Testimonials />
        <FinalCta />
        <Faq />
      </main>
      <LandingFooter />
    </div>
  );
}
