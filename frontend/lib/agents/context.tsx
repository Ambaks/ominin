"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchAgent, fetchStats } from "./api";
import type { AgentMailbox, AgentProfile, AgentStats } from "./types";

/*
 * État partagé de l'espace Agents : profil, boîte connectée et compteurs,
 * lus par le chrome (statut, badge « À valider ») comme par les pages. Les
 * listes (e-mails, prospects) restent chargées par leur page.
 */

interface AgentsState {
  profile: AgentProfile;
  mailbox: AgentMailbox | null;
  stats: AgentStats;
}

interface AgentsData {
  state: AgentsState | null;
  loadError: string | null;
  /** Relit profil et compteurs après une action qui les change. */
  reload(): void;
  setProfile(profile: AgentProfile): void;
}

const AgentsContext = createContext<AgentsData | null>(null);

export function useAgents(): AgentsData {
  const data = useContext(AgentsContext);
  if (!data) {
    throw new Error("useAgents doit être utilisé sous <AgentsProvider>.");
  }
  return data;
}

/** Pour les pages, rendues seulement une fois l'état chargé par le shell. */
export function useAgentsState(): AgentsState {
  const { state } = useAgents();
  if (!state) throw new Error("État Agents non chargé.");
  return state;
}

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AgentsState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(() => {
    Promise.all([fetchAgent(), fetchStats()])
      .then(([agent, stats]) => {
        setState({ ...agent, stats });
        setLoadError(null);
      })
      .catch((error: unknown) =>
        setLoadError(
          error instanceof Error ? error.message : "Une erreur est survenue."
        )
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo<AgentsData>(
    () => ({
      state,
      loadError,
      reload,
      setProfile: (profile) =>
        setState((current) => (current ? { ...current, profile } : current)),
    }),
    [state, loadError, reload]
  );

  return (
    <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>
  );
}
