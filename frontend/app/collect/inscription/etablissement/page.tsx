import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { createClient } from "@/lib/supabase/server";
import { CollectSignupForm } from "./form";

export const metadata: Metadata = {
  title: "Votre établissement — Ominin Collect",
  robots: { index: false, follow: false },
};

/** Garde serveur, derrière celle du proxy : le compte doit exister. */
export default async function CollectEtablissementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
          Espace restaurants
        </p>
        <Wordmark suffix="Collect" className="text-2xl" />
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
          Votre établissement
        </h1>
        <p className="text-sm text-muted">
          Trois informations, et votre page de commande est prête.
        </p>
      </div>
      <CollectSignupForm />
    </div>
  );
}
