import type { Metadata } from "next";
import { Equipe } from "@/components/hotels/demo/gestion/equipe";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("/equipe") };

export default function HotelsDemoGestionEquipe() {
  return <Equipe />;
}
