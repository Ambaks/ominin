"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PlusIcon } from "@/components/admin/icons";
import { AppointmentFormModal } from "@/components/admin/rdv/appointment-form-modal";
import { TaskFormModal } from "@/components/admin/tasks/task-form-modal";
import { TaskRowItem } from "@/components/admin/tasks/task-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useRunMutation, useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  APPOINTMENTS_WINDOW_DAYS,
  APPOINTMENT_STATUS_LABELS,
  COMPLETED_TASKS_WINDOW_DAYS,
} from "@/lib/admin/constants";
import { useProductAdmin } from "@/lib/admin/filters";
import {
  addDays,
  dayStart,
  formatDayLong,
  formatTime,
  isToday,
  isTomorrow,
} from "@/lib/admin/format";
import type {
  AppointmentRow,
  AppointmentStatus,
  TaskRow,
} from "@/lib/admin/types";

/*
 * L'agenda commercial : relances et rendez-vous sur une même ligne de temps,
 * jour par jour. « À venir » lit le snapshot (tâches ouvertes, RDV prévus de
 * la fenêtre) ; l'historique — relances closes, RDV passés — se charge à la
 * demande. Une relance sans fiche n'appartient à aucun produit : seule la vue
 * d'ensemble la montre, comme dans le reste du CRM.
 */

type Entry =
  | { kind: "task"; at: string | null; task: TaskRow }
  | { kind: "rdv"; at: string; rdv: AppointmentRow };

type TabId = "upcoming" | "history";

interface History {
  tasks: TaskRow[];
  appointments: AppointmentRow[];
}

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: "border-hairline text-muted",
  completed: "border-status-signed/40 bg-status-signed/10 text-status-signed",
  cancelled: "border-hairline text-faint line-through",
  no_show: "border-status-lost/40 bg-status-lost/10 text-status-lost",
};

const OUTCOMES: [AppointmentStatus, string][] = [
  ["completed", "Marquer terminé"],
  ["no_show", "No-show"],
  ["cancelled", "Annuler le RDV"],
];

const SECTION_TITLE =
  "text-[11px] font-semibold uppercase tracking-wider text-faint";

/** Entrées datées regroupées par jour, dans l'ordre demandé. */
function groupByDay(entries: Entry[], newestFirst: boolean) {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (entry.at === null) continue;
    const key = dayStart(new Date(entry.at)).toISOString();
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const sign = newestFirst ? -1 : 1;
  return [...groups.entries()]
    .sort(([a], [b]) => sign * a.localeCompare(b))
    .map(([day, rows]) => ({
      day,
      rows: rows.sort((a, b) => sign * (a.at ?? "").localeCompare(b.at ?? "")),
    }));
}

