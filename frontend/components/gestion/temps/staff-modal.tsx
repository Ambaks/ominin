"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { ROLE_LABELS } from "@/lib/gestion/constants";
import { planningLink } from "@/lib/gestion/temps";
import type { Role, Staff } from "@/lib/gestion/types";

/*
 * Fiche d'un membre de l'équipe. Un serveur n'a pas besoin de compte : le
 * gérant le crée ici, le nomme, et lui transmet son lien de planning une
 * fois. Le lien vaut tant que la fiche est active — retirer quelqu'un le
 * coupe, sans effacer les heures qu'il a faites.
 */

const ROLES: Role[] = ["serveur", "cuisinier", "gerant"];

export function StaffModal({
  staff,
  onClose,
  onSaved,
}: {
  staff?: Staff;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(staff?.name ?? "");
  const [role, setRole] = useState<Role>(staff?.role ?? "serveur");
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = staff ? planningLink(staff.planningToken) : "";

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (staff) await api.renameStaff(staff.id, name);
      else await api.createStaff(name, role);
      toast.success(staff ? "Fiche modifiée." : `${name.trim()} rejoint l'équipe.`);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : le lien reste lisible
      // à l'écran, il suffit de le sélectionner.
      toast.error("Copie impossible, sélectionnez le lien à la main.");
    }
  };

  return (
    <Modal
      title={staff ? staff.name : "Nouveau membre"}
      onClose={onClose}
      footer={
        <>
          {staff && (
            <button
              type="button"
              onClick={() => setArchiving(true)}
              disabled={busy}
              className="mr-auto text-sm font-semibold text-ember-3 transition-opacity hover:opacity-80 disabled:opacity-60"
            >
              Retirer de l&rsquo;équipe
            </button>
          )}
          <button
            type="submit"
            form="staff-form"
            disabled={busy || !name.trim()}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <form id="staff-form" onSubmit={save} className="flex flex-col gap-4">
        <Field
          label="Nom"
          required
          hint="Celui qui s'affiche sur la badgeuse et le planning."
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            autoFocus
            className={inputClass}
          />
        </Field>
        {!staff && (
          <Field label="Rôle" hint="Sert au planning ; l'accès, lui, passe par les comptes.">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className={inputClass}
            >
              {ROLES.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {ROLE_LABELS[candidate]}
                </option>
              ))}
            </select>
          </Field>
        )}
        {staff && (
          <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Lien de planning
            </p>
            <p className="break-all text-xs text-muted">{link}</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-faint">
                À lui envoyer une fois : il y voit ses créneaux sans avoir de
                compte.
              </p>
              <button
                type="button"
                onClick={() => void copy()}
                className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
              >
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        )}
      </form>

      {archiving && staff && (
        <ConfirmDialog
          title="Retirer de l'équipe ?"
          message={`La fiche de ${staff.name} sera supprimée, avec ses créneaux à venir, et son lien de planning cessera de répondre. Ses heures déjà badgées restent au journal.`}
          confirmLabel="Retirer"
          destructive
          onClose={() => setArchiving(false)}
          onConfirm={async () => {
            setArchiving(false);
            setBusy(true);
            try {
              await api.deleteStaff(staff.id);
              toast.success(`${staff.name} a été retiré de l'équipe.`);
              onSaved();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue."
              );
              setBusy(false);
            }
          }}
        />
      )}
    </Modal>
  );
}
