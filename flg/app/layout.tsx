import type { Metadata, Viewport } from "next";
import { archivo } from "@/lib/fonts";
import { indexable } from "@/lib/site";
import "./globals.css";

const description =
  "Aérogommage de charpentes, plafonds, façades, escaliers, poutres et sols à Toulouse, Montauban, Albi, Carcassonne et Auch. Décapage à sec, basse pression, sans produit chimique. Devis gratuit.";

export const metadata: Metadata = {
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  title: "FLG Aérogommage — Décapage de charpentes, plafonds et façades en Occitanie",
  description,
  alternates: { canonical: "/" },
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "FLG Aérogommage",
    title: "FLG Aérogommage — La matière, révélée.",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0e0c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
