"use client";

import { CONTACT_RULES } from "@/lib/club/contact";

/*
 * Nom, téléphone et e-mail de qui paie une place : le pass et le lien de
 * partage partent à cet e-mail. Les règles sont celles que le serveur
 * applique (cleanContact) ; les erreurs ne s'affichent qu'à l'envoi.
 */

export type Contact = { name: string; phone: string; email: string };

export const emptyContact: Contact = { name: "", phone: "", email: "" };

export function contactErrors(contact: Contact): Partial<Record<keyof Contact, string>> {
  const errors: Partial<Record<keyof Contact, string>> = {};
  const name = contact.name.trim();
  const digits = contact.phone.replace(/[^\d+]/g, "");
  const email = contact.email.trim();
  if (name.length < CONTACT_RULES.name.min || name.length > CONTACT_RULES.name.max) {
    errors.name = "Votre prénom et votre nom.";
  }
  if (digits.length < CONTACT_RULES.phoneDigits.min || digits.length > CONTACT_RULES.phoneDigits.max) {
    errors.phone = "Un numéro de téléphone valide.";
  }
  if (!CONTACT_RULES.email.test(email) || email.length > CONTACT_RULES.emailMax) {
    errors.email = "Une adresse e-mail valide : le pass y est envoyé.";
  }
  return errors;
}

const FIELDS = [
  { key: "name", label: "Prénom et nom", type: "text", autoComplete: "name", inputMode: undefined },
  { key: "phone", label: "Téléphone", type: "tel", autoComplete: "tel", inputMode: "tel" },
  { key: "email", label: "E-mail", type: "email", autoComplete: "email", inputMode: "email" },
] as const;

export function ContactFields({
  value,
  onChange,
  showErrors,
}: {
  value: Contact;
  onChange: (value: Contact) => void;
  showErrors: boolean;
}) {
  const errors = showErrors ? contactErrors(value) : {};
  return (
    <div className="bo-fields">
      {FIELDS.map((field) => {
        const error = errors[field.key];
        return (
          <label key={field.key} className="bo-field">
            <span>{field.label}</span>
            <input
              type={field.type}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              value={value[field.key]}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `bo-error-${field.key}` : undefined}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
            />
            {error && (
              <span id={`bo-error-${field.key}`} className="bo-field-error">
                {error}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
