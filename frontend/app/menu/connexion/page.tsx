import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Connexion — Ominin",
  robots: { index: false, follow: false },
};

export default async function ConnexionPage({
  searchParams,
}: PageProps<"/menu/connexion">) {
  const { error, next } = await searchParams;
  // Retour à la page de l'espace qui a demandé la connexion (un code de
  // retrait scanné) ; un chemin d'ailleurs, ou qui s'en échappe, ne compte pas.
  const destination =
    typeof next === "string" && /^\/gestion(\/[\w-]+)*$/.test(next) ? next : "/gestion";
  return (
    <AuthForm
      brand={<Wordmark className="text-2xl" />}
      space="Espace restaurants"
      destination={destination}
      mode="signin"
      otherHref="/inscription"
      subtitle="Accédez à votre espace de gestion."
      authError={error === "auth"}
    />
  );
}
