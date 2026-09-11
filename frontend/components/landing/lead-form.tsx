"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { CONTACT_LIMITS, type ContactSource } from "@/lib/portal/contact";

/*
 * Formulaire de contact commun au portail (/sur-mesure) et à la landing
 * Ominin Shop : mêmes champs, même route /api/contact, même piège à robots.
 * Le composant ne porte aucun texte — chaque page passe ses libellés déjà
 * résolus dans sa langue — et dit d'où part la demande (`source`), ce qui
 * donne son sujet à l'e-mail de notification et sa colonne en base.
 */

export type LeadFormCopy = {
  name: { label: string; placeholder: string };
  email: { label: string; placeholder: string };
  company: { label: string; hint: string; placeholder: string };
  message: { label: string; placeholder: string };
  submit: string;
  sending: string;
  success: { title: string; body: string };
  error: string;
  note: string;
};

type Status = "idle" | "sending" | "sent" | "error";

export function LeadForm({
  copy,
  source,
  locale,
}: {
  copy: LeadFormCopy;
  source: ContactSource;
  locale: "fr" | "en";
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(data),
        locale,
        source,
      }),
    }).catch(() => null);

    setStatus(response?.ok ? "sent" : "error");
  }

  if (status === "sent") {
    return (
      <div className="rise rounded-2xl border border-hairline bg-surface p-7 text-center lg:p-9">
        <p className="ember-text font-display text-2xl font-semibold">
          {copy.success.title}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          {copy.success.body}
        </p>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-hairline bg-surface p-7 lg:p-9"
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.name.label} required>
            <input
              name="name"
              type="text"
              required
              maxLength={CONTACT_LIMITS.name.max}
              autoComplete="name"
              placeholder={copy.name.placeholder}
              className={inputClass}
            />
          </Field>

          <Field label={copy.email.label} required>
            <input
              name="email"
              type="email"
              required
              maxLength={CONTACT_LIMITS.email.max}
              autoComplete="email"
              placeholder={copy.email.placeholder}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={copy.company.label} hint={copy.company.hint}>
          <input
            name="company"
            type="text"
            maxLength={CONTACT_LIMITS.company.max}
            autoComplete="organization"
            placeholder={copy.company.placeholder}
            className={inputClass}
          />
        </Field>

        <Field label={copy.message.label} required>
          <textarea
            name="message"
            required
            rows={6}
            minLength={CONTACT_LIMITS.message.min}
            maxLength={CONTACT_LIMITS.message.max}
            placeholder={copy.message.placeholder}
            className={`${inputClass} resize-y`}
          />
        </Field>

        {/* Piège à robots : hors flux et hors tabulation, jamais rempli par un
            humain. Une valeur présente fait ignorer la soumission côté route. */}
        <div className="absolute -left-[9999px]" aria-hidden>
          <input
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {status === "error" && (
          <p role="alert" className="text-sm text-ember-3">
            {copy.error}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-faint">{copy.note}</p>
          <button
            type="submit"
            disabled={sending}
            className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background transition-opacity disabled:opacity-60"
          >
            {sending ? copy.sending : copy.submit}
          </button>
        </div>
      </div>
    </form>
  );
}
