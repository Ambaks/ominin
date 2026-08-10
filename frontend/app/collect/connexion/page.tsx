import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Connexion — Ominin Collect",
  robots: { index: false, follow: false },
};

/*
 * Connexion du sous-domaine click & collect. La session reste attachée à cet
 * hôte : la destination est relative, et l'espace de gestion est servi ici
 * même (voir la réécriture du proxy).
 */
export default async function CollectConnexionPage({
  searchParams,
}: PageProps<"/collect/connexion">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<Wordmark suffix="Collect" className="text-2xl" />}
      space="Espace restaurants"
      destination="/gestion"
      mode="signin"
      otherHref="/inscription"
      subtitle="Vos commandes à emporter vous attendent dans votre espace de gestion."
      authError={error === "auth"}
    />
  );
}
