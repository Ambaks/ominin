"use client";

import { ClockIcon } from "@/components/gestion/icons";
import { StatTile, type DeltaTone } from "@/components/gestion/ui";
import {
  ENCAISSER_WAIT_MIN_ORDERS,
  ENCAISSER_WAIT_NOTABLE_MINUTES,
} from "@/lib/gestion/constants";
import { cashOutWaits } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";
import { formatWait } from "@/lib/gestion/use-now";

function medianMinutes(waits: number[]): number {
  const sorted = [...waits].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  const value = Number.isInteger(middle) ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[Math.floor(middle)];
  return Math.round(value);
}

/**
 * L'attente typique à l'encaissement sur place, face au même jour la semaine
 * dernière à la même heure. La médiane : une note oubliée une heure ne fausse
 * pas la soirée. Le nombre de commandes reste à côté : une attente plus longue
 * peut tenir à une soirée plus chargée, pas à l'équipe.
 */
export function CashOutWait({ state, weekday }: { state: GestionState; weekday: string }) {
  const at = new Date();
  const today = cashOutWaits(state, at);
  at.setDate(at.getDate() - 7);
  const lastWeek = cashOutWaits(state, at);

  const todayReady = today.length >= ENCAISSER_WAIT_MIN_ORDERS;
  const lastWeekReady = lastWeek.length >= ENCAISSER_WAIT_MIN_ORDERS;
  if (!todayReady && !lastWeekReady) return null;

  const title = "Temps typique entre la commande et l’encaissement sur place, sur les commandes déjà encaissées";
  const when = `${weekday} dernier à cette heure`;
  if (!todayReady) {
    return (
      <StatTile
        entity="money"
        icon={<ClockIcon />}
        label="Attente à l’encaissement"
        value="—"
        baseline={`était ${formatWait(medianMinutes(lastWeek))} ${when}`}
        title={title}
      />
    );
  }

  const current = medianMinutes(today);
  if (!lastWeekReady) {
    return (
      <StatTile
        entity="money"
        icon={<ClockIcon />}
        label="Attente à l’encaissement"
        value={formatWait(current)}
        baseline={`${today.length} commandes · pas de repère ${when}`}
        title={title}
      />
    );
  }

  const gap = current - medianMinutes(lastWeek);
  const slower = gap >= ENCAISSER_WAIT_NOTABLE_MINUTES;
  const tone: DeltaTone = slower ? "worse" : gap <= -ENCAISSER_WAIT_NOTABLE_MINUTES ? "better" : "neutral";
  return (
    <StatTile
      entity={slower ? "problem" : "money"}
      icon={<ClockIcon />}
      label="Attente à l’encaissement"
      value={formatWait(current)}
      delta={{ text: `${gap > 0 ? "+" : gap < 0 ? "−" : ""}${Math.abs(gap)} min`, tone }}
      baseline={`${slower ? "plus lent que" : "vs"} ${when} · ${today.length} commandes contre ${lastWeek.length}`}
      title={title}
    />
  );
}
