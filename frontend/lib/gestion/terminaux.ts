import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import { TERMINAL_ONLINE_WINDOW_MS } from "./constants";

/*
 * Onglet Terminaux : boîtiers Omilink et imprimantes de l'établissement.
 * Lecture directe de Supabase (RLS) relue périodiquement — l'état de santé
 * change toutes les quelques secondes et ne vit pas dans le store de gestion.
 */

export type OmilinkDevice = Tables<"omilink_devices">;
export type Printer = Tables<"printers">;
export type PrintJob = Tables<"print_jobs">;

export interface PrinterInput {
  name: string;
  host: string;
  port: number;
  deviceId: string;
}

const DUPLICATE_PRINTER = "printers_device_id_host_port_key";

function save(result: { error: { message: string } | null }): void {
  if (result.error?.message.includes(DUPLICATE_PRINTER)) {
    throw new Error("Une imprimante est déjà déclarée à cette adresse.");
  }
  check(result);
}

export async function loadTerminaux(
  etablissementId: string
): Promise<{ devices: OmilinkDevice[]; printers: Printer[] }> {
  const supabase = createClient();
  const [devices, printers] = await Promise.all([
    supabase
      .from("omilink_devices")
      .select("*")
      .eq("etablissement_id", etablissementId)
      .order("created_at"),
    supabase
      .from("printers")
      .select("*")
      .eq("etablissement_id", etablissementId)
      .order("created_at"),
  ]);
  return { devices: must(devices), printers: must(printers) };
}

export async function createPrinter(
  etablissementId: string,
  input: PrinterInput
): Promise<void> {
  save(
    await createClient().from("printers").insert({
      etablissement_id: etablissementId,
      device_id: input.deviceId,
      name: input.name,
      host: input.host,
      port: input.port,
    })
  );
}

export async function updatePrinter(
  id: string,
  input: PrinterInput
): Promise<void> {
  save(
    await createClient()
      .from("printers")
      .update({
        device_id: input.deviceId,
        name: input.name,
        host: input.host,
        port: input.port,
      })
      .eq("id", id)
  );
}

export async function deletePrinter(id: string): Promise<void> {
  check(await createClient().from("printers").delete().eq("id", id));
}

/** Met un ticket de test en file ; le boîtier le sort à son prochain passage. */
export async function requestTestPrint(
  etablissementId: string,
  printerId: string
): Promise<PrintJob> {
  return must(
    await createClient()
      .from("print_jobs")
      .insert({
        etablissement_id: etablissementId,
        printer_id: printerId,
        kind: "test",
      })
      .select()
      .single()
  );
}

export async function fetchJobs(ids: string[]): Promise<PrintJob[]> {
  if (!ids.length) return [];
  return must(await createClient().from("print_jobs").select("*").in("id", ids));
}

export function isRecent(at: string | null, now: number): boolean {
  return at != null && now - new Date(at).getTime() < TERMINAL_ONLINE_WINDOW_MS;
}
