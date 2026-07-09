import type { Metadata } from "next";
import { seo } from "@/lib/landing-data";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { QrShowcase } from "@/components/landing/qr-showcase";
import { Features } from "@/components/landing/features";
import { DemoShowcase } from "@/components/landing/demo-showcase";
import { Proof } from "@/components/landing/proof";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    siteName: "Ominin",
    locale: "fr_FR",
    url: "/",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Ominin" }],
  },
};

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <QrShowcase />
        <Features />
        <DemoShowcase />
        <Proof />
        <Testimonials />
        <Pricing />
        <FinalCta />
        <Faq />
      </main>
      <LandingFooter />
    </>
  );
}
