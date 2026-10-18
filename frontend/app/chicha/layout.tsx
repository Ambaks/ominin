import type { Metadata, Viewport } from "next";
import { chichaFonts } from "@/components/pitch/brands/chicha-fonts";
import { chicha } from "@/lib/pitch/chicha";
import "@/components/pitch/pitch.css";
import "@/components/pitch/brands/chicha.css";

/*
 * Le pitch aux restaurants-chicha. Comme les autres pitchs, un lien envoyé
 * à la main, jamais listé : ni index, ni suivi, absent du sitemap comme du
 * reste du site.
 */
const { title, description } = chicha.meta;

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title,
    description,
    images: [{ url: "/pitch/chicha/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0806",
};

export default function ChichaPitchLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pitch pitch-chicha ${chichaFonts} flex flex-1 flex-col`}>{children}</div>;
}
