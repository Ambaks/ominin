"use client";

import { LeadForm } from "@/components/landing/lead-form";
import { useLanguage } from "@/lib/portal/language";
import { surMesure } from "@/lib/portal-data";

const { form } = surMesure;

/** Formulaire « sur mesure » : le formulaire commun, résolu dans la langue du portail. */
export function ContactForm() {
  const { language, t } = useLanguage();

  return (
    <LeadForm
      source="sur-mesure"
      locale={language}
      copy={{
        name: { label: t(form.name.label), placeholder: t(form.name.placeholder) },
        email: { label: t(form.email.label), placeholder: t(form.email.placeholder) },
        company: {
          label: t(form.company.label),
          hint: t(form.company.optional),
          placeholder: t(form.company.placeholder),
        },
        message: { label: t(form.message.label), placeholder: t(form.message.placeholder) },
        submit: t(form.submit),
        sending: t(form.sending),
        success: { title: t(form.success.title), body: t(form.success.body) },
        error: t(form.error),
        note: t(form.note),
      }}
    />
  );
}
