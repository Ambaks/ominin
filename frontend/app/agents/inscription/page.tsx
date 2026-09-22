import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AgentsWordmark } from "@/components/agents/wordmark";

export const metadata: Metadata = {
  title: "Créer un compte — Ominin Agents",
  robots: { index: false, follow: false },
};

export default async function AgentsInscriptionPage({
  searchParams,
}: PageProps<"/agents/inscription">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<AgentsWordmark className="text-2xl" />}
      space="Espace agents"
      destination="/espace"
      mode="signup"
      otherHref="/connexion"
      subtitle="Un agent qui prospecte pour votre entreprise."
      signUpData={{ product: "agents" }}
      authError={error === "auth"}
    />
  );
}
