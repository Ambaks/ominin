"use client";

import { useState } from "react";
import { isPhoneLoginEmail } from "@/lib/shop/phone";
import { createClient } from "@/lib/supabase/client";
import { MailIcon } from "../icons";
import { useShop } from "./context";
import { shopHref } from "./href";
import { Alert, Button, Field, Input } from "./ui";

/*
 * Connexion cliente par lien magique : aucun mot de passe, le lien ramène
 * sur cette boutique (callback partagé /auth/callback, chemin relatif).
 */
export function LoginForm({ next }: { next?: string }) {
  const { slug } = useShop();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = next && next.startsWith("/") ? next : shopHref(slug, "/compte/commandes");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPhoneLoginEmail(email)) {
      setError("Adresse e-mail invalide.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`, shouldCreateUser: true },
    });
    if (error) setError("Impossible d'envoyer le lien pour le moment. Réessaie dans un instant.");
    else setSent(true);
    setBusy(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-shop-tint-strong text-shop-accent-deep">
          <MailIcon className="size-6" />
        </span>
        <p className="font-shop-display text-xl">Ton lien est en route</p>
        <p className="text-sm leading-relaxed text-shop-ink-soft">
          Un lien de connexion vient d&apos;être envoyé à <span className="font-medium text-shop-ink">{email}</span>. Il est valable quelques minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Adresse e-mail" htmlFor="login-email" hint="Celle utilisée pour tes commandes.">
        <Input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille@exemple.fr" />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" loading={busy} className="w-full">
        Recevoir mon lien de connexion
      </Button>
      <p className="text-center text-xs leading-relaxed text-shop-ink-soft">Pas de mot de passe : un lien envoyé par e-mail te connecte en un clic.</p>
    </form>
  );
}
