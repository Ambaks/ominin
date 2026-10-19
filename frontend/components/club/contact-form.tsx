"use client";

import { CONTACT_RULES as RULES } from "@/lib/club/contact";
import type { ClubConditions } from "@/lib/club/types";

/*
 * Les coordonnées et les conditions d'un paiement en ligne (table entière,
 * part d'organisateur, part d'un ami) : mêmes champs, mêmes contrôles que
 * le serveur (cleanContact), mêmes conditions à accepter. Les erreurs ne
 * s'affichent qu'après un premier essai de paiement.
 */

export type Contact = { name: string; phone: string; email: string };
export type ContactErrors = Partial<Record<keyof Contact | "accepted", string>>;


export function contactErrors(contact: Contact, accepted: boolean): ContactErrors {
  const errors: ContactErrors = {};
  const name = contact.name.trim();
  const phone = contact.phone.replace(/[^\d+]/g, "");
  const email = contact.email.trim();
  if (name.length < RULES.name.min || name.length > RULES.name.max) errors.name = "Indiquez votre nom et votre prénom.";
  if (phone.length < RULES.phoneDigits.min || phone.length > RULES.phoneDigits.max)
    errors.phone = "Ce numéro paraît incomplet.";
  if (!RULES.email.test(email) || email.length > RULES.emailMax) errors.email = "Cette adresse e-mail paraît incomplète.";
  if (!accepted) errors.accepted = "Cochez la case pour accepter les conditions du club.";
  return errors;
}

/** Le premier champ en erreur prend le focus : le client voit ce qui manque. */
export function focusFirstError(form: HTMLFormElement | null, errors: ContactErrors) {
  const first = (["name", "phone", "email", "accepted"] as const).find((key) => errors[key]);
  if (first) form?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
}

function Field({
  name,
  label,
  error,
  hint,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="club-field" data-invalid={error ? "" : undefined}>
      <span>{label}</span>
      {children}
      {error ? (
        <small className="club-field-error" id={`${name}-error`}>
          {error}
        </small>
      ) : (
        hint && <small>{hint}</small>
      )}
    </label>
  );
}

export function ContactFields({
  value,
  onChange,
  errors,
  emailHint,
}: {
  value: Contact;
  onChange: (next: Contact) => void;
  errors: ContactErrors;
  emailHint: string;
}) {
  return (
    <>
      <Field name="name" label="Nom et prénom" error={errors.name}>
        <input
          name="name"
          autoComplete="name"
          maxLength={RULES.name.max}
          aria-invalid={Boolean(errors.name) || undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          value={value.name}
          onChange={(input) => onChange({ ...value, name: input.target.value })}
        />
      </Field>
      <Field name="phone" label="Téléphone" error={errors.phone}>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone) || undefined}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          value={value.phone}
          onChange={(input) => onChange({ ...value, phone: input.target.value })}
        />
      </Field>
      <Field name="email" label="E-mail" error={errors.email} hint={emailHint}>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={RULES.emailMax}
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          value={value.email}
          onChange={(input) => onChange({ ...value, email: input.target.value })}
        />
      </Field>
    </>
  );
}

export function ConditionsBlock({
  conditions,
  refund,
  holdNote,
  accepted,
  onAccept,
  error,
}: {
  conditions: ClubConditions;
  refund: string;
  holdNote: string;
  accepted: boolean;
  onAccept: (accepted: boolean) => void;
  error?: string;
}) {
  return (
    <div className="club-conditions" data-invalid={error ? "" : undefined}>
      <ul className="club-conditions-list">
        <li>
          <svg viewBox="0 0 24 24" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <circle cx="9" cy="11" r="2.2" />
            <path d="M6 16c.8-1.6 1.9-2.4 3-2.4s2.2.8 3 2.4M14 10h4M14 13.5h3" />
          </svg>
          <span>{`${conditions.minAge} ans et plus, pièce d’identité à l’appui`}</span>
        </li>
        {(conditions.dress || conditions.refused) && (
          <li>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3c-.5 1.4-1.7 2.2-3 2.2S9.5 4.4 9 3Z" />
            </svg>
            <span>{[conditions.dress, conditions.refused].filter(Boolean).join(" · ")}</span>
          </li>
        )}
        <li>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
            <path d="M12 8v4l3 2" />
          </svg>
          <span>{refund}</span>
        </li>
      </ul>
      <label className="club-check">
        <input
          type="checkbox"
          name="accepted"
          checked={accepted}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "accepted-error" : undefined}
          onChange={(input) => onAccept(input.target.checked)}
        />
        <span>J&rsquo;accepte les conditions du club</span>
      </label>
      {error && (
        <p className="club-field-error" id="accepted-error">
          {error}
        </p>
      )}
      <p className="club-fine club-hold-note">{holdNote}</p>
    </div>
  );
}
