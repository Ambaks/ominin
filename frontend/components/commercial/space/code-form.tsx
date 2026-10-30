"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

const CODE_LENGTH = 6;

/* Le code à 6 chiffres de la connexion : l'application installée sur iPhone n'ouvre pas les liens des e-mails. */
export function CodeForm({ submitLabel, onDone }: { submitLabel: string; onDone?: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: refused } = await createClient().auth.updateUser({
      password: code,
      data: { commercial_code_set: true },
    });
    setBusy(false);
    if (refused) {
      setError("Ce code est refusé : choisis-en un autre, moins évident.");
      return;
    }
    setCode("");
    onDone?.();
    router.refresh();
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Field label={`Code à ${CODE_LENGTH} chiffres`} required>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern={`\\d{${CODE_LENGTH}}`}
          maxLength={CODE_LENGTH}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className={inputClass}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-ember-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || code.length !== CODE_LENGTH}
        className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
