"use client";

import { useState } from "react";
import { EditIcon } from "@/components/gestion/icons";
import { StaffModal } from "@/components/gestion/temps/staff-modal";
import { Chip, EmptyState, GlassButton, Plate } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { isPickupShop, roleLabels } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";
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
    <GlassButton onClick={() => void copy()} title="Copier son lien de planning">
      {copied ? "Lien copié" : "Copier le lien"}
    </GlassButton>
  );
}

function PulseDot() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="animate-pulse" aria-hidden>
      <circle cx="12" cy="12" r="5" />
    </svg>
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
  const state = useGestion();
  const roleLabel = roleLabels(state);
  const pickupShop = isPickupShop(state);
  const now = new Date();
  const addLabel = pickupShop ? "+ Ajouter un employé" : "+ Ajouter un serveur";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-g-label text-muted">
          Un prénom et un code suffisent. Les heures sont celles badgées cette semaine.
        </p>
        <GlassButton variant="primary" onClick={() => setCreating(true)}>
          {addLabel}
        </GlassButton>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          text={`Personne dans l'équipe. Ajoutez vos ${pickupShop ? "employés" : "serveurs"} : ils apparaîtront sur la badgeuse et dans le planning.`}
          action={
            <GlassButton variant="primary" onClick={() => setCreating(true)}>
              {addLabel}
            </GlassButton>
          }
        />
      ) : (
        <Plate className="divide-y divide-hairline px-4">
          {staff.map((member) => {
            const worked = workedMinutes(entriesOf(entries, member.id), now);
            const inService = openEntry(entries, member.id) != null;
            return (
              <div
                key={member.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-3 ${
                  member.hidden ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditing(member)}
                  className="g-press min-h-g-control min-w-0 flex-1 py-1 text-left"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-g-label font-semibold">{member.name}</span>
                    {inService && (
                      <span className="g-orders">
                        <Chip icon={<PulseDot />}>En service</Chip>
                      </span>
                    )}
                    {member.hidden && <Chip>Masqué</Chip>}
                    {!member.codeSet && <Chip tone="problem">Sans code</Chip>}
                  </span>
                  <span className="block text-g-meta text-muted">
                    {roleLabel[member.role]}
                    {member.userId ? " · a un compte" : ""}
                  </span>
                </button>
                <span className="shrink-0 text-g-label font-semibold tabular-nums">
                  {worked > 0 ? formatDuration(worked) : "—"}
                </span>
                {/* La ligne entière ouvre déjà la fiche ; le crayon le dit. */}
                <GlassButton
                  variant="icon"
                  onClick={() => setEditing(member)}
                  aria-label={`Modifier ${member.name}`}
                >
                  <EditIcon />
                </GlassButton>
                <CopyLink staff={member} />
              </div>
            );
          })}
        </Plate>
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
