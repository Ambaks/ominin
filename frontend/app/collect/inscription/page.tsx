import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";
import { collectOffer, pricingSection } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: "Créer un compte — Ominin Collect",
  robots: { index: false, follow: false },
};

export default async function CollectInscriptionPage({
  searchParams,
}: PageProps<"/collect/inscription">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<Wordmark suffix="Collect" className="text-2xl" />}
      space="Espace restaurants"
      destination="/inscription/etablissement"
      mode="signup"
      otherHref="/connexion"
      subtitle={`Votre page de commande à emporter, à votre nom — ${collectOffer.price} €${pricingSection.perMonth}.`}
      authError={error === "auth"}
    />
  );
}
