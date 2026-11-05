import { WEEK_DAYS } from "./constants";
import { formatDays, formatDaysShort, priceToInput } from "./format";
import type { MenuTarget, PriceRule, PriceRuleDirection, PriceRuleUnit } from "./types";
import { cents } from "@/lib/menu/tarifs";
import { formatPrice } from "@/lib/menu/format";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Un tarif planifié mis en mots, et son aperçu dans le formulaire. Le prix
 * facturé reste celui de la fonction SQL prix_ajuste : ceci n'en est que le
 * miroir, le temps de la saisie, avant que la règle existe.
 */

type RulePrice = Pick<PriceRule, "direction" | "unit" | "value">;
type RuleTime = Pick<PriceRule, "days" | "startsAt" | "endsAt">;

/** Le prix qu'une règle donne à `base`, jamais négatif. */
export function ruledPrice(base: number, { direction, unit, value }: RulePrice): number {
  if (direction === "prix_fixe") return cents(value);
  const delta = unit === "pourcentage" ? (base * value) / 100 : value;
  return Math.max(0, cents(direction === "remise" ? base - delta : base + delta));
}

/** « 5,00 € de plus », « 10 % de moins », « Prix fixe 15,00 € ». */
export function formatAdjustment({ direction, unit, value }: RulePrice): string {
  if (direction === "prix_fixe") return `Prix fixe ${formatPrice(value)}`;
  const amount = unit === "pourcentage" ? `${priceToInput(value)} %` : formatPrice(value);
  return `${amount} de ${direction === "remise" ? "moins" : "plus"}`;
}

const shortTime = (time: string) => time.slice(0, 5);

/** « toute la journée », « 19:00 → 02:00 (le lendemain) ». */
export function formatWindow({ startsAt, endsAt }: Pick<PriceRule, "startsAt" | "endsAt">): string {
  if (!startsAt || !endsAt) return "toute la journée";
  // Fin avant début : le créneau passe minuit et appartient au jour d'ouverture.
  return `${shortTime(startsAt)} → ${shortTime(endsAt)}${startsAt >= endsAt ? " (le lendemain)" : ""}`;
}

/** « Tous les ven, sam, dim · toute la journée ». */
export function describeRuleTime(rule: RuleTime): string {
  const days = rule.days.length === WEEK_DAYS.length
    ? "Tous les jours"
    : rule.days.length === 1
      ? `Tous les ${formatDays(rule.days)}s`
      : `Tous les ${formatDaysShort(rule.days)}`;
  return `${days} · ${formatWindow(rule)}`;
}

const WEEK_END = [5, 6, 7];
const WORK_DAYS = [1, 2, 3, 4, 5];

function daysSuffix(days: number[]): string {
  if (days.length === WEEK_DAYS.length) return "";
  if (days.length === 1) return ` du ${formatDays(days)}`;
  if (days.every((day) => WEEK_END.includes(day))) return " week-end";
  if (days.length === WORK_DAYS.length && days.every((day) => WORK_DAYS.includes(day))) return " de semaine";
  return "";
}

/** Le nom proposé, puisque le client le lit : « Tarif week-end », « Happy hour ». */
export function suggestRuleName(direction: PriceRuleDirection, days: number[], timed: boolean): string {
  if (direction === "remise" && timed) return "Happy hour";
  const noun = direction === "majoration" ? "Tarif" : direction === "remise" ? "Offre" : "Prix spécial";
  return `${noun}${daysSuffix(days)}`;
}

export interface PreviewLine {
  key: string;
  label: string;
  from: number;
  to: number;
  /** Un article à formats, visé en entier : le prix écrit est celui de son premier format. */
  startingAt: boolean;
}

/** Les articles et formats qu'une règle vise, dans l'ordre de la carte, chacun une fois. */
export function previewLines(
  categories: MenuCategory[],
  targets: MenuTarget[],
  rule: RulePrice
): PreviewLine[] {
  const pickedCategories = new Set(targets.flatMap((t) => (t.kind === "category" ? [t.id] : [])));
  const pickedItems = new Set(targets.flatMap((t) => (t.kind === "item" && !t.choiceId ? [t.id] : [])));
  const pickedChoices = new Set(
    targets.flatMap((t) => (t.kind === "item" && t.choiceId ? [`${t.id}:${t.choiceId}`] : []))
  );
  return categories.flatMap((category) =>
    category.items.flatMap((item) => {
      const formats = item.options?.find((group) => group.formats)?.choices ?? [];
      if (pickedCategories.has(category.id) || pickedItems.has(item.id)) {
        return [{
          key: item.id,
          label: item.name,
          from: item.price,
          to: ruledPrice(item.price, rule),
          startingAt: formats.length > 0,
        }];
      }
      return formats.flatMap((choice) => {
        if (!pickedChoices.has(`${item.id}:${choice.id}`)) return [];
        const from = cents(item.price + choice.supplement);
        return [{
          key: `${item.id}:${choice.id}`,
          label: `${item.name} ${choice.name}`,
          from,
          to: ruledPrice(from, rule),
          startingAt: false,
        }];
      });
    })
  );
}

/** Un prix fixe est toujours en euros (contrainte price_rules_prix_fixe_en_euros). */
export const ruleUnit = (direction: PriceRuleDirection, unit: PriceRuleUnit): PriceRuleUnit =>
  direction === "prix_fixe" ? "montant" : unit;
