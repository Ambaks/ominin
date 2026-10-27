import type { Metadata, Viewport } from "next";
import { CyprienFooter } from "@/components/sites/cyprien/footer";
import { CyprienHeader } from "@/components/sites/cyprien/header";
import { SiteMotion } from "@/components/sites/motion";
import { cyprienFontVariables } from "@/lib/menu/brand-fonts";
import { ogImage, photos } from "@/lib/sites/cyprien";
import "./cyprien.css";

const description =
  "Boulangerie et pâtisserie 100 % artisanale à Toulouse, quartier Saint-Cyprien : pain au levain bio, viennoiseries au beurre AOP, pâtisserie fine. Commande en ligne et retrait en boutique.";

/*
 * Aperçu tant que le domaine de la boulangerie ne pointe pas ici : ni index,
 * ni suivi des liens.
 */
export const metadata: Metadata = {
  title: {
    default: "Boulangerie Cyprien · Boulangerie-pâtisserie artisanale à Toulouse",
    template: "%s · Boulangerie Cyprien",
  },
  description,
  applicationName: "Boulangerie Cyprien",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Boulangerie Cyprien",
    locale: "fr_FR",
    title: "Boulangerie Cyprien, Toulouse",
    description,
    images: [ogImage(photos.croissantsFour)],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f7f2ea",
  colorScheme: "light",
};

export default function CyprienLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`cy-site ${cyprienFontVariables}`}>
      <a href="#contenu" className="cy-skip">
        Aller au contenu
      </a>
      <CyprienHeader />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <CyprienFooter />
      <SiteMotion root=".cy-site" />
    </div>
  );
}
