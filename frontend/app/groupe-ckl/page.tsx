import { redirect } from "next/navigation";
import { presentationPath } from "@/lib/pitch/groupe-ckl";

/** Le pitch au Groupe CKL n'a pas de page à part : son adresse mène à la présentation. */
export default function GroupeCklPitch() {
  redirect(presentationPath);
}
