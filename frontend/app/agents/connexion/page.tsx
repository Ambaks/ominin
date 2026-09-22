import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AgentsWordmark } from "@/components/agents/wordmark";

export const metadata: Metadata = {
  title: "Connexion — Ominin Agents",
  robots: { index: false, follow: false },
};

export default async function AgentsConnexionPage({
  searchParams,
}: PageProps<"/agents/connexion">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<AgentsWordmark className="text-2xl" />}
      space="Espace agents"
      destination="/espace"
      mode="signin"
      otherHref="/inscription"
      subtitle="Accédez à votre agent Ominin."
      authError={error === "auth"}
    />
  );
}
