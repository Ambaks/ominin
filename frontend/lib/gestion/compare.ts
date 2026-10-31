import type { DeltaTone } from "@/components/gestion/ui";
import { formatPercent } from "@/lib/admin/format";
import { SMALL_BASE } from "./constants";

function delta(current: number, previous: number): { text: string; tone: DeltaTone } {
  const ratio = (current - previous) / previous;
  return {
    text: `${ratio > 0 ? "+" : ""}${formatPercent(ratio)}`,
    tone: ratio > 0 ? "better" : ratio < 0 ? "worse" : "neutral",
  };
}

/**
 * Le repère d'un chiffre comparé (DESIGN § 8) : un écart signé quand la base
 * le permet, la valeur d'alors sous une petite base, et rien de plus que ce
 * qu'on sait sans base. Jamais un « vs » sans écart en face.
 */
export function comparison(
  current: number,
  previous: { value: number; count: number },
  when: string,
  nothing: string,
  format: (value: number) => string
): { delta?: { text: string; tone: DeltaTone }; baseline: string } {
  if (previous.count === 0) return { baseline: nothing };
  if (previous.count < SMALL_BASE || previous.value === 0) return { baseline: `était ${format(previous.value)} ${when}` };
  return { delta: delta(current, previous.value), baseline: `vs ${when}` };
}
