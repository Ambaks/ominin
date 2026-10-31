import type { Metadata } from "next";
import { GestionShell } from "@/components/gestion/shell";
import { kitFont } from "@/components/landing-kit/font";
import { gestionLogos } from "@/lib/menu-data";

export const metadata: Metadata = {
  title: "Espace de gestion — Ominin",
  robots: { index: false, follow: false },
};

export default function GestionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`g-titres contents ${kitFont.variable}`}>
      <GestionShell logos={gestionLogos()}>{children}</GestionShell>
    </div>
  );
}
