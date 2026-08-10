"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useLanguage } from "@/lib/portal/language";
import { CONTACT_LIMITS } from "@/lib/portal/contact";
import { surMesure } from "@/lib/portal-data";

const { form } = surMesure;

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const { language, t } = useLanguage();
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
        locale: language,
      }),
    }).catch(() => null);

    setStatus(response?.ok ? "sent" : "error");
  }

  if (status === "sent") {
    return (
      <div className="rise rounded-2xl border border-hairline bg-surface p-7 text-center lg:p-9">
        <p className="ember-text font-display text-2xl font-semibold">
          {t(form.success.title)}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          {t(form.success.body)}
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
          <Field label={t(form.name.label)} required>
            <input
              name="name"
              type="text"
              required
              maxLength={CONTACT_LIMITS.name.max}
              autoComplete="name"
              placeholder={t(form.name.placeholder)}
              className={inputClass}
            />
          </Field>

          <Field label={t(form.email.label)} required>
            <input
              name="email"
              type="email"
              required
              maxLength={CONTACT_LIMITS.email.max}
              autoComplete="email"
              placeholder={t(form.email.placeholder)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={t(form.company.label)} hint={t(form.company.optional)}>
          <input
            name="company"
            type="text"
            maxLength={CONTACT_LIMITS.company.max}
            autoComplete="organization"
            placeholder={t(form.company.placeholder)}
            className={inputClass}
          />
        </Field>

        <Field label={t(form.message.label)} required>
          <textarea
            name="message"
            required
            rows={6}
            minLength={CONTACT_LIMITS.message.min}
            maxLength={CONTACT_LIMITS.message.max}
            placeholder={t(form.message.placeholder)}
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
            {t(form.error)}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-faint">{t(form.note)}</p>
          <button
            type="submit"
            disabled={sending}
            className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background transition-opacity disabled:opacity-60"
          >
            {sending ? t(form.sending) : t(form.submit)}
          </button>
        </div>
      </div>
    </form>
  );
}
