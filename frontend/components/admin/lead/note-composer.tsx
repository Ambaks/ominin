"use client";

import { forwardRef, useState } from "react";
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
        className={`g-input resize-none`}
      />
      {note.trim() && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="g-btn g-btn-primary g-press self-end"
        >
          Ajouter la note
        </button>
      )}
    </div>
  );
});
