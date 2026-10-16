import { addDays, dayStart, formatDayLong, isToday } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { must } from "@/lib/supabase/result";

/*
 * Journal de l'équipe : une entrée par /push (script `npm run journal`), la
 * plus récente en tête, regroupée par jour à l'écran.
 */

export type JournalEntry = Database["public"]["Tables"]["projet_journal"]["Row"];

export interface JournalDay {
  key: number;
  label: string;
  entries: JournalEntry[];
}

export async function fetchJournal(): Promise<JournalEntry[]> {
  return createClient()
    .from("projet_journal")
    .select("*")
    .order("created_at", { ascending: false })
    .then(must);
}

function dayLabel(iso: string, now: Date): string {
  if (isToday(iso, now)) return "Aujourd'hui";
  if (isToday(iso, addDays(now, -1))) return "Hier";
  return formatDayLong(iso);
}

/** Les entrées, déjà triées de la plus récente à la plus ancienne, par jour. */
export function groupByDay(entries: JournalEntry[], now = new Date()): JournalDay[] {
  const days: JournalDay[] = [];
  for (const entry of entries) {
    const key = dayStart(new Date(entry.created_at)).getTime();
    const last = days.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, label: dayLabel(entry.created_at, now), entries: [entry] });
  }
  return days;
}
