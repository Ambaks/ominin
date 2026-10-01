"use client";

import { useCallback, useEffect, useState } from "react";
import { useRunMutation, useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/admin/format";
import * as api from "@/lib/admin/social";
import type { SocialJob, SocialRun } from "@/lib/admin/social";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./styles";

/*
 * Les deux jobs de l'agent tournent chaque jour par cron ; ces boutons les
 * lancent tout de suite, pour un premier essai ou après un échec corrigé.
 * Publier deux fois le même jour ne double rien : le contenu du jour est
 * repris, seuls les comptes sans succès sont retentés.
 */

const JOBS: {
  id: SocialJob;
  label: string;
  action: string;
  started: string;
}[] = [
  {
    id: "social_post",
    label: "Publication du jour",
    action: "Publier maintenant",
    started:
      "Publication lancée — quelques minutes, résultat dans l'onglet Publications.",
  },
  {
    id: "social_research",
    label: "Relevé et apprentissage",
    action: "Analyser maintenant",
    started:
      "Analyse lancée — chiffres et ligne éditoriale mis à jour d'ici quelques minutes.",
  },
];

const STATUS: Record<SocialRun["status"], { label: string; tone: string }> = {
  running: { label: "en cours", tone: "text-ember-2" },
  succeeded: { label: "réussi", tone: "text-status-signed" },
  failed: { label: "en échec", tone: "text-status-lost" },
};

/** onRefresh recharge aussi les publications : un run fini en a ajouté. */
export function RunPanel({ onRefresh }: { onRefresh: () => void }) {
  const run = useRunMutation();
  const toast = useToast();
  const [runs, setRuns] = useState<
    Partial<Record<SocialJob, SocialRun | null>>
  >({});
  const [pending, setPending] = useState<SocialJob | null>(null);

  const reload = useCallback(() => {
    for (const job of JOBS) {
      api
        .fetchLatestSocialRun(job.id)
        .then((latest) =>
          setRuns((current) => ({ ...current, [job.id]: latest }))
        )
        .catch((error: unknown) =>
          toast.error(error instanceof Error ? error.message : String(error))
        );
    }
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const trigger = (job: (typeof JOBS)[number]) => {
    setPending(job.id);
    void run(async () => {
      try {
        await api.triggerSocialRun(job.id);
        reload();
      } finally {
        setPending(null);
      }
    }, job.started);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {JOBS.map((job) => {
        const latest = runs[job.id];
        const status = latest ? STATUS[latest.status] : null;
        return (
          <div
            key={job.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-4"
          >
            <div className="min-w-40 flex-1">
              <p className="text-sm font-medium">{job.label}</p>
              <p className="mt-0.5 text-xs text-muted">
                {latest === undefined ? (
                  "…"
                ) : latest && status ? (
                  <>
                    Dernier run {formatRelative(latest.startedAt)} —{" "}
                    <span className={`font-semibold ${status.tone}`}>
                      {status.label}
                    </span>
                  </>
                ) : (
                  "Jamais lancé"
                )}
              </p>
              {latest?.status === "failed" && latest.error && (
                <p className="mt-1 line-clamp-2 text-xs text-status-lost">
                  {latest.error}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending !== null || latest?.status === "running"}
                onClick={() => trigger(job)}
                className={`${PRIMARY_BUTTON} disabled:opacity-50`}
              >
                {pending === job.id ? "Lancement…" : job.action}
              </button>
              <button
                type="button"
                onClick={() => {
                  reload();
                  onRefresh();
                }}
                className={SECONDARY_BUTTON}
              >
                Actualiser
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
