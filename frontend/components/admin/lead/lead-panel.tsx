"use client";

import { useRef, useState } from "react";
import { EditIcon } from "@/components/gestion/icons";
import { useRunMutation } from "@/components/ui/toast";
import { inputClass } from "@/components/ui/field";
import * as api from "@/lib/admin/api";
import { CATEGORY_LABELS } from "@/lib/admin/constants";
import { formatDayTime, formatRelative, httpHref } from "@/lib/admin/format";
import { useLeadDetail } from "@/lib/admin/lead-cache";
import { useAdmin } from "@/lib/admin/store";
import type { LeadDetail } from "@/lib/admin/types";
import { MAPS_DIRECTIONS_BASE } from "@/lib/collect/shared";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  NoteIcon,
  PhoneIcon,
  RouteIcon,
  UserIcon,
} from "../icons";
import { LeadStatusBadge, PriorityBadge } from "../status-badge";
import { AppointmentFormModal } from "../rdv/appointment-form-modal";
import { TaskFormModal } from "../tasks/task-form-modal";
import { ActivityTimeline } from "./activity-timeline";
import { NoteComposer } from "./note-composer";
import { StatusMenu } from "./status-menu";
import { VisitedFlow } from "./visited-flow";

function PanelSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 p-5">
      <div className="shimmer h-8 w-2/3 rounded-xl" />
      <div className="shimmer h-24 rounded-2xl" />
      <div className="shimmer h-40 rounded-2xl" />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
      {children}
    </p>
  );
}

function directionsHref(detail: LeadDetail): string | null {
  const { latitude, longitude, address, city } = detail.restaurant;
  const destination =
    latitude !== null && longitude !== null
      ? `${latitude},${longitude}`
      : [address, city].filter(Boolean).join(", ");
  return destination
    ? `${MAPS_DIRECTIONS_BASE}&destination=${encodeURIComponent(destination)}`
    : null;
}

/*
 * La fiche lead : le panneau central du CRM. Desktop, tiroir à droite
 * au-dessus de la carte ; mobile, plein écran. Ouvert par ?lead=<id> depuis
 * n'importe quelle page (le shell l'héberge), le bouton retour le ferme.
 */
