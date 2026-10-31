"use client";

import { useRef, useState } from "react";
import { PhotoField } from "@/components/gestion/photo-field";
import { GlassButton } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import type { Affiche } from "@/lib/gestion/types";

export function AfficheFormModal({
  affiche,
  onClose,
}: {
  /** undefined ⇒ création. */
  affiche?: Affiche;
  onClose: () => void;
}) {
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [image, setImage] = useState(affiche?.image ?? "");
  const [offres, setOffres] = useState(affiche ? String(affiche.offres) : "");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsedOffres = Number.parseInt(offres, 10);
  const offresValid = Number.isInteger(parsedOffres) && parsedOffres > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!image.trim() || !offresValid) return;

    const input: api.AfficheInput = { image: image.trim(), offres: parsedOffres };
    setSaving(true);
    try {
      if (affiche) {
        await api.updateAffiche(affiche.id, input);
        toast.success("Image modifiée.");
      } else {
        await api.createAffiche(input);
        toast.success("Image ajoutée : placez-y vos formules.");
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'enregistrer. Rechargez la page et réessayez."
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      title={affiche ? "Modifier l'image" : "Image des offres"}
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={saving} onClick={() => form.current?.requestSubmit()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </GlassButton>
        </>
      }
    >
      <form ref={form} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-g-meta text-muted">
          Un visuel qui présente vos offres côte à côte, avec leurs noms et leurs
          prix. Il défile en haut du menu ; sous lui, un bouton par formule ouvre sa composition.
        </p>
        <PhotoField label="Image" value={image} onChange={setImage} alt="Aperçu de l'image des offres" />
        {submitted && !image.trim() && (
          <p role="alert" className="-mt-2 text-g-meta font-medium text-ember-3">
            Ajoutez l&rsquo;image pour enregistrer.
          </p>
        )}
        <Field
          label="Nombre d'offres sur l'image"
          required
          hint={
            affiche
              ? "En le réduisant, les formules des derniers emplacements redeviennent des tuiles."
              : "Vous placerez ensuite une formule par offre, de gauche à droite."
          }
          error={submitted && !offresValid ? "Indiquez au moins une offre." : undefined}
        >
          <input
            value={offres}
            onChange={(event) => setOffres(event.target.value)}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="2"
            aria-invalid={submitted && !offresValid ? true : undefined}
            className={`${inputClass} max-w-32`}
          />
        </Field>
      </form>
    </Modal>
  );
}
