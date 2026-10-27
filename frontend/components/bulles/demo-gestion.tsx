"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CLUB_TIMING } from "@/components/club/timing";
import { BullesBoard } from "@/components/gestion/bulles/board";
import { ToastProvider } from "@/components/ui/toast";
import {
  BulleActionsContext,
  type BulleActions,
  type BulleDay,
  type BulleReservation,
  type BulleSetup,
} from "@/lib/gestion/bulles-api";
import type { Table } from "@/lib/gestion/types";

/*
 * L'onglet Bulles de la démonstration, sans compte : le même tableau que la
 * gestion, lu et actionné par /api/bulles/demo. Une bulle réservée sur un
 * téléphone devant le gérant y paraît à la relecture suivante (au plus
 * CLUB_TIMING.refresh, ou au retour sur l'onglet).
 */

type Snapshot = {
  date: string;
  slug: string;
  dayEndHour: number;
  setup: BulleSetup;
  tables: Pick<Table, "id" | "number">[];
  reservations: BulleReservation[];
};

async function send(body: Record<string, unknown>) {
  const response = await fetch("/api/bulles/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? "Ce geste n'a pas pu se faire.");
  }
}

const actions: BulleActions = {
  markArrival: (reservationId, arrived, paid) => send({ action: "arrivee", reservationId, arrived, paid }),
  cancelReservation: (reservationId) => send({ action: "annuler", reservationId }),
  createReservation: (input) => send({ action: "creer", ...input }),
};

export function BullesDemoGestion() {
  const [date, setDate] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((count) => count + 1), []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/bulles/demo${date ? `?date=${date}` : ""}`)
      .then(async (response) => {
        const body = (await response.json()) as Snapshot & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "La démonstration n'a pas pu se charger.");
        return body;
      })
      .then(
        (body) => {
          if (cancelled) return;
          setError(null);
          setSnapshot(body);
        },
        (loadError: Error) => {
          if (!cancelled) setError(loadError.message);
        }
      );
    return () => {
      cancelled = true;
    };
  }, [date, version]);

  useEffect(() => {
    const reload = () => {
      if (!document.hidden) refresh();
    };
    const timer = window.setInterval(reload, CLUB_TIMING.refresh);
    document.addEventListener("visibilitychange", reload);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", reload);
    };
  }, [refresh]);

  const shown = snapshot && (date === null || snapshot.date === date) ? snapshot : null;
  const day: BulleDay = useMemo(
    () => ({ reservations: shown?.reservations ?? null, error, refresh }),
    [shown, error, refresh]
  );

  if (!snapshot) {
    return error ? (
      <p role="alert" className="rounded-2xl border border-ember-3/40 p-5 text-sm">
        {error}
      </p>
    ) : (
      <div aria-busy className="h-64 animate-pulse rounded-3xl bg-surface" />
    );
  }

  return (
    <ToastProvider>
      <BulleActionsContext value={actions}>
        <BullesBoard
          slug={snapshot.slug}
          dayEndHour={snapshot.dayEndHour}
          tables={snapshot.tables.map((table) => ({ ...table, staffId: null, groupId: null }))}
          gerant
          setup={snapshot.setup}
          date={date ?? snapshot.date}
          onDateChange={setDate}
          day={day}
        />
      </BulleActionsContext>
    </ToastProvider>
  );
}
