import type { Metadata } from "next";
import { GestionShell } from "@/components/gestion/shell";

export const metadata: Metadata = {
  title: "Espace de gestion — Ominin",
  robots: { index: false, follow: false },
};

export default function GestionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <GestionShell>{children}</GestionShell>;
}
