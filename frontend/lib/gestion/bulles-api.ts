"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { addDays } from "@/lib/bulles/format";
import { parisInstant } from "@/lib/collect/hours";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/*
 * L'onglet Bulles de la gestion : réglages, bulles et créneaux de
 * l'établissement, et les réservations d'un soir, relues en direct quand un
 * client paie une place ou qu'un collègue coche une arrivée. Les écritures
 * des réservations passent par les fonctions SQL (droits et règles en
 * base) ; réglages, bulles et créneaux s'écrivent directement (RLS gérant).
 */

type Tables = Database["public"]["Tables"];
export type BulleReglages = Tables["bulle_reglages"]["Row"];
export type Bulle = Tables["bulles"]["Row"];
export type BulleCreneau = Tables["bulle_creneaux"]["Row"];
export type BulleSource = Database["public"]["Enums"]["bulle_reservation_source"];

export type BulleReservation = Tables["bulle_reservations"]["Row"] & {
  bulle_parts: Pick<Tables["bulle_parts"]["Row"], "id" | "name" | "places" | "amount_cents" | "method" | "status" | "organiser">[];
};

export type BulleSetup = { reglages: BulleReglages | null; bulles: Bulle[]; creneaux: BulleCreneau[] };

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

export async function loadSetup(etablissementId: string): Promise<BulleSetup> {
  const supabase = createClient();
  const [reglages, bulles, creneaux] = await Promise.all([
    supabase.from("bulle_reglages").select("*").eq("etablissement_id", etablissementId).maybeSingle(),
    supabase.from("bulles").select("*").eq("etablissement_id", etablissementId).order("sort").order("name"),
    supabase
      .from("bulle_creneaux")
      .select("*")
      .eq("etablissement_id", etablissementId)
      .order("weekday")
      .order("start_minutes"),
  ]);
  return { reglages: unwrap(reglages), bulles: unwrap(bulles) ?? [], creneaux: unwrap(creneaux) ?? [] };
}

/**
 * Les réservations d'un soir de service : de l'heure de bascule de ce jour
 * à celle du lendemain (un créneau de minuit appartient à la veille).
 */
async function loadDay(etablissementId: string, date: string, dayEndHour: number) {
  const from = parisInstant(date, dayEndHour * 60).toISOString();
  const to = parisInstant(addDays(date, 1), dayEndHour * 60).toISOString();
  return unwrap(
    await createClient()
      .from("bulle_reservations")
      .select("*, bulle_parts(id, name, places, amount_cents, method, status, organiser)")
      .eq("etablissement_id", etablissementId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at")
  ) as BulleReservation[];
}

/** Les réservations d'un soir (null tant qu'elles se chargent), et de quoi les relire. */
export type BulleDay = {
  reservations: BulleReservation[] | null;
  error: string | null;
  refresh: () => void;
};

/** Le soir choisi, relu à chaque changement d'une réservation ou d'une part de l'établissement. */
export function useBulleDay(etablissementId: string | undefined, date: string, dayEndHour: number): BulleDay {
  const [day, setDay] = useState<{ key: string; reservations: BulleReservation[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const key = `${etablissementId}:${date}`;

  useEffect(() => {
    if (!etablissementId) return;
    let cancelled = false;
    loadDay(etablissementId, date, dayEndHour).then(
      (reservations) => {
        if (cancelled) return;
        setError(null);
        setDay({ key, reservations });
      },
      (loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [etablissementId, date, dayEndHour, key, version]);

  useEffect(() => {
    if (!etablissementId) return;
    const supabase = createClient();
    const reload = () => setVersion((count) => count + 1);
    const filter = `etablissement_id=eq.${etablissementId}`;
    const channel = supabase
      .channel(`bulles:${etablissementId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bulle_reservations", filter }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bulle_parts", filter }, reload)
      .subscribe();
    const onVisible = () => {
      if (!document.hidden) reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [etablissementId]);

  const refresh = useCallback(() => setVersion((count) => count + 1), []);
  return { reservations: day?.key === key ? day.reservations : null, error, refresh };
}

export async function markArrival(reservationId: string, arrived: boolean, paid: boolean) {
  unwrap(
    await createClient().rpc("bulle_marquer_arrivee", {
      p_reservation: reservationId,
      p_arrived: arrived,
      p_paid: paid,
    })
  );
}

export async function cancelReservation(reservationId: string) {
  unwrap(await createClient().rpc("bulle_annuler_reservation", { p_reservation: reservationId }));
}

export type NewBulleReservation = {
  bulleId: string;
  startsAt: string;
  name: string;
  phone: string;
  partySize: number;
  source: Exclude<BulleSource, "en_ligne">;
  note: string;
};

export async function createReservation(input: NewBulleReservation) {
  unwrap(
    await createClient().rpc("creer_reservation_bulle", {
      p_bulle: input.bulleId,
      p_starts_at: input.startsAt,
      p_name: input.name,
      p_phone: input.phone,
      p_party: input.partySize,
      p_source: input.source,
      p_note: input.note,
    })
  );
}

/**
 * Les gestes de l'accueil sur une réservation. Ceux de la gestion passent par
 * la session de l'équipe ; la démonstration fournit les siens (par le
 * serveur, sans compte).
 */
export type BulleActions = {
  markArrival: (reservationId: string, arrived: boolean, paid: boolean) => Promise<void>;
  cancelReservation: (reservationId: string) => Promise<void>;
  createReservation: (input: NewBulleReservation) => Promise<void>;
};

export const BulleActionsContext = createContext<BulleActions>({ markArrival, cancelReservation, createReservation });

export const useBulleActions = () => useContext(BulleActionsContext);

export async function saveReglages(
  etablissementId: string,
  values: Omit<BulleReglages, "etablissement_id">
) {
  unwrap(
    await createClient()
      .from("bulle_reglages")
      .upsert({ etablissement_id: etablissementId, ...values })
  );
}

export async function addCreneau(etablissementId: string, weekday: number, startMinutes: number) {
  unwrap(
    await createClient()
      .from("bulle_creneaux")
      .insert({ etablissement_id: etablissementId, weekday, start_minutes: startMinutes })
  );
}

export async function removeCreneau(id: string) {
  unwrap(await createClient().from("bulle_creneaux").delete().eq("id", id));
}

export async function saveBulle(
  etablissementId: string,
  bulle: { id?: string; name: string; color: string; active: boolean; sort: number; table_id: string | null }
) {
  const supabase = createClient();
  const { id, ...values } = bulle;
  const { error } = id
    ? await supabase.from("bulles").update(values).eq("id", id)
    : await supabase.from("bulles").insert({ etablissement_id: etablissementId, ...values });
  // bulles.table_id est unique : une table ne sert qu'à une bulle.
  if (error?.code === "23505") throw new Error("Cette table est déjà celle d'une autre bulle.");
  if (error) throw new Error(error.message);
}
