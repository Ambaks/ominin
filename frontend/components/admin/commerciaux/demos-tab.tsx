"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { deliverDemo, fetchDemoRequests, openDocument, type DemoRow } from "@/lib/admin/commerciaux";
import { formatDate } from "@/lib/admin/format";
import { GHOST_BUTTON } from "./commerciaux-tab";

/*
 * Démos à faire (lot 2) : les demandes des commerciaux, photos de la carte
 * comprises, traitées avec /new-restaurant. Livrer pose le lien sur la
 * fiche, coche l'étape 2 et prévient le commercial.
 */
export function DemosTab() {
  const toast = useToast();
  const [rows, setRows] = useState<DemoRow[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const load = useCallback(() => fetchDemoRequests().then(setRows), []);
  useEffect(() => void load(), [load]);

  if (!rows) return <div aria-busy className="shimmer h-40 rounded-2xl" />;
  const waiting = rows.filter((row) => row.status === "requested");
  const done = rows.filter((row) => row.status !== "requested");

  const deliver = async (row: DemoRow) => {
    try {
      await deliverDemo(row.id, urls[row.id] ?? "");
      toast.success("Démo livrée : le commercial est prévenu.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {waiting.length === 0 ? (
        <EmptyState title="Aucune démo à faire" body="Les demandes des commerciaux, avec leurs photos de carte, arrivent ici." />
      ) : (
        <ul className="flex flex-col gap-3">
          {waiting.map((row) => (
            <li key={row.id} className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4">
              <div>
                <p className="font-medium">{row.restaurant}</p>
                <p className="text-sm text-muted">
                  {row.commercial} · demandée le {formatDate(row.created_at)}
                </p>
                {row.note && <p className="mt-1 text-sm">{row.note}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.photos.map((path, index) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => void openDocument(path).catch((cause) => toast.error(String(cause)))}
                    className={GHOST_BUTTON}
                  >
                    Photo {index + 1}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={urls[row.id] ?? ""}
                  onChange={(event) => setUrls({ ...urls, [row.id]: event.target.value })}
                  placeholder="Lien de la démo livrée"
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={!urls[row.id]?.trim()}
                  onClick={() => void deliver(row)}
                  className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
                >
                  Livrer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {done.map((row) => (
            <li key={row.id}>
              {row.restaurant} · {row.commercial} ·{" "}
              {row.demo_url ? (
                <a href={row.demo_url} target="_blank" rel="noopener" className="underline">
                  démo livrée
                </a>
              ) : (
                "annulée"
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
