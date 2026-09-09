"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { planFeature } from "@/lib/gestion/permissions";
import { activeProducts } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";
import type { Feature } from "@/lib/gestion/types";

/*
 * Écran fermé — et les deux raisons ne se disent pas de la même façon. Ou
 * l'offre ne le comprend pas, et il y a quelque chose à proposer ; ou Ominin
 * l'a retiré pour ce restaurant, et c'est à nous qu'il faut le demander. La
 * sortie mène au menu, le seul écran qui ne se retire jamais.
 */
export function FeatureLocked({ feature }: { feature: Feature }) {
  const inPlan = planFeature(activeProducts(useGestion()), feature);
  return (
    <EmptyState
      title={inPlan ? "Écran non activé" : "Disponible avec l'offre Smart"}
      body={
        inPlan
          ? "Cet écran ne fait pas partie de ce qui est ouvert pour votre établissement. Écrivez-nous pour l'activer."
          : "Le suivi des commandes, les tables et le badgeage font partie des offres Smart et Connect."
      }
      action={
        <Link
          href="/gestion/menu"
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
        >
          Retour au menu
        </Link>
      }
    />
  );
}
