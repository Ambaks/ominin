import { notifyOrderEvent } from "@/lib/push/events";
import { createClient } from "@/lib/supabase/client";

/**
 * Le règlement en ligne n'aura pas lieu — impossible à démarrer, refusé,
 * annulé chez Stripe, ou « Payer au comptoir » : l'addition redevient à
 * encaisser en salle, prévenue comme d'une commande ordinaire. Sans effet sur
 * une commande déjà réglée ou close (la RPC ne touche qu'une commande en
 * attente).
 */
export async function fallBackToCounter(orderId: string): Promise<void> {
  await createClient().rpc("abandon_online_payment", { p_order_id: orderId });
  notifyOrderEvent(orderId, "en_attente");
}
