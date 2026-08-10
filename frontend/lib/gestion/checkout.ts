/**
 * Ouvre une session Stripe Checkout pour l'établissement du gérant connecté
 * et y redirige. Sans `product`, l'API facture l'offre de l'établissement.
 * Lève si l'API refuse (produit déjà abonné, rôle insuffisant) : l'appelant
 * affiche le message et réarme son bouton.
 *
 * Retourne true quand l'abonnement a simplement basculé sur la formule
 * groupée : rien à payer de nouveau, donc aucune redirection — l'appelant
 * relit l'état de l'abonnement.
 */
export async function startCheckout(product?: string): Promise<boolean> {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product ? { product } : {}),
  });
  const body = (await response.json()) as {
    url?: string;
    bundled?: boolean;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? "Une erreur est survenue.");
  }
  if (body.bundled) return true;
  if (!body.url) throw new Error("Une erreur est survenue.");
  window.location.assign(body.url);
  return false;
}
