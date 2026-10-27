"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ROLE_LABELS } from "@/lib/gestion/constants";
import type { Role } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";

function Frame({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}

export function InvitationNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Frame>
      <h1 className="font-display text-xl font-medium">{title}</h1>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </Frame>
  );
}

/*
 * Accepter, c'est aussi choisir son mot de passe, compte existant compris :
 * un compte ouvert à cette adresse avant l'invitation pouvait l'être par
 * quelqu'un d'autre. Le nouveau mot de passe et la fermeture des autres
 * sessions laissent la place à qui a lu l'e-mail.
 */
export function InvitationForm({
  token,
  restaurantName,
  role,
}: {
  token: string;
  restaurantName: string;
  role: Role;
}) {
  const [displayName, setDisplayName] = useState("");
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
      // Reprendre son mot de passe actuel est permis.
      if (error && error.code !== "same_password") throw error;
      const { data: etablissementId, error: acceptError } = await supabase.rpc(
        "accept_invitation",
        { p_token: token },
      );
      if (acceptError) throw acceptError;
      const name = displayName.trim();
      if (name) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Policy « self update » : chacun renseigne son propre nom.
          await supabase
            .from("memberships")
            .update({ display_name: name })
            .eq("user_id", user.id)
            .eq("etablissement_id", etablissementId);
        }
      }
      await supabase.auth.signOut({ scope: "others" });
      window.location.assign("/menu/gestion");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue.",
      );
      setBusy(false);
    }
  };

  return (
    <Frame>
      <h1 className="font-display text-xl font-medium">
        Bienvenue dans l&rsquo;équipe
      </h1>
      {/* Serveur et cuisinier changent de nom en boutique à emporter, ce que
          cette page ignore : seul le gérant est nommé. */}
      <p className="mt-1 text-sm text-muted">
        <span className="font-medium text-foreground">{restaurantName}</span>{" "}
        {role === "gerant" ? (
          <>
            vous invite en tant que{" "}
            <span className="font-medium text-foreground">
              {ROLE_LABELS.gerant}
            </span>
          </>
        ) : (
          "vous invite dans son équipe"
        )}
        . Choisissez votre mot de passe pour accepter l&rsquo;invitation — vous
        pouvez reprendre celui de votre compte Ominin si vous en avez déjà un.
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <Field
          label="Votre nom"
          required={role === "serveur"}
          hint={
            role === "serveur"
              ? "Affiché sur vos tables et vos pourboires — modifiable ensuite depuis votre espace."
              : "Affiché à l'équipe — modifiable ensuite depuis votre espace."
          }
        >
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required={role === "serveur"}
            maxLength={80}
            autoComplete="name"
            className={inputClass}
          />
        </Field>
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
          Accepter et continuer
        </button>
      </form>
    </Frame>
  );
}
