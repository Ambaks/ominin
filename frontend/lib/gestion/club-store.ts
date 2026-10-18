"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useSyncExternalStore } from "react";
import {
  rowToBooking,
  rowToEvent,
  rowToGuest,
  rowToTable,
  rowToZone,
} from "@/lib/club/mappers";
import type {
  BookingStatus,
  ClubBooking,
  ClubEvent,
  ClubGuest,
  ClubTable,
  ClubZone,
} from "@/lib/club/types";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { must } from "@/lib/supabase/result";
import { useGestion } from "./store";

/*
 * Soirées d'un club (Ominin Club) : la salle, les soirées et, chargées à la
 * demande, leurs réservations et leurs invités. À part du store de gestion :
 * un restaurant n'en charge rien, un club n'a ni carte ni commandes. Même
 * mécanique que lui — realtime filtré sur l'établissement, relectures
 * coalescées, tout relu au retour du réseau ou de l'onglet.
 */

type Client = SupabaseClient<Database>;

/** Une zone en vente un soir : son prix du soir, null pour celui de la zone. */
export type EventZoneSetting = { zoneId: string; priceCents: number | null };

export type ClubNight = { bookings: ClubBooking[]; guests: ClubGuest[] };

/** Une table payée en ligne par un client pendant que l'écran était ouvert. */
export type ClubArrival = { booking: ClubBooking; eventId: string };

/** Les conditions d'entrée du club, montrées au client avant de payer sa table. */
export type ClubConditions = { minAge: number; dressCode: string | null; refused: string | null };

export interface ClubState {
  etablissementId: string;
  conditions: ClubConditions;
  zones: ClubZone[];
  tables: ClubTable[];
  events: ClubEvent[];
  eventZones: Record<string, EventZoneSetting[]>;
  blocked: Record<string, string[]>;
  /** Réservations et invités par soirée, chargés à la demande (useClubNights). */
  nights: Record<string, ClubNight>;
  /** Réservations arrivées en direct, que le plan signale jusqu'à leur acquittement. */
  arrivals: ClubArrival[];
  /** Dernière lecture réussie (ms) : l'écran dit depuis quand il est à jour. */
  syncedAt: number;
}

/*
 * Ce que l'équipe a à voir d'une soirée : les tables tenues, et celles
 * remboursées (le gérant y retrouve son geste). Les annulations — attentes
 * de paiement abandonnées surtout — s'accumulent et n'ont rien à montrer.
 */
const NIGHT_STATUSES: BookingStatus[] = ["en_attente", "payee", "arrivee", "remboursee"];

let state: ClubState | null = null;
let loadingFor: string | null = null;
let loadError: string | null = null;
/** Essais de chargement : un nouvel essai relance les lectures restées en échec. */
let attempt = 0;
let channel: RealtimeChannel | null = null;
let realtimeLive: boolean | null = null;
let onVisible: (() => void) | null = null;
const pendingNights = new Set<string>();
const listeners = new Set<() => void>();
const arrivalListeners = new Set<(arrival: ClubArrival) => void>();

function notify() {
  for (const listener of listeners) listener();
}

type Row = { id: string; created_at: string };

/**
 * Lecture par pages (plafond de PostgREST), triées par (created_at, id) :
 * chacune reprend après la dernière ligne reçue, l'id départageant les
 * lignes nées dans la même transaction.
 */
async function readAll<T extends Row>(
  page: (after: string | null) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let after: string | null = null;
  for (;;) {
    const batch: T[] = must(await page(after));
    if (batch.length === 0) return rows;
    rows.push(...batch);
    const last = batch[batch.length - 1];
    after = `created_at.gt."${last.created_at}",and(created_at.eq."${last.created_at}",id.gt.${last.id})`;
  }
}

async function fetchBase(supabase: Client, etablissementId: string) {
  const [zones, tables, events, conditions] = await Promise.all([
    supabase
      .from("club_zones")
      .select("*")
      .eq("etablissement_id", etablissementId)
      .order("sort", { ascending: true })
      .then(must),
    supabase.from("club_tables").select("*").eq("etablissement_id", etablissementId).then(must),
    supabase
      .from("club_events")
      .select("*, club_event_zones(zone_id, price_cents), club_event_blocked_tables(table_id)")
      .eq("etablissement_id", etablissementId)
      .order("starts_at", { ascending: true })
      .then(must),
    supabase
      .from("etablissements")
      .select("club_min_age, club_dress_code, club_refused")
      .eq("id", etablissementId)
      .single()
      .then(must),
  ]);
  return {
    conditions: {
      minAge: conditions.club_min_age,
      dressCode: conditions.club_dress_code,
      refused: conditions.club_refused,
    },
    zones: zones.map(rowToZone),
    tables: tables
      .map(rowToTable)
      .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true })),
    events: events.map(rowToEvent),
    eventZones: Object.fromEntries(
      events.map((event) => [
        event.id,
        event.club_event_zones.map((row) => ({ zoneId: row.zone_id, priceCents: row.price_cents })),
      ])
    ),
    blocked: Object.fromEntries(
      events.map((event) => [event.id, event.club_event_blocked_tables.map((row) => row.table_id)])
    ),
  };
}

