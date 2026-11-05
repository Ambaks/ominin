import { bulleConfirmPlaces, bullePlacesFacturees, type BulleCompte } from "@/lib/bulles/format";
import { DEFAULT_DAY_END_HOUR } from "@/lib/gestion/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/*
 * Une réservation de bulle vue par le client, par la clé de sa page
 * (l'organisateur) ou par son lien de partage (ses amis). Lue au serveur :
 * les réservations portent des coordonnées et ne sont pas publiques.
 */

export type BulleTicket = BulleCompte & {
  slug: string;
  etablissement: string;
  address: string | null;
  bulle: { name: string; color: string };
  startsAt: string;
  endsAt: string;
  /** Bascule du jour de service : un créneau d'après minuit reste au soir réservé. */
  dayEndHour: number;
  organiser: string;
  token: string;
  shareToken: string;
  placesPaid: number;
  /** Les places payées qui confirment ce groupe. */
  confirmPlaces: number;
  status: Database["public"]["Enums"]["bulle_reservation_status"];
  /** Qui a payé en ligne, et combien de places. */
  payers: { name: string; places: number; organiser: boolean }[];
};

export async function fetchBulleTicket(
  key: { token: string } | { shareToken: string }
): Promise<BulleTicket | null> {
  const query = createAdminClient()
    .from("bulle_reservations")
    .select(
      "token, share_token, name, starts_at, ends_at, party_size, places_paid, place_cents, paid_cents, min_billed_places, status, bulles(name, color), etablissements(slug, name, address, bulle_reglages(group_threshold), etablissement_settings(day_end_hour)), bulle_parts(name, places, organiser, method, status, created_at)"
    );
  const { data, error } = await ("token" in key
    ? query.eq("token", key.token)
    : query.eq("share_token", key.shareToken)
  ).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.bulles || !data.etablissements?.bulle_reglages) return null;
  return {
    slug: data.etablissements.slug,
    etablissement: data.etablissements.name,
    address: data.etablissements.address,
    bulle: data.bulles,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    dayEndHour: data.etablissements.etablissement_settings?.day_end_hour ?? DEFAULT_DAY_END_HOUR,
    organiser: data.name,
    token: data.token,
    shareToken: data.share_token,
    partySize: data.party_size,
    placesPaid: data.places_paid,
    confirmPlaces: bulleConfirmPlaces(
      bullePlacesFacturees(data.party_size, data.min_billed_places),
      data.etablissements.bulle_reglages.group_threshold
    ),
    placeCents: data.place_cents,
    paidCents: data.paid_cents,
    minBilledPlaces: data.min_billed_places,
    status: data.status,
    payers: data.bulle_parts
      .filter((part) => part.method === "en_ligne" && part.status === "payee")
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(({ name, places, organiser }) => ({ name, places, organiser })),
  };
}
