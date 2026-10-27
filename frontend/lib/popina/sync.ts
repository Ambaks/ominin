import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { popinaApi, popinaList, PopinaError } from "./client";
import { POPINA } from "./config";
import { importTillSales, toTillSale, type ApiOrder, type TillSale } from "./orders";

type Admin = ReturnType<typeof createAdminClient>;

type PopinaConnection = Tables<"popina_connections">;

const HOUR_MS = 60 * 60 * 1000;

/** Un 401 : Popina ne reconnaît plus la clé, le gérant doit en coller une. */
export async function markBlocked(admin: Admin, etablissementId: string): Promise<void> {
  await admin
    .from("popina_connections")
    .update({ last_failed_at: new Date().toISOString() })
    .eq("etablissement_id", etablissementId);
}

/** Relit une vente que le webhook signale, et l'importe si elle est close. */
export async function importOne(
  admin: Admin,
  connection: Pick<PopinaConnection, "etablissement_id" | "api_key">,
  orderId: string,
  tableName: string | null
): Promise<void> {
  const order = await popinaApi<ApiOrder>(
    connection.api_key,
    `/v1/orders/${encodeURIComponent(orderId)}`
  );
  const sale = toTillSale(order, tableName);
  if (sale) await importTillSales(admin, connection.etablissement_id, [sale]);
}

/**
 * Relit les ventes de la fenêtre et importe ce qu'un webhook perdu aurait
 * laissé de côté. Un seul appel pour toute la fenêtre ; s'il échoue, vente
 * par vente, pour qu'une vente illisible n'arrête pas les autres.
 */
export async function reconcile(admin: Admin, connection: PopinaConnection): Promise<string[]> {
  const since = new Date(Date.now() - POPINA.reconcileLookbackHours * HOUR_MS).toISOString();
  let orders: ApiOrder[];
  try {
    orders = await popinaList<ApiOrder>(
      connection.api_key,
      `/v1/orders?since=${encodeURIComponent(since)}`
    );
  } catch (error) {
    if (error instanceof PopinaError && error.status === 401) {
      await markBlocked(admin, connection.etablissement_id);
      return [];
    }
    throw error;
  }

  const sales = orders
    .map((order) => toTillSale(order, null))
    .filter((sale): sale is TillSale => sale !== null);
  const failures: string[] = [];
  try {
    await importTillSales(admin, connection.etablissement_id, sales);
  } catch {
    for (const sale of sales) {
      try {
        await importTillSales(admin, connection.etablissement_id, [sale]);
      } catch (failure) {
        failures.push(
          `vente ${sale.popina_order_id} : ${failure instanceof Error ? failure.message : String(failure)}`
        );
      }
    }
  }
  await admin
    .from("popina_connections")
    .update({ reconciled_at: new Date().toISOString() })
    .eq("etablissement_id", connection.etablissement_id);
  return failures;
}

/**
 * Filet du workflow popina-reconcile : chaque connexion, isolée des autres.
 * Une clé refusée est passée — le gérant le voit dans Gestion, et un échec
 * horaire du workflow noierait les vraies pannes.
 */
export async function reconcileAll(admin: Admin) {
  const { data: connections, error } = await admin
    .from("popina_connections")
    .select("*")
    .is("last_failed_at", null);
  if (error) throw new Error(error.message);
  const failures: string[] = [];
  for (const connection of connections) {
    const label = connection.location_name ?? connection.location_id;
    try {
      failures.push(...(await reconcile(admin, connection)).map((failure) => `${label} : ${failure}`));
    } catch (failure) {
      failures.push(`${label} : ${failure instanceof Error ? failure.message : String(failure)}`);
    }
  }
  if (failures.length) console.error("[popina] relecture en échec", { failures });
  return { connections: connections.length, failures };
}
