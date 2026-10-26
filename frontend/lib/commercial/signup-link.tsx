"use client";

import { useEffect, useState } from "react";
import type { Product } from "./labels";

/*
 * Le lien d'inscription d'un commercial dans les tunnels d'inscription : lu
 * dans ?c=, gardé sur l'appareil le temps de créer le compte (l'URL ne
 * survit pas à la connexion Google ni aux redirections), puis rattaché au
 * compte dès qu'une session existe. Rend le restaurant, pour pré-remplir.
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

function storedToken(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("c");
    if (fromUrl) window.localStorage.setItem(KEY, fromUrl);
    return fromUrl ?? window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function useSignupLink(product: Product): SignupLinkInfo | null {
  const [info, setInfo] = useState<SignupLinkInfo | null>(null);
  useEffect(() => {
    const token = storedToken();
    if (!token) return;
    void fetch("/api/inscription/lien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, product }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { info: SignupLinkInfo | null } | null) => {
        if (!result) return;
        // Lien expiré, consommé ou inconnu : il n'a plus rien à faire ici.
        if (!result.info) window.localStorage.removeItem(KEY);
        setInfo(result.info);
      });
  }, [product]);
  return info;
}

/** Au-dessus du formulaire : pour qui, par qui, et que c'est le gérant qui s'inscrit. */
export function SignupLinkBanner({ product }: { product: Product }) {
  const info = useSignupLink(product);
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
