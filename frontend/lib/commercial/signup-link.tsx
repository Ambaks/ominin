"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "./labels";

/*
 * Le lien d'inscription d'un commercial dans les tunnels d'inscription : lu
 * dans ?c=, gardé sur l'appareil le temps de créer le compte (l'URL ne
 * survit pas à la connexion Google ni aux redirections) et posé dans les
 * métadonnées du compte créé par e-mail (la confirmation peut s'ouvrir dans
 * un autre navigateur), puis rattaché au compte dès qu'une session existe.
 * Rend le restaurant, pour pré-remplir, ou le refus du rattachement.
 */

const KEY = "ominin:signup-link";

export interface SignupLinkInfo {
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  commercial: string | null;
}

/** Jeton du lien ouvert sur cet appareil, pour les métadonnées de l'inscription. */
export function signupLinkToken(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("c");
    if (fromUrl) window.localStorage.setItem(KEY, fromUrl);
    return fromUrl ?? window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export interface SignupLink {
  info: SignupLinkInfo | null;
  /** Rattachement refusé (lien d'un autre compte, compte commercial ou admin). */
  error: string | null;
}

export function useSignupLink(product: Product): SignupLink {
  const [link, setLink] = useState<SignupLink>({ info: null, error: null });
  useEffect(() => {
    void (async () => {
      const token =
        signupLinkToken() ??
        ((await createClient().auth.getSession()).data.session?.user.user_metadata?.signup_link as string | undefined);
      if (!token) return;
      const response = await fetch("/api/inscription/lien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, product }),
      });
      const result = (await response.json().catch(() => null)) as { info?: SignupLinkInfo | null; error?: string } | null;
      if (!result) return;
      // Lien expiré, consommé ou inconnu : il n'a plus rien à faire ici.
      if (response.ok && !result.info) {
        try {
          window.localStorage.removeItem(KEY);
        } catch {}
      }
      setLink({ info: result.info ?? null, error: result.error ?? null });
    })();
  }, [product]);
  return link;
}

/** Le refus du rattachement, en tête du formulaire. */
export function SignupLinkError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="w-full max-w-sm rounded-2xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm leading-relaxed">
      {error}
    </p>
  );
}

/** Au-dessus du formulaire : pour qui, par qui, et que c'est le gérant qui s'inscrit. */
export function SignupLinkBanner({ product }: { product: Product }) {
  const { info, error } = useSignupLink(product);
  if (error) return <SignupLinkError error={error} />;
  if (!info) return null;
  return (
    <p className="w-full max-w-sm rounded-2xl border border-ember-2/30 bg-ember-2/10 px-4 py-3 text-sm leading-relaxed">
      Inscription de <span className="font-semibold">{info.name}</span>
      {info.commercial ? `, proposée par ${info.commercial}, commercial indépendant d’Ominin` : ""}. C’est vous, le
      gérant, qui créez votre compte et acceptez les conditions d’Ominin.
    </p>
  );
}

/** Pré-remplit un champ vide quand le lien est connu. */
export function usePrefill(value: string, set: (next: string) => void, from: string | null | undefined) {
  useEffect(() => {
    if (from && !value) set(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois, quand le lien arrive
  }, [from]);
}
