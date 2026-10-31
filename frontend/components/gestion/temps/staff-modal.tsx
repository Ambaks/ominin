"use client";

import { useState } from "react";
import { ConfirmSheet, Field, GlassButton, Input, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
import { STAFF_CODE_LENGTH } from "@/lib/gestion/constants";
import { planningLink } from "@/lib/gestion/temps";
import type { Role, Staff } from "@/lib/gestion/types";
import { RoleCards } from "./role-cards";

/*
 * Fiche d'un membre de l'équipe. Un serveur n'a pas besoin de compte : le
 * gérant le crée ici, le nomme, lui pose son code de badgeage et lui transmet
 * son lien de planning une fois. La fiche se masque — hors badgeuse, planning
 * et affectation, sans rien effacer — ou se supprime ; ses heures déjà
 * badgées restent au journal dans les deux cas.
 */

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
  const missing = !name.trim()
    ? "Indiquez un nom pour enregistrer."
    : !codeValid
      ? `Le code fait ${STAFF_CODE_LENGTH} chiffres.`
      : null;

  const fail = (error: unknown) => {
    toast.error(
      describeError(error).message
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
    <Sheet
      title={staff ? staff.name : "Nouveau membre"}
      onClose={onClose}
      footer={
        <>
          {missing && <p role="status">{missing}</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton
            variant="primary"
            type="submit"
            form="staff-form"
            disabled={busy || !name.trim() || !codeValid}
          >
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <form id="staff-form" onSubmit={save} className="flex flex-col gap-4">
        <Field
          label="Nom"
          required
          hint="Celui qui s'affiche sur la badgeuse et le planning."
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            data-autofocus
          />
        </Field>
        {!staff && (
          <Field label="Rôle" hint="Sert au planning ; l'accès, lui, passe par les comptes.">
            <RoleCards value={role} onChange={setRole} disabled={busy} />
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
          <Input
            value={code}
            onChange={(event) => setCode(digits(event.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder={staff?.codeSet ? "••••" : "0000"}
            aria-invalid={code.length > 0 && !codeComplete}
            className="tracking-widest"
          />
        </Field>
        {staff && (
          <div className="flex flex-col gap-2 rounded-g-card border border-hairline p-4">
            <p className="text-g-label font-semibold">Lien de planning</p>
            <p className="break-all text-g-meta text-muted">{link}</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-g-meta text-muted">
                À lui envoyer une fois : il y voit ses créneaux sans avoir de
                compte.
              </p>
              <GlassButton onClick={() => void copy()}>{copied ? "Copié" : "Copier"}</GlassButton>
            </div>
          </div>
        )}
        {staff && (
          <div className="flex flex-col gap-3 rounded-g-card border border-hairline p-4">
            <div>
              <p className="text-g-label font-semibold">Fiche</p>
              <p className="mt-1 text-g-meta text-muted">
                {staff.hidden
                  ? "Masquée : absente de la badgeuse, du planning et des tables. Ses heures restent au journal."
                  : "Masquer la retire de la badgeuse, du planning et des tables sans rien effacer."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <GlassButton onClick={() => void toggleHidden()} disabled={busy}>
                {staff.hidden ? "Réafficher" : "Masquer"}
              </GlassButton>
              <GlassButton variant="danger" onClick={() => setDeleting(true)} disabled={busy}>
                Supprimer
              </GlassButton>
            </div>
          </div>
        )}
      </form>

      {deleting && staff && (
        <ConfirmSheet
          title="Supprimer cette fiche ?"
          text={`La fiche de ${staff.name} sera supprimée, avec ses créneaux à venir, et son lien de planning cessera de répondre. Ses heures déjà badgées restent au journal.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeleting(false)}
          onConfirm={() => void remove()}
        />
      )}
    </Sheet>
  );
}
