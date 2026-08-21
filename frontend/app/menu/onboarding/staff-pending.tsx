"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";

export function StaffPending() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const checkMembership = async () => {
    setChecking(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/connexion");
      return;
    }
    const { data: membership } = await supabase
      .from("memberships")
      .select("etablissement_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membership) {
      router.push("/gestion");
    } else {
      setChecking(false);
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <ThemeToggle className="fixed right-4 top-4" />

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
          Espace restaurants
        </p>
        <Link
          href="/"
          className="font-display text-2xl font-medium tracking-tight"
        >
          <Wordmark className="text-2xl" />
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-hairline bg-background text-2xl">
          👋
        </div>
        <h1 className="mt-4 font-display text-xl font-medium">
          Compte créé !
        </h1>
        <p className="mt-2 text-sm text-muted">
          Votre gérant doit maintenant vous inviter depuis son espace{" "}
          <span className="font-medium text-foreground">Équipe</span> pour que
          vous puissiez accéder au tableau de bord.
        </p>
        <p className="mt-3 text-xs text-faint">
          Communiquez-lui l&apos;adresse email avec laquelle vous venez de créer
          votre compte.
        </p>
        <button
          type="button"
          onClick={checkMembership}
          disabled={checking}
          className="ember-gradient mt-5 w-full rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {checking ? "Vérification…" : "Vérifier mon accès"}
        </button>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        Se déconnecter
      </button>
    </div>
  );
}
