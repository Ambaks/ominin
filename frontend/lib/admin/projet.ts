"use client";

import { useSyncExternalStore } from "react";
import { addDays } from "./format";
import { PRODUCT_LABELS, isProduct, type Product } from "./products";

/*
 * Section Projet : ce que GitHub dit du travail. Une gate est une milestone
 * (« <Produit> · <objectif> »), une tâche une issue, le produit un label
 * « produit:<id> » — conventions décrites dans le README (Gestion du projet).
 * Chargé une fois à l'ouverture de la section, rechargé à la demande.
 */

export interface Gate {
  number: number;
  title: string;
  description: string | null;
  dueOn: string | null;
  closed: boolean;
  url: string;
  openCount: number;
  closedCount: number;
}

export interface Person {
  login: string;
  name: string | null;
}

export interface ProjetIssue {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  gate: number | null;
  labels: string[];
  assignees: Person[];
}

export interface ProjetPull {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  updatedAt: string;
  branch: string;
  author: string | null;
  review: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  conflict: boolean;
  checks: "SUCCESS" | "FAILURE" | "ERROR" | "PENDING" | "EXPECTED" | null;
  /** Labels de la PR et des issues qu'elle ferme. */
  labels: string[];
  closes: number[];
}

export interface ProjetData {
  repo: string;
  gates: Gate[];
  issues: ProjetIssue[];
  pulls: ProjetPull[];
}

// ---------------------------------------------------------------------------
// Conventions

const PRODUCT_LABEL_PREFIX = "produit:";
const GATE_SEPARATOR = " · ";
export const STATUS_IN_PROGRESS_LABEL = "statut:en-cours";
export const STATUS_BLOCKED_LABEL = "statut:bloqué";
export const PRIORITY_LABEL = "priorité:haute";
const TYPE_LABEL_PREFIX = "type:";

/** « Menu · LZ.FOOD autonome » → produit et objectif ; « Transverse · … » → null. */
export function splitGateTitle(title: string): {
  product: Product | null;
  goal: string;
} {
  const at = title.indexOf(GATE_SEPARATOR);
  if (at < 0) return { product: null, goal: title };
  const prefix = title.slice(0, at);
  const product =
    (Object.entries(PRODUCT_LABELS).find(
      ([, label]) => label === prefix,
    )?.[0] as Product | undefined) ?? null;
  return { product, goal: title.slice(at + GATE_SEPARATOR.length) };
}

function labelProducts(labels: string[]): Product[] {
  return labels
    .filter((label) => label.startsWith(PRODUCT_LABEL_PREFIX))
    .map((label) => label.slice(PRODUCT_LABEL_PREFIX.length))
    .filter(isProduct);
}

/** Types d'une issue, sans leur préfixe (« code », « décision »…). */
export function issueTypes(issue: ProjetIssue): string[] {
  return issue.labels
    .filter((label) => label.startsWith(TYPE_LABEL_PREFIX))
    .map((label) => label.slice(TYPE_LABEL_PREFIX.length));
}

export type IssueStatus = "todo" | "in_progress" | "blocked";

/** Bloquée prime ; une PR ouverte qui la ferme vaut « en cours ». */
export function issueStatus(
  issue: ProjetIssue,
  pulls: ProjetPull[],
): IssueStatus {
  if (issue.labels.includes(STATUS_BLOCKED_LABEL)) return "blocked";
  if (
    issue.labels.includes(STATUS_IN_PROGRESS_LABEL) ||
    pulls.some((pull) => pull.closes.includes(issue.number))
  ) {
    return "in_progress";
  }
  return "todo";
}

export type GateState = "done" | "late" | "upcoming" | "undated";

export function gateState(gate: Gate, now = new Date()): GateState {
  if (gate.closed || (gate.openCount === 0 && gate.closedCount > 0))
    return "done";
  if (!gate.dueOn) return "undated";
  // GitHub date l'échéance à minuit UTC : la gate a toute sa journée.
  return addDays(new Date(gate.dueOn), 1) < now ? "late" : "upcoming";
}

/** Gates datées d'abord, par échéance ; les « plus tard » ensuite. */
export function sortGates(gates: Gate[]): Gate[] {
  return [...gates].sort(
    (a, b) =>
      (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") ||
      a.number - b.number,
  );
}

export const personLabel = (person: Person) => person.name ?? person.login;

/** Ce que la vue d'un produit garde ; la vue d'ensemble garde tout. */
export function selectProjetFor(
  data: ProjetData,
  product: Product | null,
): ProjetData {
  if (!product) return data;
  const gates = data.gates.filter(
    (gate) => splitGateTitle(gate.title).product === product,
  );
  const gateNumbers = new Set(gates.map((gate) => gate.number));
  return {
    ...data,
    gates,
    issues: data.issues.filter(
      (issue) =>
        labelProducts(issue.labels).includes(product) ||
        (issue.gate !== null && gateNumbers.has(issue.gate)),
    ),
    pulls: data.pulls.filter((pull) =>
      labelProducts(pull.labels).includes(product),
    ),
  };
}

// ---------------------------------------------------------------------------
// Chargement

interface ProjetState {
  data: ProjetData | null;
  error: string | null;
  loading: boolean;
}

let state: ProjetState = { data: null, error: null, loading: false };
const listeners = new Set<() => void>();

function set(next: Partial<ProjetState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export async function reloadProjet(): Promise<void> {
  if (state.loading) return;
  set({ loading: true, error: null });
  try {
    const response = await fetch("/api/admin/github", { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as
      ProjetData | { error?: string };
    if (!response.ok || !("gates" in body)) {
      throw new Error(
        ("error" in body && body.error) || "Lecture de GitHub impossible.",
      );
    }
    set({ data: body, loading: false });
  } catch (error) {
    set({
      loading: false,
      error:
        error instanceof Error
          ? error.message
          : "Lecture de GitHub impossible.",
    });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!state.data && !state.loading && !state.error) void reloadProjet();
  return () => {
    listeners.delete(listener);
  };
}

const serverState: ProjetState = { data: null, error: null, loading: false };

export function useProjet(): ProjetState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}
