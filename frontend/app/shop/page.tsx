import type { Metadata } from "next";
import { kitFont } from "@/components/landing-kit/font";
import "@/components/landing-kit/kit.css";
import { Marquee } from "@/components/landing-kit/marquee";
import { ShopHero } from "@/components/shop/landing/hero";
import { ShopJourney } from "@/components/shop/landing/journey";
import { ShopNav } from "@/components/shop/landing/nav";
import { ShopScreens } from "@/components/shop/landing/screens";
import {
  ShopAudiences,
  ShopContact,
  ShopFaq,
  ShopFooter,
  ShopPricing,
  ShopSetup,
  ShopShift,
  ShopShowcase,
} from "@/components/shop/landing/sections";
import { marquee, seo, shopBrand } from "@/lib/shop-landing-data";
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
 * Ordre pensé pour un trafic venu des réseaux : la promesse (hero animé), le
 * parcours d'une commande raconté au défilement, on se reconnaît (pour qui),
 * ce qui change, la vraie boutique à essayer, ses écrans, la mise en route,
 * le tarif, les objections, et la page se referme sur le formulaire.
 */
export default function ShopHome() {
  return (
    <div className={`kit-landing ${kitFont.variable}`}>
      <ShopNav />
      <main className="overflow-x-clip">
        <ShopHero />
        <Marquee words={marquee} />
        <ShopJourney />
        <ShopAudiences />
        <ShopShift />
        <ShopShowcase />
        <ShopScreens />
        <ShopSetup />
        <ShopPricing />
        <ShopFaq />
        <ShopContact />
      </main>
      <ShopFooter />
    </div>
  );
}
