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
import { ServiceTime } from "./service-time";

/*
 * L'écran de la cuisine (UX-SIMPLICITÉ § 3.5). Les commandes sortent sur
 * l'imprimante : il reste au poste deux gestes, fermer ou rouvrir ce que la
 * cuisine sert, et marquer un plat épuisé, ici, sans passer par la Carte.
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
  // Tant qu'il n'a pas de nom, l'équipe le lit en adresse e-mail : on le
  // demande avant la liste. Ensuite, la ligne descend sous la carte.
  const named = Boolean(
    state.members.find((member) => member.userId === state.userId)?.displayName
  );
  const block = (i: number) => ({ "--g-i": i }) as CSSProperties;

  return (
    <div className="grid gap-5">
      <GlassFrame
        hero
        i={0}
        entity={stopped.length > 0 ? "problem" : "orders"}
        eyebrow="Service en direct"
        icon={<PrinterIcon />}
      >
        <Plate className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-g-h1">Cuisine</h1>
            <ServiceTime />
          </div>
          <p className="mt-1 text-g-body text-muted first-letter:uppercase">
            {today} · {stopped.length > 0 ? `à l’arrêt : ${listFr(stopped)}` : "en service"}
          </p>
        </Plate>
      </GlassFrame>

      {state.closures.length > 0 && (
        <section className="g-rise" style={block(1)}>
          <FermeturesBar
            closures={state.closures}
            categories={state.categories}
            dayEndHour={state.dayEndHour}
          />
        </section>
      )}

      {!named && <ProfileRow state={state} style={block(2)} />}

      <section className="g-rise" style={block(3)}>
        <CarteEnVente state={state} />
      </section>

      {named && <ProfileRow state={state} style={block(4)} />}
    </div>
  );
}
