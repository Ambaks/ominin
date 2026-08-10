import { redirect } from "next/navigation";

/** Ancienne adresse du sous-domaine clippers : chemins relatifs à cet hôte. */
export default async function ClipLoginPage({
  searchParams,
}: PageProps<"/clip/login">) {
  const { inscription } = await searchParams;
  redirect(inscription === "1" ? "/inscription" : "/connexion");
}
