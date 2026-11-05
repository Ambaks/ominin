"use client";

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import { folio, gestion, guest, live, staff, staffSeed, type Activity, type FolioLine, type RoomStatus } from "@/lib/hotels-demo-data";

/*
 * L'état de la démo, partagé par tous ses QR codes et par l'espace équipe :
 * le client reconnu, sa note de chambre, ce qui est en cours, l'affluence
 * comptée par l'équipe, l'état des chambres. Gardé dans le navigateur, pour que la commande passée
 * au transat se retrouve sur la note ouverte depuis la chambre et dans
 * l'onglet de l'équipe ; jamais envoyé. La démo vit un jour d'été fixe,
 * à partir de `gestion.today.hour` : son horloge part de `startedAt`.
 */

interface State {
  recognised: boolean;
  folio: FolioLine[];
  activity: Activity[];
  /** Les présents comptés par l'équipe, par espace ; absent, le chiffre de départ. */
  counts: Record<string, number>;
  /** L'état des chambres changé par l'équipe ; absent, celui de départ. */
  rooms: Record<string, RoomStatus>;
  /** Les chambres dont la note est partie sur la facture. */
  sent: string[];
  /** L'instant réel (ms) où la démo a commencé : son horloge en part. */
  startedAt: number;
  /** Posé au chargement depuis le navigateur : avant, rien n'est sauvegardé. */
  loaded: boolean;
}

type Saved = Omit<State, "loaded">;

type Action =
  | { type: "load"; state: Saved }
  | { type: "recognise" }
  | { type: "charge"; line: FolioLine }
  | { type: "track"; activity: Activity }
  | { type: "advance"; id: string }
  | { type: "dismiss"; id: string }
  | { type: "count"; id: string; value: number }
  | { type: "room"; room: string; status: RoomStatus }
  | { type: "send"; room: string }
  | { type: "reset"; activity: Activity[]; startedAt: number };

const initial: State = { recognised: false, folio: folio.seed, activity: [], counts: {}, rooms: {}, sent: [], startedAt: 0, loaded: false };
/** Versionnée : un état d'une version précédente de la démo est ignoré. */
const storageKey = "ominin-hotels-demo-v2";

export const isDone = (a: Activity) => a.step === a.steps.length - 1;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { ...action.state, loaded: true };
    case "recognise":
      return state.recognised ? state : { ...state, recognised: true };
    case "charge":
      return { ...state, folio: [...state.folio, action.line], sent: state.sent.filter((room) => room !== guest.room) };
    case "track":
      return { ...state, activity: [action.activity, ...state.activity] };
    case "advance":
      return { ...state, activity: state.activity.map((a) => (a.id === action.id && !isDone(a) ? { ...a, step: a.step + 1 } : a)) };
    case "dismiss":
      return { ...state, activity: state.activity.map((a) => (a.id === action.id ? { ...a, hidden: true } : a)) };
    case "count":
      return { ...state, counts: { ...state.counts, [action.id]: action.value } };
    case "room":
      return { ...state, rooms: { ...state.rooms, [action.room]: action.status } };
    case "send":
      return state.sent.includes(action.room) ? state : { ...state, sent: [...state.sent, action.room] };
    case "reset":
      return { ...initial, activity: action.activity, startedAt: action.startedAt, loaded: true };
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** L'état relu du navigateur, s'il a la forme de cette version ; sinon rien. */
function parse(json: string | null): Saved | null {
  try {
    const saved: unknown = JSON.parse(json ?? "null");
    if (!isRecord(saved)) return null;
    const { recognised, folio, activity, counts, rooms, sent, startedAt } = saved;
    const ok =
      typeof recognised === "boolean" &&
      Array.isArray(folio) &&
      Array.isArray(activity) &&
      activity.every((a) => isRecord(a) && typeof a.id === "string" && typeof a.step === "number" && Array.isArray(a.steps) && Array.isArray(a.actions)) &&
      isRecord(counts) &&
      isRecord(rooms) &&
      Array.isArray(sent) &&
      typeof startedAt === "number";
    return ok ? (saved as unknown as Saved) : null;
  } catch {
    return null;
  }
}

const day = 24 * 60;

