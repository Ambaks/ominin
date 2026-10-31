import type { Metadata } from "next";
import { GestionShell } from "@/components/gestion/shell";
import { gestionLogos } from "@/lib/menu-data";

export const metadata: Metadata = {
  title: "Espace de gestion — Ominin",
  robots: { index: false, follow: false },
};

export default function GestionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <GestionShell logos={gestionLogos()}>{children}</GestionShell>;
}
