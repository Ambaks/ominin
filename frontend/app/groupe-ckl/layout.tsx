import type { Metadata, Viewport } from "next";
import "@/components/pitch/pitch.css";

/*
 * La présentation au Groupe CKL : un lien envoyé à la main, jamais listé —
 * ni index, ni suivi, absente du sitemap comme du reste du site.
 */
const description = "La commande et le paiement à table, le ticket au bar et en cuisine, et vos quatre établissements en direct sur un seul écran.";

export const metadata: Metadata = {
  title: "Groupe CKL × Ominin",
  description,
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Groupe CKL × Ominin",
    description,
    images: [{ url: "/pitch/groupe-ckl/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#070605",
};

export default function GroupeCklLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
