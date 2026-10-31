"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Field, inputClass } from "@/components/ui/field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";

/*
 * Mot de passe oublié, en deux pages : la demande du lien, puis le choix du
 * nouveau mot de passe une fois le lien ouvert. Le lien passe par
 * /auth/callback, comme une invitation : la session qu'il pose prouve
 * l'accès à la boîte. Chemins préfixés /menu, comme ceux de l'invitation :
 * le proxy les ramène à leur forme nue sur le sous-domaine, et les sert tels
 * quels tant que celui-ci est inerte (dev).
 */
const LOGIN_HREF = "/menu/connexion";
const FORGOT_HREF = "/menu/mot-de-passe-oublie";
const NEW_PASSWORD_PATH = "/menu/nouveau-mot-de-passe";

function Frame({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <ThemeToggle className="fixed right-4 top-4" />
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
          Espace restaurants
        </p>
        <Link href="/" className="font-display text-2xl font-medium tracking-tight">
          <Wordmark className="text-2xl" />
        </Link>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6">
        {children}
      </div>
      {footer}
    </div>
  );
}

const footerLink = (href: string, label: string) => (
  <Link
    href={href}
    className="text-sm text-muted transition-colors hover:text-foreground"
  >
    {label}
  </Link>
);

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(NEW_PASSWORD_PATH)}`,
    });
    if (error) {
      setError(
        error.code === "over_email_send_rate_limit"
          ? "Un lien vient déjà de partir. Patientez une minute avant d'en redemander un."
          : error.message
      );
      setBusy(false);
      return;
    }
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <Frame footer={footerLink(LOGIN_HREF, "Retour à la connexion")}>
        <h1 className="font-display text-xl font-medium">Lien envoyé</h1>
        <p className="mt-2 text-sm text-muted">
          Si un compte existe pour{" "}
          <span className="font-medium text-foreground">{sentTo}</span>, un
          lien vient d&rsquo;y être envoyé. Ouvrez-le pour choisir un nouveau
          mot de passe.
        </p>
        <p className="mt-3 text-xs text-faint">
          Pensez à vérifier vos courriers indésirables si l&rsquo;email
          n&rsquo;apparaît pas dans quelques minutes.
        </p>
      </Frame>
    );
  }

  return (
    <Frame footer={footerLink(LOGIN_HREF, "Retour à la connexion")}>
      <h1 className="font-display text-xl font-medium">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-muted">
        Indiquez votre email : nous vous envoyons un lien pour en choisir un
        nouveau.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
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
        {error && <p className="text-sm text-ember-3">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          Envoyer le lien
        </button>
      </form>
    </Frame>
  );
}

/** Lien ouvert sans session : il a expiré, ou a déjà servi. */
export function ExpiredLinkNotice() {
  return (
    <Frame footer={footerLink(LOGIN_HREF, "Retour à la connexion")}>
      <h1 className="font-display text-xl font-medium">Lien expiré</h1>
      <p className="mt-2 text-sm text-muted">
        Ce lien ne fonctionne plus : il a expiré ou a déjà été utilisé.
        Demandez-en un nouveau, il arrive en quelques instants.
      </p>
      <Link
        href={FORGOT_HREF}
        className="ember-gradient mt-5 block rounded-full px-5 py-2.5 text-center text-sm font-semibold text-background"
      >
        Recevoir un nouveau lien
      </Link>
    </Frame>
  );
}

export function NewPasswordForm({ email }: { email: string }) {
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
      // Retrouver son mot de passe en le retapant : c'est bien lui, on entre.
      if (error && error.code !== "same_password") throw error;
      // Qui connaissait l'ancien mot de passe n'a plus de session.
      await supabase.auth.signOut({ scope: "others" });
      window.location.assign("/menu/gestion");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Frame>
      <h1 className="font-display text-xl font-medium">Nouveau mot de passe</h1>
      <p className="mt-1 text-sm text-muted">
        Choisissez-le pour{" "}
        <span className="font-medium text-foreground">{email}</span>. Vous
        serez connecté dans la foulée.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <Field label="Nouveau mot de passe" required>
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
    </Frame>
  );
}
