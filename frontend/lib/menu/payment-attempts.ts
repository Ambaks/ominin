import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Note qu'un encaisseur a refusé le paiement de la tentative en cours : une
 * tentative écartée ensuite se lit « échouée », pas « expirée » (voir le
 * journal, 20261031000500). Une mesure ne fait jamais échouer un paiement :
 * l'erreur est journalisée, pas levée.
 */
export async function markPaymentRefused(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string
): Promise<void> {
  const { error } = await admin
    .from("online_payment_attempts")
    .update({ refused: true })
    .eq("order_id", orderId);
  if (error) {
    console.error("[paiement] refus non journalisé", { orderId, message: error.message });
  }
}
