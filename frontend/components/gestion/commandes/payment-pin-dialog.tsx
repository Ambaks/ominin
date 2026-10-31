"use client";

import { useState } from "react";
import { Field, GlassButton, Input, Sheet } from "@/components/gestion/ui";
import { verifyPaymentPin } from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";

export function PaymentPinDialog({
  onAuthorized,
  onClose,
}: {
  onAuthorized: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (code.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await verifyPaymentPin(code))) {
        setError("Code incorrect : réessayez, ou demandez-le au gérant.");
        setCode("");
        return;
      }
      onAuthorized(code);
    } catch (reason) {
      setError(describeError(reason).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Code d’encaissement"
      centered
      description="Le gérant l’a défini dans Réglages › Encaissement."
      onClose={onClose}
      footer={
        <>
          {code.length !== 4 && <p>Saisissez les 4 chiffres pour continuer.</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form="payment-pin-form" disabled={code.length !== 4 || busy}>
            {busy ? "Vérification…" : "Continuer"}
          </GlassButton>
        </>
      }
    >
      <form id="payment-pin-form" onSubmit={(event) => void submit(event)}>
        <Field label="Code" hint="4 chiffres" error={error ?? undefined}>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            data-autofocus
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
              setError(null);
            }}
            placeholder="••••"
            className="text-center tracking-[0.5em]"
          />
        </Field>
      </form>
    </Sheet>
  );
}
