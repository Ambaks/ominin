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

/**
 * Ce que le menu ne vend plus en ce moment, et jusqu'à quand : à l'aperçu,
 * sous les yeux de qui peut le rouvrir sans passer par Commandes.
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
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-medium">À l’arrêt</h2>
      <div className="rounded-2xl border border-ember-3/40 bg-ember-3/5">
        {active.map((closure, index) => (
          <div
            key={closure.id}
            className={`flex items-center justify-between gap-4 px-5 py-3 ${
              index > 0 ? "border-t border-hairline" : ""
            }`}
          >
            <div>
              <p className="text-sm font-medium">
                {closure.name}
                <span className="font-normal text-muted">
                  {" "}
                  · jusqu’à {closureUntil(closure, clock, state.dayEndHour)}
                </span>
              </p>
              <p className="text-xs text-faint">
                {describeTargets(closure, state.categories)}
              </p>
            </div>
            <button
              type="button"
              disabled={busy === closure.id}
              onClick={() => void run(closure, false)}
              aria-label={`Rouvrir : ${closure.name}`}
              className="ember-gradient min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold text-background disabled:opacity-50"
            >
              Rouvrir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
