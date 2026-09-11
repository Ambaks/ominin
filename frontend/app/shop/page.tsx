import type { Metadata } from "next";
import { ShopNav } from "@/components/shop/landing/nav";
import { ShopFaq, ShopFeatures, ShopFinalCta, ShopFooter, ShopHero, ShopHowItWorks, ShopPricing, ShopShowcase } from "@/components/shop/landing/sections";
import { seo, shopBrand } from "@/lib/shop-landing-data";
import { shopSiteUrl } from "@/lib/site";

// Canonical absolu : la page est servie sur shop.ominin.com et ominin.com/shop.
export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: shopSiteUrl },
  openGraph: { title: seo.title, description: seo.description, type: "website", siteName: shopBrand, locale: "fr_FR", url: shopSiteUrl, images: [{ url: "/shop/mybox/signature.webp", width: 720, height: 900, alt: shopBrand }] },
  twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: ["/shop/mybox/signature.webp"] },
};

export default function ShopHome() {
  return (
    <>
      <ShopNav />
      <main>
        <ShopHero />
        <ShopShowcase />
        <ShopHowItWorks />
        <ShopFeatures />
        <ShopPricing />
        <ShopFinalCta />
        <ShopFaq />
      </main>
      <ShopFooter />
    </>
  );
}
