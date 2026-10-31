"use client";

import { useState } from "react";
import { describeError } from "@/lib/gestion/errors";
import { GlassButton, Plate } from "@/components/gestion/ui";
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
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length === 4) void submit(code);
  };
  const incomplete = code.length !== 4;

  return (
    <Plate className="max-w-xl p-5">
      <form onSubmit={save} className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-g-h2">Code d&apos;encaissement</h2>
          <p className="mt-1 text-muted">
            {pinSet
              ? "Demandé à chaque appui sur Encaisser. Saisissez-en un nouveau pour le remplacer, ou retirez-le."
              : "Aucun code : l'équipe encaisse sans rien saisir. Posez-en un pour qu'il soit demandé à chaque appui sur Encaisser."}
          </p>
        </div>
        <Field label="Code à 4 chiffres" hint="Il doit être différent du code Admin.">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder={pinSet ? "••••" : "Aucun code"}
            className={`${inputClass} max-w-40`}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {incomplete && !busy && (
            <span className="mr-auto text-g-meta text-muted">
              Saisissez les 4 chiffres pour {pinSet ? "remplacer" : "enregistrer"}.
            </span>
          )}
          {pinSet && (
            <GlassButton disabled={busy} onClick={() => void submit("")}>
              Retirer le code
            </GlassButton>
          )}
          <button
            type="submit"
            disabled={busy || incomplete}
            className="g-btn g-btn-primary g-press"
          >
            {busy ? "Enregistrement…" : pinSet ? "Remplacer" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Plate>
  );
}
