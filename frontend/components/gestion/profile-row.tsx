"use client";

import { useState } from "react";
import { Field, GlassButton, Input, Plate, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
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
        describeError(error).message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Plate className="g-rise flex items-center justify-between gap-4 px-5 py-4" style={style}>
      <div className="min-w-0">
        <p className="truncate text-g-label font-semibold">{currentName}</p>
        <p className="text-g-meta text-muted">Votre nom, visible par l&rsquo;équipe</p>
      </div>
      <GlassButton
        onClick={() => {
          const self = state.members.find((m) => m.userId === state.userId);
          setName(self?.displayName ?? "");
          setEditing(true);
        }}
      >
        Modifier
      </GlassButton>
      {editing && (
        <Sheet
          title="Votre nom"
          onClose={() => setEditing(false)}
          footer={
            <>
              <GlassButton onClick={() => setEditing(false)}>Annuler</GlassButton>
              <GlassButton variant="primary" type="submit" form="profile-form" disabled={busy || !name.trim()}>
                Enregistrer
              </GlassButton>
            </>
          }
        >
          <form id="profile-form" onSubmit={save} className="flex flex-col gap-4">
            <Field label="Nom d'affichage" required>
              <Input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
                autoComplete="name"
                data-autofocus
              />
            </Field>
          </form>
        </Sheet>
      )}
    </Plate>
  );
}
