"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/gestion/icons";
import { CalendarIcon, PhoneIcon, WhatsappIcon } from "@/components/admin/icons";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import { contactName, formatDayTime, formatRelative, fromDatetimeLocalValue } from "@/lib/admin/format";
import * as api from "@/lib/commercial/api";
import { CONTACT_ROLES, LEA_LABELS, LOG_TYPES, type Retained } from "@/lib/commercial/labels";
import { frenchDate } from "@/lib/legal/format";
import { readDraft, writeDraft } from "./device";
import { RetainedFields } from "./retained";
import {
  Choice,
  FieldGroup,
  SectionTitle,
  cardClass,
  ghostButton,
  primaryButton,
  telHref,
  whatsappHref,
} from "./ui";

type Sheet = api.RestaurantSheet;

const icsDate = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Le rendez-vous au format iCalendar, à ouvrir dans l'agenda du téléphone. */
function icsHref(rdv: api.Appointment, restaurant: string): string {
  const end = rdv.end_at ?? rdv.start_at;
  const text = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ominin//Espace commercial//FR",
    "BEGIN:VEVENT",
    `UID:${rdv.id}@ominin`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(new Date(rdv.start_at).toISOString())}`,
    `DTEND:${icsDate(new Date(end).toISOString())}`,
    `SUMMARY:${text(`${rdv.title} · ${restaurant}`)}`,
    ...(rdv.location ? [`LOCATION:${text(rdv.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/*
 * Le travail d'un commercial sur sa déclaration : étapes, journal, relances,
 * rendez-vous, interlocuteurs, fiche retenue. Chaque geste écrit en base par
 * une fonction commercial_* puis recharge la fiche (onChange).
 */

export function Steps({ sheet, onChange }: { sheet: Sheet; onChange: () => void }) {
  const run = useRunMutation();
  const mine = sheet.mine!;
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Étapes</SectionTitle>
      <ol className={`${cardClass} flex flex-col divide-y divide-hairline p-0`}>
        {sheet.steps.map((step) => {
          const doneAt = mine.step_done_at[String(step.position)];
          return (
            <li key={step.position} className="flex items-start gap-3 px-4 py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={Boolean(doneAt)}
                aria-label={`Étape ${step.position} : ${step.title}`}
                onClick={() =>
                  void run(async () => {
                    await api.setStep(mine.id, step.position, !doneAt);
                    onChange();
                  })
                }
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border transition-colors ${
                  doneAt ? "ember-gradient border-transparent text-background" : "border-hairline text-transparent"
                }`}
              >
                <CheckIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(open === step.position ? null : step.position)}
                className="min-w-0 flex-1 text-left"
              >
                <span className={`block text-[15px] ${doneAt ? "text-muted line-through decoration-hairline" : ""}`}>
                  {step.position}. {step.title}
                </span>
                {doneAt && <span className="text-xs text-faint">Fait le {frenchDate(doneAt)}</span>}
                {open === step.position && (
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted">{step.detail}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Journal({ sheet, onChange }: { sheet: Sheet; onChange: () => void }) {
  const run = useRunMutation();
  const declarationId = sheet.mine!.id;
  const [type, setType] = useState<(typeof LOG_TYPES)[number]["id"]>("visit");
  const [text, setText] = useState(() => readDraft(declarationId));
  const [busy, setBusy] = useState(false);

  const save = () =>
    void run(async () => {
      setBusy(true);
      try {
        await api.log(declarationId, type, text);
        setText("");
        writeDraft(declarationId, "");
        onChange();
      } finally {
        setBusy(false);
      }
    }, "Noté");

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Journal</SectionTitle>
      <div className={`${cardClass} flex flex-col gap-3`}>
        <Choice options={LOG_TYPES} value={type} onChange={setType} />
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            writeDraft(declarationId, event.target.value);
          }}
          rows={3}
          placeholder="Ce que vous avez vu ou entendu…"
          aria-label="Note"
          className={`${inputClass} resize-none`}
        />
        <button type="button" onClick={save} disabled={busy} className={primaryButton}>
          Noter
        </button>
      </div>
      {sheet.activities.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sheet.activities.map((activity) => (
            <li key={activity.id} className="rounded-xl border border-hairline px-4 py-3 text-sm">
              <p className="text-xs font-semibold text-faint">
                {LOG_TYPES.find((entry) => entry.id === activity.type)?.label ?? activity.type} ·{" "}
                {formatRelative(activity.created_at)}
              </p>
              {activity.description && <p className="mt-1 whitespace-pre-wrap leading-relaxed">{activity.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FollowUps({ sheet, onChange }: { sheet: Sheet; onChange: () => void }) {
  const run = useRunMutation();
  const declarationId = sheet.mine!.id;
  const [adding, setAdding] = useState<"task" | "appointment" | null>(null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");

  const close = () => {
    setAdding(null);
    setTitle("");
    setWhen("");
    setWhere("");
  };
  const add = () =>
    void run(async () => {
      if (adding === "task") {
        await api.upsertTask(declarationId, { title, due_at: fromDatetimeLocalValue(when) });
      } else {
        await api.upsertAppointment(declarationId, {
          title,
          start_at: fromDatetimeLocalValue(when),
          location: where || undefined,
        });
      }
      close();
      onChange();
    }, adding === "task" ? "Relance ajoutée" : "Rendez-vous ajouté");

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>À venir</SectionTitle>
      <ul className="flex flex-col gap-2">
        {sheet.appointments.map((rdv) => (
          <li key={rdv.id} className="flex items-center gap-3 rounded-xl border border-hairline px-4 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{rdv.title}</span>
              <span className="text-xs text-muted">
                Rendez-vous {formatDayTime(rdv.start_at)}
                {rdv.location ? ` · ${rdv.location}` : ""}
              </span>
            </span>
            <a
              href={icsHref(rdv, sheet.restaurant.name)}
              download={`rendez-vous-${rdv.id}.ics`}
              className={ghostButton}
              aria-label="Ajouter à mon agenda"
            >
              <CalendarIcon className="size-4" />
            </a>
            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  await api.upsertAppointment(declarationId, { id: rdv.id, status: "completed" });
                  onChange();
                }, "Rendez-vous fait")
              }
              className={ghostButton}
            >
              Fait
            </button>
          </li>
        ))}
        {sheet.tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 rounded-xl border border-hairline px-4 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{task.title}</span>
              {task.due_at && <span className="text-xs text-muted">Relance {formatRelative(task.due_at)}</span>}
            </span>
            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  await api.upsertTask(declarationId, { id: task.id, status: "done" });
                  onChange();
                }, "Relance faite")
              }
              className={ghostButton}
            >
              Faite
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAdding("task")} className={ghostButton}>
          + Relance
        </button>
        <button type="button" onClick={() => setAdding("appointment")} className={ghostButton}>
          + Rendez-vous
        </button>
      </div>
      {adding && (
        <Modal
          title={adding === "task" ? "Nouvelle relance" : "Nouveau rendez-vous"}
          onClose={close}
          footer={
            <button type="button" onClick={add} disabled={!title.trim() || !when} className={`${primaryButton} w-full`}>
              Ajouter
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Quoi" required>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={adding === "task" ? "Rappeler le gérant" : "Démo sur sa carte"}
                className={inputClass}
                data-autofocus
              />
            </Field>
            <Field label="Quand" required>
              <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className={inputClass} />
            </Field>
            {adding === "appointment" && (
              <Field label="Où" hint="Vide : au restaurant.">
                <input value={where} onChange={(event) => setWhere(event.target.value)} className={inputClass} />
              </Field>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

const ROLE_OPTIONS = CONTACT_ROLES.map((role) => ({ id: role, label: role }));

export function Contacts({ sheet, onChange }: { sheet: Sheet; onChange: () => void }) {
  const run = useRunMutation();
  const [editing, setEditing] = useState<api.ContactInput | null>(null);
  const save = () =>
    void run(async () => {
      await api.upsertContact(sheet.mine!.id, editing!);
      setEditing(null);
      onChange();
    }, "Interlocuteur enregistré");
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle
        aside={
          <button type="button" onClick={() => setEditing({ role: "" })} className="text-sm font-semibold text-ember-1">
            + Ajouter
          </button>
        }
      >
        Interlocuteurs
      </SectionTitle>
      <ul className="flex flex-col gap-2">
        {sheet.contacts.map((contact) => {
          const whatsapp = contact.phone ? whatsappHref(contact.phone) : null;
          return (
            <li key={contact.id} className="flex items-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm">
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    id: contact.id,
                    role: contact.role ?? "",
                    first_name: contact.first_name ?? undefined,
                    last_name: contact.last_name ?? undefined,
                    phone: contact.phone ?? undefined,
                    email: contact.email ?? undefined,
                    is_decision_maker: contact.is_decision_maker,
                  })
                }
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate font-medium">
                  {contactName({ firstName: contact.first_name, lastName: contact.last_name, role: contact.role })}
                </span>
                <span className="text-xs text-muted">
                  {[contact.first_name || contact.last_name ? contact.role : null, contact.is_decision_maker && "décideur"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
              {contact.phone && (
                <a href={telHref(contact.phone)} className={`${ghostButton} px-3`} aria-label="Appeler">
                  <PhoneIcon className="size-4" />
                </a>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener" className={`${ghostButton} px-3`} aria-label="WhatsApp">
                  <WhatsappIcon className="size-4" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {editing && (
        <Modal
          title={editing.id ? "Interlocuteur" : "Nouvel interlocuteur"}
          onClose={() => setEditing(null)}
          footer={
            <button type="button" onClick={save} disabled={!editing.role} className={`${primaryButton} w-full`}>
              Enregistrer
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            <FieldGroup label="Fonction" required>
              <Choice
                options={ROLE_OPTIONS}
                value={editing.role as (typeof CONTACT_ROLES)[number]}
                onChange={(role) => setEditing({ ...editing, role })}
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <input
                  value={editing.first_name ?? ""}
                  onChange={(event) => setEditing({ ...editing, first_name: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Nom">
                <input
                  value={editing.last_name ?? ""}
                  onChange={(event) => setEditing({ ...editing, last_name: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Téléphone">
              <input
                type="tel"
                value={editing.phone ?? ""}
                onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={editing.email ?? ""}
                onChange={(event) => setEditing({ ...editing, email: event.target.value })}
                className={inputClass}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={editing.is_decision_maker ?? false}
                onChange={(event) => setEditing({ ...editing, is_decision_maker: event.target.checked })}
                className="size-5 accent-[var(--color-ember-2)]"
              />
              C’est lui qui décide
            </label>
          </div>
        </Modal>
      )}
    </section>
  );
}

export function RetainedCard({ sheet, onChange }: { sheet: Sheet; onChange: () => void }) {
  const run = useRunMutation();
  const [draft, setDraft] = useState<Retained>(sheet.mine!.retained);
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Fiche retenue</SectionTitle>
      {open ? (
        <div className={`${cardClass} flex flex-col gap-5`}>
          <RetainedFields value={draft} onChange={setDraft} noteMax={sheet.note_max} />
          <button
            type="button"
            onClick={() =>
              void run(async () => {
                await api.saveRetained(sheet.mine!.id, draft);
                setOpen(false);
                onChange();
              }, "Fiche retenue enregistrée")
            }
            className={primaryButton}
          >
            Enregistrer
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`${cardClass} text-left text-sm text-muted`}>
          {sheet.mine!.retained_updated_at
            ? `Mise à jour ${formatRelative(sheet.mine!.retained_updated_at)} — compléter`
            : "Caisse, TPE, tables, objections, intérêt… à remplir après votre passage."}
        </button>
      )}
    </section>
  );
}

export function LeaExchanges({ sheet }: { sheet: Sheet }) {
  if (!sheet.lea.length) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Échanges avec Ominin par e-mail</SectionTitle>
      <ul className={`${cardClass} flex flex-col gap-1.5 text-sm`}>
        {sheet.lea.map((entry) => (
          <li key={`${entry.at}-${entry.direction}`} className="flex justify-between gap-3">
            <span className="text-muted">
              {entry.direction === "outbound"
                ? "E-mail d’Ominin"
                : `Réponse : ${LEA_LABELS[entry.classification ?? ""] ?? "autre"}`}
            </span>
            <span className="shrink-0 text-faint">{frenchDate(entry.at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
