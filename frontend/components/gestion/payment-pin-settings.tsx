"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { setPaymentPin } from "@/lib/gestion/api";

export function PaymentPinSettings({ pinSet }: { pinSet: boolean }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (next: string) => {
    setBusy(true);
    try {
      await setPaymentPin(next);
      setCode("");
      toast.success(
        !next
          ? "Code d'encaissement retiré."
          : pinSet
            ? "Code d'encaissement remplacé."
            : "Code d'encaissement enregistré."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length === 4) void submit(code);
  };

  return (
    <form
      onSubmit={save}
      className="flex max-w-xl flex-col gap-5 rounded-2xl border border-hairline bg-surface p-5 lg:p-6"
    >
      <div>
        <h2 className="font-display text-lg font-medium">
          Code d&apos;encaissement
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {pinSet
            ? "Ce code est demandé à chaque appui sur Encaisser. Saisissez-en un nouveau pour le remplacer, ou retirez-le pour encaisser sans code."
            : "Aucun code : l'équipe encaisse sans rien saisir. Posez un code pour qu'il soit demandé à chaque appui sur Encaisser."}
        </p>
      </div>
      <Field label="Code à 4 chiffres" hint="Il doit être différent du code Admin.">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 4))
          }
          placeholder={pinSet ? "••••" : "Aucun code"}
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end gap-3">
        {pinSet && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit("")}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            Retirer le code
          </button>
        )}
        <button
          type="submit"
          disabled={busy || code.length !== 4}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          {busy ? "Enregistrement…" : pinSet ? "Remplacer" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
