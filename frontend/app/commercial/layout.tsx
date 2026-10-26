import type { Metadata } from "next";
import { commercialPrefix } from "@/lib/site";

export const metadata: Metadata = {
  title: "Espace commercial — Ominin",
  robots: { index: false, follow: false },
  // Installable à part de la gestion (route app/manifest.webmanifest).
  manifest: commercialPrefix ? "/manifest.webmanifest?app=commercial" : "/manifest.webmanifest",
};

export default function CommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
