"use client";

import { createContext, useContext, useMemo } from "react";
import {
  fetchAnalytics,
  generateCaptions,
  pollPostStatus,
  publishClip,
  refreshAccounts,
  requestLinkUrl,
  retryPost,
  uploadClip,
} from "./api";
import type {
  CaptionSet,
  ClipPlatform,
  ConnectedAccount,
  PlatformAnalytics,
} from "./provider/types";
import { retryLoad, useClip, useClipLoadError } from "./store";
import type { ClipPost, ClipState } from "./types";

/*
 * Source de données de l'espace clipper : les écrans consomment cette surface
 * sans savoir qui la fournit. Deux fournisseurs — ClipDataProvider (store +
 * api réels, /espace) et DemoClipProvider (état en mémoire, /demo) — rendent
 * les mêmes pages, seule la provenance des données change.
 */

/** Métadonnées du clip sélectionné — `file` absent en démo (échantillon fourni). */
export interface ClipUploadInput {
  name: string;
  size: number;
  file?: File;
}

export interface ClipActions {
  uploadClip(
    input: ClipUploadInput,
    onProgress: (fraction: number) => void
  ): Promise<string>;
  generateCaptions(
    context: string,
    platforms: ClipPlatform[]
  ): Promise<CaptionSet>;
  publishClip(input: {
    path: string;
    title: string;
    captions: CaptionSet;
    platforms: ClipPlatform[];
  }): Promise<ClipPost>;
  pollPostStatus(id: string): Promise<ClipPost>;
  retryPost(id: string): Promise<ClipPost>;
  connectAccounts(): Promise<void>;
  refreshAccounts(): Promise<ConnectedAccount[]>;
  fetchAnalytics(): Promise<PlatformAnalytics[]>;
}

export interface ClipData {
  state: ClipState | null;
  loadError: string | null;
  retryLoad(): void;
  demo: boolean;
  basePath: "/espace" | "/demo";
  /** Clip d'exemple proposé au clic sur la zone de dépôt (démo uniquement). */
  sampleClip?: { name: string; size: number };
  actions: ClipActions;
}

export const ClipDataContext = createContext<ClipData | null>(null);

export function useClipData(): ClipData {
  const data = useContext(ClipDataContext);
  if (!data) {
    throw new Error("useClipData doit être utilisé sous un fournisseur Clip.");
  }
  return data;
}

async function connectAccounts(): Promise<void> {
  // Onglet ouvert avant l'await : un window.open différé serait bloqué
  // comme popup hors geste utilisateur (Safari notamment).
  const tab = window.open("", "_blank");
  try {
    const url = await requestLinkUrl();
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

const realActions: ClipActions = {
  uploadClip: (input, onProgress) => {
    if (!input.file) {
      return Promise.reject(new Error("Aucun fichier à envoyer."));
    }
    return uploadClip(input.file, onProgress);
  },
  generateCaptions,
  publishClip,
  pollPostStatus,
  retryPost,
  connectAccounts,
  refreshAccounts,
  fetchAnalytics,
};

export function ClipDataProvider({ children }: { children: React.ReactNode }) {
  const state = useClip();
  const loadError = useClipLoadError();
  const value = useMemo<ClipData>(
    () => ({
      state,
      loadError,
      retryLoad,
      demo: false,
      basePath: "/espace",
      actions: realActions,
    }),
    [state, loadError]
  );
  return (
    <ClipDataContext.Provider value={value}>
      {children}
    </ClipDataContext.Provider>
  );
}
