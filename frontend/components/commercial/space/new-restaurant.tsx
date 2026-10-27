"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CrosshairIcon } from "@/components/admin/icons";
import { Field, inputClass } from "@/components/ui/field";
import { CATEGORY_LABELS } from "@/lib/admin/constants";
import * as api from "@/lib/commercial/api";
import { spaceHref } from "./shell";
import { PageTitle, SectionTitle, StatePill, cardClass, errorMessage, ghostButton, primaryButton } from "./ui";

interface Draft {
  name: string;
  category: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

const REASON_LABELS: Record<string, string> = {
  external_id: "même fiche Google",
  phone: "même téléphone",
  email: "même e-mail",
  name_proximity: "nom proche, même ville ou tout près",
};

/*
 * Ajouter un restaurant absent de la base : on vérifie d'abord les doublons
 * probables (une fiche par restaurant), et l'on ne crée qu'après « Ce n'est
 * aucun de ceux-là ». La position de l'appareil, si le commercial est devant
 * le restaurant, le place sur la carte.
 */
export function NewRestaurantScreen({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
    name: initialName,
    category: "restaurant",
    address: "",
    postal_code: "",
    city: "",
    phone: "",
  });
  const [duplicates, setDuplicates] = useState<api.SearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDraft({ ...draft, [key]: event.target.value });
    setDuplicates(null);
  };

  const locate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocating(false);
      },
      () => {
        setError("Position indisponible : la fiche n’apparaîtra pas sur la carte.");
        setLocating(false);
      }
    );
  };

  const act = async (step: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const check = (event: React.FormEvent) => {
    event.preventDefault();
    void act(async () => {
      setDuplicates(
        await api.findDuplicates({
          name: draft.name.trim(),
          city: draft.city.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          lat: draft.latitude,
          lng: draft.longitude,
        })
      );
    });
  };

  const create = () =>
    void act(async () => {
      const id = await api.createRestaurant({ ...draft });
      router.replace(spaceHref(`/restaurants/${id}`));
    });

  return (
    <div className="flex flex-col gap-6">
      <PageTitle sub="Cherchez-le d’abord : il est peut-être déjà dans la base.">Ajouter un restaurant</PageTitle>

      <form onSubmit={check} className="flex flex-col gap-4">
        <Field label="Nom" required>
          <input value={draft.name} onChange={set("name")} required className={inputClass} autoComplete="off" />
        </Field>
        <Field label="Type">
          <select value={draft.category} onChange={set("category")} className={inputClass}>
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Adresse">
          <input value={draft.address} onChange={set("address")} className={inputClass} autoComplete="street-address" />
        </Field>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <Field label="Code postal">
            <input value={draft.postal_code} onChange={set("postal_code")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Ville">
            <input value={draft.city} onChange={set("city")} className={inputClass} />
          </Field>
        </div>
        <Field label="Téléphone du restaurant">
          <input value={draft.phone} onChange={set("phone")} type="tel" className={inputClass} />
        </Field>
        <button type="button" onClick={locate} disabled={locating} className={ghostButton}>
          <CrosshairIcon className="size-4" />
          {draft.latitude !== undefined
            ? "Position enregistrée ✓"
            : locating
              ? "Localisation…"
              : "Je suis devant : utiliser ma position"}
        </button>
        {error && <p role="alert" className="text-sm text-ember-3">{error}</p>}
        {!duplicates && (
          <button type="submit" disabled={busy || !draft.name.trim()} className={primaryButton}>
            Continuer
          </button>
        )}
      </form>

      {duplicates && (
        <section className="flex flex-col gap-3">
          {duplicates.length > 0 ? (
            <>
              <SectionTitle>Est-ce l’un de ceux-là ?</SectionTitle>
              <ul className="flex flex-col gap-2">
                {duplicates.map((duplicate) => (
                  <li key={duplicate.id}>
                    <Link
                      href={spaceHref(`/restaurants/${duplicate.id}`)}
                      className={`${cardClass} flex items-center justify-between gap-3`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{duplicate.name}</span>
                        <span className="block truncate text-sm text-muted">
                          {REASON_LABELS[duplicate.reason ?? ""] ?? ""}
                          {duplicate.city ? ` · ${duplicate.city}` : ""}
                        </span>
                      </span>
                      <StatePill state={duplicate.state} />
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={create} disabled={busy} className={ghostButton}>
                Ce n’est aucun de ceux-là : créer la fiche
              </button>
            </>
          ) : (
            <button type="button" onClick={create} disabled={busy} className={primaryButton}>
              Aucun doublon : créer la fiche
            </button>
          )}
        </section>
      )}
    </div>
  );
}
