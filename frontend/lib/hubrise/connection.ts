import type { Tables } from "@/lib/supabase/database.types";
import type { createAdminClient } from "@/lib/supabase/admin";
import { hubriseApi, HubriseError } from "./client";

type Admin = ReturnType<typeof createAdminClient>;

export type Connection = Tables<"hubrise_connections">;

export async function getConnection(
  admin: Admin,
  etablissementId: string
): Promise<Connection | null> {
  const { data } = await admin
    .from("hubrise_connections")
    .select("*")
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  return data;
}

export async function getConnectionByLocation(
  admin: Admin,
  locationId: string
): Promise<Connection | null> {
  const { data } = await admin
    .from("hubrise_connections")
    .select("*")
    .eq("location_id", locationId)
    .maybeSingle();
  return data;
}

/**
 * Appel HubRise au nom d'une connexion. Un 401 marque la connexion en échec
 * (le gérant est invité à reconnecter, les envois attendent) ; le premier
 * appel réussi ensuite efface la marque. Les autres erreurs remontent telles
 * quelles : à l'appelant de décider s'il réessaie.
 */
export async function callHubrise<T>(
  admin: Admin,
  connection: Pick<Connection, "etablissement_id" | "access_token" | "last_failed_at">,
  path: string,
  init?: RequestInit
): Promise<T> {
  try {
    const body = await hubriseApi<T>(connection.access_token, path, init);
    if (connection.last_failed_at) {
      await admin
        .from("hubrise_connections")
        .update({ last_failed_at: null })
        .eq("etablissement_id", connection.etablissement_id);
      connection.last_failed_at = null;
    }
    return body;
  } catch (error) {
    if (error instanceof HubriseError && error.status === 401) {
      const failedAt = new Date().toISOString();
      await admin
        .from("hubrise_connections")
        .update({ last_failed_at: failedAt })
        .eq("etablissement_id", connection.etablissement_id);
      connection.last_failed_at = failedAt;
    }
    throw error;
  }
}
