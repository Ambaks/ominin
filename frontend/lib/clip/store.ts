"use client";

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { must } from "@/lib/supabase/result";
import { POSTS_PAGE_SIZE } from "./constants";
import type { ConnectedAccount } from "./provider/types";
import { rowToClipPost, type ClipState } from "./types";

/*
 * Store de l'espace clipper, calqué sur lib/gestion/store.ts mais sans
 * membership ni realtime : un clipper = un utilisateur, et ses publications
 * n'évoluent que par ses propres actions (+ polling du statut).
 */

let state: ClipState | null = null;
let loadStarted = false;
let loadError: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Appel JSON vers nos routes /api/clip — l'erreur française remonte telle quelle. */
export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !body) {
    throw new Error(body?.error ?? "Une erreur est survenue.");
  }
  return body;
}

async function load(): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) {
    window.location.assign("/login");
    return;
  }

  const [{ accounts }, rows] = await Promise.all([
    fetchApi<{ accounts: ConnectedAccount[] }>("/api/clip/accounts"),
    supabase
      .from("clip_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(POSTS_PAGE_SIZE)
      .then(must),
  ]);

  state = {
    email: user.email ?? "",
    accounts,
    posts: rows.map(rowToClipPost),
  };
  notify();
}

function startLoad() {
  loadStarted = true;
  loadError = null;
  notify();
  load().catch((error) => {
    console.error("Chargement de l'espace clipper impossible :", error);
    loadError =
      error instanceof Error ? error.message : "Une erreur est survenue.";
    // Autorise un nouvel essai via retryLoad().
    loadStarted = false;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loadStarted && !state) startLoad();
  return () => {
    listeners.delete(listener);
  };
}

export function retryLoad() {
  if (loadStarted || state) return;
  startLoad();
  notify();
}

const getClientSnapshot = (): ClipState | null => state;

// Référence stable exigée par useSyncExternalStore côté serveur.
const getServerSnapshot = (): ClipState | null => null;

const getErrorSnapshot = (): string | null => loadError;

/** Message d'échec du chargement initial, ou null. */
export function useClipLoadError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, () => null);
}

/** État courant — réservé aux mutations d'api.ts, après chargement. */
export function getState(): ClipState {
  if (!state) throw new Error("Espace clipper non chargé.");
  return state;
}

export function commit(next: ClipState) {
  state = next;
  notify();
}

/** État complet, ou null côté serveur / avant chargement (⇒ squelette). */
export function useClip(): ClipState | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
