import { redirect } from "next/navigation";

/*
 * Ancienne adresse unique : la connexion et l'inscription sont désormais deux
 * pages distinctes. Conservée pour les liens déjà diffusés (emails, formulaire
 * de contact), qui portaient le mode dans la query.
 */
export default async function LoginPage({
  searchParams,
}: PageProps<"/menu/login">) {
  const { plan, inscription } = await searchParams;
  const chosenPlan = typeof plan === "string" ? plan : undefined;
  if (chosenPlan) {
    redirect(`/inscription?plan=${encodeURIComponent(chosenPlan)}`);
  }
  redirect(inscription === "1" ? "/inscription" : "/connexion");
}
