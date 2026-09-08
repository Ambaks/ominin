"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { memberName } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";

/**
 * Nom d'affichage du membre connecté. C'est lui qui figure sur le planning et
 * sur les badgeages : sans lui, l'équipe se lit en adresses e-mail. Seul le
 * membre peut poser le sien (policy « self update »).
 */
export function ProfileRow({
  state,
  style,
}: {
  state: GestionState;
  style?: React.CSSProperties;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const currentName = memberName(state, state.userId);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateDisplayName(name);
      toast.success("Nom enregistré.");
      setEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rise flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface px-5 py-4"
      style={style}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{currentName}</p>
        <p className="text-xs text-faint">Votre nom, visible par l&rsquo;équipe</p>
      </div>
      <button
        type="button"
        onClick={() => {
          const self = state.members.find((m) => m.userId === state.userId);
          setName(self?.displayName ?? "");
          setEditing(true);
        }}
        className="shrink-0 text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
      >
        Modifier
      </button>
      {editing && (
        <Modal title="Votre nom" onClose={() => setEditing(false)}>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Nom d'affichage" required>
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
            <div className="flex justify-end">
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
      )}
    </div>
  );
}
