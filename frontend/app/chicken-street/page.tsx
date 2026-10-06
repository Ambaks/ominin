import { chickenStreetBrand } from "@/components/pitch/brands/chicken-street";
import { PitchPage } from "@/components/pitch/page-sections";
import { chickenStreet } from "@/lib/pitch/chicken-street";

/** Page privée du pitch au siège de Chicken Street : le lien envoyé avec la présentation. */
export default function ChickenStreetPitch() {
  return <PitchPage pitch={chickenStreet} brand={chickenStreetBrand} />;
}
