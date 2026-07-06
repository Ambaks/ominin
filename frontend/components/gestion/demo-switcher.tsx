"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { OFFRE_LABELS, ROLE_LABELS } from "@/lib/gestion/constants";
import { hasFeature } from "@/lib/gestion/permissions";
import type { Etablissement, Offre, Role } from "@/lib/gestion/types";

const selectClass =
  "appearance-none rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-muted outline-none transition-colors hover:text-foreground focus:border-ember-2/50";

export function DemoSwitcher({
  etablissement,
  role,
}: {
  etablissement: Etablissement;
  role: Role;
}) {
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-hairline py-1 pl-3 pr-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-faint">
        Démo
      </span>
      <select
        value={etablissement.offre}
        onChange={(event) => api.setOffre(event.target.value as Offre)}
        title="Offre"
        className={selectClass}
      >
        {(Object.keys(OFFRE_LABELS) as Offre[]).map((offre) => (
          <option key={offre} value={offre}>
            {OFFRE_LABELS[offre]}
          </option>
        ))}
      </select>
      {hasFeature(etablissement.offre, "roles") && (
        <select
          value={role}
          onChange={(event) => api.setRole(event.target.value as Role)}
          title="Rôle"
          className={selectClass}
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((candidate) => (
            <option key={candidate} value={candidate}>
              {ROLE_LABELS[candidate]}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => setConfirmReset(true)}
        title="Réinitialiser la démo"
        aria-label="Réinitialiser la démo"
        className="rounded-full border border-hairline p-1.5 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
      {confirmReset && (
        <ConfirmDialog
          title="Réinitialiser la démo ?"
          message="Toutes vos modifications seront remplacées par les données de démonstration."
          confirmLabel="Réinitialiser"
          destructive
          onClose={() => setConfirmReset(false)}
          onConfirm={async () => {
            await api.resetDemo();
            setConfirmReset(false);
            toast.success("Démo réinitialisée.");
          }}
        />
      )}
    </div>
  );
}
