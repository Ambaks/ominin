"use client";

import { useCallback, useEffect, useState } from "react";
import { MapCanvas } from "@/components/admin/carte/map-canvas";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { STATUS_MAP_COLORS } from "@/lib/admin/status";
import type { GeoPoint, LeadLite, LeadStatus } from "@/lib/admin/types";
import { MAPS_DIRECTIONS_BASE } from "@/lib/collect/shared";
import * as api from "@/lib/commercial/api";
import { ErrorNote, Skeleton, cardClass, errorMessage, ghostButton, primaryButton, telHref } from "./ui";

/* Les quatre couleurs de la carte, prises dans la palette des statuts de l'admin. */
const LEGEND: { status: LeadStatus; label: string }[] = [
  { status: "to_contact", label: "Libre" },
  { status: "appointment_scheduled", label: "Contacté par Léa" },
  { status: "visited", label: "Visité" },
  { status: "signed", label: "Client" },
];

function mapStatus(place: api.MapRestaurant): LeadStatus {
  if (place.state === "client") return "signed";
  if (place.state === "visited") return "visited";
  return place.contacted_by_lea ? "appointment_scheduled" : "to_contact";
}

function toLead(place: api.MapRestaurant): LeadLite {
  return {
    restaurantId: place.id,
    leadId: place.id,
    name: place.name,
    category: "restaurant",
    city: place.city,
    address: place.address,
    lat: place.latitude,
    lng: place.longitude,
    status: mapStatus(place),
    priority: "medium",
    phone: place.phone,
    email: null,
    hasWebsite: false,
    ownerName: null,
    lastContactAt: null,
    nextFollowUpAt: null,
    targetProducts: [],
    createdAt: "",
    searchKey: "",
  };
}

function stateLabel(place: api.MapRestaurant): string {
  if (place.state === "client") return "Déjà client";
  if (place.state === "visited") return place.mine ? "Visité par toi" : `Visité par ${place.holder}`;
  return "Libre";
}

function RestaurantCard({ place }: { place: api.MapRestaurant }) {
  const directions = `${MAPS_DIRECTIONS_BASE}&destination=${place.latitude},${place.longitude}`;
  return (
    <div className={`${cardClass} flex w-full flex-col gap-3 shadow-lg lg:w-72`}>
      <div className="min-w-0">
        <p className="truncate font-medium">{place.name}</p>
        {place.address && <p className="truncate text-sm text-muted">{place.address}</p>}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-full border px-2.5 py-0.5" style={{ borderColor: STATUS_MAP_COLORS[mapStatus(place)], color: STATUS_MAP_COLORS[mapStatus(place)] }}>
          {stateLabel(place)}
        </span>
        {place.contacted_by_lea && (
          <span className="rounded-full border border-hairline px-2.5 py-0.5 text-muted">Déjà contacté par Léa</span>
        )}
      </div>
      <div className="flex gap-2">
        <a href={directions} target="_blank" rel="noopener" className={`${ghostButton} flex-1`}>
          Itinéraire
        </a>
        {place.phone && (
          <a href={telHref(place.phone)} className={`${ghostButton} flex-1`}>
            Appeler
          </a>
        )}
      </div>
    </div>
  );
}

/* Un restaurant absent de la carte, posé à l'endroit où se trouve le commercial. */
function AddRestaurant({ position, onClose, onAdded }: { position: GeoPoint; onClose: () => void; onAdded: (id: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onAdded(await api.createRestaurant({ name: name.trim(), latitude: position.lat, longitude: position.lng }));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Ajouter un restaurant"
      onClose={onClose}
      footer={
        <button type="button" disabled={busy || !name.trim()} onClick={() => void submit()} className={primaryButton}>
          Ajouter ici
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Nom du restaurant" required>
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus className={inputClass} />
        </Field>
        <p className="text-sm text-muted">Il est placé à ta position actuelle.</p>
        {error && <p className="text-sm text-ember-3">{error}</p>}
      </div>
    </Modal>
  );
}

/*
 * La carte : tous les restaurants à attraper, aux couleurs de leur état, et
 * la position du commercial suivie en direct.
 */
export function MapScreen() {
  const [places, setPlaces] = useState<api.MapRestaurant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(
    () => api.mapRestaurants().then(setPlaces, (cause: unknown) => setError(errorMessage(cause))),
    []
  );

  useEffect(() => {
    void load();
    const watch = navigator.geolocation.watchPosition(
      (found) => setPosition({ lat: found.coords.latitude, lng: found.coords.longitude }),
      () => setPosition(null)
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [load]);

  if (error) return <ErrorNote message={error} onRetry={() => void load()} />;
  if (!places) return <Skeleton />;

  const leads = places.map(toLead);
  const current = leads.find((lead) => lead.restaurantId === selected) ?? null;
  const place = places.find((entry) => entry.id === selected);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {LEGEND.map(({ status, label }) => (
          <li key={status} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_MAP_COLORS[status] }} />
            {label}
          </li>
        ))}
      </ul>
      <div className="relative h-[calc(100dvh-15rem)] min-h-80 overflow-hidden rounded-2xl border border-hairline">
        <MapCanvas
          leads={leads}
          selected={current}
          onSelect={setSelected}
          myPosition={position}
          renderCard={() => place && <RestaurantCard place={place} />}
        />
      </div>
      <button
        type="button"
        disabled={!position}
        onClick={() => setAdding(true)}
        className={ghostButton}
        title={position ? undefined : "Autorise la localisation pour ajouter un restaurant à ta position."}
      >
        + Ajouter un restaurant absent
      </button>
      {adding && position && (
        <AddRestaurant
          position={position}
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false);
            setSelected(id);
            void load();
          }}
        />
      )}
    </div>
  );
}
