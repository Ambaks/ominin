import type { Metadata } from "next";
import { Chambres } from "@/components/hotels/demo/gestion/chambres";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("/chambres") };

export default function HotelsDemoGestionChambres() {
  return <Chambres />;
}
