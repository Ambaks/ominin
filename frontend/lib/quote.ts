import { pricingSection, starterKit, type Plan } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";

/*
 * Devis de démarrage : ce qu'un restaurant règle pour ouvrir son offre. Pur
 * et partagé — la page /devis, l'écran d'activation et la route Stripe
 * calculent la même chose à partir des mêmes tarifs (lib/landing-data.ts).
 * Le serveur ne fait jamais confiance au nombre de tables du client : il
 * recompte celles de l'établissement.
 */
export interface StarterQuote {
  plan: string;
  tables: number;
  omilink: boolean;
  square: boolean;
}

export interface QuoteLine {
  id: string;
  label: string;
  /** Précision sous le libellé (« 12 × 1,50 € »). */
  detail?: string;
  amount: number;
}

export const quotePlan = (planId: string): Plan | undefined =>
  pricingSection.plans.find((plan) => plan.id === planId);

/** Boîtier et caisse ne concernent que les offres avec commande à table. */
export const hasInstallOptions = (planId: string) =>
  Boolean(quotePlan(planId)?.commission);

/** Lignes réglées aujourd'hui, dans l'ordre de l'addition. */
export function quoteLines(quote: StarterQuote): QuoteLine[] {
  const plan = quotePlan(quote.plan);
  const { cachet, omilink, shipping } = starterKit;
  const lines: QuoteLine[] = [];
  // Une offre à mois offerts ne facture pas son premier mois : elle s'ouvre
  // sur sa seule commande de démarrage.
  if (plan && plan.price > 0 && !plan.trial) {
    lines.push({
      id: plan.id,
      label: `Ominin ${plan.name}`,
      detail: "Premier mois",
      amount: plan.price,
    });
  }
  lines.push({
    id: cachet.id,
    label: "Cachets imprimés",
    detail: `${quote.tables} × ${formatPrice(cachet.price)}`,
    amount: quote.tables * cachet.price,
  });
  if (quote.omilink && hasInstallOptions(quote.plan)) {
    lines.push({ id: omilink.id, label: omilink.name, amount: omilink.price });
  }
  lines.push({ id: shipping.id, label: shipping.name, amount: shipping.price });
  return lines;
}

export const quoteTotal = (quote: StarterQuote) =>
  quoteLines(quote).reduce((sum, line) => sum + line.amount, 0);

/** Devis porté d'une page à l'autre du funnel (inscription → onboarding). */
export function quoteQuery(quote: StarterQuote): string {
  const params = new URLSearchParams({
    plan: quote.plan,
    tables: String(quote.tables),
  });
  if (hasInstallOptions(quote.plan)) {
    if (quote.omilink) params.set("omilink", "1");
    if (quote.square) params.set("square", "1");
  }
  return params.toString();
}

type RawParams = Record<string, string | string[] | undefined>;

/** Relit un devis depuis des searchParams ; null si l'offre est inconnue. */
export function parseQuote(raw: RawParams): StarterQuote | null {
  const plan = typeof raw.plan === "string" ? raw.plan : undefined;
  if (!plan || !quotePlan(plan)) return null;
  const tables = Number(raw.tables);
  return {
    plan,
    tables: Number.isInteger(tables) && tables > 0 ? tables : 0,
    omilink: raw.omilink === "1",
    square: raw.square === "1",
  };
}
