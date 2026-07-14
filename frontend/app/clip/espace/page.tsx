import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { contactEmail } from "@/lib/landing-data";
import { createClient } from "@/lib/supabase/server";
import { ClipWordmark } from "@/components/clip/wordmark";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Votre espace — Ominin Clip",
  robots: { index: false, follow: false },
};

/*
 * Espace clipper, version d'attente : le compte existe, le setup sur mesure
 * (connexion des comptes, agents) est construit avec le client. La vraie
 * plateforme remplacera cette page en phase 2.
 */
export default async function ClipEspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <ClipWordmark className="text-2xl" />

      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-8">
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Votre espace
        </p>
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
          Votre setup est en préparation.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Votre compte{" "}
          <span className="font-medium text-foreground">{user.email}</span> est
          bien créé. Chaque setup Ominin Clip est construit sur mesure : nous
          revenons vers vous sous 24 heures pour brancher vos comptes et
          configurer vos agents.
        </p>
        <a
          href={`mailto:${contactEmail}`}
          className="ember-gradient mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-background"
        >
          Nous écrire
        </a>
      </div>

      <SignOutButton />
    </div>
  );
}
