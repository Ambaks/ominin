import type { Metadata } from "next";
import { DemoBanner } from "@/components/clip/demo-banner";
import { ClipShell } from "@/components/clip/espace/shell";
import { DemoClipProvider } from "@/lib/clip/demo/provider";

export const metadata: Metadata = {
  title: "Démo — Ominin Clip",
  robots: { index: false, follow: false },
};

/*
 * Démo publique de l'espace clipper : les pages réelles de /espace rendues
 * au-dessus du fournisseur en mémoire (données fictives, aucune clé d'API,
 * aucune authentification). Le layout persiste entre les onglets : l'état de
 * la démo survit à la navigation interne.
 */
export default function ClipDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoClipProvider>
      <DemoBanner />
      <ClipShell>{children}</ClipShell>
    </DemoClipProvider>
  );
}
