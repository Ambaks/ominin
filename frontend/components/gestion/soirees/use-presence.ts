"use client";

import { useState } from "react";

type Presence = "stable" | "entree" | "sortie";

type Row<T> = { key: string; item: T; presence: Presence };

/*
 * Une liste qui vit en direct : une ligne nouvelle entre (« entree »), une
 * ligne disparue reste le temps de sortir (« sortie »), à sa place, jusqu'à
 * ce que son animation l'acquitte (done). Au premier rendu, rien n'anime ;
 * rien non plus quand resetKey change (recherche, filtre) : la liste se pose
 * d'un coup, la frappe ne fait rien danser.
 */
export function usePresence<T>(items: T[], keyOf: (item: T) => string, resetKey = "") {
  const signature = items.map(keyOf).join("|");
  const [state, setState] = useState(() => ({
    signature,
    resetKey,
    rows: items.map((item): Row<T> => ({ key: keyOf(item), item, presence: "stable" })),
  }));

  let rows = state.rows;
  if (state.resetKey !== resetKey) {
    rows = items.map((item): Row<T> => ({ key: keyOf(item), item, presence: "stable" }));
    setState({ signature, resetKey, rows });
  } else if (state.signature !== signature) {
    const kept = new Map(state.rows.filter((row) => row.presence !== "sortie").map((row) => [row.key, row]));
    const current = new Set(items.map(keyOf));
    const next: Row<T>[] = items.map((item) => {
      const key = keyOf(item);
      return { key, item, presence: kept.get(key)?.presence ?? "entree" };
    });
    state.rows.forEach((row, index) => {
      if (!current.has(row.key)) next.splice(Math.min(index, next.length), 0, { ...row, presence: "sortie" });
    });
    rows = next;
    setState({ signature, resetKey, rows: next });
  }

  const fresh = new Map(items.map((item) => [keyOf(item), item]));
  const shown = rows.map((row) =>
    row.presence === "sortie" ? row : { ...row, item: fresh.get(row.key) ?? row.item }
  );
  const done = (key: string) =>
    setState((current) => ({
      ...current,
      rows: current.rows.filter((row) => !(row.key === key && row.presence === "sortie")),
    }));
  return [shown, done] as const;
}
