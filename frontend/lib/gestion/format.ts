/** Parse une saisie de prix française ("7,90", "7.90", "7") → nombre, ou null si invalide. */
export function parsePriceInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Nombre → saisie de prix française ("7,90", "7"). */
export function priceToInput(price: number): string {
  return Number.isInteger(price)
    ? String(price)
    : price.toFixed(2).replace(".", ",");
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
