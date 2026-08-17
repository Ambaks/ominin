"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import {
  APPOINTMENT_DEFAULT_DURATION_MIN,
  APPOINTMENT_DURATIONS_MIN,
  APPOINTMENT_TYPE_LABELS,
} from "@/lib/admin/constants";
import { fromDatetimeLocalValue } from "@/lib/admin/format";
import { useLeadDetail } from "@/lib/admin/lead-cache";
import { useAdmin } from "@/lib/admin/store";
import type { AppointmentType, LeadLite } from "@/lib/admin/types";
import { RestaurantPicker } from "../restaurant-picker";

/*
 * Création d'un rendez-vous. Début + durée (plutôt qu'une seconde saisie de
 * date : moins d'erreurs) ; le lieu se pré-remplit avec l'adresse du
 * restaurant. Le contact se choisit parmi les contacts de la fiche.
 */
export function AppointmentFormModal({
  restaurantId,
  onClose,
}: {
  /** Restaurant imposé (ouverture depuis une fiche). */
  restaurantId?: string;
  onClose: () => void;
}) {
  const state = useAdmin();
  const toast = useToast();
  const [restaurant, setRestaurant] = useState<LeadLite | null>(
    state?.leads.find((lead) => lead.restaurantId === restaurantId) ?? null
  );
  // Détail de la fiche : contacts pour le <select>, adresse pour le lieu.
  const { detail } = useLeadDetail(restaurant?.restaurantId ?? null);

  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState(APPOINTMENT_DEFAULT_DURATION_MIN);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<AppointmentType>("visit");
  const [busy, setBusy] = useState(false);

  const restaurantAddress = detail
    ? [detail.restaurant.address, detail.restaurant.city]
        .filter(Boolean)
        .join(", ")
    : "";

  const submit = async () => {
    if (!restaurant) {
      toast.error("Choisissez un restaurant.");
      return;
    }
    if (!title.trim() || !startAt) {
      toast.error("Titre et date sont requis.");
      return;
    }
    setBusy(true);
    try {
      const startIso = fromDatetimeLocalValue(startAt);
      const endIso = new Date(
        new Date(startIso).getTime() + duration * 60_000
      ).toISOString();
      await api.createAppointment({
        restaurantId: restaurant.restaurantId,
        contactId: contactId || null,
        title,
        startAt: startIso,
        endAt: endIso,
        location,
        notes,
        type,
      });
      toast.success("Rendez-vous créé");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Nouveau rendez-vous"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!restaurantId && (
          <Field label="Restaurant" required>
            <RestaurantPicker value={restaurant} onSelect={setRestaurant} />
          </Field>
        )}
        <Field label="Titre" required>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Démo menu digital…"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début" required>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Durée">
            <select
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className={inputClass}
            >
              {APPOINTMENT_DURATIONS_MIN.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes < 60
                    ? `${minutes} min`
                    : `${minutes / 60} h${minutes % 60 ? ` ${minutes % 60}` : ""}`}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as AppointmentType)
              }
              className={inputClass}
            >
              {(
                Object.entries(APPOINTMENT_TYPE_LABELS) as [
                  AppointmentType,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact">
            <select
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {(detail?.contacts ?? []).map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName ?? ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Lieu">
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={inputClass}
            />
            {restaurantAddress && location !== restaurantAddress && (
              <button
                type="button"
                onClick={() => setLocation(restaurantAddress)}
                className="shrink-0 rounded-xl border border-hairline px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground"
              >
                Utiliser l’adresse
              </button>
            )}
          </div>
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </Field>
      </div>
    </Modal>
  );
}
