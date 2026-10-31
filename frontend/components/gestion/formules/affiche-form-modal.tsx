"use client";

import { useState } from "react";
import { PhotoField } from "@/components/gestion/photo-field";
import { Field, GlassButton, Input, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
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
  const formId = "affiche-form";
  const [image, setImage] = useState(affiche?.image ?? "");
  const [offres, setOffres] = useState(affiche ? String(affiche.offres) : "");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsedOffres = Number.parseInt(offres, 10);
  const offresValid = Number.isInteger(parsedOffres) && parsedOffres > 0;
  const imageError = submitted && !image.trim() ? "Ajoutez l'image pour enregistrer." : undefined;

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
      toast.error(describeError(error).message);
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={affiche ? "Modifier l'image" : "Image des offres"}
      description="Un visuel qui présente vos offres côte à côte, avec leurs noms et leurs prix. Il défile en haut du menu ; sous lui, un bouton par formule ouvre sa composition."
      onClose={onClose}
      footer={
        <>
          {saving && <p>Un instant…</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton type="submit" form={formId} variant="primary" disabled={saving}>
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <PhotoField label="Image" value={image} onChange={setImage} alt="Aperçu de l'image des offres" />
        {imageError && (
          <p role="alert" className="g-field-error">
            <span>{imageError}</span>
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
          <Input
            numeric
            inputMode="numeric"
            value={offres}
            onChange={(event) => setOffres(event.target.value)}
            placeholder="2"
            className="max-w-32"
          />
        </Field>
      </form>
    </Sheet>
  );
}
