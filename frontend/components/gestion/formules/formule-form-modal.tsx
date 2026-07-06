"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import * as api from "@/lib/gestion/api";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Formule } from "@/lib/gestion/types";
import type { MenuItem } from "@/lib/menu-data";
import {
  EtapeEditor,
  draftToEtapes,
  emptyEtape,
  etapesToDraft,
  type EtapeDraft,
} from "./etape-editor";

export function FormuleFormModal({
  formule,
  menuItems,
  onClose,
}: {
  /** undefined ⇒ création. */
  formule?: Formule;
  menuItems: MenuItem[];
  onClose: () => void;
}) {
  const { hasFeature } = useGestionAccess();
  const toast = useToast();

  const [name, setName] = useState(formule?.name ?? "");
  const [description, setDescription] = useState(formule?.description ?? "");
  const [price, setPrice] = useState(
    formule ? priceToInput(formule.price) : ""
  );
  const [disponible, setDisponible] = useState(formule?.disponible ?? true);
  const [etapes, setEtapes] = useState<EtapeDraft[]>(
    formule ? etapesToDraft(formule.etapes) : [emptyEtape()]
  );
  const [submitted, setSubmitted] = useState(false);

  const parsedPrice = parsePriceInput(price);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || parsedPrice === null) return;

    const input: api.FormuleInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: parsedPrice,
      disponible,
      etapes: draftToEtapes(etapes),
    };
    try {
      if (formule) {
        await api.updateFormule(formule.id, input);
        toast.success("Formule modifiée.");
      } else {
        await api.createFormule(input);
        toast.success("Formule ajoutée.");
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
      title={formule ? "Modifier la formule" : "Nouvelle formule"}
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
            form="formule-form"
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <form id="formule-form" onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Nom" required>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Formule midi"
              className={`${inputClass} ${submitted && !name.trim() ? "border-ember-3/60" : ""}`}
            />
          </Field>
          <Field label="Prix" required>
            <PriceInput
              value={price}
              onChange={setPrice}
              invalid={submitted && parsedPrice === null}
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Entrée + plat au choix…"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-muted">
          <Toggle
            checked={disponible}
            onChange={setDisponible}
            label="Formule disponible"
          />
          Disponible sur le menu client
        </label>

        <Field label="Étapes">
          <EtapeEditor
            value={etapes}
            onChange={setEtapes}
            menuItems={menuItems}
            showOptions={hasFeature("options")}
          />
        </Field>
      </form>
    </Modal>
  );
}
