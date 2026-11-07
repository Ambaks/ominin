import type { Metadata } from "next";
import { menuSiteUrl } from "@/lib/site";
import { faqSection, marquee, nav, seo } from "@/lib/menu-landing-data";
import { Mesh } from "@/components/gestion/ui";
import { KitFaq } from "@/components/landing-kit/faq";
import { kitFont } from "@/components/landing-kit/font";
import { Marquee } from "@/components/landing-kit/marquee";
import { KitNav } from "@/components/landing-kit/nav";
import "@/components/landing-kit/kit.css";
import "@/components/portal/portal.css";
import "@/components/menu-landing/menu-landing.css";
import { MenuAccompany } from "@/components/menu-landing/accompany";
import { MenuCompare } from "@/components/menu-landing/compare";
import { MenuConnect } from "@/components/menu-landing/connect";
import { MenuDemoBand } from "@/components/menu-landing/demo-band";
import { MenuFinalCta } from "@/components/menu-landing/final-cta";
import { MenuFooter } from "@/components/menu-landing/footer";
import { MenuHero } from "@/components/menu-landing/hero";
import { MenuProof } from "@/components/menu-landing/proof";
import { MenuStory } from "@/components/menu-landing/story";

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

/*
 * Landing Menu, sur le modèle du portail ominin.com (verre de gestion, hero
 * en éventail, rangée collée qui pilote un parcours) et avec le contenu de la
 * plaquette restaurant de l'espace commercial.
 */
export default function Home() {
  return (
    <div className={`kit-landing menu-landing g-titres ${kitFont.variable}`}>
      <Mesh />
      <div className="relative z-1">
        <KitNav
          glass
          linksFrom="lg"
          wordmark={
            <span className="font-display text-base font-semibold sm:text-lg">
              <span className="ember-text">Ominin</span> <span className="hidden text-muted min-[420px]:inline">{nav.wordmark}</span>
            </span>
          }
          links={nav.links}
          login={nav.login}
          cta={nav.cta}
        />
        <main className="overflow-x-clip">
          <MenuHero />
          <Marquee words={marquee} />
          <MenuStory />
          <MenuProof />
          <MenuAccompany />
          <MenuConnect />
          <MenuCompare />
          <MenuDemoBand />
          <KitFaq id={faqSection.id} eyebrow={faqSection.eyebrow} title={faqSection.title} items={faqSection.items} glass />
          <MenuFinalCta />
        </main>
        <MenuFooter />
      </div>
    </div>
  );
}
