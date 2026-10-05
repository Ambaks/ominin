"use client";

import Link from "next/link";
import { ProjetFrame } from "@/components/admin/projet/frame";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { formatDate, formatRelative } from "@/lib/admin/format";
import { PRODUCT_LABELS } from "@/lib/admin/products";
import {
  gateState,
  sortGates,
  splitGateTitle,
  type GateState,
  type ProjetData,
} from "@/lib/admin/projet";

/*
 * La route jusqu'aux objectifs : chaque gate sur une ligne de temps, faite,
 * en retard, à venir ou « plus tard », avec la part de ses tâches bouclées.
 */

const STATE_STYLES: Record<GateState, { dot: string; label: string }> = {
  done: { dot: "bg-status-signed", label: "Atteinte" },
  late: { dot: "bg-ember-3", label: "En retard" },
  upcoming: { dot: "bg-ember-1", label: "À venir" },
  undated: { dot: "bg-hairline", label: "Plus tard" },
};

function Planning({ data }: { data: ProjetData }) {
  const { basePath, product } = useAdminBasePath();
  const gates = sortGates(data.gates);
  const next = gates.find((gate) => {
    const state = gateState(gate);
    return state === "late" || state === "upcoming";
  });
  const toReview = data.pulls.filter(
    (pull) => !pull.draft && pull.review !== "APPROVED",
  ).length;

  if (gates.length === 0) {
    return (
      <EmptyState
        title="Aucune gate pour ce produit"
        body="Créez une milestone « <Produit> · <objectif> » sur GitHub, avec une date cible."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Prochaine gate"
          value={next ? splitGateTitle(next.title).goal : "—"}
          hint={
            next
              ? `${next.dueOn ? formatRelative(next.dueOn) : ""} · ${next.openCount} tâche${next.openCount > 1 ? "s" : ""} restante${next.openCount > 1 ? "s" : ""}`
              : "Toutes les gates datées sont atteintes"
          }
          alert={next ? gateState(next) === "late" : false}
          href={
            next ? `${basePath}/projet/taches?gate=${next.number}` : undefined
          }
        />
        <StatCard
          label="Tâches ouvertes"
          value={String(data.issues.length)}
          href={`${basePath}/projet/taches`}
        />
        <StatCard
          label="PR à relire"
          value={String(toReview)}
          href={`${basePath}/projet/pull-requests`}
        />
      </div>

      <ol className="flex flex-col">
        {gates.map((gate, index) => {
          const state = gateState(gate);
          const style = STATE_STYLES[state];
          const { product: gateProduct, goal } = splitGateTitle(gate.title);
          const total = gate.openCount + gate.closedCount;
          const pct =
            total === 0 ? 0 : Math.round((gate.closedCount / total) * 100);
          return (
            <li key={gate.number} className="flex gap-4">
              <div className="w-24 shrink-0 pt-4 text-right text-xs tabular-nums text-muted">
                {gate.dueOn ? formatDate(gate.dueOn) : "Plus tard"}
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={`mt-4.5 size-3 shrink-0 rounded-full ${style.dot}`}
                />
                {index < gates.length - 1 && (
                  <span className="w-px flex-1 bg-hairline" />
                )}
              </div>
              <div className="mb-3 min-w-0 flex-1 rounded-2xl border border-hairline bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link
                    href={`${basePath}/projet/taches?gate=${gate.number}`}
                    className="min-w-0 font-medium transition-colors hover:text-ember-1"
                  >
                    {!product && (
                      <span className="text-muted">
                        {gateProduct
                          ? PRODUCT_LABELS[gateProduct]
                          : "Transverse"}
                        {" · "}
                      </span>
                    )}
                    {goal}
                  </Link>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      state === "late" ? "text-ember-3" : "text-faint"
                    }`}
                  >
                    {style.label}
                  </span>
                </div>
                {gate.description && (
                  <p className="mt-1 text-sm text-muted">{gate.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-surface-raised">
                    <div
                      className="bar-rise h-2 rounded-full bg-chart-mark"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {gate.closedCount}/{total}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default function PlanningPage() {
  return (
    <ProjetFrame title="Planning" githubPath="milestones">
      {(data) => <Planning data={data} />}
    </ProjetFrame>
  );
}
