"use client";

import { useSyncExternalStore } from "react";
import { DAY_NAMES, parisParts, toMinutes } from "@/lib/collect/hours";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { formatTime, type Hours } from "@/lib/sites/cyprien";

function status(hours: Hours): string {
  // Jour 0 = dimanche, comme les horaires du site ; minutes écoulées à Toulouse.
  const { isoDay, minutes } = parisParts(new Date());
  const day = isoDay % 7;
  const slotsOf = (weekday: number) => hours.find((entry) => entry.days.includes(weekday))?.slots ?? [];
  const today = slotsOf(day);
  const current = today.find(([open, close]) => minutes >= toMinutes(open) && minutes < toMinutes(close));
  if (current) return `Ouvert · jusqu’à ${formatTime(current[1])}`;
  const later = today.find(([open]) => minutes < toMinutes(open));
  if (later) return `Fermé · ouvre à ${formatTime(later[0])}`;
  // Prochaine ouverture : le premier jour suivant qui a un créneau.
  for (let offset = 1; offset <= 7; offset++) {
    const weekday = (day + offset) % 7;
    const [next] = slotsOf(weekday);
    if (next) return `Fermé · ouvre ${offset === 1 ? "demain" : DAY_NAMES[(weekday + 6) % 7].toLowerCase()} à ${formatTime(next[0])}`;
  }
  return "Fermé";
}

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, WAIT_TICK_MS);
  return () => window.clearInterval(timer);
}

/** Pastille « ouvert / fermé », calculée chez le visiteur : le serveur ne rend qu’une place vide. */
export function OpenNow({ hours }: { hours: Hours }) {
  const label = useSyncExternalStore(
    subscribe,
    () => status(hours),
    () => null,
  );
  const open = label?.startsWith("Ouvert") ?? false;
  return (
    <p className="cy-open" data-open={label ? String(open) : undefined}>
      <span className="cy-open-dot" aria-hidden="true" />
      <span>{label ?? " "}</span>
    </p>
  );
}
