"use client";

import { CheckIcon } from "@/components/gestion/icons";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/admin/constants";
import { STATUS_DOT_CLASSES } from "@/lib/admin/status";
import type { LeadStatus } from "@/lib/admin/types";

/** Changement de statut en un geste : une liste, un tap. */
export function StatusMenu({
  restaurantId,
  current,
  onClose,
}: {
  restaurantId: string;
  current: LeadStatus;
  onClose: () => void;
}) {
  const run = useRunMutation();

  const pick = (status: LeadStatus) => {
    if (status !== current) {
      void run(
        () => api.updateLeadStatus(restaurantId, status),
        "Statut mis à jour"
      );
    }
    onClose();
  };

  return (
    <Modal title="Statut du lead" onClose={onClose}>
      <ul className="-my-2 flex flex-col">
        {STATUS_ORDER.map((status) => (
          <li key={status}>
            <button
              type="button"
              onClick={() => pick(status)}
              className="flex w-full items-center gap-3 border-t border-hairline py-3 text-left text-sm transition-colors first:border-t-0 hover:text-ember-1"
            >
              <span
                className={`size-2.5 rounded-full ${STATUS_DOT_CLASSES[status]}`}
              />
              <span className="flex-1">{STATUS_LABELS[status]}</span>
              {status === current && <CheckIcon className="size-4 text-ember-1" />}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
