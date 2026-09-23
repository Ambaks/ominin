"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { setPaymentPin } from "@/lib/gestion/api";

export function PaymentPinSettings({ pinSet }: { pinSet: boolean }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 4) return;
    setBusy(true);
    try {
      await setPaymentPin(code);
      setCode("");
      toast.success(
        pinSet
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
            ? "Ce code est demandé à chaque appui sur Encaisser. Saisissez-en un nouveau pour le remplacer."
            : "Définissez un code différent du code Admin. Tant qu'il manque, aucun encaissement au comptoir n'est possible."}
        </p>
      </div>
      <Field
        label="Code à 4 chiffres"
        required
        hint="Il doit être différent du code Admin."
      >
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 4))
          }
          placeholder={pinSet ? "••••" : "4 chiffres"}
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end">
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
