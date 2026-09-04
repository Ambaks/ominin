import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import { SERIAL_CODE_LENGTH, TERMINAL_ONLINE_WINDOW_MS } from "./constants";

/*
 * Onglet Terminaux : boîtiers Omilink et imprimantes de l'établissement.
 * Lecture directe de Supabase (RLS) relue périodiquement — l'état de santé
 * change toutes les quelques secondes et ne vit pas dans le store de gestion.
 */

export type OmilinkDevice = Tables<"omilink_devices">;
export type Printer = Tables<"printers">;
export type PrintJob = Tables<"print_jobs">;

/** Boîtier annoncé, pas encore rattaché (route /api/gestion/omilink/unclaimed). */
export interface UnclaimedDevice {
  serial: string;
  hostname: string | null;
  lan_ip: string | null;
  last_seen_at: string;
}

export interface PrinterInput {
  name: string;
  host: string;
  port: number;
  deviceId: string;
}

/** Contraintes Postgres traduites pour l'écran. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  printers_device_id_host_port_key:
    "Une imprimante est déjà déclarée à cette adresse.",
  printers_device_id_fkey: "Retirez d'abord les imprimantes de ce boîtier.",
};

function save(result: { error: { message: string } | null }): void {
  const message = result.error?.message;
  if (message) {
    for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
      if (message.includes(constraint)) throw new Error(friendly);
    }
  }
  check(result);
}

/** Code lisible d'un boîtier : fin du numéro de série, comme sur son étiquette. */
export function deviceCode(serial: string | null): string | null {
  return serial ? serial.slice(-SERIAL_CODE_LENGTH).toUpperCase() : null;
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

export async function fetchUnclaimed(
  etablissementId: string
): Promise<UnclaimedDevice[]> {
  const response = await fetch(
    `/api/gestion/omilink/unclaimed?etablissement_id=${encodeURIComponent(etablissementId)}`
  );
  const body = (await response.json().catch(() => null)) as {
    devices?: UnclaimedDevice[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(body?.error ?? "Recherche des boîtiers impossible.");
  }
  return body?.devices ?? [];
}

/** Rattache un boîtier annoncé ; il passe « En ligne » à sa prochaine annonce. */
export async function claimDevice(
  serial: string,
  etablissementId: string,
  name: string
): Promise<string> {
  return must(
    await createClient().rpc("omilink_claim_device", {
      p_serial: serial,
      p_etablissement_id: etablissementId,
      p_name: name,
    })
  );
}

export async function deleteDevice(id: string): Promise<void> {
  save(await createClient().from("omilink_devices").delete().eq("id", id));
}

/** Demande au boîtier de balayer le réseau ; le résultat arrive par le sync. */
export async function requestScan(deviceId: string): Promise<void> {
  check(
    await createClient()
      .from("omilink_devices")
      .update({ scan_requested_at: new Date().toISOString() })
      .eq("id", deviceId)
  );
}

/** Balayage demandé et pas encore livré par le boîtier. */
export function isScanning(device: OmilinkDevice): boolean {
  return (
    device.scan_requested_at != null &&
    (device.scanned_at == null ||
      new Date(device.scanned_at).getTime() <
        new Date(device.scan_requested_at).getTime())
  );
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
