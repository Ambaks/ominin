import type { Metadata } from "next";
import { Notes } from "@/components/hotels/demo/gestion/notes";
import { gestionPageTitle } from "@/lib/hotels-demo-data";

export const metadata: Metadata = { title: gestionPageTitle("/notes") };

export default function HotelsDemoGestionNotes() {
  return <Notes />;
}
