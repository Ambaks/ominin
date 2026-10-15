import { formatPrice } from "@/lib/menu/format";

/**
 * Refus d'un règlement en ligne sous la commande minimum du restaurant,
 * pourboire non compris — le même que place_order, pour un appel qui
 * contournerait le menu. En centimes, comme le montant débité. null : rien
 * à redire.
 */
export function onlineMinimumError(
  lines: { unit_price: number; quantity: number }[],
  minimum: number | null,
  collect: boolean
): string | null {
  if (minimum === null) return null;
  const minimumCents = Math.round(Number(minimum) * 100);
  const totalCents = lines.reduce(
    (sum, line) => sum + Math.round(line.unit_price * 100) * line.quantity,
    0
  );
  if (totalCents >= minimumCents) return null;
  const amount = formatPrice(minimumCents / 100);
  // Le click & collect n'a pas de comptoir où se rabattre.
  return collect
    ? `Commande minimum : ${amount}.`
    : `Paiement en ligne dès ${amount} : réglez au comptoir.`;
}
