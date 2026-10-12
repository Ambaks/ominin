import type { Metadata, Viewport } from "next";
import { baiKoFonts } from "@/components/pitch/brands/bai-ko-fonts";
import "@/components/pitch/pitch.css";
import "@/components/pitch/brands/bai-ko.css";

/*
 * Le pitch à Baï-Kō : une page privée et sa présentation. Liens envoyés à la
 * main, jamais listés : ni index, ni suivi, absents du sitemap comme du reste
 * du site.
 */
export const metadata: Metadata = {
  title: "Baï-Kō × Ominin",
  description: "La commande et le paiement à table, et la vente à emporter en direct, pour Baï-Kō.",
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Baï-Kō × Ominin",
    description: "La commande et le paiement à table, et la vente à emporter en direct, pour Baï-Kō.",
    images: [{ url: "/pitch/bai-ko/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pitch pitch-bai-ko ${baiKoFonts} flex flex-1 flex-col`}>{children}</div>;
}
