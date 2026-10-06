import type { Metadata, Viewport } from "next";
import { oCroustiPouletFonts } from "@/components/pitch/brands/o-crousti-poulet-fonts";
import "@/components/pitch/pitch.css";
import "@/components/pitch/brands/o-crousti-poulet.css";

/*
 * Le pitch au siège d'O'Crousti Poulet Original : une page privée et sa
 * présentation. Liens envoyés à la main, jamais listés : ni index, ni suivi,
 * absents du sitemap comme du reste du site.
 */
export const metadata: Metadata = {
  title: "O’Crousti Poulet × Ominin",
  description: "La commande mobile pour tout le réseau O’Crousti Poulet.",
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "O’Crousti Poulet × Ominin",
    description: "La commande mobile pour tout le réseau O’Crousti Poulet.",
    images: [{ url: "/pitch/o-crousti-poulet/film-poster.webp", width: 1920, height: 1080 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#131416",
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pitch pitch-o-crousti-poulet ${oCroustiPouletFonts} flex flex-1 flex-col`}>{children}</div>;
}
