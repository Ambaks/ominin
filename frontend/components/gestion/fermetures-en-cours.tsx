"use client";

import { useClosureToggle } from "@/components/gestion/commandes/fermetures-bar";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import {
  closureActive,
  closureUntil,
  describeTargets,
  serviceClock,
} from "@/lib/gestion/fermetures";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { ClockIcon } from "./icons";
import { GlassButton, GlassFrame, Plate } from "./ui";

/**
 * Ce que le menu ne vend plus en ce moment, et jusqu'à quand : à l'aperçu,
 * sous les yeux de qui peut le rouvrir sans passer par Commandes. Un seul
 * cadre de verre, quel que soit le nombre de fermetures.
 */
export function FermeturesEnCours({ state }: { state: GestionState }) {
  const now = useNow(WAIT_TICK_MS);
  const { run, busy } = useClosureToggle(
    state.closures,
    state.categories,
    state.dayEndHour
  );
  const clock = serviceClock(now, state.dayEndHour);
  const active = state.closures.filter((closure) =>
    closureActive(closure, clock, state.dayEndHour)
  );
  if (active.length === 0) return null;
  return (
    <GlassFrame entity="problem" eyebrow="Fermeture en cours" icon={<ClockIcon />}>
      <Plate role="status" className="px-4">
        {active.map((closure) => (
          <div
            key={closure.id}
            className="flex min-h-(--g-step-h) items-center justify-between gap-4 border-t border-hairline py-2 first:border-t-0"
          >
            <div className="min-w-0">
              <p className="text-g-body font-semibold [overflow-wrap:anywhere]">
                {closure.name}
                <span className="font-normal text-muted">
                  {" "}
                  · jusqu’à {closureUntil(closure, clock, state.dayEndHour)}
                </span>
              </p>
              <p className="text-g-meta text-muted">
                {describeTargets(closure, state.categories)}
              </p>
            </div>
            <GlassButton
              disabled={busy === closure.id}
              onClick={() => void run(closure, false)}
              aria-label={`Rouvrir : ${closure.name}`}
            >
              Rouvrir
            </GlassButton>
          </div>
        ))}
      </Plate>
    </GlassFrame>
  );
}
