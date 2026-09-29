/**
 * Ce que le client lit quand un appel à la base échoue. Les refus de la base
 * (RAISE, code P0001) sont écrits pour lui, en français ; tout le reste — le
 * réseau qui tombe sur la terrasse, une erreur technique en anglais —
 * devient `fallback`.
 */
export function customerMessage(
  error: { message: string; code?: string },
  fallback: string
): string {
  return error.code === "P0001" ? error.message : fallback;
}
