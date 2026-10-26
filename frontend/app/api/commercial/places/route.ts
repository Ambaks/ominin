import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Recherche Google Places d'un commercial (5.2), côté serveur : la clé
 * (GOOGLE_PLACES_API_KEY) n'est jamais exposée. Chaque appel compte dans le
 * quota du jour du commercial (commercial_count_places, refusé sans quota
 * réglé). Même requête et même masque de champs que la découverte de Léa
 * (backend/app/clients/places.py) : rien des SKU « atmosphère » facturés plus
 * cher.
 */

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
].join(",");

interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; types: string[] }[];
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
}

const component = (place: Place, kind: string) =>
  place.addressComponents?.find((entry) => entry.types.includes(kind))?.longText;

export async function POST(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "La recherche Google n'est pas configurée." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "Que cherchez-vous ?" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("commercial_count_places");
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify({ textQuery: query, languageCode: "fr", regionCode: "FR" }),
  });
  if (!response.ok) {
    console.error("[commercial] Google Places", response.status, await response.text().catch(() => ""));
    return NextResponse.json({ error: "Google ne répond pas. Réessayez." }, { status: 502 });
  }
  const { places = [] } = (await response.json()) as { places?: Place[] };
  return NextResponse.json({
    places: places.map((place) => ({
      external_id: place.id,
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? null,
      city: component(place, "locality") ?? null,
      postal_code: component(place, "postal_code") ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      phone: place.nationalPhoneNumber ?? null,
      website: place.websiteUri ?? null,
      google_maps_url: place.googleMapsUri ?? null,
    })),
  });
}
