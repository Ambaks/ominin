import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitPreview } from "./kit-preview";

export const metadata: Metadata = {
  title: "Kit ember glass — Ominin",
  robots: { index: false, follow: false },
};

/*
 * Vitrine du kit Gestion v2 (components/gestion/ui), hors de l'espace de
 * gestion : ni session ni store, pour juger la matière sans se connecter.
 * Développement seulement.
 */
export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitPreview />;
}
