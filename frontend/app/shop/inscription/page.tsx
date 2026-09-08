import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = { title: "Créer ma boutique — Ominin Shop", robots: { index: false, follow: false } };

/*
 * Inscription d'une future gérante de boutique : formulaire partagé
 * (e-mail + mot de passe ou Google), puis création de la boutique. Une
 * gérante sans e-mail est créée par Ominin avec son numéro de téléphone.
 */
export default async function ShopInscriptionPage({ searchParams }: PageProps<"/shop/inscription">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<Wordmark suffix="Shop" className="text-2xl" />}
      space="Espace boutiques"
      destination="/inscription/boutique"
      mode="signup"
      otherHref="/connexion"
      subtitle="Créez votre compte, puis votre boutique : elle sera en ligne dès que vos premiers produits seront ajoutés."
      signUpData={{ product: "shop" }}
      authError={error === "auth"}
    />
  );
}
