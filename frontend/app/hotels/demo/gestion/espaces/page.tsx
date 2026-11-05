import type { Metadata } from "next";
import { Espaces } from "@/components/hotels/demo/gestion/espaces";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("/espaces") };

export default function HotelsDemoGestionEspaces() {
  return <Espaces />;
}