export function LeadPanel({
  restaurantId,
  onClose,
}: {
  restaurantId: string;
  onClose: () => void;
}) {
  const { detail, error, retry } = useLeadDetail(restaurantId);
  const state = useAdmin();
  const run = useRunMutation();
  const [statusOpen, setStatusOpen] = useState(false);
  const [visitedOpen, setVisitedOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [rdvOpen, setRdvOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const lite =
    state?.leads.find((lead) => lead.restaurantId === restaurantId) ?? null;

  const focusNote = () => {
    // Gestionnaire d'événement : l'accès au ref n'a pas lieu pendant le rendu.
    noteRef.current?.focus();
  };

  const logCall = () =>
    void run(
      () => api.addActivity(restaurantId, { type: "call", title: "Appel" }),
      "Appel enregistré"
    );
  const logEmail = () =>
    void run(
      () => api.addActivity(restaurantId, { type: "email", title: "E-mail" }),
      "E-mail enregistré"
    );

  const openTasks = detail?.tasks.filter((task) => task.status === "open") ?? [];
  const upcomingRdv =
    detail?.appointments.filter(
      (rdv) => rdv.status === "scheduled" && rdv.startAt >= new Date().toISOString()
    ) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[480px] lg:border-l lg:border-hairline lg:bg-surface lg:shadow-2xl">
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-medium">
            {detail?.restaurant.name ?? "…"}
          </p>
          {detail && (
            <p className="truncate text-xs text-muted">
              {CATEGORY_LABELS[detail.restaurant.category]}
              {detail.restaurant.cuisine ? ` · ${detail.restaurant.cuisine}` : ""}
              {detail.restaurant.city ? ` · ${detail.restaurant.city}` : ""}
            </p>
          )}
        </div>
        {detail && (
          <button
            type="button"
            onClick={() => setStatusOpen(true)}
            title="Changer le statut"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <LeadStatusBadge status={detail.lead.status} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!detail ? (
          error ? (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <p className="text-sm text-muted">{error}</p>
              <button
                type="button"
                onClick={retry}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <PanelSkeleton />
          )
        ) : (
          <div className="flex flex-col gap-6 p-4 pb-10 lg:p-5">
            <div className="grid grid-cols-6 gap-1.5">
              {/* eslint-disable-next-line react-hooks/refs -- focusNote ne lit le ref qu'au clic */}
              {[
                {
                  label: "Visité",
                  icon: MapPinIcon,
                  onClick: () => setVisitedOpen(true),
                  disabled: !lite,
                },
                {
                  label: "Appel",
                  icon: PhoneIcon,
                  href: detail.restaurant.phone
                    ? `tel:${detail.restaurant.phone}`
                    : undefined,
                  onClick: logCall,
                  disabled: !detail.restaurant.phone,
                },
                {
                  label: "Email",
                  icon: MailIcon,
                  href: detail.restaurant.email
                    ? `mailto:${detail.restaurant.email}`
                    : undefined,
                  onClick: logEmail,
                  disabled: !detail.restaurant.email,
                },
                {
                  label: "Note",
                  icon: NoteIcon,
                  onClick: focusNote,
                },
                {
                  label: "RDV",
                  icon: CalendarIcon,
                  onClick: () => setRdvOpen(true),
                },
                {
                  label: "Relance",
                  icon: ClockIcon,
                  onClick: () => setTaskOpen(true),
                },
              ].map((action) => {
                const className = `flex flex-col items-center gap-1.5 rounded-xl border border-hairline py-2.5 text-[10px] font-medium transition-colors ${
                  action.disabled
                    ? "cursor-not-allowed text-faint opacity-50"
                    : "text-muted hover:border-ember-2/40 hover:text-foreground"
                }`;
                return action.href && !action.disabled ? (
                  <a
                    key={action.label}
                    href={action.href}
                    onClick={action.onClick}
                    className={className}
                  >
                    <action.icon className="size-4.5" />
                    {action.label}
                  </a>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className={className}
                  >
                    <action.icon className="size-4.5" />
                    {action.label}
                  </button>
                );
              })}
            </div>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <SectionTitle>Informations importantes</SectionTitle>
                <button
                  type="button"
                  onClick={() =>
                    setNotesDraft(detail.restaurant.importantNotes ?? "")
                  }
                  aria-label="Modifier les informations importantes"
                  className="text-faint transition-colors hover:text-foreground"
                >
                  <EditIcon className="size-3.5" />
                </button>
              </div>
              {notesDraft !== null ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNotesDraft(null)}
                      className="rounded-full border border-hairline px-3.5 py-1.5 text-xs font-semibold text-muted"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          await api.updateImportantNotes(
                            restaurantId,
                            notesDraft
                          );
                          setNotesDraft(null);
                        }, "Enregistré")
                      }
                      className="ember-gradient rounded-full px-3.5 py-1.5 text-xs font-semibold text-background"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : detail.restaurant.importantNotes ? (
                <p className="whitespace-pre-wrap rounded-xl border border-status-appointment/40 bg-status-appointment/10 px-3.5 py-2.5 text-sm leading-relaxed">
                  {detail.restaurant.importantNotes}
                </p>
              ) : (
                <p className="text-sm text-faint">
                  Rien à signaler — le crayon pour ajouter.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <SectionTitle>Coordonnées</SectionTitle>
                <PriorityBadge priority={detail.lead.priority} />
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {detail.restaurant.phone && (
                  <li className="flex items-center gap-2.5">
                    <PhoneIcon className="size-4 shrink-0 text-faint" />
                    <a
                      href={`tel:${detail.restaurant.phone}`}
                      className="transition-colors hover:text-ember-1"
                    >
                      {detail.restaurant.phone}
                    </a>
                  </li>
                )}
                {detail.restaurant.email && (
                  <li className="flex items-center gap-2.5">
                    <MailIcon className="size-4 shrink-0 text-faint" />
                    <a
                      href={`mailto:${detail.restaurant.email}`}
                      className="truncate transition-colors hover:text-ember-1"
                    >
                      {detail.restaurant.email}
                    </a>
                  </li>
                )}
                {detail.restaurant.website && (
                  <li className="flex items-center gap-2.5">
                    <GlobeIcon className="size-4 shrink-0 text-faint" />
                    <a
                      href={httpHref(detail.restaurant.website)}
                      target="_blank"
                      rel="noopener"
                      className="truncate transition-colors hover:text-ember-1"
                    >
                      {detail.restaurant.website.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                )}
                {(detail.restaurant.address || detail.restaurant.city) && (
                  <li className="flex items-center gap-2.5">
                    <MapPinIcon className="size-4 shrink-0 text-faint" />
                    <span className="min-w-0 flex-1 truncate text-muted">
                      {[
                        detail.restaurant.address,
                        detail.restaurant.postalCode,
                        detail.restaurant.city,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                    {directionsHref(detail) && (
                      <a
                        href={directionsHref(detail) as string}
                        target="_blank"
                        rel="noopener"
                        className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-ember-1"
                      >
                        <RouteIcon className="size-3.5" />
                        Itinéraire
                      </a>
                    )}
                  </li>
                )}
                {detail.restaurant.ownerName && (
                  <li className="flex items-center gap-2.5">
                    <UserIcon className="size-4 shrink-0 text-faint" />
                    <span>
                      {detail.restaurant.ownerName}
                      <span className="text-faint"> · propriétaire</span>
                    </span>
                    {detail.restaurant.ownerPhone && (
                      <a
                        href={`tel:${detail.restaurant.ownerPhone}`}
                        className="ml-auto shrink-0 text-xs font-semibold text-muted transition-colors hover:text-ember-1"
                      >
                        {detail.restaurant.ownerPhone}
                      </a>
                    )}
                  </li>
                )}
              </ul>
              {detail.contacts.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1.5">
                  {detail.contacts.map((contact) => (
                    <li
                      key={contact.id}
                      className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {contact.firstName} {contact.lastName ?? ""}
                        <span className="text-faint">
                          {contact.role ? ` · ${contact.role}` : ""}
                          {contact.isDecisionMaker ? " · décideur" : ""}
                        </span>
                      </span>
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-ember-1"
                        >
                          {contact.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(openTasks.length > 0 || upcomingRdv.length > 0) && (
              <section className="flex flex-col gap-2.5">
                <SectionTitle>À venir</SectionTitle>
                <ul className="flex flex-col gap-1.5">
                  {upcomingRdv.map((rdv) => (
                    <li
                      key={rdv.id}
                      className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-sm"
                    >
                      <CalendarIcon className="size-4 shrink-0 text-faint" />
                      <span className="min-w-0 flex-1 truncate">{rdv.title}</span>
                      <span className="shrink-0 text-xs text-faint">
                        {formatDayTime(rdv.startAt)}
                      </span>
                    </li>
                  ))}
                  {openTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void run(
                            () => api.completeTask(task.id),
                            "Tâche terminée"
                          )
                        }
                        aria-label={`Terminer « ${task.title} »`}
                        className="size-4.5 shrink-0 rounded-full border border-hairline transition-colors hover:border-ember-1"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {task.title}
                      </span>
                      {task.dueAt && (
                        <span
                          className={`shrink-0 text-xs ${
                            task.dueAt < new Date().toISOString()
                              ? "font-semibold text-ember-3"
                              : "text-faint"
                          }`}
                        >
                          {formatRelative(task.dueAt)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-2.5">
              <SectionTitle>Activité</SectionTitle>
              <NoteComposer ref={noteRef} restaurantId={restaurantId} />
              <ActivityTimeline activities={detail.activities} />
            </section>
          </div>
        )}
      </div>

      {statusOpen && detail && (
        <StatusMenu
          restaurantId={restaurantId}
          current={detail.lead.status}
          onClose={() => setStatusOpen(false)}
        />
      )}
      {visitedOpen && lite && (
        <VisitedFlow lead={lite} onClose={() => setVisitedOpen(false)} />
      )}
      {taskOpen && (
        <TaskFormModal
          task={null}
          restaurantId={restaurantId}
          onClose={() => setTaskOpen(false)}
        />
      )}
      {rdvOpen && (
        <AppointmentFormModal
          restaurantId={restaurantId}
          onClose={() => setRdvOpen(false)}
        />
      )}
    </div>
  );
}
