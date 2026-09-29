"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";

function Shell({
  children,
  after,
}: {
  children: React.ReactNode;
  after?: React.ReactNode;
}) {
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
        {children}
      </div>
      {after}
    </div>
  );
}

export function ClaimCard({
  token,
  restaurant,
  email,
}: {
  token: string;
  restaurant: string;
  email: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setError(null);
    setBusy(true);
    const { error } = await createClient().rpc("claim_gerant_link", {
      p_token: token,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    window.location.assign("/gestion");
  };

  const switchAccount = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.reload();
  };

  return (
    <Shell
      after={
        <button
          type="button"
          onClick={switchAccount}
          disabled={busy}
          className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-60"
        >
          Utiliser un autre compte
        </button>
      }
    >
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        Accès gérant
      </p>
      <h1 className="mt-2 font-display text-xl font-medium">{restaurant}</h1>
      <p className="mt-2 text-sm text-muted">
        Compte connecté :{" "}
        <span className="font-medium text-foreground">{email}</span>.
        Confirmez pour le relier à l&rsquo;établissement.
      </p>

      {error && <p className="mt-4 text-sm text-ember-3">{error}</p>}

      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="ember-gradient mt-5 w-full rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
      >
        {busy ? "Un instant…" : "Accéder à mon espace"}
      </button>
    </Shell>
  );
}

export function UsedLink() {
  return (
    <Shell>
      <h1 className="font-display text-xl font-medium">Lien déjà utilisé</h1>
      <p className="mt-2 text-sm text-muted">
        Ce lien a déjà servi ou n&rsquo;existe plus. Si votre compte est créé,
        connectez-vous ; sinon, demandez un nouveau lien à Ominin.
      </p>
      <Link
        href="/connexion"
        className="ember-gradient mt-5 block w-full rounded-full px-5 py-2.5 text-sm font-semibold text-background"
      >
        Accéder à mon espace
      </Link>
    </Shell>
  );
}
