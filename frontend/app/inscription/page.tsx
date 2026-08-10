import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Créer un compte — Ominin",
  robots: { index: false, follow: false },
};

export default async function InscriptionPage({
  searchParams,
}: PageProps<"/inscription">) {
  const { error, plan } = await searchParams;
  // Offre choisie sur la landing : l'onboarding la préremplit.
  const chosenPlan = typeof plan === "string" ? plan : undefined;
  return (
    <AuthForm
      brand={<Wordmark className="text-2xl" />}
      space="Espace restaurants"
      destination={
        chosenPlan
          ? `/onboarding?plan=${encodeURIComponent(chosenPlan)}`
          : "/onboarding"
      }
      mode="signup"
      otherHref="/connexion"
      subtitle="Gérez votre restaurant avec Ominin."
      authError={error === "auth"}
    />
  );
}
