import { bigSmashBrand } from "@/components/pitch/brands/big-smash";
import { PitchPage } from "@/components/pitch/page-sections";
import { bigSmash } from "@/lib/pitch/big-smash";

/** Page privée du pitch au siège de Big Smash : le lien envoyé avec la présentation. */
export default function BigSmashPitch() {
  return <PitchPage pitch={bigSmash} brand={bigSmashBrand} />;
}
