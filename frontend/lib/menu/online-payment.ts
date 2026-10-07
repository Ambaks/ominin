import { notifyOrderEvent } from "@/lib/push/events";
import { createClient } from "@/lib/supabase/client";

/**
 * Où en est un règlement par carte dans la page (Stripe, Square, SumUp) : le
 * formulaire attend, un débit est en cours, ou c'est payé. La feuille qui le
 * porte ne se referme pas de la même façon selon le cas.
 */
export type CardPhase = "form" | "charging" | "paid";

/**
 * Le règlement en ligne n'aura pas lieu — impossible à démarrer, refusé,
 * abandonné, ou « Payer au comptoir » : l'addition redevient à
 * encaisser en salle, prévenue comme d'une commande ordinaire. Sans effet sur
 * une commande déjà réglée ou close (la RPC ne touche qu'une commande en
 * attente). Rend faux si la base n'a pas pu l'enregistrer.
 */
export async function fallBackToCounter(orderId: string): Promise<boolean> {
  const { error } = await createClient().rpc("abandon_online_payment", {
    p_order_id: orderId,
  });
  // Prévenue seulement si l'addition est bien passée au comptoir : sinon, la
  // salle recevrait une commande qu'elle ne voit pas, et plus la vraie ensuite.
  if (!error) notifyOrderEvent(orderId, "en_attente");
  return !error;
}
