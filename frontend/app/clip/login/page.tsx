import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { ClipWordmark } from "@/components/clip/wordmark";

export const metadata: Metadata = {
  title: "Connexion — Ominin Clip",
  robots: { index: false, follow: false },
};

export default async function ClipLoginPage({
  searchParams,
}: PageProps<"/clip/login">) {
  const { error, inscription } = await searchParams;
  return (
    <AuthForm
      brand={<ClipWordmark className="text-2xl" />}
      destination="/espace"
      // Les CTA de conversion de la landing arrivent avec ?inscription=1.
      initialMode={inscription === "1" ? "signup" : "signin"}
      signinSubtitle="Accédez à votre espace Ominin Clip."
      signupSubtitle="Vos clips, publiés partout, automatiquement."
      signUpData={{ product: "clip" }}
      authError={error === "auth"}
    />
  );
}
