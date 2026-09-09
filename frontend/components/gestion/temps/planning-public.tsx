"use client";

import type { PlanningPayload } from "@/app/menu/planning/[token]/page";
import { MonPlanning } from "./planning";

/*
 * Le planning tel que le voit un serveur par son lien : les mêmes créneaux et
 * les mêmes heures que dans l'espace de gestion, sans rien d'autre. La fiche
 * n'a qu'un occupant, son identifiant n'a donc pas à voyager.
 */

const ME = "me";

export function PlanningPublic({
  payload,
  start,
}: {
  payload: PlanningPayload;
  /** ISO : un composant serveur ne peut pas passer une Date. */
  start: string;
}) {
  return (
    <MonPlanning
      staffId={ME}
      start={new Date(start)}
      shifts={payload.shifts.map((shift) => ({
        id: shift.id,
        staffId: ME,
        startsAt: shift.starts_at,
        endsAt: shift.ends_at,
        note: shift.note ?? undefined,
      }))}
      entries={payload.entries.map((entry) => ({
        id: entry.id,
        staffId: ME,
        startedAt: entry.started_at,
        endedAt: entry.ended_at ?? undefined,
      }))}
    />
  );
}
