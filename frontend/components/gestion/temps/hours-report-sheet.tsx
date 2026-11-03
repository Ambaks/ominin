"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorNotice, GlassButton, Notice, Segmented, Sheet, Shimmer } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { downloadBlob, downloadCsv } from "@/lib/admin/csv";
import { describeError } from "@/lib/gestion/errors";
import {
  buildHoursReport,
  formatDifference,
  hoursReportCsv,
  nextAnchor,
  reportPeriod,
  type ReportKind,
  type ReportRow,
} from "@/lib/gestion/hours-report";
import { formatDuration, loadReportData, type ReportData } from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";
import { Arrow } from "./planning";

const KINDS: { value: ReportKind; label: string }[] = [
  { value: "semaine", label: "Semaine" },
  { value: "mois", label: "Mois" },
];

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-g-meta text-muted">{label}</p>
      <p className="text-g-label tabular-nums">{value}</p>
    </div>
  );
}

function RowView({ row, strong = false }: { row: ReportRow; strong?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 py-3 ${strong ? "font-semibold" : ""}`}>
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-g-label font-semibold">
        <span className="min-w-0 wrap-anywhere">{row.name}</span>
        {row.open > 0 && (
          <span className="text-g-meta font-normal text-muted">
            {row.open} en cours, non compté{row.open > 1 ? "s" : ""}
          </span>
        )}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="Prévu" value={formatDuration(row.planned)} />
        <Cell label="Badgé" value={formatDuration(row.worked)} />
        <Cell label="Écart" value={formatDifference(row.difference)} />
      </div>
    </div>
  );
}

export function HoursReportSheet({
  etablissementId,
  restaurant,
  slug,
  staff,
  dayEndHour,
  onClose,
}: {
  etablissementId: string;
  restaurant: string;
  slug: string;
  staff: Staff[];
  dayEndHour: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<ReportKind>("semaine");
  const [anchor, setAnchor] = useState(() => new Date());
  const [attempt, setAttempt] = useState(0);
  const period = useMemo(() => reportPeriod(kind, anchor, dayEndHour), [kind, anchor, dayEndHour]);
  const from = period.from.getTime();
  const to = period.to.getTime();
  const key = `${from}-${to}-${attempt}`;
  // Le résultat porte sa clé : changer de période remet l'écran en attente sans setState dans l'effet.
  const [result, setResult] = useState<{ key: string; data?: ReportData; error?: unknown } | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadReportData(etablissementId, new Date(from), new Date(to))
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ key, error });
      });
    return () => {
      cancelled = true;
    };
  }, [etablissementId, from, to, key]);

  const current = result?.key === key ? result : null;
  const report = useMemo(
    () => (current?.data ? buildHoursReport(staff, current.data) : null),
    [current, staff]
  );
  const empty = report !== null && report.total.planned === 0 && report.total.worked === 0 && report.total.open === 0;
  const ready = report !== null && !empty;
  const filename = `heures-${slug}-${period.slug}`;

  const exportCsv = () => {
    if (report) downloadCsv(`${filename}.csv`, hoursReportCsv(report, period));
  };

  const exportPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const { hoursReportPdf } = await import("@/lib/gestion/hours-report-pdf");
      const bytes = await hoursReportPdf(restaurant, report, period);
      downloadBlob(`${filename}.pdf`, new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet
      title="Rapport d'heures"
      onClose={onClose}
      footer={
        <>
          {!ready && current?.data && <p>Rien à exporter sur cette période.</p>}
          <GlassButton disabled={!ready} onClick={exportCsv}>
            Exporter en CSV
          </GlassButton>
          <GlassButton variant="primary" disabled={!ready || exporting} onClick={() => void exportPdf()}>
            {exporting ? "Un instant…" : "Exporter en PDF"}
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented<ReportKind> glass={false} label="Période" options={KINDS} value={kind} onChange={setKind} />
          <div className="flex items-center justify-between gap-2">
            <GlassButton
              variant="icon"
              aria-label={kind === "semaine" ? "Semaine précédente" : "Mois précédent"}
              onClick={() => setAnchor(nextAnchor(period, -1))}
            >
              <Arrow left />
            </GlassButton>
            <p className="text-center text-g-label font-semibold tabular-nums first-letter:uppercase">{period.label}</p>
            <GlassButton
              variant="icon"
              aria-label={kind === "semaine" ? "Semaine suivante" : "Mois suivant"}
              onClick={() => setAnchor(nextAnchor(period, 1))}
            >
              <Arrow />
            </GlassButton>
          </div>
        </div>

        {current?.error != null ? (
          <ErrorNotice error={current.error} onRetry={() => setAttempt((count) => count + 1)} />
        ) : !report ? (
          <div aria-busy className="flex flex-col gap-3">
            <Shimmer className="h-16" />
            <Shimmer className="h-16" />
          </div>
        ) : empty ? (
          <EmptyState text="Aucun créneau ni pointage sur cette période." />
        ) : (
          <>
            {report.total.open > 0 && (
              <Notice
                tone="info"
                title={`${report.total.open} pointage${report.total.open > 1 ? "s" : ""} en cours`}
                text="Sans heure de départ, ils ne comptent pas dans le badgé. Un départ oublié se corrige dans Pointage."
              />
            )}
            <div className="divide-y divide-hairline">
              {report.rows.map((row) => (
                <RowView key={row.key} row={row} />
              ))}
              <RowView row={report.total} strong />
            </div>
            <p className="text-g-meta text-muted">
              Écart : badgé moins prévu. Un créneau ou un pointage de nuit compte sur la journée où il commence.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
