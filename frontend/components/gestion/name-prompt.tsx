"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { useGestion } from "@/lib/gestion/store";

/**
 * Invite un serveur sans nom d'affichage à le renseigner : l'affectation des
 * tables et l'attribution des pourboires reposent dessus. Reportable (le
 * service n'attend pas), redemandé à la prochaine session.
 */
export function NamePrompt() {
  const state = useGestion();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!state || dismissed || state.role !== "serveur") return null;
  const self = state.members.find((m) => m.userId === state.userId);
  if (!self || self.displayName) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateDisplayName(name);
      toast.success("Nom enregistré.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Modal title="Comment vous appelez-vous ?" onClose={() => setDismissed(true)}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Votre nom s&rsquo;affiche sur les tables qui vous sont confiées et
          permet d&rsquo;attribuer vos pourboires.
        </p>
        <Field label="Votre nom" required>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            autoFocus
            className={inputClass}
          />
        </Field>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Plus tard
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}
