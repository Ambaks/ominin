"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12.02 12.02 0 0 0 0 10.76l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 6 9 7 9-7" />
    </svg>
  );
}

export function LoginForm({
  authError,
  plan,
}: {
  authError: boolean;
  plan?: string;
}) {
  // Offre choisie sur la landing : si l'utilisateur n'a pas encore
  // d'établissement, l'onboarding la préremplit (sinon il est redirigé).
  const destination = plan
    ? `/onboarding?plan=${encodeURIComponent(plan)}`
    : "/gestion";
  const [mode, setMode] = useState<"signin" | "signup">(
    plan ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? "La connexion a échoué. Réessayez." : null
  );
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.assign(destination);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          window.location.assign(destination);
        } else {
          setPendingEmail(email);
        }
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  if (pendingEmail) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
        <Link
          href="/"
          className="font-display text-2xl font-medium tracking-tight"
        >
          <span className="ember-text">Ominin</span>
        </Link>

        <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6 text-center">
          <div className="ember-gradient mx-auto flex size-12 items-center justify-center rounded-full text-background">
            <MailIcon />
          </div>
          <h1 className="mt-4 font-display text-xl font-medium">
            Merci de votre inscription !
          </h1>
          <p className="mt-2 text-sm text-muted">
            Nous avons envoyé un lien de confirmation à{" "}
            <span className="font-medium text-foreground">{pendingEmail}</span>.
            Ouvrez-le pour activer votre compte et accéder à votre espace.
          </p>
          <p className="mt-3 text-xs text-faint">
            Pensez à vérifier vos courriers indésirables si l’email n’apparaît
            pas dans quelques minutes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPendingEmail(null);
            setMode("signin");
            setPassword("");
            setBusy(false);
          }}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <Link href="/" className="font-display text-2xl font-medium tracking-tight">
        <span className="ember-text">Ominin</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6">
        <h1 className="font-display text-xl font-medium">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "signin"
            ? "Accédez à votre espace de gestion."
            : "Gérez votre restaurant avec Ominin."}
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium transition-colors hover:border-ember-2/40 disabled:opacity-60"
        >
          <GoogleIcon />
          Continuer avec Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
          <span className="h-px flex-1 bg-hairline" />
          ou par email
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Email" required>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
          </Field>
          <Field label="Mot de passe" required>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-ember-3">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        {mode === "signin"
          ? "Pas encore de compte ? Créer un compte"
          : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
