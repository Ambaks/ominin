"use client";

import { useEffect, useState } from "react";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { CLIENT_PERIOD_DAYS } from "@/lib/admin/constants";
import { periodOf, previousPeriod, type Period } from "@/lib/admin/metrics";

/*
 * Ce que partagent les synthèses Clients des offres : une période choisie,
 * chargée avec celle de même durée qui la précède, pour repérer qui décroche.
 */

export interface PeriodPair<T> {
  rows: T[];
  previous: T[];
}

const PERIOD_TABS = CLIENT_PERIOD_DAYS.map((days) => ({
  id: String(days),
  label: `${days} j`,
}));

/** `fetch` doit être stable (une fonction de module). */
export function usePeriodPair<T>(
  fetch: (period: Period) => Promise<T[]>,
): { days: number; setDays: (days: number) => void; data: PeriodPair<T> | null } {
  const toast = useToast();
  const [days, setDays] = useState<number>(CLIENT_PERIOD_DAYS[1]);
  const [data, setData] = useState<PeriodPair<T> | null>(null);

  useEffect(() => {
    let current = true;
    // La période a changé : la vue repart en chargement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    const period = periodOf(days);
    Promise.all([fetch(period), fetch(previousPeriod(period))])
      .then(([rows, previous]) => {
        if (current) setData({ rows, previous });
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue.",
        ),
      );
    return () => {
      current = false;
    };
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch, days]);

  return { days, setDays, data };
}

export function PeriodHeader({
  title,
  subtitle,
  days,
  onDays,
}: {
  title: string;
  subtitle: string;
  days: number;
  onDays: (days: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-medium">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <PillTabs
        tabs={PERIOD_TABS}
        activeId={String(days)}
        onSelect={(id) => onDays(Number(id))}
      />
    </div>
  );
}

export function ClientsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer h-24 rounded-2xl" />
      </div>
      <div className="shimmer h-64 rounded-2xl" />
    </div>
  );
}

/** Encadré d'alerte : un titre, une explication, une ligne par client. */
export function AlertList({
  title,
  body,
  items,
}: {
  title: string;
  body: string;
  items: { key: string; name: string; detail: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-ember-3/40 bg-ember-3/5 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ember-3">
          {title}
        </p>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"
          >
            <span className="font-medium">{item.name}</span>
            <span className="text-muted">{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const TH = "px-4 py-3 font-semibold";
export const TH_NUM = "px-4 py-3 text-right font-semibold";
export const TD_NUM = "px-4 py-3 text-right tabular-nums";
export const TABLE_HEAD =
  "border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint";
export const TABLE_ROW =
  "border-b border-hairline last:border-0 transition-colors hover:bg-surface-raised";

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count > 1 ? many : one}`;
