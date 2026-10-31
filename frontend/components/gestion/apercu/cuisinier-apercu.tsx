"use client";

import type { CSSProperties } from "react";
import { FermeturesBar } from "@/components/gestion/commandes/fermetures-bar";
import { ProfileRow } from "@/components/gestion/profile-row";
import { PrinterIcon } from "@/components/gestion/icons";
import { GlassFrame, Plate } from "@/components/gestion/ui";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { closureActive, listFr, serviceClock } from "@/lib/gestion/fermetures";
import { serviceDate } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { CarteEnVente } from "./carte-en-vente";
import { ServiceClock } from "./service-clock";

/*
 * L'écran de la cuisine (UX-SIMPLICITÉ § 3.5). Les commandes sortent sur
 * l'imprimante : il reste au poste deux gestes, fermer ou rouvrir ce que la
 * cuisine sert, et marquer un plat épuisé — ici, sans passer par la Carte.
 */

export function CuisinierApercu({ state }: { state: GestionState }) {
  const now = useNow(WAIT_TICK_MS);
  const clock = serviceClock(now, state.dayEndHour);
  const stopped = state.closures
    .filter((closure) => closureActive(closure, clock, state.dayEndHour))
    .map((closure) => closure.name);
  const today = serviceDate(now, state.dayEndHour).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="grid gap-5">
      <section className="g-rise" style={{ "--g-i": 0 } as CSSProperties}>
        <GlassFrame
          hero
          entity={stopped.length > 0 ? "problem" : "orders"}
          eyebrow="Service en direct"
          icon={<PrinterIcon />}
        >
          <Plate className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-5">
            <div className="min-w-0">
              <h1 className="font-display text-g-h1">Cuisine</h1>
              <p className="mt-1.5 text-g-body text-muted">
                <span className="capitalize">{today}</span> ·{" "}
                {stopped.length > 0 ? `à l’arrêt : ${listFr(stopped)}` : "en service"}
              </p>
            </div>
            <ServiceClock />
          </Plate>
        </GlassFrame>
      </section>

      {state.closures.length > 0 && (
        <section className="g-rise" style={{ "--g-i": 1 } as CSSProperties}>
          <FermeturesBar
            closures={state.closures}
            categories={state.categories}
            dayEndHour={state.dayEndHour}
          />
        </section>
      )}

      <section className="g-rise" style={{ "--g-i": 2 } as CSSProperties}>
        <CarteEnVente state={state} />
      </section>

      <ProfileRow state={state} style={{ "--g-i": 3 } as CSSProperties} />
    </div>
  );
}
