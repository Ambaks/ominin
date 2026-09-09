"use client";

import type { ReactNode } from "react";
import { formatPercent } from "@/lib/admin/format";
import type { ClientOverview } from "@/lib/admin/metrics";
import { OFFRE_LABELS } from "@/lib/gestion/constants";

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  square: "Square",
};

export function ClientReglages({ client }: { client: ClientOverview }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface">
      <dl className="divide-y divide-hairline text-sm">
        <Row label="Offre" value={OFFRE_LABELS[client.offre] ?? client.offre} />
        <Row
          label="Encaisseur"
          value={
            <>
              {PROVIDER_LABELS[client.provider] ?? client.provider}
              {!client.provider_ready && (
                <span className="ml-2 text-xs text-muted">
                  · non relié
                </span>
              )}
            </>
          }
        />
        <Row
          label="Commission"
          value={formatPercent(client.fee_percent / 100)}
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
