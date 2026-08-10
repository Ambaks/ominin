import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { ClipWordmark } from "@/components/clip/wordmark";

export const metadata: Metadata = {
  title: "Connexion — Ominin Clip",
  robots: { index: false, follow: false },
};

export default async function ClipConnexionPage({
  searchParams,
}: PageProps<"/clip/connexion">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<ClipWordmark className="text-2xl" />}
      space="Espace clippers"
      destination="/espace"
      mode="signin"
      otherHref="/inscription"
      subtitle="Accédez à votre espace Ominin Clip."
      authError={error === "auth"}
    />
  );
}
