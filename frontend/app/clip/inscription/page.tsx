import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { ClipWordmark } from "@/components/clip/wordmark";

export const metadata: Metadata = {
  title: "Créer un compte — Ominin Clip",
  robots: { index: false, follow: false },
};

export default async function ClipInscriptionPage({
  searchParams,
}: PageProps<"/clip/inscription">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<ClipWordmark className="text-2xl" />}
      space="Espace clippers"
      destination="/espace"
      mode="signup"
      otherHref="/connexion"
      subtitle="Vos clips, publiés partout, automatiquement."
      signUpData={{ product: "clip" }}
      authError={error === "auth"}
    />
  );
}
