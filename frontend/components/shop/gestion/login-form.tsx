"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Field, inputClass } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { loginEmailFor } from "@/lib/shop/phone";
import { createClient } from "@/lib/supabase/client";

/*
 * Connexion à l'espace de gestion d'une boutique. Une gérante se connecte
 * avec son numéro de téléphone ou son e-mail, et son mot de passe : le
 * numéro est converti en adresse technique (lib/shop/phone.ts) — Supabase
 * n'a pas de fournisseur SMS à configurer.
 */
export function ShopLoginForm({ authError }: { authError: boolean }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(authError ? "La connexion a échoué. Réessayez." : null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = loginEmailFor(identifier);
    if (!email) {
      setError("Indiquez un numéro de téléphone ou une adresse e-mail valide.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError("Identifiant ou mot de passe incorrect.");
      setBusy(false);
      return;
    }
    window.location.assign("/gestion");
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Link href="/">
          <Wordmark suffix="Shop" className="text-2xl" />
        </Link>
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">Espace boutiques</p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-hairline bg-surface p-6">
        <Field label="Téléphone ou e-mail" required>
          <input className={inputClass} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" placeholder="06 00 00 00 00" required />
        </Field>
        <Field label="Mot de passe" required>
          <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {error && (
          <p className="text-sm text-ember-3" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="ember-gradient rounded-full px-5 py-3 text-sm font-semibold text-background disabled:opacity-60">
          {busy ? "Connexion…" : "Se connecter"}
        </button>
        <p className="text-center text-xs text-muted">
          Pas encore de boutique ?{" "}
          <Link href="/inscription" className="font-semibold text-ember-1">
            Créer un compte
          </Link>
        </p>
      </form>
      <ThemeToggle />
    </main>
  );
}
