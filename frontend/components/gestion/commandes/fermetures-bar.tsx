"use client";

import { useState } from "react";
import { Chip, ConfirmSheet, GlassButton, GlassFrame, Plate } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { toggleClosure } from "@/lib/gestion/api";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import {
  closedItems,
  closureActive,
  closesLater,
  closureUntil,
  describeTargets,
  liftedUntil,
  listFr,
  manualCloseUntil,
  serviceClock,
  targetedItems,
  type ServiceClock,
} from "@/lib/gestion/fermetures";
import type { Closure } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import type { MenuCategory } from "@/lib/menu-data";
import { ClockIcon } from "../icons";
import { describeError } from "@/lib/gestion/errors";

/**
 * Fermer ou rouvrir, avec l'avis qui suit : à la barre de Commandes comme à
 * l'aperçu. Les noms sont libres (« Cuisine », « Bar ») : les états se
 * disent sans accord.
 */
export function useClosureToggle(
  closures: Closure[],
  categories: MenuCategory[],
  dayEndHour: number
) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  // Rouvrir « Risotto » ne sert pas un plat que « Cuisine » coupe encore :
  // le gérant doit l'apprendre tout de suite, pas d'un client.
  const stillClosed = (closure: Closure, clock: ServiceClock) => {
    const others = closedItems(
      closures.filter((other) => other.id !== closure.id),
      categories,
      clock,
      dayEndHour
    );
    const items = targetedItems(closure, categories).filter((item) =>
      others.has(item.id)
    );
    return items.length > 0
      ? {
          by: [...new Set(items.map((item) => others.get(item.id) as string))],
          items: items.map((item) => item.name),
        }
      : null;
  };

  const run = async (closure: Closure, closed: boolean) => {
    const clock = serviceClock(new Date(), dayEndHour);
    setBusy(closure.id);
    const blocked = closed ? null : stillClosed(closure, clock);
    try {
      const updated = await toggleClosure(closure.id, closed);
      toast.success(
        closed
          ? `« ${closure.name} » à l’arrêt jusqu’à ${closureUntil(updated, clock, dayEndHour)}.`
          : blocked
            ? `« ${closure.name} » de nouveau en service, mais ${listFr(
                blocked.by.map((name) => `« ${name} »`)
              )} ${blocked.by.length > 1 ? "coupent" : "coupe"} encore ${listFr(blocked.items)}.`
            : `« ${closure.name} » de nouveau en service.`
      );
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(null);
    }
  };

  return { run, busy };
}

/*
 * Pendant le service, d'un geste : fermer la cuisine quand elle s'arrête,
 * la rouvrir pour une table arrivée tard. Le gérant et le cuisinier y ont
 * accès ; le geste vaut jusqu'au prochain changement de l'horaire, au plus
 * tard la fin de la journée de service. Un bandeau de verre par fermeture :
 * grenat à l'arrêt, neutre en service.
 */
export function FermeturesBar({
  closures,
  categories,
  dayEndHour,
}: {
  closures: Closure[];
  categories: MenuCategory[];
  dayEndHour: number;
}) {
  const now = useNow(WAIT_TICK_MS);
  const [confirming, setConfirming] = useState<Closure | null>(null);
  const clock = serviceClock(now, dayEndHour);
  const { run, busy } = useClosureToggle(closures, categories, dayEndHour);
  const status = (closure: Closure) => {
    if (closureActive(closure, clock, dayEndHour)) {
      return `À l’arrêt jusqu’à ${closureUntil(closure, clock, dayEndHour)}`;
    }
    const suspended = liftedUntil(closure, clock, dayEndHour);
    if (suspended) return `En service · horaire suspendu jusqu’à ${suspended}`;
    const later = closesLater(closure, clock, dayEndHour);
    return later ? `En service · ferme à ${later}` : "En service";
  };
  const confirmingTargets = confirming && describeTargets(confirming, categories);
  const confirmingUntil = confirming && manualCloseUntil(confirming, clock, dayEndHour);

  const anyActive = closures.some((closure) => closureActive(closure, clock, dayEndHour));

  return (
    <div data-visite="commandes-fermetures" className="rounded-g-frame">
      <GlassFrame entity={anyActive ? "problem" : "orders"} eyebrow="Fermetures" icon={<ClockIcon />}>
        <Plate className="flex flex-col divide-y divide-hairline px-4">
          {closures.map((closure) => {
            const active = closureActive(closure, clock, dayEndHour);
            return (
              <div key={closure.id} className="flex min-h-g-control items-center gap-3 py-1.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="min-w-0 text-g-body font-semibold [overflow-wrap:anywhere]">{closure.name}</span>
                  {active ? (
                    <Chip tone="problem" icon={<ClockIcon />}>
                      {status(closure)}
                    </Chip>
                  ) : (
                    <span className="text-g-meta text-muted">{status(closure)}</span>
                  )}
                </div>
                <GlassButton
                  variant={active ? "primary" : "secondary"}
                  disabled={busy === closure.id}
                  onClick={() => (active ? void run(closure, false) : setConfirming(closure))}
                  aria-label={`${active ? "Rouvrir" : "Fermer"} : ${closure.name}`}
                >
                  {active ? "Rouvrir" : "Fermer"}
                </GlassButton>
              </div>
            );
          })}
        </Plate>
      </GlassFrame>

      {confirming && (
        <ConfirmSheet
          title={`Fermer « ${confirming.name} » ?`}
          text={
            confirmingTargets
              ? `Vos clients verront « Plus servi » sur ${confirmingTargets} jusqu’à ${confirmingUntil}, ou jusqu’à ce que vous rouvriez.`
              : "Elle ne coupe plus aucun article : le gérant les choisit dans Réglages."
          }
          confirmLabel="Fermer maintenant"
          cancelLabel="Laisser en service"
          onConfirm={() => {
            const closure = confirming;
            setConfirming(null);
            void run(closure, true);
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/**
 * Pour la salle, sans les boutons : un client demandera pourquoi le burger a
 * disparu de la carte.
 */
export function FermeturesStatut({
  closures,
  categories,
  dayEndHour,
}: {
  closures: Closure[];
  categories: MenuCategory[];
  dayEndHour: number;
}) {
  const now = useNow(WAIT_TICK_MS);
  const clock = serviceClock(now, dayEndHour);
  const active = closures.filter((closure) =>
    closureActive(closure, clock, dayEndHour)
  );
  if (active.length === 0) return null;
  return (
    <GlassFrame entity="problem" eyebrow="Fermetures" icon={<ClockIcon />}>
      <Plate className="flex flex-col divide-y divide-hairline px-4">
        {active.map((closure) => (
          <div key={closure.id} className="flex min-h-g-control flex-wrap items-center gap-x-2.5 gap-y-1 py-1.5">
            <span className="min-w-0 text-g-body font-semibold [overflow-wrap:anywhere]">{closure.name}</span>
            <Chip tone="problem" icon={<ClockIcon />}>
              {`À l’arrêt jusqu’à ${closureUntil(closure, clock, dayEndHour)}`}
            </Chip>
            <span className="basis-full text-g-meta text-muted">{describeTargets(closure, categories)}</span>
          </div>
        ))}
      </Plate>
    </GlassFrame>
  );
}
