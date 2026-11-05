"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/admin/carte/map-canvas";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { STATUS_MAP_COLORS } from "@/lib/admin/status";
import type { GeoPoint, LeadLite, LeadStatus, MapBounds } from "@/lib/admin/types";
import { MAPS_DIRECTIONS_BASE } from "@/lib/collect/shared";
import { LIST_PAGE_SIZES, LIST_SEARCH_DEBOUNCE_MS } from "@/lib/gestion/constants";
import { frenchDate } from "@/lib/legal/format";
import * as api from "@/lib/commercial/api";
import { spaceHref } from "./shell";
import { ErrorNote, cardClass, errorMessage, ghostButton, primaryButton, telHref } from "./ui";

/*
 * Les quatre couleurs de la carte, prises dans la palette des statuts de
 * l'admin. « Libre » n'est pas le bleu de « à contacter » : c'est celui du
 * point de position du commercial.
 */
const LEGEND: { status: LeadStatus; label: string }[] = [
  { status: "interested", label: "Libre" },
  { status: "appointment_scheduled", label: "Contacté par Léa" },
  { status: "visited", label: "Visité" },
  { status: "signed", label: "Client" },
];

function mapStatus(place: api.MapRestaurant): LeadStatus {
  if (place.state === "client") return "signed";
  if (place.state === "visited") return "visited";
  return place.contacted_by_lea ? "appointment_scheduled" : "interested";
}

const POINT_STATUS: Record<api.MapPointState, LeadStatus> = {
  c: "signed",
  m: "visited",
  v: "visited",
  l: "appointment_scheduled",
  f: "interested",
};

/* La carte ne dessine que des points : le reste de la fiche vient au toucher. */
function toLead([id, lat, lng, state]: api.MapPoint): LeadLite {
  return {
    restaurantId: id,
    leadId: id,
    name: "",
    category: "restaurant",
    city: null,
    address: null,
    lat,
    lng,
    status: POINT_STATUS[state],
    priority: "medium",
    phone: null,
    email: null,
    hasWebsite: false,
    ownerName: null,
    lastContactAt: null,
    nextFollowUpAt: null,
    targetProducts: [],
    createdAt: "",
  };
}

function stateLabel(place: api.MapRestaurant): string {
  if (place.state === "client") return "Déjà client";
  if (place.state === "visited") return place.mine ? "Visité par toi" : `Visité par ${place.holder}`;
  return "Libre";
}

/* Un restaurant suivi par un autre commercial : la demande part dans #demandes, il accepte ou refuse. */
function RequestVisit({ place, onSent }: { place: api.MapRestaurant; onSent: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (place.request === "pending") return <p className="text-sm text-muted">Demande envoyée à {place.holder}.</p>;
  if (place.request === "refused") {
    return (
      <p className="text-sm text-muted">
        {place.holder} a refusé ta demande. S’il n’avance pas, le restaurant se libère le {frenchDate(place.request_ends!)}.
      </p>
    );
  }
  const send = async () => {
    setBusy(true);
    const response = await fetch("/api/commercial/demande", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: place.id }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) return toast.error(result.error ?? "Demande impossible.");
    toast.success(`Demande envoyée à ${place.holder}.`);
    onSent();
  };
  return (
    <button type="button" disabled={busy} onClick={() => void send()} className={primaryButton}>
      Demander une visite
    </button>
  );
}

function RestaurantCard({ place, onChange }: { place: api.MapRestaurant; onChange: () => void }) {
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
      {place.last_by && place.last_at && (
        <p className="text-sm text-muted">
          {place.last_by} est passé le {frenchDate(place.last_at)}.
        </p>
      )}
      {(place.state === "free" || place.mine) && (
        <Link href={spaceHref(`/visite/${place.id}`)} className={primaryButton}>
          Je suis là
        </Link>
      )}
      {place.state === "visited" && !place.mine && <RequestVisit place={place} onSent={onChange} />}
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
    <Sheet
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
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus className="g-input" />
        </Field>
        <p className="text-sm text-muted">Il est placé à ta position actuelle.</p>
        {error && <p className="text-sm text-ember-3">{error}</p>}
      </div>
    </Sheet>
  );
}

const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;

