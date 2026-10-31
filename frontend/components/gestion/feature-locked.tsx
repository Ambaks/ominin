"use client";

import { LockIcon } from "@/components/gestion/icons";
import { GlassButton, Plate } from "@/components/gestion/ui";
import { planFeature } from "@/lib/gestion/permissions";
import { activeProducts } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";
import type { Feature } from "@/lib/gestion/types";

/*
 * Écran fermé — et les deux raisons ne se disent pas de la même façon. Ou
 * l'offre ne le comprend pas, et il y a quelque chose à proposer ; ou Ominin
 * l'a retiré pour ce restaurant, et c'est à nous qu'il faut le demander. La
 * sortie mène à la carte, le seul écran qui ne se retire jamais.
 */
export function FeatureLocked({ feature }: { feature: Feature }) {
  const inPlan = planFeature(activeProducts(useGestion()), feature);
  return (
    <Plate className="g-rise mx-auto flex w-full max-w-xl flex-col items-start gap-3 px-5 py-6 sm:px-6">
      <span className="flex text-muted *:size-5" aria-hidden>
        <LockIcon />
      </span>
      <h1 className="font-display text-g-h2">
        {inPlan ? "Écran non activé" : "Disponible avec l’offre Smart"}
      </h1>
      <p className="text-g-body text-muted">
        {inPlan
          ? "Cet écran ne fait pas partie de ce qui est ouvert pour votre établissement. Écrivez-nous pour l’activer."
          : "Le suivi des commandes, les tables et le pointage font partie des offres Smart et Connect."}
      </p>
      <GlassButton variant="primary" href="/gestion/menu" className="mt-1">
        Retour à la carte
      </GlassButton>
    </Plate>
  );
}
