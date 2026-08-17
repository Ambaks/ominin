"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon } from "@/components/admin/icons";
import { AppointmentFormModal } from "@/components/admin/rdv/appointment-form-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  APPOINTMENTS_WINDOW_DAYS,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/admin/constants";
import {
  addDays,
  dayStart,
  formatDayLong,
  formatTime,
  isToday,
  isTomorrow,
} from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import type { AppointmentRow, AppointmentStatus } from "@/lib/admin/types";

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: "border-hairline text-muted",
  completed: "border-status-signed/40 bg-status-signed/10 text-status-signed",
  cancelled: "border-hairline text-faint line-through",
  no_show: "border-status-lost/40 bg-status-lost/10 text-status-lost",
};

function groupByDay(appointments: AppointmentRow[]): [string, AppointmentRow[]][] {
  const groups = new Map<string, AppointmentRow[]>();
  for (const rdv of appointments) {
    const key = dayStart(new Date(rdv.startAt)).toISOString();
    const list = groups.get(key) ?? [];
    list.push(rdv);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function dayTitle(dayIso: string): string {
  if (isToday(dayIso)) return `Aujourd'hui — ${formatDayLong(dayIso)}`;
  if (isTomorrow(dayIso)) return `Demain — ${formatDayLong(dayIso)}`;
  const label = formatDayLong(dayIso);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function RdvPage() {
  const state = useAdmin();
  const toast = useToast();
  const router = useRouter();
  const { basePath, localPath } = useAdminBasePath();
  const [upcoming, setUpcoming] = useState<AppointmentRow[] | null>(null);
  const [past, setPast] = useState<AppointmentRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuFor, setMenuFor] = useState<AppointmentRow | null>(null);

  const nameById = useMemo(
    () =>
      new Map(
        (state?.leads ?? []).map((lead) => [lead.restaurantId, lead.name])
      ),
    [state?.leads]
  );

  const reportError = useCallback(
    (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      ),
    [toast]
  );

  const loadUpcoming = useCallback(() => {
    api
      .fetchAppointments({
        from: dayStart().toISOString(),
        to: addDays(dayStart(), APPOINTMENTS_WINDOW_DAYS).toISOString(),
      })
      .then(setUpcoming)
      .catch(reportError);
  }, [reportError]);

  useEffect(loadUpcoming, [loadUpcoming]);

  const loadPast = () => {
    if (past !== null) return;
    api
      .fetchAppointments({
        from: addDays(dayStart(), -APPOINTMENTS_WINDOW_DAYS).toISOString(),
        to: dayStart().toISOString(),
      })
      .then(setPast)
      .catch(reportError);
  };

  const changeStatus = (rdv: AppointmentRow, status: AppointmentStatus) => {
    setMenuFor(null);
    api
      .updateAppointmentStatus(rdv.id, status)
      .then(() => {
        const patch = (list: AppointmentRow[] | null) =>
          list?.map((a) => (a.id === rdv.id ? { ...a, status } : a)) ?? null;
        setUpcoming(patch);
        setPast(patch);
        toast.success("Rendez-vous mis à jour");
      })
      .catch(reportError);
  };

  const renderRow = (rdv: AppointmentRow) => (
    <div
      key={rdv.id}
      className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface px-3.5 py-3"
    >
      <div className="w-20 shrink-0 text-sm tabular-nums text-muted">
        {formatTime(rdv.startAt)}
        {rdv.endAt && (
          <span className="text-faint">–{formatTime(rdv.endAt)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{rdv.title}</p>
        <p className="truncate text-xs text-faint">
          {rdv.location ?? ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() =>
          router.push(`${basePath}${localPath}?lead=${rdv.restaurantId}`)
        }
        className="hidden max-w-36 shrink-0 truncate rounded-full border border-hairline px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground sm:block"
      >
        {nameById.get(rdv.restaurantId) ?? "Fiche"}
      </button>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_CLASSES[rdv.status]}`}
      >
        {APPOINTMENT_STATUS_LABELS[rdv.status]}
      </span>
      {rdv.status === "scheduled" && (
        <button
          type="button"
          onClick={() => setMenuFor(rdv)}
          aria-label="Changer l'issue du rendez-vous"
          className="shrink-0 rounded-full px-1.5 text-muted transition-colors hover:text-foreground"
        >
          …
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-medium">Rendez-vous</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ember-gradient flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-background"
        >
          <PlusIcon className="size-4" />
          Nouveau RDV
        </button>
      </div>

      {upcoming === null ? (
        <div aria-busy className="flex flex-col gap-3">
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-16 rounded-2xl" />
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState
          title="Aucun rendez-vous à venir"
          body={`Les ${APPOINTMENTS_WINDOW_DAYS} prochains jours sont libres.`}
        />
      ) : (
        groupByDay(upcoming).map(([dayIso, rows]) => (
          <section key={dayIso} className="flex flex-col gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              {dayTitle(dayIso)}
            </h2>
            {rows.map(renderRow)}
          </section>
        ))
      )}

      <details
        onToggle={(event) => {
          if ((event.target as HTMLDetailsElement).open) loadPast();
        }}
        className="rounded-2xl border border-hairline bg-surface px-4 py-3"
      >
        <summary className="cursor-pointer text-sm font-medium text-muted">
          Rendez-vous passés ({APPOINTMENTS_WINDOW_DAYS} derniers jours)
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          {past === null ? (
            <div className="shimmer h-14 rounded-2xl" />
          ) : past.length === 0 ? (
            <p className="text-sm text-faint">Aucun rendez-vous passé.</p>
          ) : (
            groupByDay(past)
              .reverse()
              .flatMap(([, rows]) => rows.map(renderRow))
          )}
        </div>
      </details>

      {creating && (
        <AppointmentFormModal
          onClose={() => {
            setCreating(false);
            loadUpcoming();
          }}
        />
      )}

      {menuFor && (
        <Modal title="Issue du rendez-vous" onClose={() => setMenuFor(null)}>
          <div className="-my-2 flex flex-col">
            {(
              [
                ["completed", "Marquer terminé"],
                ["no_show", "No-show"],
                ["cancelled", "Annuler le RDV"],
              ] as [AppointmentStatus, string][]
            ).map(([status, label]) => (
              <button
                key={status}
                type="button"
                onClick={() => changeStatus(menuFor, status)}
                className="border-t border-hairline py-3 text-left text-sm transition-colors first:border-t-0 hover:text-ember-1"
              >
                {label}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
