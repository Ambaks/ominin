import type { Metadata } from "next";
import { Planning } from "@/components/hotels/demo/gestion/planning";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("/planning") };

export default function HotelsDemoGestionPlanning() {
  return <Planning />;
}
