import type { Metadata, Viewport } from "next";
import { clubFonts } from "@/components/pitch/brands/club-fonts";
import "@/components/pitch/pitch.css";
import "@/components/pitch/brands/club.css";

/*
 * Le pitch aux clubs et discothèques : une page et son film. Comme les autres
 * pitchs, un lien envoyé à la main, jamais listé : ni index, ni suivi,
 * absent du sitemap comme du reste du site.
 */
const title = "Ominin pour les clubs";
const description = "Vos clients commandent depuis la piste, sont prévenus quand c’est prêt et récupèrent au bar sans faire la queue.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title,
    description,
    images: [{ url: "/pitch/club/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#060609",
};

export default function ClubPitchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pitch pitch-club ${clubFonts} flex flex-1 flex-col`}>{children}</div>;
}
