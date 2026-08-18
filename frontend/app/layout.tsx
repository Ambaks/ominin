import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { seo } from "@/lib/portal-data";
import { siteUrl } from "@/lib/site";
import { Providers } from "./providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

// Défauts hérités par toutes les pages (title/description/OG/Twitter) sauf
// override explicite : ceux du portail, la racine du domaine principal. Chaque
// landing produit pose les siens. metadataBase résout les URLs relatives des
// images OG.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seo.title,
  description: seo.description,
  applicationName: "Ominin",
  openGraph: {
    type: "website",
    siteName: "Ominin",
    locale: "fr_FR",
    url: siteUrl,
    title: seo.title,
    description: seo.description,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Ominin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0c0a08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${instrumentSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Thème partagé entre produits : le cookie .ominin.com (posé par
            ThemeCookieSync) est recopié dans le localStorage AVANT le script
            de next-themes, qui applique donc le choix fait sur n'importe quel
            sous-domaine. Le menu QR garde sa clé dédiée, non concernée. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var m=document.cookie.match(/(?:^|; )ominin-theme=(light|dark)/);if(m)localStorage.setItem("theme",m[1])}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
