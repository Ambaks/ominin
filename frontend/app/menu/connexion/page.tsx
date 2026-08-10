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
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<Wordmark className="text-2xl" />}
      space="Espace restaurants"
      destination="/gestion"
      mode="signin"
      otherHref="/inscription"
      subtitle="Accédez à votre espace de gestion."
      authError={error === "auth"}
    />
  );
}