async function fetchNights(supabase: Client, eventIds: string[]): Promise<Record<string, ClubNight>> {
  const [bookings, guests] = await Promise.all([
    readAll((after) => {
      let query = supabase
        .from("club_bookings")
        .select("*")
        .in("event_id", eventIds)
        .in("status", NIGHT_STATUSES)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (after) query = query.or(after);
      return query;
    }),
    readAll((after) => {
      let query = supabase
        .from("club_guests")
        .select("*")
        .in("event_id", eventIds)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (after) query = query.or(after);
      return query;
    }),
  ]);
  const nights: Record<string, ClubNight> = Object.fromEntries(
    eventIds.map((id) => [id, { bookings: [], guests: [] }])
  );
  for (const row of bookings) nights[row.event_id].bookings.push(rowToBooking(row));
  for (const row of guests) nights[row.event_id].guests.push(rowToGuest(row));
  return nights;
}

/*
 * Relecture coalescée par clé : une relecture en vol absorbe les événements
 * suivants de la même soirée au lieu d'empiler les requêtes.
 */
function coalescedBy(what: string, refetch: (key: string) => Promise<void>) {
  const running = new Set<string>();
  const queued = new Set<string>();
  return async (key: string) => {
    if (!state) return;
    if (running.has(key)) {
      queued.add(key);
      return;
    }
    running.add(key);
    try {
      do {
        queued.delete(key);
        await refetch(key);
      } while (queued.has(key));
    } catch (error) {
      console.error(`Rafraîchissement ${what} impossible :`, error);
    } finally {
      running.delete(key);
    }
  };
}

const refreshBase = coalescedBy("des soirées", async () => {
  if (!state) return;
  const base = await fetchBase(createClient(), state.etablissementId);
  if (state) {
    state = { ...state, ...base, syncedAt: Date.now() };
    notify();
  }
});

/**
 * Remplace les soirées relues ; signale les tables qu'un client vient de
 * payer en ligne (une attente de paiement peut encore être abandonnée).
 */
function mergeNights(fresh: Record<string, ClubNight>) {
  if (!state) return;
  const arrivals: ClubArrival[] = [];
  for (const [eventId, night] of Object.entries(fresh)) {
    const before = state.nights[eventId];
    if (!before) continue;
    const paid = new Set(
      before.bookings.filter((b) => b.status === "payee" || b.status === "arrivee").map((b) => b.id)
    );
    for (const booking of night.bookings) {
      if (booking.source === "en_ligne" && booking.status === "payee" && !paid.has(booking.id)) {
        arrivals.push({ booking, eventId });
      }
    }
  }
  state = {
    ...state,
    nights: { ...state.nights, ...fresh },
    arrivals: [...state.arrivals, ...arrivals],
    syncedAt: Date.now(),
  };
  notify();
  for (const arrival of arrivals) {
    for (const listener of arrivalListeners) listener(arrival);
  }
}

const refreshNight = coalescedBy("d'une soirée", async (eventId) => {
  mergeNights(await fetchNights(createClient(), [eventId]));
});

const refreshAll = coalescedBy("du club", async () => {
  await refreshBase("base");
  const loaded = state ? Object.keys(state.nights) : [];
  if (loaded.length > 0) mergeNights(await fetchNights(createClient(), loaded));
});

type NightRow = { event_id?: string };

// Une suppression n'a que l'ancienne ligne (replica identity full), un ajout que la nouvelle.
function onNightChange(payload: { new: NightRow; old: NightRow }) {
  const eventId = payload.new.event_id ?? payload.old.event_id;
  if (eventId && state?.nights[eventId]) void refreshNight(eventId);
}

