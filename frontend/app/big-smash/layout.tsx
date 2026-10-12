import type { Metadata, Viewport } from "next";
import { bigSmashFonts } from "@/components/pitch/brands/big-smash-fonts";
import "@/components/pitch/pitch.css";
import "@/components/pitch/brands/big-smash.css";

/*
 * Le pitch au siège de Big Smash : une page privée et sa présentation. Liens
 * envoyés à la main, jamais listés : ni index, ni suivi, absents du sitemap
 * comme du reste du site.
 */
export const metadata: Metadata = {
  title: "Big Smash × Ominin",
  description: "La commande QR pour tout le réseau Big Smash.",
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Big Smash × Ominin",
    description: "La commande QR pour tout le réseau Big Smash.",
    // La couverture de la présentation : l'affiche du film ouvrait l'aperçu sur « la file s'allonge ».
    images: [{ url: "/pitch/big-smash/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#121212",
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pitch pitch-big-smash ${bigSmashFonts} flex flex-1 flex-col`}>{children}</div>;
}
