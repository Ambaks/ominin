"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobeIcon, PhoneIcon } from "@/components/admin/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useRunMutation } from "@/components/ui/toast";
import { httpHref } from "@/lib/admin/format";
import { excludeProspect, fetchProspects } from "@/lib/agents/api";
import {
  DISQUALIFY_REASON_LABELS,
  PROSPECTS_FETCH_LIMIT,
  PROSPECT_STATUS_BADGE_CLASSES,
  PROSPECT_STATUS_LABELS,
} from "@/lib/agents/constants";
import type { AgentProspect, ProspectStatus } from "@/lib/agents/types";

/** Onglets dans l'ordre du parcours ; « Sans e-mail » = à appeler. */
const FILTERS: ("all" | ProspectStatus)[] = [
  "all",
  "interested",
  "contacted",
  "qualified",
  "no_email",
  "pending",
  "not_interested",
  "disqualified",
];

const EXCLUDABLE: ProspectStatus[] = ["pending", "qualified", "no_email"];

function ProspectItem({
  prospect,
  onExclude,
}: {
  prospect: AgentProspect;
  onExclude: () => void;
}) {
  const status = prospect.status as ProspectStatus;
  const reason = prospect.disqualify_reason
    ? (DISQUALIFY_REASON_LABELS[prospect.disqualify_reason] ?? prospect.disqualify_reason)
    : null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{prospect.name}</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PROSPECT_STATUS_BADGE_CLASSES[status]}`}
        >
          {PROSPECT_STATUS_LABELS[status]}
        </span>
        {reason && <span className="text-xs text-faint">{reason}</span>}
        {EXCLUDABLE.includes(status) && (
          <button
            type="button"
            onClick={onExclude}
            className="ml-auto rounded-full border border-hairline px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            Exclure
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        {prospect.category}
        {prospect.city && ` · ${prospect.city}`}
        {prospect.email && ` · ${prospect.email}`}
      </p>
      {(prospect.phone || prospect.website) && (
        <div className="flex flex-wrap gap-2">
          {prospect.phone && (
            <a
              href={`tel:${prospect.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs text-muted transition-colors hover:text-foreground"
            >
              <PhoneIcon className="size-3.5" />
              {prospect.phone}
            </a>
          )}
          {prospect.website && (
            <a
              href={httpHref(prospect.website)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs text-muted transition-colors hover:text-foreground"
            >
              <GlobeIcon className="size-3.5" />
              Site web
            </a>
          )}
        </div>
      )}
      {prospect.ai_notes && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-ember-2">
            Ce que l&apos;agent en a retenu
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {prospect.ai_notes}
          </p>
        </details>
      )}
    </div>
  );
}

export default function AgentsProspectsPage() {
  const run = useRunMutation();
  const [prospects, setProspects] = useState<AgentProspect[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  useEffect(() => {
    fetchProspects().then(setProspects).catch(() => setProspects([]));
  }, []);

  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const p of prospects ?? []) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    return byStatus;
  }, [prospects]);

  if (prospects === null) return <div className="shimmer h-64 rounded-2xl" />;

  const shown = filter === "all" ? prospects : prospects.filter((p) => p.status === filter);

  const exclude = (prospect: AgentProspect) =>
    void run(async () => {
      await excludeProspect(prospect.id);
      setProspects((current) =>
        (current ?? []).map((p) =>
          p.id === prospect.id ? { ...p, status: "disqualified", disqualify_reason: "excluded" } : p
        )
      );
    }, `${prospect.name} ne sera pas contacté.`);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-medium">Prospects</h1>
        <p className="mt-1 text-sm text-muted">
          Les entreprises trouvées par l&apos;agent. Celles sans e-mail gardent leur numéro : à vous
          d&apos;appeler.
          {prospects.length >= PROSPECTS_FETCH_LIMIT && ` Les ${PROSPECTS_FETCH_LIMIT} plus récentes sont affichées.`}
        </p>
      </div>
      <PillTabs
        tabs={FILTERS.map((id) => ({
          id,
          label: id === "all" ? "Toutes" : PROSPECT_STATUS_LABELS[id],
          count: id === "all" ? prospects.length : (counts.get(id) ?? 0),
        }))}
        activeId={filter}
        onSelect={(id) => setFilter(id as (typeof FILTERS)[number])}
      />
      {shown.length === 0 ? (
        <EmptyState
          title="Aucun prospect ici"
          body="L'agent cherche de nouvelles entreprises dès que sa réserve baisse, à partir de vos cibles et de votre zone."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((prospect) => (
            <ProspectItem key={prospect.id} prospect={prospect} onExclude={() => exclude(prospect)} />
          ))}
        </div>
      )}
    </div>
  );
}
