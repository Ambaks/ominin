import type { Metadata } from "next";
import { Service } from "@/components/hotels/demo/gestion/service";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("/service") };

export default function HotelsDemoGestionService() {
  return <Service />;
}
