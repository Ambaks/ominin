import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Connexion — Ominin Collect",
  robots: { index: false, follow: false },
};

/*
 * Connexion du sous-domaine click & collect. L'espace de gestion ne vit que
 * sur le domaine principal : la destination est donc absolue, et la session
 * la suit grâce au cookie posé sur le domaine parent (lib/supabase/cookies).
 */
export default async function CollectConnexionPage({
  searchParams,
}: PageProps<"/collect/connexion">) {
  const { error } = await searchParams;
  return (
    <AuthForm
      brand={<Wordmark suffix="Collect" className="text-2xl" />}
      space="Espace restaurants"
      destination={`${siteUrl}/gestion`}
      mode="signin"
      otherHref="/inscription"
      subtitle="Vos commandes à emporter vous attendent dans votre espace de gestion."
      authError={error === "auth"}
    />
  );
}
