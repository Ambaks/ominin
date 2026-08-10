import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";
import { collectProduct } from "@/lib/products";

export const metadata: Metadata = {
  title: "Connexion — Ominin",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { error, plan, produit } = await searchParams;
  // Offre choisie sur la landing : si l'utilisateur n'a pas encore
  // d'établissement, l'onboarding la préremplit (sinon il est redirigé).
  const chosenPlan = typeof plan === "string" ? plan : undefined;
  const destination = chosenPlan
    ? `/onboarding?plan=${encodeURIComponent(chosenPlan)}`
    : "/gestion";
  // Arrivée depuis la landing click & collect : le produit n'a pas d'espace
  // propre (il se pilote depuis la gestion), mais on le nomme pour que le
  // visiteur reconnaisse le produit qu'il vient de choisir.
  const fromCollect = produit === collectProduct.id;

  return (
    <AuthForm
      brand={<Wordmark suffix={fromCollect ? "Collect" : undefined} className="text-2xl" />}
      space="Espace restaurants"
      destination={destination}
      initialMode={chosenPlan ? "signup" : "signin"}
      signinSubtitle={
        fromCollect
          ? "Le click & collect se pilote depuis votre espace de gestion."
          : "Accédez à votre espace de gestion."
      }
      signupSubtitle={
        fromCollect
          ? "Votre page de commande à emporter, à votre nom."
          : "Gérez votre restaurant avec Ominin."
      }
      authError={error === "auth"}
    />
  );
}
