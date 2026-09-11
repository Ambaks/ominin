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
 * prénom et un code, la fiche existe : elle entre au planning, apparaît sur
 * la badgeuse, et son lien personnel montre ses horaires à qui n'a rien à
 * installer ni à retenir. On lit ici ce qui sert à payer — les heures badgées
 * de la semaine — et ce qui reste à régler : une fiche sans code, une fiche
 * masquée.
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
      className="shrink-0 rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
    >
      {copied ? "Lien copié" : "Copier le lien"}
    </button>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: "ember" | "warn" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    ember: "border-ember-2/30 bg-ember-2/10 text-ember-2",
    warn: "border-ember-3/40 bg-ember-3/10 text-ember-3",
    muted: "border-hairline text-faint",
  };
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
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
            Un prénom et un code suffisent. Les heures sont celles badgées
            cette semaine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ember-gradient shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
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
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 ${
                  member.hidden ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditing(member)}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    {inService && (
                      <Tag tone="ember">
                        <span
                          className="size-1.5 animate-pulse rounded-full bg-ember-2"
                          aria-hidden
                        />
                        En service
                      </Tag>
                    )}
                    {member.hidden && <Tag tone="muted">Masqué</Tag>}
                    {!member.codeSet && <Tag tone="warn">Sans code</Tag>}
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
