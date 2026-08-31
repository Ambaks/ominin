"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ROLE_LABELS } from "@/lib/gestion/constants";
import type { Role } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";

export function InvitationForm({
  restaurantName,
  role,
}: {
  restaurantName: string;
  role: Role;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      window.location.assign("/menu/gestion");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue.",
      );
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <ThemeToggle className="fixed right-4 top-4" />
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
          Espace de gestion
        </p>
        <Link
          href="/"
          className="font-display text-2xl font-medium tracking-tight"
        >
          Ominin
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6">
        <h1 className="font-display text-xl font-medium">
          Bienvenue dans l&rsquo;équipe
        </h1>
        <p className="mt-1 text-sm text-muted">
          <span className="font-medium text-foreground">{restaurantName}</span>{" "}
          vous a ajouté en tant que{" "}
          <span className="font-medium text-foreground">
            {ROLE_LABELS[role]}
          </span>
          . Choisissez un mot de passe pour accéder à votre espace.
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <Field label="Mot de passe" required>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
          <Field label="Confirmer le mot de passe" required>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-ember-3">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            Enregistrer et continuer
          </button>
        </form>
      </div>
    </div>
  );
}
