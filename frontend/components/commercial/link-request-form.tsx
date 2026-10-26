"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Field, inputClass } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/*
 * Connexion sans mot de passe : l'adresse invitée reçoit un lien. Le message
 * de confirmation est le même pour toute adresse — la route ne dit pas qui
 * est commercial.
 */
export function LinkRequestForm({ authError }: { authError: boolean }) {
  const [email, setEmail] = useState("");
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

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/commercial/lien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "L’envoi a échoué.");
      setSentTo(email.trim().toLowerCase());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’envoi a échoué.");
    } finally {
      setBusy(false);
    }
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
              correspond à une invitation d’Ominin, un lien de connexion vient
              d’y être envoyé.
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
            <h1 className="font-display text-xl font-medium">Connexion</h1>
            <p className="mt-1 text-sm text-muted">
              Saisissez l’adresse de votre invitation : nous vous envoyons un
              lien de connexion.
            </p>
            <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
              <Field label="E-mail" required>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="prenom@exemple.fr"
                  autoFocus
                  className={inputClass}
                />
              </Field>
              {error && (
                <p role="alert" className="text-sm text-ember-3">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
              >
                {busy ? "Envoi…" : "Recevoir un lien"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
