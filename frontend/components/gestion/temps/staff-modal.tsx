"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { ROLE_LABELS, STAFF_CODE_LENGTH } from "@/lib/gestion/constants";
import { planningLink } from "@/lib/gestion/temps";
import type { Role, Staff } from "@/lib/gestion/types";

/*
 * Fiche d'un membre de l'équipe. Un serveur n'a pas besoin de compte : le
 * gérant le crée ici, le nomme, lui pose son code de badgeage et lui transmet
 * son lien de planning une fois. La fiche se masque — hors badgeuse, planning
 * et affectation, sans rien effacer — ou se supprime ; ses heures déjà
 * badgées restent au journal dans les deux cas.
 */

const ROLES: Role[] = ["serveur", "cuisinier", "gerant"];

function digits(value: string): string {
  return value.replace(/\D/g, "").slice(0, STAFF_CODE_LENGTH);
}

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
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = staff ? planningLink(staff.planningToken) : "";
  const codeComplete = code.length === STAFF_CODE_LENGTH;
  // Nouvelle fiche : le code est obligatoire. Fiche existante : vide, il
  // ne change pas ; sinon il doit être complet.
  const codeValid = staff ? code === "" || codeComplete : codeComplete;

  const fail = (error: unknown) => {
    toast.error(
      error instanceof Error ? error.message : "Une erreur est survenue."
    );
    setBusy(false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !codeValid) return;
    setBusy(true);
    try {
      if (staff) {
        if (name.trim() !== staff.name) await api.renameStaff(staff.id, name);
        if (code) await api.setStaffCode(staff.id, code);
        toast.success("Fiche modifiée.");
      } else {
        await api.createStaff(name, role, code);
        toast.success(`${name.trim()} rejoint l'équipe.`);
      }
      onSaved();
    } catch (error) {
      fail(error);
    }
  };

  const toggleHidden = async () => {
    if (!staff) return;
    setBusy(true);
    try {
      await api.setStaffHidden(staff.id, !staff.hidden);
      toast.success(
        staff.hidden
          ? `${staff.name} est de retour sur la badgeuse et le planning.`
          : `${staff.name} est masqué.`
      );
      onSaved();
    } catch (error) {
      fail(error);
    }
  };

  const remove = async () => {
    if (!staff) return;
    setDeleting(false);
    setBusy(true);
    try {
      await api.deleteStaff(staff.id);
      toast.success(`${staff.name} a été retiré de l'équipe.`);
      onSaved();
    } catch (error) {
      fail(error);
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
        <button
          type="submit"
          form="staff-form"
          disabled={busy || !name.trim() || !codeValid}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          Enregistrer
        </button>
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
        <Field
          label={staff?.codeSet ? "Nouveau code de badgeage" : "Code de badgeage"}
          required={!staff}
          hint={
            staff
              ? staff.codeSet
                ? `${STAFF_CODE_LENGTH} chiffres. Laissez vide pour garder le code actuel.`
                : "Aucun code posé : il badge sans code tant que vous n'en donnez pas un."
              : `${STAFF_CODE_LENGTH} chiffres, à lui communiquer : il les tape pour badger.`
          }
        >
          <input
            value={code}
            onChange={(event) => setCode(digits(event.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder={staff?.codeSet ? "••••" : "0000"}
            aria-invalid={code.length > 0 && !codeComplete}
            className={`${inputClass} tracking-[0.4em]`}
          />
        </Field>
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
                className="shrink-0 rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
              >
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        )}
        {staff && (
          <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Fiche
              </p>
              <p className="mt-1 text-xs text-faint">
                {staff.hidden
                  ? "Masquée : absente de la badgeuse, du planning et des tables. Ses heures restent au journal."
                  : "Masquer la retire de la badgeuse, du planning et des tables sans rien effacer."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void toggleHidden()}
                disabled={busy}
                className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
              >
                {staff.hidden ? "Réafficher" : "Masquer"}
              </button>
              <button
                type="button"
                onClick={() => setDeleting(true)}
                disabled={busy}
                className="rounded-full border border-ember-3/50 bg-ember-3/10 px-4 py-2.5 text-sm font-semibold text-ember-3 transition-colors hover:bg-ember-3/20 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </form>

      {deleting && staff && (
        <ConfirmDialog
          title="Supprimer cette fiche ?"
          message={`La fiche de ${staff.name} sera supprimée, avec ses créneaux à venir, et son lien de planning cessera de répondre. Ses heures déjà badgées restent au journal.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeleting(false)}
          onConfirm={() => void remove()}
        />
      )}
    </Modal>
  );
}
