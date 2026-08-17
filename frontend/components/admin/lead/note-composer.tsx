"use client";

import { forwardRef, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";

/** Ajout d'une note au fil — vidé après envoi, focalisable depuis « Note ». */
export const NoteComposer = forwardRef<
  HTMLTextAreaElement,
  { restaurantId: string }
>(function NoteComposer({ restaurantId }, ref) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.addActivity(restaurantId, { type: "note", description: note });
      setNote("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={ref}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Ajouter une note…"
        className={`${inputClass} resize-none`}
      />
      {note.trim() && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="ember-gradient self-end rounded-full px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
        >
          Ajouter la note
        </button>
      )}
    </div>
  );
});
