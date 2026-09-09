"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { TaskRowItem } from "@/components/admin/tasks/task-row";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { emptyFilters, setFilters } from "@/lib/admin/filters";
import {
  addDays,
  dayStart,
  formatDayTime,
} from "@/lib/admin/format";
import {
  selectActiveLeadCount,
  selectFollowUpBuckets,
  selectFunnel,
  selectStatusCounts,
} from "@/lib/admin/selectors";
import { useAdmin } from "@/lib/admin/store";

function Bar({
  label,
  count,
  pct,
  detail,
}: {
  label: string;
  count: number;
  pct: number;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {count}
          {detail ? ` · ${detail}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-raised">
        <div
          className="bar-rise h-2 rounded-full bg-chart-mark"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ApercuPage() {
  const state = useAdmin();
  const router = useRouter();
  const { basePath } = useAdminBasePath();
  const [weekly, setWeekly] = useState<api.WeeklyActivityCounts | null>(null);

  useEffect(() => {
    if (!state) return;
    api.fetchWeeklyActivityCounts().then(setWeekly).catch(console.error);
  }, [state != null]); // eslint-disable-line react-hooks/exhaustive-deps

  const leads = useMemo(() => state?.leads ?? [], [state?.leads]);
  const counts = useMemo(() => selectStatusCounts(leads), [leads]);
  const funnel = useMemo(() => selectFunnel(leads), [leads]);
  const followUps = useMemo(() => selectFollowUpBuckets(leads), [leads]);

  const in7Days = addDays(dayStart(), 8).toISOString();
  const upcomingRdv = (state?.appointments ?? []).filter(
    (rdv) => rdv.startAt < in7Days
  );
  const nameById = new Map(leads.map((lead) => [lead.restaurantId, lead.name]));
  const endOfToday = addDays(dayStart(), 1).toISOString();
  const tasksToday = (state?.tasks ?? [])
    .filter((task) => task.dueAt !== null && task.dueAt < endOfToday)
    .slice(0, 5);

  const openFollowUps = () => {
    setFilters({ ...emptyFilters(), hasFollowUp: true });
    router.push(`${basePath}/restaurants`);
  };

  const maxWeekly = Math.max(
    weekly?.visits ?? 0,
    weekly?.calls ?? 0,
    weekly?.emails ?? 0,
    weekly?.appointments ?? 0,
    1
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-medium">Aperçu</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Restaurants"
          value={String(leads.length)}
          href={`${basePath}/restaurants`}
        />
        <StatCard
          label="Leads actifs"
          value={String(selectActiveLeadCount(leads))}
          href={`${basePath}/pipeline`}
          hint="hors signés, perdus, pas intéressés"
        />
        <StatCard
          label="Signés"
          value={String(counts.signed)}
          href={`${basePath}/pipeline`}
        />
        <StatCard
          label="RDV à venir (7 j)"
          value={String(upcomingRdv.length)}
          href={`${basePath}/rdv`}
        />
      </div>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Suivis
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["En retard", followUps.overdue.length, true],
              ["Aujourd'hui", followUps.today.length, false],
              ["7 prochains jours", followUps.upcoming7.length, false],
            ] as const
          ).map(([label, count, alert]) => (
            <button
              key={label}
              type="button"
              onClick={openFollowUps}
              className="flex flex-col gap-1 rounded-xl border border-hairline p-3 text-left transition-colors hover:border-ember-2/40"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                {label}
              </span>
              <span
                className={`font-display text-2xl font-medium ${
                  alert && count > 0 ? "text-ember-3" : ""
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Entonnoir de conversion
          </h2>
          <div className="flex flex-col gap-3">
            {funnel.map((stage) => (
              <Bar
                key={stage.label}
                label={stage.label}
                count={stage.count}
                pct={stage.pct}
                detail={`${stage.pct} %`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Activité cette semaine
          </h2>
          {weekly === null ? (
            <div aria-busy className="flex flex-col gap-3">
              <div className="shimmer h-8 rounded-xl" />
              <div className="shimmer h-8 rounded-xl" />
              <div className="shimmer h-8 rounded-xl" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(
                [
                  ["Visites", weekly.visits],
                  ["Appels", weekly.calls],
                  ["E-mails", weekly.emails],
                  ["Rendez-vous", weekly.appointments],
                ] as const
              ).map(([label, count]) => (
                <Bar
                  key={label}
                  label={label}
                  count={count}
                  pct={Math.round((count / maxWeekly) * 100)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Prochains rendez-vous
            </h2>
            <Link
              href={`${basePath}/rdv`}
              className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
            >
              Tous les RDV
            </Link>
          </div>
          {upcomingRdv.length === 0 ? (
            <p className="text-sm text-faint">Aucun rendez-vous prévu.</p>
          ) : (
            <ul className="flex flex-col">
              {upcomingRdv.slice(0, 5).map((rdv) => (
                <li
                  key={rdv.id}
                  className="flex items-baseline justify-between gap-3 border-t border-hairline py-2.5 text-sm first:border-t-0"
                >
                  <span className="min-w-0 truncate">
                    {rdv.title}
                    <span className="text-faint">
                      {" "}
                      · {nameById.get(rdv.restaurantId) ?? ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">
                    {formatDayTime(rdv.startAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Tâches du jour
            </h2>
            <Link
              href={`${basePath}/taches`}
              className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
            >
              Toutes les tâches
            </Link>
          </div>
          {tasksToday.length === 0 ? (
            <p className="text-sm text-faint">
              Rien d’échu aujourd’hui — profitez-en pour prospecter.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tasksToday.map((task) => (
                <TaskRowItem
                  key={task.id}
                  task={task}
                  restaurantName={
                    task.restaurantId
                      ? (nameById.get(task.restaurantId) ?? null)
                      : null
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
