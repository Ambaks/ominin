import type { Metadata, Viewport } from "next";
import { chickenStreetFonts } from "@/components/pitch/brands/chicken-street-fonts";
import "@/components/pitch/pitch.css";
import "@/components/pitch/brands/chicken-street.css";

/*
 * Le pitch au siège de Chicken Street : une page privée et sa présentation.
 * Liens envoyés à la main, jamais listés : ni index, ni suivi, absents du
 * sitemap comme du reste du site.
 */
export const metadata: Metadata = {
  title: "Chicken Street × Ominin",
  description: "La commande QR et l’estimateur IA pour tout le réseau Chicken Street.",
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Chicken Street × Ominin",
    description: "La commande QR et l’estimateur IA pour tout le réseau Chicken Street.",
    images: [{ url: "/pitch/chicken-street/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pitch pitch-chicken-street ${chickenStreetFonts} flex flex-1 flex-col`}>{children}</div>;
}
