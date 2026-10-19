"use client";

import { useState } from "react";
import { PhotoField } from "@/components/gestion/photo-field";
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
  const [image, setImage] = useState(affiche?.image ?? "");
  const [offres, setOffres] = useState(affiche ? String(affiche.offres) : "");
  const [submitted, setSubmitted] = useState(false);

  const parsedOffres = Number.parseInt(offres, 10);
  const offresValid = Number.isInteger(parsedOffres) && parsedOffres > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!image.trim() || !offresValid) return;

    const input: api.AfficheInput = { image: image.trim(), offres: parsedOffres };
    try {
      if (affiche) {
        await api.updateAffiche(affiche.id, input);
        toast.success("Affiche modifiée.");
      } else {
        await api.createAffiche(input);
        toast.success("Affiche ajoutée : créez maintenant ses formules.");
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <Modal
      title={affiche ? "Modifier l'affiche" : "Nouvelle affiche"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="affiche-form"
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <form id="affiche-form" onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Un visuel qui présente vos offres côte à côte, avec leurs noms et
          leurs prix. Il défile en haut du menu ; sous lui, un bouton par
          formule ouvre sa composition.
        </p>
        <PhotoField value={image} onChange={setImage} alt="Aperçu de l'affiche" />
        {submitted && !image.trim() && (
          <p role="alert" className="-mt-2 text-xs font-medium text-ember-3">
            Ajoutez l&rsquo;image de l&rsquo;affiche.
          </p>
        )}
        <Field
          label="Nombre d'offres sur l'affiche"
          required
          hint={
            affiche
              ? "En le réduisant, les formules des derniers emplacements redeviennent des tuiles."
              : "Vous créerez ensuite une formule par offre, de gauche à droite."
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
            aria-invalid={submitted && !offresValid}
            className={`${inputClass} max-w-32 ${submitted && !offresValid ? "border-ember-3/60" : ""}`}
          />
        </Field>
      </form>
    </Modal>
  );
}