/** Le début de la démo, tenu à jour par `DemoProvider` pour l'horloge lue hors de React. */
let started = Date.now();

/** Les minutes depuis minuit à l'horloge de la démo. */
export function demoMinutes(now = Date.now(), startedAt = started): number {
  return (gestion.today.hour * 60 + Math.max(0, Math.floor((now - startedAt) / 60_000))) % day;
}

/** L'heure de la démo, « 16 h 05 ». */
export function clock(now = Date.now()): string {
  return staff.time(demoMinutes(now));
}

/** Les minutes écoulées depuis une heure donnée par `clock` jusqu'à `now` (minutes de la démo), passage de minuit compris. */
export function minutesSince(at: string, now = demoMinutes()): number {
  const [, hours, minutes] = /(\d+)\D+(\d+)/.exec(at)?.map(Number) ?? [];
  if (hours === undefined || minutes === undefined) return 0;
  return (now - (hours * 60 + minutes) + day) % day;
}

let counter = 0;

/** Un identifiant unique ; `crypto.randomUUID` manque hors contexte sécurisé (téléphone en http sur le réseau local). */
function newId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

function seeded(): Activity[] {
  const now = gestion.today.hour * 60;
  return staffSeed.map(({ ago, ...seed }, i) => ({ ...seed, id: `seed-${i}`, detail: "", at: staff.time((now - ago + day) % day), seed: true }));
}

/** Repart de zéro : l'état de départ, l'horloge remise à l'heure de la démo. */
function fresh(): Action {
  started = Date.now();
  return { type: "reset", activity: seeded(), startedAt: started };
}

const DemoContext = createContext<{ state: State; dispatch: (action: Action) => void } | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    if (!state.loaded) return;
    try {
      const json = JSON.stringify(state);
      if (localStorage.getItem(storageKey) !== json) localStorage.setItem(storageKey, json);
    } catch {}
  }, [state]);

  useEffect(() => {
    let saved: Saved | null = null;
    try {
      saved = parse(localStorage.getItem(storageKey));
    } catch {}
    if (saved) started = saved.startedAt;
    dispatch(saved ? { type: "load", state: saved } : fresh());

    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = parse(event.newValue);
      if (!next) return;
      started = next.startedAt;
      dispatch({ type: "load", state: next });
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return <DemoContext.Provider value={{ state, dispatch }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo hors de DemoProvider");
  const { state, dispatch } = context;
  return {
    ...state,
    total: state.folio.reduce((sum, line) => sum + line.amount, 0),
    /** L'affluence du moment : le chiffre de départ, ou celui que l'équipe a compté. */
    places: live.map((place) => {
      const count = state.counts[place.id];
      if (count === undefined || !place.capacity) return place;
      return { ...place, value: String(count), share: count / place.capacity, hint: place.free ? place.free(place.capacity - count) : place.hint };
    }),
    recognise: () => dispatch({ type: "recognise" }),
    charge: (line: FolioLine) => dispatch({ type: "charge", line }),
    track: (activity: Omit<Activity, "id" | "step" | "at">) =>
      dispatch({ type: "track", activity: { ...activity, id: newId(), step: 0, at: clock() } }),
    advance: (id: string) => dispatch({ type: "advance", id }),
    dismiss: (id: string) => dispatch({ type: "dismiss", id }),
    count: (id: string, value: number) => dispatch({ type: "count", id, value }),
    setRoom: (room: string, status: RoomStatus) => dispatch({ type: "room", room, status }),
    /** La note de la chambre part sur la facture ; une nouvelle ligne la rouvre. */
    sendNote: (room: string) => dispatch({ type: "send", room }),
    reset: () => dispatch(fresh()),
  };
}

/** L'heure de la démo, rafraîchie à chaque minute de son horloge. */
export function useDemoTime(): { minutes: number; label: string } {
  const { startedAt, loaded } = useDemo();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 60_000 - ((Date.now() - startedAt) % 60_000));
    return () => clearTimeout(timer);
  }, [now, startedAt]);
  const minutes = loaded ? demoMinutes(now, startedAt) : gestion.today.hour * 60;
  return { minutes, label: staff.time(minutes) };
}