function subscribeClub(supabase: Client, etablissementId: string) {
  if (channel) void supabase.removeChannel(channel);
  if (onVisible) document.removeEventListener("visibilitychange", onVisible);
  onVisible = () => {
    if (document.visibilityState === "visible") void refreshAll("all");
  };
  document.addEventListener("visibilitychange", onVisible);

  const filter = `etablissement_id=eq.${etablissementId}`;
  let joined = false;
  channel = supabase
    .channel("gestion-club")
    .on("postgres_changes", { event: "*", schema: "public", table: "club_bookings", filter }, onNightChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "club_guests", filter }, onNightChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "club_events", filter },
      () => void refreshBase("base")
    )
    .subscribe((status) => {
      const live = status === "SUBSCRIBED";
      if (live && joined) void refreshAll("all");
      joined ||= live;
      if (realtimeLive !== live) {
        realtimeLive = live;
        notify();
      }
    });
}

function startLoad(etablissementId: string) {
  loadingFor = etablissementId;
  loadError = null;
  notify();
  const supabase = createClient();
  // Abonné avant la lecture : un événement entre les deux ne passe pas inaperçu.
  subscribeClub(supabase, etablissementId);
  fetchBase(supabase, etablissementId)
    .then((base) => {
      state = { etablissementId, ...base, nights: {}, arrivals: [], syncedAt: Date.now() };
      notify();
    })
    .catch((error: unknown) => {
      console.error("Chargement des soirées impossible :", error);
      loadError = error instanceof Error ? error.message : "Une erreur est survenue.";
      loadingFor = null;
      notify();
    });
}

function ensureNights(eventIds: string[]) {
  if (!state) return;
  const missing = eventIds.filter((id) => !state?.nights[id] && !pendingNights.has(id));
  if (missing.length === 0) return;
  for (const id of missing) pendingNights.add(id);
  fetchNights(createClient(), missing)
    .then((nights) => {
      if (!state) return;
      state = { ...state, nights: { ...state.nights, ...nights }, syncedAt: Date.now() };
      notify();
    })
    .catch((error: unknown) => {
      console.error("Chargement des réservations impossible :", error);
      loadError = error instanceof Error ? error.message : "Une erreur est survenue.";
      notify();
    })
    .finally(() => {
      for (const id of missing) pendingNights.delete(id);
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = (): ClubState | null => null;

const getAttempt = () => attempt;

/** Le club de l'espace ouvert, ou null pendant son chargement. */
export function useClub(): ClubState | null {
  const gestion = useGestion();
  const etablissementId = gestion?.etablissement.id;
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const tries = useSyncExternalStore(subscribe, getAttempt, () => 0);
  useEffect(() => {
    if (etablissementId && loadingFor !== etablissementId) startLoad(etablissementId);
  }, [etablissementId, tries]);
  return snapshot?.etablissementId === etablissementId ? snapshot : null;
}

/** Charge les réservations et invités de ces soirées (une seule lecture pour toutes). */
export function useClubNights(eventIds: string[]) {
  const ready = useSyncExternalStore(subscribe, () => state !== null, () => false);
  const tries = useSyncExternalStore(subscribe, getAttempt, () => 0);
  const key = eventIds.join(",");
  useEffect(() => {
    if (ready && key) ensureNights(key.split(","));
  }, [ready, key, tries]);
}

export function useClubLoadError(): string | null {
  return useSyncExternalStore(subscribe, () => loadError, () => null);
}

/** Flux realtime joint (true), coupé (false) ou pas encore établi (null). */
export function useClubRealtime(): boolean | null {
  return useSyncExternalStore(subscribe, () => realtimeLive, () => null);
}

export function retryClubLoad() {
  loadError = null;
  attempt += 1;
  if (state) void refreshAll("all");
  notify();
}

/** Prévient à chaque table réservée en direct par un client ; renvoie le désabonnement. */
export function onClubArrival(listener: (arrival: ClubArrival) => void): () => void {
  arrivalListeners.add(listener);
  return () => {
    arrivalListeners.delete(listener);
  };
}

/** État courant — réservé aux mutations de club-api.ts, après chargement. */
export function getClub(): ClubState {
  if (!state) throw new Error("Soirées non chargées.");
  return state;
}

/** Le plan a signalé la réservation : elle quitte la file des arrivées. */
export function acknowledgeArrival(bookingId: string) {
  if (!state?.arrivals.some((arrival) => arrival.booking.id === bookingId)) return;
  state = {
    ...state,
    arrivals: state.arrivals.filter((arrival) => arrival.booking.id !== bookingId),
  };
  notify();
}

export function commitClub(next: ClubState) {
  state = next;
  notify();
}

/** Relit une soirée sans attendre l'événement realtime (après une route serveur). */
export async function refreshNightNow(eventId: string): Promise<void> {
  if (state?.nights[eventId]) await refreshNight(eventId);
}

export async function refreshClubNow(): Promise<void> {
  await refreshAll("all");
}
