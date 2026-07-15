import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Connexion — Ominin",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { error, plan } = await searchParams;
  // Offre choisie sur la landing : si l'utilisateur n'a pas encore
  // d'établissement, l'onboarding la préremplit (sinon il est redirigé).
  const chosenPlan = typeof plan === "string" ? plan : undefined;
  const destination = chosenPlan
    ? `/onboarding?plan=${encodeURIComponent(chosenPlan)}`
    : "/gestion";

  return (
    <AuthForm
      brand={<span className="ember-text">Ominin</span>}
      destination={destination}
      initialMode={chosenPlan ? "signup" : "signin"}
      signinSubtitle="Accédez à votre espace de gestion."
      signupSubtitle="Gérez votre restaurant avec Ominin."
      authError={error === "auth"}
    />
  );
}
