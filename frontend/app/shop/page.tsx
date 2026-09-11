import type { Metadata } from "next";
import { ShopNav } from "@/components/shop/landing/nav";
import {
  ShopAudiences,
  ShopContact,
  ShopFaq,
  ShopFeatures,
  ShopFooter,
  ShopHero,
  ShopHowItWorks,
  ShopPricing,
  ShopShift,
  ShopShowcase,
} from "@/components/shop/landing/sections";
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

/*
 * Ordre pensé pour un trafic venu des réseaux : on se reconnaît (pour qui),
 * on voit ce qui change, on voit une vraie boutique, on comprend le
 * déroulé, puis le tarif, les objections, et la page se referme sur le
 * formulaire.
 */
export default function ShopHome() {
  return (
    <>
      <ShopNav />
      <main>
        <ShopHero />
        <ShopAudiences />
        <ShopShift />
        <ShopShowcase />
        <ShopHowItWorks />
        <ShopFeatures />
        <ShopPricing />
        <ShopFaq />
        <ShopContact />
      </main>
      <ShopFooter />
    </>
  );
}
