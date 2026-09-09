"use client";

import { useState } from "react";
import { StaffModal } from "@/components/gestion/temps/staff-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/lib/gestion/constants";
import {
  entriesOf,
  formatDuration,
  openEntry,
  planningLink,
  workedMinutes,
  type TimeEntry,
} from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";

/*
 * L'équipe d'un restaurant qui ne donne pas de comptes. Le gérant tape un
 * prénom, la fiche existe : elle entre au planning, apparaît sur la badgeuse,
 * et son lien personnel montre ses horaires à qui n'a rien à installer ni à
 * retenir. On lit ici ce qui sert à payer — les heures badgées de la semaine —
 * et on emporte le lien d'un geste.
 */
function CopyLink({ staff }: { staff: Staff }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planningLink(staff.planningToken));
      setCopied(true);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : la fiche montre le
      // lien en entier, il reste à le sélectionner.
      toast.error("Copie impossible, ouvrez la fiche pour lire le lien.");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title="Copier son lien de planning"
      className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
    >
      {copied ? "Lien copié" : "Copier le lien"}
    </button>
  );
}

export function StaffList({
  staff,
  entries,
  onChange,
}: {
  staff: Staff[];
  /** Badgeages de la semaine ouverte : ce qui se compte pour la paie. */
  entries: TimeEntry[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<Staff | null>(null);
  const [creating, setCreating] = useState(false);
  const now = new Date();

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">L&rsquo;équipe</h2>
          <p className="mt-0.5 text-sm text-muted">
            Un prénom suffit. Les heures sont celles badgées cette semaine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ember-gradient shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-background"
        >
          + Ajouter un serveur
        </button>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          title="Personne dans l'équipe"
          body="Ajoutez vos serveurs : ils apparaîtront sur la badgeuse et dans le planning."
        />
      ) : (
        <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
          {staff.map((member) => {
            const worked = workedMinutes(entriesOf(entries, member.id), now);
            const inService = openEntry(entries, member.id) != null;
            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5"
              >
                <button
                  type="button"
                  onClick={() => setEditing(member)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    {inService && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
                        <span
                          className="size-1.5 animate-pulse rounded-full bg-ember-2"
                          aria-hidden
                        />
                        En service
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-faint">
                    {ROLE_LABELS[member.role]}
                    {member.userId ? " · a un compte" : ""}
                  </p>
                </button>
                <span className="shrink-0 font-display text-base tabular-nums">
                  {worked > 0 ? formatDuration(worked) : "—"}
                </span>
                <CopyLink staff={member} />
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <StaffModal
          staff={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}
