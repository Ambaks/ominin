import type { Metadata } from "next";
import { GestionShell } from "@/components/gestion/shell";
import { kitFont } from "@/components/landing-kit/font";

export const metadata: Metadata = {
  title: "Espace de gestion — Ominin",
  robots: { index: false, follow: false },
};

export default function GestionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`g-titres contents ${kitFont.variable}`}>
      <GestionShell>{children}</GestionShell>
    </div>
  );
}
