"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleIcon } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/brand/wordmark";
import { Field, inputClass } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { commercialPrefix } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "link";

const submitClass = "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60";

/*
 * Connexion : e-mail et code à 6 chiffres, ou Google. L'inscription et le
 * code oublié passent par un lien envoyé à l'adresse invitée ; le message de
 * confirmation est le même pour toute adresse — la route ne dit pas qui est
 * commercial. Un compte Google non invité n'ouvre rien (« Espace réservé »).
 */
export function LinkRequestForm({ authError }: { authError: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  // Le formulaire disparaît sous le focus : on le pose sur la confirmation.
  useEffect(() => {
    if (sentTo) sentHeading.current?.focus();
  }, [sentTo]);
  const [error, setError] = useState<string | null>(
    authError ? "Ce lien n’est plus valable. Demandez-en un nouveau." : null
  );

  const destination = `${commercialPrefix}/espace`;

  const requestLink = async () => {
    const response = await fetch("/api/commercial/lien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "L’envoi a échoué.");
    setSentTo(email.trim().toLowerCase());
  };

  const signIn = async () => {
    const { error: refused } = await createClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: code,
    });
    if (refused) throw new Error("E-mail ou code incorrect.");
    window.location.assign(destination);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await (mode === "signin" ? signIn() : requestLink());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’envoi a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setBusy(true);
    const { error: refused } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (refused) {
      setError(refused.message);
      setBusy(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <ThemeToggle className="fixed right-4 top-4" />
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
          Espace commercial
        </p>
        <Wordmark className="text-2xl" />
      </div>

      <div aria-live="polite" className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6">
        {sentTo ? (
          <>
            <h1 ref={sentHeading} tabIndex={-1} className="font-display text-xl font-medium outline-none">
              Vérifiez vos e-mails
            </h1>
            <p className="mt-2 text-sm text-muted">
              Si <span className="font-medium text-foreground">{sentTo}</span>{" "}
              correspond à une invitation d’Ominin, un lien vient d’y être
              envoyé. Ouvrez-le ici, dans ce navigateur, pour choisir votre code.
            </p>
            <p className="mt-3 text-xs text-muted">
              Rien après quelques minutes ? Regardez dans les indésirables.
            </p>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="mt-4 text-sm text-muted underline transition-colors hover:text-foreground"
            >
              Utiliser une autre adresse
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-medium">
              {mode === "signin" ? "Connexion" : "Inscription ou code oublié"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {mode === "signin"
                ? "Avec Google, ou votre e-mail et votre code à 6 chiffres."
                : "Saisissez l’adresse de votre invitation : nous vous envoyons un lien pour choisir votre code."}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void signInWithGoogle()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              <GoogleIcon />
              Continuer avec Google
            </button>
            <form onSubmit={(event) => void onSubmit(event)} className="mt-4 flex flex-col gap-4">
              <Field label="E-mail" required>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="prenom@exemple.fr"
                  className={inputClass}
                />
              </Field>
              {mode === "signin" && (
                <Field label="Code à 6 chiffres" required>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    required
                    className={inputClass}
                  />
                </Field>
              )}
              {error && (
                <p role="alert" className="text-sm text-ember-3">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className={submitClass}>
                {mode === "signin" ? "Se connecter" : busy ? "Envoi…" : "Recevoir un lien"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => switchTo(mode === "signin" ? "link" : "signin")}
              className="mt-4 text-sm text-muted underline transition-colors hover:text-foreground"
            >
              {mode === "signin" ? "S’inscrire, ou code oublié" : "J’ai déjà mon code"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
