import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Connexion — Ominin Admin",
  robots: { index: false, follow: false },
};

/*
 * Pas de page d'inscription : l'espace est réservé à l'allowlist admin_users.
 * « Continuer avec Google » crée le compte au premier passage ; un compte hors
 * allowlist ne voit rien (RLS) et le shell le renvoie ici.
 */
export default async function ConnexionPage({
  searchParams,
}: PageProps<"/admin/connexion">) {
  const { error } = await searchParams;
  // Sur admin.ominin.com les chemins sont nus ; en mode inerte (apex, dev)
  // l'app vit sous /admin — la destination post-connexion suit le host.
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const destination =
    host === process.env.NEXT_PUBLIC_ADMIN_HOST ? "/" : "/admin";
  return (
    <AuthForm
      brand={<Wordmark suffix="Admin" className="text-2xl" />}
      space="CRM interne"
      destination={destination}
      mode="signin"
      subtitle="Espace réservé à l'équipe Ominin."
      authError={error === "auth"}
    />
  );
}
