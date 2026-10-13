"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { toggleClosure } from "@/lib/gestion/api";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import {
  closedItems,
  closureActive,
  closesLater,
  closureUntil,
  dayEndLabel,
  describeTargets,
  liftedToday,
  listFr,
  serviceClock,
  targetedItems,
  type ServiceClock,
} from "@/lib/gestion/fermetures";
import type { Closure } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import type { MenuCategory } from "@/lib/menu-data";

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
          ? `« ${closure.name} » à l’arrêt jusqu’à ${closureUntil(updated, clock, dayEndHour)}.`
          : blocked
            ? `« ${closure.name} » de nouveau en service, mais ${listFr(
                blocked.by.map((name) => `« ${name} »`)
              )} ${blocked.by.length > 1 ? "coupent" : "coupe"} encore ${listFr(blocked.items)}.`
            : `« ${closure.name} » de nouveau en service.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(null);
    }
  };

  return { run, busy };
}

/*
 * Pendant le service, d'un geste : fermer la cuisine quand elle s'arrête,
 * la rouvrir pour une table arrivée tard. Le gérant et le cuisinier y ont
 * accès ; le geste vaut jusqu'à la fin de la journée de service.
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
      return `à l’arrêt jusqu’à ${closureUntil(closure, clock, dayEndHour)}`;
    }
    if (liftedToday(closure, clock)) return "en service · horaire suspendu aujourd’hui";
    const later = closesLater(closure, clock, dayEndHour);
    return later ? `en service · ferme à ${later}` : "en service";
  };
  const confirmingTargets = confirming && describeTargets(confirming, categories);
  // Levée pendant son horaire, la refermer rend la main à l'horaire : elle
  // rouvrira à sa fin, pas forcément à la bascule.
  const confirmingUntil =
    confirming && liftedToday(confirming, clock)
      ? closureUntil(
          { ...confirming, overrideClosed: null, overrideDay: null },
          clock,
          dayEndHour
        )
      : dayEndLabel(dayEndHour);

  return (
    <div
      data-visite="commandes-fermetures"
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:self-start"
    >
      {closures.map((closure) => {
        const active = closureActive(closure, clock, dayEndHour);
        return (
          <div
            key={closure.id}
            className={`flex items-center justify-between gap-3 rounded-full border py-1 pl-4 pr-1 ${
              active ? "border-ember-3/40 bg-ember-3/10" : "border-hairline bg-surface"
            }`}
          >
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
              <span
                aria-hidden
                className={`size-2 rounded-full ${active ? "bg-ember-3" : "border border-current text-muted"}`}
              />
              <span className="font-medium">{closure.name}</span>
              <span className="text-muted">
                {status(closure)}
              </span>
            </span>
            <button
              type="button"
              disabled={busy === closure.id}
              onClick={() =>
                active ? void run(closure, false) : setConfirming(closure)
              }
              aria-label={`${active ? "Rouvrir" : "Fermer"} : ${closure.name}`}
              className={`min-h-11 rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
                active
                  ? "ember-gradient text-background"
                  : "border border-hairline text-foreground hover:border-ember-3/40"
              }`}
            >
              {active ? "Rouvrir" : "Fermer"}
            </button>
          </div>
        );
      })}

      {confirming && (
        <ConfirmDialog
          title={`Fermer « ${confirming.name} » ?`}
          message={
            confirmingTargets
              ? `Vos clients verront « Plus servi » sur ${confirmingTargets} jusqu’à ${confirmingUntil}, ou jusqu’à ce que vous rouvriez.`
              : "Elle ne coupe plus aucun article : le gérant les choisit dans Établissement."
          }
          confirmLabel="Fermer maintenant"
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
    <div className="flex flex-col gap-1 self-start rounded-2xl border border-ember-3/40 bg-ember-3/10 px-4 py-2.5 text-sm">
      {active.map((closure) => (
        <p key={closure.id} className="flex items-baseline gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-ember-3" />
          <span>
            <span className="font-medium">À l’arrêt :</span> {closure.name}
            <span className="text-muted">
              {" "}
              ({describeTargets(closure, categories)}) jusqu’à{" "}
              {closureUntil(closure, clock, dayEndHour)}
            </span>
          </span>
        </p>
      ))}
    </div>
  );
}
