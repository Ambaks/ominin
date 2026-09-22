import type { SignedDoc } from "@/lib/legal/types";

/** Options de la commande de démarrage (première activation d'une offre). */
export interface StarterOptions {
  omilink: boolean;
  square: boolean;
}

/**
 * Ouvre une session Stripe Checkout pour l'établissement du gérant connecté
 * et y redirige. Sans `product`, l'API facture l'offre de l'établissement —
 * commande de démarrage comprise à la première activation (`starter`).
 * Lève si l'API refuse (produit déjà abonné, rôle insuffisant) : l'appelant
 * affiche le message et réarme son bouton.
 *
 * Retourne true quand il n'y a rien à payer de nouveau (bascule sur la
 * formule groupée, offre en mois offerts rouverte) : aucune redirection —
 * l'appelant relit l'état de l'abonnement.
 *
 * `versions` est le premier paramètre, et il est obligatoire : la route
 * refuse sans lui, et un écran qui ne l'a pas ne peut rien vendre. Le rendre
 * facultatif laisserait passer à la compilation un bouton définitivement
 * cassé — c'est arrivé.
 */
export async function startCheckout(
  versions: Record<SignedDoc, string>,
  options: {
    product?: string;
    starter?: StarterOptions;
    /** Opposition cochée sous la case de signature, s'il y en avait une. */
    trainingOptOut?: boolean;
  } = {}
): Promise<boolean> {
  const { product, starter, trainingOptOut } = options;
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(product && { product }),
      ...starter,
      versions,
      ...(trainingOptOut !== undefined && { trainingOptOut }),
    }),
  });
  const body = (await response.json()) as {
    url?: string;
    bundled?: boolean;
    activated?: boolean;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? "Une erreur est survenue.");
  }
  if (body.bundled || body.activated) return true;
  if (!body.url) throw new Error("Une erreur est survenue.");
  window.location.assign(body.url);
  return false;
}
