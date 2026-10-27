import type { Metadata, Viewport } from "next";
import { archivo } from "@/lib/fonts";
import { description, indexable, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: "Aérogommage à Toulouse et en Occitanie — FLG Aérogommage",
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
