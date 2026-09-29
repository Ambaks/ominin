import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";
import { menuSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { ClaimCard, UsedLink } from "./claim";

/*
 * Lien gérant (npm run menu:gerant) : le propriétaire y crée son compte — ou
 * se connecte —, revient ici connecté et confirme ; la confirmation le
 * rattache comme gérant et consomme le lien. Ouvrir la page ne consomme
 * rien : l'aperçu d'une messagerie reste sans effet, et un compte déjà
 * connecté sur ce navigateur (le nôtre, en vérifiant le lien) ne devient pas
 * gérant sans l'avoir demandé.
 */

export const metadata: Metadata = {
  title: "Accès gérant — Ominin",
  robots: { index: false, follow: false },
};

// Chemin visible de la page, retour après inscription : nu sur le
// sous-domaine menu, préfixé (/menu) quand il est inerte.
const basePath = new URL(menuSiteUrl).pathname.replace(/\/$/, "");

export default async function RejoindrePage({
  params,
  searchParams,
}: PageProps<"/menu/rejoindre/[token]">) {
  const { token } = await params;
  const { connexion } = await searchParams;
  const supabase = await createClient();
  const [{ data: restaurant }, { data: { user } }] = await Promise.all([
    supabase.rpc("gerant_link_etablissement", { p_token: token }),
    supabase.auth.getUser(),
  ]);

  if (!restaurant) return <UsedLink />;
  if (user) {
    return (
      <ClaimCard token={token} restaurant={restaurant} email={user.email ?? ""} />
    );
  }

  const self = `${basePath}/rejoindre/${token}`;
  const signin = connexion !== undefined;
  return (
    <AuthForm
      brand={<Wordmark className="text-2xl" />}
      space="Espace restaurants"
      destination={self}
      mode={signin ? "signin" : "signup"}
      otherHref={signin ? self : `${self}?connexion`}
      subtitle={`${signin ? "Connectez-vous" : "Créez votre compte"} pour gérer ${restaurant}.`}
      authError={false}
    />
  );
}
