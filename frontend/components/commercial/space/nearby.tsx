"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapCanvas } from "@/components/admin/carte/map-canvas";
import type { GeoPoint, LeadLite, LeadStatus } from "@/lib/admin/types";
import * as api from "@/lib/commercial/api";
import { spaceHref } from "./shell";
import { ErrorNote, PageTitle, Skeleton, StatePill, cardClass, errorMessage } from "./ui";

/** Couleur de carte d'un état : celle de son étiquette (StatePill). */
function mapStatus(state: api.RestaurantState): LeadStatus {
  if (state.kind === "client") return "signed";
  if (state.kind === "opted_out") return "lost";
  if (state.kind === "reserved") return state.mine ? "negotiation" : "not_interested";
  return state.in_talks ? "appointment_scheduled" : "to_contact";
}

function toLead(place: api.NearbyRestaurant): LeadLite {
  return {
    restaurantId: place.id,
    leadId: place.id,
    name: place.name,
    category: place.category as LeadLite["category"],
    city: null,
    address: place.address,
    lat: place.latitude,
    lng: place.longitude,
    status: mapStatus(place.state),
    priority: "medium",
    phone: null,
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

/*
 * Autour de moi : les restaurants dans le rayon réglé par Ominin, aux
 * couleurs de leur état. Chaque ouverture compte comme une recherche.
 */
export function NearbyScreen() {
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [places, setPlaces] = useState<api.NearbyRestaurant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (found) => {
        const point = { lat: found.coords.latitude, lng: found.coords.longitude };
        setPosition(point);
        api.nearby(point.lat, point.lng).then(setPlaces, (cause: unknown) => setError(errorMessage(cause)));
      },
      () => setError("Position indisponible : autorisez la localisation pour voir les restaurants autour de vous.")
    );
  }, []);

  const leads = (places ?? []).map(toLead);
  const current = leads.find((lead) => lead.restaurantId === selected) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageTitle>Autour de moi</PageTitle>
      {error ? (
        <ErrorNote message={error} />
      ) : !places ? (
        <Skeleton />
      ) : (
        <>
          <div className="relative h-[55dvh] overflow-hidden rounded-2xl border border-hairline">
            <MapCanvas
              leads={leads}
              selected={current}
              onSelect={setSelected}
              myPosition={position}
              renderCard={(lead) => (
                <Link href={spaceHref(`/restaurants/${lead.restaurantId}`)} className={`${cardClass} block w-56 text-sm shadow-lg`}>
                  <span className="block font-medium">{lead.name}</span>
                  <span className="block text-muted">{lead.address}</span>
                </Link>
              )}
            />
          </div>
          <ul className="flex flex-col gap-2">
            {places.map((place) => (
              <li key={place.id}>
                <Link href={spaceHref(`/restaurants/${place.id}`)} className={`${cardClass} flex items-center justify-between gap-3`}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{place.name}</span>
                    <span className="block truncate text-sm text-muted">{place.address}</span>
                  </span>
                  <StatePill state={place.state} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
