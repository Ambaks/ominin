"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { acceptanceStatement } from "@/lib/commercial/record";
import type { CommercialIdentity } from "@/lib/legal/commercial";

type Draft = Omit<CommercialIdentity, "email">;

const FIELDS: {
  key: keyof Draft;
  label: string;
  autoComplete: string;
  hint?: string;
  inputMode?: "numeric" | "tel";
  /** Contrôle natif, doublé côté serveur (parseIdentity). */
  pattern?: string;
  /** Message du contrôle natif quand le motif n'est pas respecté. */
  title?: string;
  type?: "tel";
}[] = [
  { key: "firstName", label: "Prénom", autoComplete: "given-name" },
  { key: "lastName", label: "Nom", autoComplete: "family-name" },
  {
    key: "siret",
    label: "SIRET",
    autoComplete: "off",
    hint: "14 chiffres, sur votre avis de situation SIRENE (Insee).",
    inputMode: "numeric",
    pattern: "\\s*(\\d\\s*){14}",
    title: "Le SIRET compte 14 chiffres.",
  },
  { key: "address", label: "Adresse de domicile", autoComplete: "street-address" },
  { key: "phone", label: "Téléphone", autoComplete: "tel", type: "tel" },
];

/*
 * Identité, l'essentiel, le contrat, la signature — dans cet ordre. Le texte
 * du contrat arrive en enfant, rendu côté serveur : c'est la version que
 * l'empreinte désigne, et le bouton renvoie son numéro pour que le serveur
 * vérifie que c'est bien elle qu'on signe.
 */
export function SignForm({
  version,
  initial,
  email,
  anchor,
  essentials,
  children,
}: {
  version: string;
  initial: Draft;
  email: string;
  /** Identifiant du bloc de signature, visé par le lien du résumé. */
  anchor: string;
  essentials: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const busy = sending || refreshing;

  // L'erreur prend le focus : sans cela, après l'envoi, il retombait sur la
  // page et le message n'était qu'annoncé, loin de l'œil.
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/commercial/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: draft, version }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok || response.status === 409) {
        // Signé, déjà signé ou texte changé : la page serveur dit laquelle.
        startRefresh(() => router.refresh());
      }
      if (!response.ok) throw new Error(result.error ?? "La signature a échoué.");
    } catch (cause) {
      // Réponse perdue (réseau, délai) : la signature a pu être écrite quand
      // même, la page serveur le dira.
      if (cause instanceof TypeError) {
        startRefresh(() => router.refresh());
      }
      setError(cause instanceof Error ? cause.message : "La signature a échoué.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-12">
      <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-medium">Votre identité</h2>
          <p className="mt-1 text-sm text-muted">
            Elle figure au relevé de signature et désigne « le Commercial » dans
            le contrat.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div
              key={field.key}
              className={field.key === "address" ? "sm:col-span-2" : undefined}
            >
              <Field label={field.label} required hint={field.hint}>
                <input
                  value={draft[field.key]}
                  onChange={(event) => {
                    // Depuis l'état courant : le remplissage automatique du
                    // navigateur change plusieurs champs d'un coup.
                    const value = event.target.value;
                    setDraft((current) => ({ ...current, [field.key]: value }));
                  }}
                  required
                  autoComplete={field.autoComplete}
                  inputMode={field.inputMode}
                  pattern={field.pattern}
                  title={field.title}
                  type={field.type}
                  readOnly={busy}
                  className={inputClass}
                />
              </Field>
            </div>
          ))}
          <div className="sm:col-span-2">
            <Field label="E-mail" hint="L’adresse de votre invitation.">
              <input value={email} readOnly disabled className={inputClass} />
            </Field>
          </div>
        </div>
      </section>

      {essentials}

      <div className="space-y-12">{children}</div>

      <section
        id={anchor}
        className="flex scroll-mt-8 flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 sm:p-6 print:hidden"
      >
        <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            required
            className="mt-1 size-4 shrink-0 accent-[var(--ember-2)]"
          />
          <span>{acceptanceStatement(version)}</span>
        </label>
        {error && (
          <p ref={alertRef} role="alert" tabIndex={-1} className="text-sm text-ember-3 outline-none">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !accepted}
          aria-busy={busy}
          className="ember-gradient self-start rounded-full px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy ? "Signature en cours…" : "Signer le contrat"}
        </button>
      </section>
    </form>
  );
}