function dayTitle(dayIso: string): string {
  if (isToday(dayIso)) return `Aujourd'hui — ${formatDayLong(dayIso)}`;
  if (isTomorrow(dayIso)) return `Demain — ${formatDayLong(dayIso)}`;
  const label = formatDayLong(dayIso);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function AppointmentLine({
  rdv,
  restaurantName,
  onOpen,
  onOutcome,
}: {
  rdv: AppointmentRow;
  restaurantName: string | null;
  onOpen: () => void;
  onOutcome: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface px-3.5 py-3">
      <div className="w-20 shrink-0 text-sm tabular-nums text-muted">
        {formatTime(rdv.startAt)}
        {rdv.endAt && (
          <span className="text-faint">–{formatTime(rdv.endAt)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{rdv.title}</p>
        <p className="truncate text-xs text-faint">{rdv.location ?? ""}</p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="hidden max-w-36 shrink-0 truncate rounded-full border border-hairline px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground sm:block"
      >
        {restaurantName ?? "Fiche"}
      </button>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_CLASSES[rdv.status]}`}
      >
        {APPOINTMENT_STATUS_LABELS[rdv.status]}
      </span>
      {rdv.status === "scheduled" && (
        <button
          type="button"
          onClick={onOutcome}
          aria-label="Changer l'issue du rendez-vous"
          className="shrink-0 rounded-full px-1.5 text-muted transition-colors hover:text-foreground"
        >
          …
        </button>
      )}
    </div>
  );
}

export default function AgendaPage() {
  const state = useProductAdmin();
  const toast = useToast();
  const run = useRunMutation();
  const router = useRouter();
  const { basePath, localPath, product } = useAdminBasePath();
  const [tab, setTab] = useState<TabId>("upcoming");
  const [history, setHistory] = useState<History | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [creatingRdv, setCreatingRdv] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<AppointmentRow | null>(null);

  const nameById = useMemo(
    () =>
      new Map(
        (state?.leads ?? []).map((lead) => [lead.restaurantId, lead.name]),
      ),
    [state?.leads],
  );

  /** Ce que la vue produit garde d'une ligne chargée hors snapshot. */
  const inView = useCallback(
    (restaurantId: string | null) =>
      !product || (restaurantId !== null && nameById.has(restaurantId)),
    [product, nameById],
  );

  const nowIso = new Date().toISOString();
  const open = state?.tasks ?? [];
  const overdue = open.filter(
    (task) => task.dueAt !== null && task.dueAt < nowIso,
  );
  const undated = open.filter((task) => task.dueAt === null);
  const upcoming = groupByDay(
    [
      ...open
        .filter((task) => task.dueAt !== null && task.dueAt >= nowIso)
        .map((task): Entry => ({ kind: "task", at: task.dueAt, task })),
      ...(state?.appointments ?? []).map(
        (rdv): Entry => ({ kind: "rdv", at: rdv.startAt, rdv }),
      ),
    ],
    false,
  );

  const past = history
    ? groupByDay(
        [
          ...history.tasks
            .filter((task) => inView(task.restaurantId))
            .map(
              (task): Entry => ({ kind: "task", at: task.completedAt, task }),
            ),
          ...history.appointments
            .filter((rdv) => inView(rdv.restaurantId))
            .map((rdv): Entry => ({ kind: "rdv", at: rdv.startAt, rdv })),
        ],
        true,
      )
    : null;

  const openHistory = () => {
    setTab("history");
    if (history !== null) return;
    Promise.all([
      api.fetchClosedTasks(COMPLETED_TASKS_WINDOW_DAYS),
      api.fetchAppointments({
        from: addDays(dayStart(), -APPOINTMENTS_WINDOW_DAYS).toISOString(),
        to: dayStart().toISOString(),
      }),
    ])
      .then(([tasks, appointments]) => setHistory({ tasks, appointments }))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue.",
        ),
      );
  };

  const changeOutcome = (rdv: AppointmentRow, status: AppointmentStatus) => {
    setOutcomeFor(null);
    void run(async () => {
      await api.updateAppointmentStatus(rdv.id, status);
      // Le RDV quitte « À venir » : l'historique se relira à l'ouverture.
      setHistory(null);
    }, "Rendez-vous mis à jour");
  };

  const openLead = (restaurantId: string) =>
    router.push(`${basePath}${localPath}?lead=${restaurantId}`);

  const renderEntry = (entry: Entry) =>
    entry.kind === "task" ? (
      <TaskRowItem
        key={entry.task.id}
        task={entry.task}
        restaurantName={
          entry.task.restaurantId
            ? (nameById.get(entry.task.restaurantId) ?? null)
            : null
        }
        onEdit={
          entry.task.status === "open"
            ? () => setEditing(entry.task)
            : undefined
        }
      />
    ) : (
      <AppointmentLine
        key={entry.rdv.id}
        rdv={entry.rdv}
        restaurantName={nameById.get(entry.rdv.restaurantId) ?? null}
        onOpen={() => openLead(entry.rdv.restaurantId)}
        onOutcome={() => setOutcomeFor(entry.rdv)}
      />
    );

  const nothingUpcoming =
    overdue.length === 0 && upcoming.length === 0 && undated.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium">Agenda</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreatingRdv(true)}
            className="flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
          >
            <PlusIcon className="size-4" />
            RDV
          </button>
          <button
            type="button"
            onClick={() => setCreatingTask(true)}
            className="ember-gradient flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-background"
          >
            <PlusIcon className="size-4" />
            Relance
          </button>
        </div>
      </div>

      <PillTabs
        tabs={[
          { id: "upcoming", label: "À venir", count: overdue.length },
          { id: "history", label: "Historique" },
        ]}
        activeId={tab}
        onSelect={(id) =>
          id === "history" ? openHistory() : setTab("upcoming")
        }
      />

      {tab === "upcoming" ? (
        nothingUpcoming ? (
          <EmptyState
            title="Rien de prévu"
            body="Posez une relance ou un RDV depuis une fiche restaurant, ou avec les boutons ci-dessus."
          />
        ) : (
          <>
            {overdue.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className={`${SECTION_TITLE} text-ember-3`}>En retard</h2>
                {overdue.map((task) =>
                  renderEntry({ kind: "task", at: task.dueAt, task }),
                )}
              </section>
            )}
            {upcoming.map(({ day, rows }) => (
              <section key={day} className="flex flex-col gap-2">
                <h2 className={SECTION_TITLE}>{dayTitle(day)}</h2>
                {rows.map(renderEntry)}
              </section>
            ))}
            {undated.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className={SECTION_TITLE}>Sans échéance</h2>
                {undated.map((task) =>
                  renderEntry({ kind: "task", at: null, task }),
                )}
              </section>
            )}
          </>
        )
      ) : past === null ? (
        <div aria-busy className="flex flex-col gap-3">
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-16 rounded-2xl" />
        </div>
      ) : past.length === 0 ? (
        <EmptyState
          title="Rien ces derniers jours"
          body={`Les relances closes et les RDV des ${APPOINTMENTS_WINDOW_DAYS} derniers jours apparaissent ici.`}
        />
      ) : (
        past.map(({ day, rows }) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className={SECTION_TITLE}>{dayTitle(day)}</h2>
            {rows.map(renderEntry)}
          </section>
        ))
      )}

      {creatingTask && (
        <TaskFormModal task={null} onClose={() => setCreatingTask(false)} />
      )}
      {editing && (
        <TaskFormModal task={editing} onClose={() => setEditing(null)} />
      )}
      {creatingRdv && (
        <AppointmentFormModal onClose={() => setCreatingRdv(false)} />
      )}

      {outcomeFor && (
        <Modal title="Issue du rendez-vous" onClose={() => setOutcomeFor(null)}>
          <div className="-my-2 flex flex-col">
            {OUTCOMES.map(([status, label]) => (
              <button
                key={status}
                type="button"
                onClick={() => changeOutcome(outcomeFor, status)}
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
