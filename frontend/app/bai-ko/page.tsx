import { baiKoBrand } from "@/components/pitch/brands/bai-ko";
import { PitchPage } from "@/components/pitch/page-sections";
import { baiKo } from "@/lib/pitch/bai-ko";

/** Page privée du pitch à Baï-Kō : le lien laissé au gérant avec la présentation. */
export default function BaiKoPitch() {
  return <PitchPage pitch={baiKo} brand={baiKoBrand} />;
}
