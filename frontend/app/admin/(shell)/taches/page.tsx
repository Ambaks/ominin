"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "@/components/admin/icons";
import { TaskFormModal } from "@/components/admin/tasks/task-form-modal";
import { TaskRowItem } from "@/components/admin/tasks/task-row";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { COMPLETED_TASKS_WINDOW_DAYS } from "@/lib/admin/constants";
import {
  addDays,
  dayStart,
  endOfWeek,
  isToday,
  isTomorrow,
} from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import type { TaskRow } from "@/lib/admin/types";

type TabId = "all" | "overdue" | "today" | "tomorrow" | "week" | "done";

export default function TachesPage() {
  const state = useAdmin();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>("all");
  const [closed, setClosed] = useState<TaskRow[] | null>(null);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);

  const nameById = useMemo(
    () =>
      new Map(
        (state?.leads ?? []).map((lead) => [lead.restaurantId, lead.name])
      ),
    [state?.leads]
  );

  const open = state?.tasks ?? [];
  const now = new Date();
  const nowIso = now.toISOString();
  const buckets: Record<Exclude<TabId, "done">, TaskRow[]> = {
    all: open,
    overdue: open.filter((task) => task.dueAt !== null && task.dueAt < nowIso),
    today: open.filter(
      (task) =>
        task.dueAt !== null && task.dueAt >= nowIso && isToday(task.dueAt, now)
    ),
    tomorrow: open.filter(
      (task) => task.dueAt !== null && isTomorrow(task.dueAt, now)
    ),
    week: open.filter(
      (task) =>
        task.dueAt !== null &&
        task.dueAt >= addDays(dayStart(now), 2).toISOString() &&
        new Date(task.dueAt) <= endOfWeek(now)
    ),
  };

  const openDoneTab = () => {
    setTab("done");
    if (closed === null) {
      api
        .fetchClosedTasks(COMPLETED_TASKS_WINDOW_DAYS)
        .then(setClosed)
        .catch((error) =>
          toast.error(
            error instanceof Error ? error.message : "Une erreur est survenue."
          )
        );
    }
  };

  const visible = tab === "done" ? (closed ?? []) : buckets[tab];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-medium">Tâches</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ember-gradient flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-background"
        >
          <PlusIcon className="size-4" />
          Nouvelle tâche
        </button>
      </div>

      <PillTabs
        tabs={[
          { id: "all", label: "Toutes", count: buckets.all.length },
          { id: "overdue", label: "En retard", count: buckets.overdue.length },
          { id: "today", label: "Aujourd'hui", count: buckets.today.length },
          { id: "tomorrow", label: "Demain", count: buckets.tomorrow.length },
          { id: "week", label: "Cette semaine", count: buckets.week.length },
          { id: "done", label: "Terminées" },
        ]}
        activeId={tab}
        onSelect={(id) => (id === "done" ? openDoneTab() : setTab(id as TabId))}
      />

      {visible.length === 0 ? (
        <EmptyState
          title={
            tab === "done" ? "Rien de terminé récemment" : "Aucune tâche ici"
          }
          body={
            tab === "done"
              ? `Les tâches terminées des ${COMPLETED_TASKS_WINDOW_DAYS} derniers jours apparaissent ici.`
              : "Créez une relance depuis une fiche restaurant ou avec « Nouvelle tâche »."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((task) => (
            <TaskRowItem
              key={task.id}
              task={task}
              restaurantName={
                task.restaurantId
                  ? (nameById.get(task.restaurantId) ?? null)
                  : null
              }
              onEdit={
                task.status === "open" ? () => setEditing(task) : undefined
              }
            />
          ))}
        </div>
      )}

      {creating && (
        <TaskFormModal task={null} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <TaskFormModal task={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
