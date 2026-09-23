"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { verifyPaymentPin } from "@/lib/gestion/api";

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
        setError("Code incorrect.");
        setCode("");
        return;
      }
      onAuthorized(code);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Vérification impossible."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Code d'encaissement"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="payment-pin-form"
            disabled={code.length !== 4 || busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {busy ? "Vérification…" : "Continuer"}
          </button>
        </>
      }
    >
      <form
        id="payment-pin-form"
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-3"
      >
        <p className="text-sm leading-relaxed text-muted">
          Saisissez le code à 4 chiffres défini dans les réglages Admin.
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
          }}
          aria-label="Code d'encaissement"
          aria-invalid={Boolean(error)}
          className="rounded-xl border border-hairline bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none transition-colors focus:border-ember-2/60"
        />
        {error && (
          <p role="alert" className="text-sm text-ember-3">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
