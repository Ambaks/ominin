"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { CATEGORY_LABELS } from "@/lib/admin/constants";
import type { RestaurantCategory } from "@/lib/admin/types";

const DUPLICATE_REASON_LABELS: Record<string, string> = {
  phone: "même téléphone",
  email: "même email",
  name_proximity: "nom très proche",
};

/*
 * Création manuelle d'un restaurant. Avant d'insérer, crm_find_duplicates
 * signale les fiches proches (téléphone, email, nom flou) — l'humain tranche,
 * rien n'est bloqué en dur.
 */
export function CreateRestaurantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (restaurantId: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<RestaurantCategory>("restaurant");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [duplicates, setDuplicates] = useState<api.DuplicateCandidate[] | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const parseCoord = (value: string): number | null => {
    const parsed = Number(value.trim().replace(",", "."));
    return value.trim() !== "" && Number.isFinite(parsed) ? parsed : null;
  };

  const create = async () => {
    const id = await api.createRestaurant({
      name,
      category,
      address,
      city,
      postalCode,
      latitude: parseCoord(latitude),
      longitude: parseCoord(longitude),
      phone,
      email,
      website,
      ownerName,
    });
    toast.success("Restaurant créé");
    onCreated(id);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setBusy(true);
    try {
      // Second passage (l'avertissement est affiché) : on crée quand même.
      if (duplicates === null) {
        const candidates = await api.findDuplicates({
          name,
          city,
          phone,
          email,
        });
        if (candidates.length > 0) {
          setDuplicates(candidates);
          setBusy(false);
          return;
        }
      }
      await create();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Nouveau restaurant"
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
            {duplicates !== null && duplicates.length > 0
              ? "Créer quand même"
              : "Créer"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {duplicates !== null && duplicates.length > 0 && (
          <div className="rounded-xl border border-status-appointment/40 bg-status-appointment/10 px-3.5 py-2.5 text-sm">
            <p className="font-medium">Fiches proches déjà en base :</p>
            <ul className="mt-1 list-inside list-disc text-muted">
              {duplicates.map((candidate) => (
                <li key={candidate.restaurantId}>
                  {candidate.name}
                  {candidate.city ? ` (${candidate.city})` : ""} —{" "}
                  {DUPLICATE_REASON_LABELS[candidate.reason] ?? candidate.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Nom" required>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Catégorie">
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as RestaurantCategory)
            }
            className={inputClass}
          >
            {(
              Object.entries(CATEGORY_LABELS) as [RestaurantCategory, string][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Adresse">
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville">
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Code postal">
            <input
              type="text"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" hint="43.61…">
            <input
              type="text"
              inputMode="decimal"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Longitude" hint="3.87…">
            <input
              type="text"
              inputMode="decimal"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone">
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Site web">
          <input
            type="url"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Propriétaire / décideur">
          <input
            type="text"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}
