import { NextResponse } from "next/server";
import {
  collectOffer,
  pricingSection,
  starterKit,
  type Plan,
  type PlanCommission,
} from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";

/*
 * Tarifs en vigueur, lus par l'agent social (backend) au moment d'écrire :
 * les publications citent les prix des landings, jamais une copie qui
 * vieillit dans un prompt. Public comme les landings qui les affichent.
 */

const euros = (amount: number) => `${amount.toLocaleString("fr-FR")} €`;
const commission = (rate: PlanCommission) => `${rate.percent} % ${rate.basis}`;

function plan(plan: Plan): string {
  return [
    `${plan.name} : ${euros(plan.price)}/mois`,
    plan.commission ? ` + ${commission(plan.commission)}` : "",
    ` — ${plan.features.join(", ")}.`,
  ].join("");
}

export function GET() {
  const cachets = `Cachets (QR de table à son logo) : ${formatPrice(starterKit.cachet.price)} par table + ${formatPrice(starterKit.shipping.price)} de livraison, une fois. Boîtier Omilink (imprimantes) : ${formatPrice(starterKit.omilink.price)}, seulement si la caisse n'imprime pas en cuisine.`;
  const { bundle } = collectOffer;
  return NextResponse.json({
    menu: [
      ...(pricingSection.plans as Plan[]).map(plan),
      pricingSection.cardFeesNote,
      cachets,
      "Sans engagement, résiliable à tout moment.",
    ].join("\n"),
    collect: [
      `${collectOffer.name} : ${euros(collectOffer.price)}/mois + ${commission(collectOffer.commission)}.`,
      `${bundle.name} : ${euros(bundle.price)}/mois + ${commission(bundle.menuCommission)} et ${commission(collectOffer.commission)}.`,
      "Sans engagement, résiliable à tout moment.",
    ].join("\n"),
  });
}
