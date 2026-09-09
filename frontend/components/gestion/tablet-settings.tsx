"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { lockAdmin } from "@/lib/gestion/admin-lock";

/*
 * Code d'accès de la tablette de salle. Une fois posé, l'espace s'ouvre en
 * vue salle sur chaque appareil : commandes, tables et badgeage, rien de
 * plus. Le bouton Admin de l'en-tête rend les écrans du gérant à qui connaît
 * le code. C'est ce qui permet de laisser une tablette au comptoir sans y
 * laisser la caisse et les paiements.
 */
export function TabletSettings({ pinSet }: { pinSet: boolean }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.setAdminPin(code);
      // Le nouveau code doit valoir tout de suite, y compris ici.
      if (code) lockAdmin();
      setCode("");
      toast.success(code ? "Code enregistré." : "Code retiré.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="flex max-w-xl flex-col gap-5 rounded-2xl border border-hairline bg-surface p-5 lg:p-6"
    >
      <div>
        <h2 className="font-display text-lg font-medium">Tablette de salle</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {pinSet
            ? "Un code est posé : l'espace démarre en vue salle et le bouton Admin ouvre vos écrans. Saisissez un nouveau code pour le remplacer, ou laissez vide pour retirer le verrou."
            : "Posez un code pour que l'espace démarre en vue salle sur chaque appareil. L'équipe garde les commandes, les tables et le badgeage ; vos écrans s'ouvrent au code."}
        </p>
      </div>
      <Field label="Code d'accès" hint="De 4 à 8 chiffres. Vide : aucun verrou.">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
          }
          placeholder={pinSet ? "••••" : "Aucun code"}
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || (code.length > 0 && code.length < 4)}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          {code ? "Enregistrer" : "Retirer le code"}
        </button>
      </div>
    </form>
  );
}
