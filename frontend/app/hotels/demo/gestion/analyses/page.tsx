import type { Metadata } from "next";
import { Analyses } from "@/components/hotels/demo/gestion/analyses";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("/analyses") };

export default function HotelsDemoGestionAnalyses() {
  return <Analyses />;
}
