import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GestionShell } from "@/components/hotels/demo/gestion/shell";
import { DemoProvider } from "@/components/hotels/demo/store";
import { gestion } from "@/lib/hotels-demo-data";

/*
 * La gestion de l'hôtel de la démo : ce que voient la direction et l'équipe
 * quand un client scanne un QR du Grand Large. Même état que les pages client,
 * dans le même navigateur ; jamais indexée.
 */

export const metadata: Metadata = {
  title: gestion.seo.title,
  description: gestion.seo.description,
  robots: { index: false, follow: false },
};

export default function HotelsDemoGestionLayout({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      <GestionShell>{children}</GestionShell>
    </DemoProvider>
  );
}
