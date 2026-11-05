import { Lost } from "@/components/hotels/demo/ui";
import { demoNotFound } from "@/lib/hotels-demo-data";

export default function HotelsDemoGestionNotFound() {
  return <Lost copy={demoNotFound.gestion} inGestion />;
}
