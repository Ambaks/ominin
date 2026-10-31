import { createPublicClient } from "@/lib/supabase/public";

export type BulleOffer = {
  etablissement: { id: string; slug: string; name: string };
  placeCents: number;
  minParty: number;
  maxParty: number;
  durationMinutes: number;
  bookingDays: number;
  bulles: { id: string; name: string; color: string }[];
  /** Les jours de la semaine (ISO, 1 = lundi) où au moins un créneau est ouvert. */
  weekdays: number[];
};

/**
 * Ce que la page publique sait des bulles d'un établissement, sans session :
 * réglages, bulles en service, jours ouverts. Null s'il n'en propose pas, ou
 * si Ominin n'a pas ouvert la capacité.
 */
export async function fetchBulleOffer(slug: string): Promise<BulleOffer | null> {
  const { data, error } = await createPublicClient()
    .from("etablissements")
    .select(
      "id, slug, name, bulle_reglages(place_cents, min_party, max_party, duration_minutes, booking_days), bulles(id, name, color, sort, active), bulle_creneaux(weekday), etablissement_settings(features)"
    )
    .eq("slug", slug)
    .order("sort", { referencedTable: "bulles", ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  const reglages = data?.bulle_reglages;
  const features = data?.etablissement_settings?.features as { bulles?: boolean } | null | undefined;
  if (!data || !reglages || features?.bulles !== true) return null;
  return {
    etablissement: { id: data.id, slug: data.slug, name: data.name },
    placeCents: reglages.place_cents,
    minParty: reglages.min_party,
    maxParty: reglages.max_party,
    durationMinutes: reglages.duration_minutes,
    bookingDays: reglages.booking_days,
    bulles: data.bulles
      .filter((bulle) => bulle.active)
      .map(({ id, name, color }) => ({ id, name, color })),
    weekdays: [...new Set(data.bulle_creneaux.map((creneau) => creneau.weekday))],
  };
}
