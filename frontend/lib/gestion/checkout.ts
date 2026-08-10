/**
 * Ouvre une session Stripe Checkout pour l'établissement du gérant connecté
 * et y redirige. Sans `product`, l'API facture l'offre de l'établissement.
 * Lève si l'API refuse (produit déjà abonné, rôle insuffisant) : l'appelant
 * affiche le message et réarme son bouton.
 */
export async function startCheckout(product?: string): Promise<void> {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product ? { product } : {}),
  });
  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? "Une erreur est survenue.");
  }
  window.location.assign(body.url);
}
