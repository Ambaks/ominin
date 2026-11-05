import type { Metadata } from "next";
import { Apercu } from "@/components/hotels/demo/gestion/apercu";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("") };

export default function HotelsDemoGestion() {
  return <Apercu />;
}
