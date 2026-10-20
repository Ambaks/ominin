import { formatOpeningHours, TIME_ZONE, type OpeningHours } from "@/lib/collect/hours";
import type { createAdminClient } from "@/lib/supabase/admin";
import { callHubrise, type Connection } from "./connection";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Horaires de la caisse → horaires d'Ominin. HubRise nomme les jours
 * (monday…) et laisse une plage passer minuit (to ≤ from) ; Ominin chiffre
 * les jours de 1 à 7 et refuse une fermeture avant l'ouverture : la plage est
 * coupée à minuit (la minute qui manque à 23:59 est le prix de cette
 * limite du champ horaire).
 */

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const END_OF_DAY = "23:59";
const START_OF_DAY = "00:00";

interface HubriseLocation {
  opening_hours: Partial<Record<(typeof DAYS)[number], { from: string; to: string }[]>> | null;
  timezone?: { name?: string };
}

export function toOpeningHours(
  hours: NonNullable<HubriseLocation["opening_hours"]>
): OpeningHours {
  const result: OpeningHours = {};
  const put = (day: number, range: [string, string]) => {
    result[String(day)] = [...(result[String(day)] ?? []), range];
  };
  DAYS.forEach((name, index) => {
    const day = index + 1;
    for (const slot of hours[name] ?? []) {
      if (slot.to > slot.from) {
        put(day, [slot.from, slot.to]);
      } else {
        // Passe minuit : la fin tombe le lendemain.
        put(day, [slot.from, END_OF_DAY]);
        if (slot.to > START_OF_DAY) put(day === 7 ? 1 : day + 1, [START_OF_DAY, slot.to]);
      }
    }
  });
  for (const ranges of Object.values(result)) ranges?.sort((a, b) => a[0].localeCompare(b[0]));
  return result;
}

export async function pullHours(admin: Admin, connection: Connection): Promise<void> {
  const location = await callHubrise<HubriseLocation>(admin, connection, "/location");
  const synced = new Date().toISOString();

  // Jamais réglés chez HubRise : on garde ceux d'Ominin.
  if (!location.opening_hours) {
    await admin
      .from("hubrise_connections")
      .update({
        hours_synced_at: synced,
        hours_note: "La caisse n'a pas d'horaires : ceux d'Ominin sont conservés.",
      })
      .eq("etablissement_id", connection.etablissement_id);
    return;
  }

  const hours = toOpeningHours(location.opening_hours);
  const text = formatOpeningHours(hours);
  const zone = location.timezone?.name;
  const { error } = await admin
    .from("etablissements")
    .update({ opening_hours: text ? hours : null, hours: text })
    .eq("id", connection.etablissement_id);
  if (error) throw new Error(error.message);
  await admin
    .from("hubrise_connections")
    .update({
      hours_synced_at: synced,
      hours_note:
        zone && zone !== TIME_ZONE
          ? `Le fuseau de la caisse est ${zone} ; Ominin lit les horaires à l'heure de Paris.`
          : null,
    })
    .eq("etablissement_id", connection.etablissement_id);
}