/* Chercher un établissement par son nom, autour du commercial, ou du centre de la carte s'il n'a pas partagé sa position. */
function MapSearchBox({
  origin,
  located,
  onPick,
}: {
  origin: () => GeoPoint | null;
  located: boolean;
  onPick: (result: api.MapSearch["results"][number]) => void;
}) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ term: string; search: api.MapSearch } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const term = query.trim();

  useEffect(() => {
    const from = origin();
    if (!term || !from) return;
    let stale = false;
    const timer = setTimeout(() => {
      api.mapSearch(term, from, LIST_PAGE_SIZES[0]).then(
        (search) => {
          if (stale) return;
          setFailed(null);
          setFound({ term, search });
        },
        (cause: unknown) => {
          if (!stale) setFailed(errorMessage(cause));
        }
      );
    }, LIST_SEARCH_DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [term, origin]);

  const search = found?.term === term ? found.search : null;

  return (
    <div className="relative z-20">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={located ? "Chercher un établissement autour de toi" : "Chercher autour du centre de la carte"}
        aria-label="Chercher un établissement par son nom"
        className="g-input"
      />
      {term && (failed || search) && (
        <div className="absolute inset-x-0 top-full mt-1 max-h-72 overflow-y-auto g-plate shadow-lg">
          {failed ? (
            <p className="px-4 py-3 text-sm text-ember-3">{failed}</p>
          ) : search!.results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Aucun établissement de ce nom à moins de {search!.radius_km} km.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {search!.results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      onPick(result);
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{result.name}</span>
                      {result.city && <span className="block truncate text-xs text-muted">{result.city}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-faint">{formatDistance(result.distance_m)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const covers = (outer: MapBounds | null, inner: MapBounds) =>
  outer !== null &&
  outer.south <= inner.south &&
  outer.west <= inner.west &&
  outer.north >= inner.north &&
  outer.east >= inner.east;

/*
 * La carte : les restaurants de la vue, aux couleurs de leur état, et la
 * position du commercial suivie en direct. Une vue déjà couverte par le
 * dernier chargement ne redemande rien, et les points déjà reçus restent.
 */
export function MapScreen() {
  const [points, setPoints] = useState<api.MapPoint[]>(() => api.mapPoints.last() ?? []);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [place, setPlace] = useState<api.MapRestaurant | null>(null);
  const [adding, setAdding] = useState(false);
  const [focus, setFocus] = useState<GeoPoint | null>(null);
  const view = useRef<MapBounds | null>(null);
  const covered = useRef<MapBounds | null>(null);
  const positionRef = useRef(position);

  const refresh = useCallback(async () => {
    const target = view.current;
    if (!target) return;
    try {
      const found = await api.mapPoints(target);
      covered.current = target;
      setPoints((known) => [...new Map([...known, ...found].map((point) => [point[0], point])).values()]);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);
  const onViewChange = useCallback(
    (next: MapBounds) => {
      view.current = next;
      if (!covers(covered.current, next)) void refresh();
    },
    [refresh]
  );
  const loadPlace = useCallback(
    (id: string) => api.mapRestaurant(id).then(setPlace, (cause: unknown) => setError(errorMessage(cause))),
    []
  );
  const searchOrigin = useCallback((): GeoPoint | null => {
    if (positionRef.current) return positionRef.current;
    const target = view.current;
    return target && { lat: (target.south + target.north) / 2, lng: (target.west + target.east) / 2 };
  }, []);

  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      (found) => {
        const next = { lat: found.coords.latitude, lng: found.coords.longitude };
        positionRef.current = next;
        setPosition(next);
      },
      () => {
        positionRef.current = null;
        setPosition(null);
      }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  const leads = useMemo(() => points.map(toLead), [points]);

  const select = (id: string | null) => {
    setSelected(id);
    setPlace(null);
    if (id) void loadPlace(id);
  };

  if (error) {
    return (
      <ErrorNote
        message={error}
        onRetry={() => {
          covered.current = null;
          setError(null);
        }}
      />
    );
  }

  const current = leads.find((lead) => lead.restaurantId === selected) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <MapSearchBox
        origin={searchOrigin}
        located={position !== null}
        onPick={(result) => {
          setFocus({ lat: result.latitude, lng: result.longitude });
          select(result.id);
        }}
      />
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
          onSelect={select}
          myPosition={position}
          focus={focus}
          onViewChange={onViewChange}
          renderCard={() =>
            place?.id === selected ? (
              <RestaurantCard
                place={place}
                onChange={() => {
                  void refresh();
                  void loadPlace(place.id);
                }}
              />
            ) : (
              <div className={`${cardClass} g-shimmer h-32 w-full shadow-lg lg:w-72`} />
            )
          }
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
            setFocus(position);
            void refresh().then(() => select(id));
          }}
        />
      )}
    </div>
  );
}
