import { oCroustiPouletBrand } from "@/components/pitch/brands/o-crousti-poulet";
import { PitchPage } from "@/components/pitch/page-sections";
import { oCroustiPoulet } from "@/lib/pitch/o-crousti-poulet";

/** Page privée du pitch au siège d'O'Crousti Poulet : le lien envoyé avec la présentation. */
export default function OCroustiPouletPitch() {
  return <PitchPage pitch={oCroustiPoulet} brand={oCroustiPouletBrand} />;
}
