"use client";

import { useRouter } from "next/navigation";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { formatRelative } from "@/lib/admin/format";
import type { TaskRow } from "@/lib/admin/types";
import { PriorityBadge } from "../status-badge";

/*
 * Ligne de tâche partagée (page Tâches, tableau de bord). Le rond termine,
 * le reste de la ligne édite, la puce restaurant ouvre la fiche.
 */
export function TaskRowItem({
  task,
  restaurantName,
  onEdit,
}: {
  task: TaskRow;
  restaurantName: string | null;
  onEdit?: () => void;
}) {
  const run = useRunMutation();
  const router = useRouter();
  const { basePath, localPath } = useAdminBasePath();
  const done = task.status !== "open";
  const overdue =
    !done && task.dueAt !== null && task.dueAt < new Date().toISOString();

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-surface px-3.5 py-3 ${
        overdue ? "border-ember-3/40" : "border-hairline"
      }`}
    >
      <button
        type="button"
        disabled={done}
        onClick={() =>
          void run(() => api.completeTask(task.id), "Tâche terminée")
        }
        aria-label={done ? "Tâche terminée" : `Terminer « ${task.title} »`}
        className={`size-5 shrink-0 rounded-full transition-colors ${
          done
            ? "ember-gradient"
            : "border border-hairline hover:border-ember-1"
        }`}
      />
      <button
        type="button"
        onClick={onEdit}
        disabled={!onEdit}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`truncate text-sm font-medium ${
            done ? "text-faint line-through" : ""
          }`}
        >
          {task.title}
        </p>
        <p className="truncate text-xs text-faint">
          {task.description ?? ""}
        </p>
      </button>
      {restaurantName && task.restaurantId && (
        <button
          type="button"
          onClick={() =>
            router.push(`${basePath}${localPath}?lead=${task.restaurantId}`)
          }
          className="hidden max-w-36 shrink-0 truncate rounded-full border border-hairline px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground sm:block"
        >
          {restaurantName}
        </button>
      )}
      {task.dueAt && (
        <span
          className={`shrink-0 text-xs ${
            overdue ? "font-semibold text-ember-3" : "text-faint"
          }`}
        >
          {formatRelative(task.dueAt)}
        </span>
      )}
      {!done && <PriorityBadge priority={task.priority} />}
    </div>
  );
}
