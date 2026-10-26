import { redirect } from "next/navigation";
import { commercialPrefix } from "@/lib/site";

/** L'espace n'a pas de page d'accueil publique : on n'y entre que sur invitation. */
export default function CommercialIndex() {
  redirect(`${commercialPrefix}/espace`);
}
