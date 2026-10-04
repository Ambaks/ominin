import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { PAGE_META, makeFmt } from "@/lib/report/copy";
import { report } from "@/lib/report/data";
import "./report.css";

/*
 * Résultats terrain d'un établissement client, anonymisés, en accès libre :
 * lien court partagé à la main, indexable, absent du sitemap. Le texte est
 * bilingue (lib/report/copy.ts), le rendu serveur en anglais.
 */
const frauncesItalic = Fraunces({
  variable: "--font-report-italic",
  subsets: ["latin"],
  style: "italic",
  axes: ["opsz"],
});

const { title } = PAGE_META;
const description = PAGE_META.description(report, makeFmt("en"));

// openGraph et twitter remplacent ceux du layout racine en bloc : image, nom du
// site et type sont redonnés, sans quoi un lien partagé perd son aperçu.
const images = [{ url: "/logo.png", width: 512, height: 512, alt: "Ominin" }];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/r7k2" },
  openGraph: { type: "website", siteName: "Ominin", url: "/r7k2", title, description, locale: "en_GB", alternateLocale: ["fr_FR"], images },
  twitter: { card: "summary_large_image", title, description, images: ["/logo.png"] },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${frauncesItalic.variable} flex flex-1 flex-col`}>{children}</div>;
}
