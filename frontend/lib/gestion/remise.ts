import { createClient } from "@/lib/supabase/client";
import { must } from "@/lib/supabase/result";
import { HANDOVER_STATUSES } from "./constants";
import { rowToOrder } from "./mappers";
import type { Order, Role } from "./types";

/*
 * Le code de retrait d'une commande, scanné par l'équipe : une seule
 * commande, lue et remise directement, sans le magasin de l'espace — la RLS
 * ne rend que celles des établissements du compte.
 */

export interface Remise {
  order: Order;
  etablissementId: string;
  etablissementName: string;
  /** La table du QR, quand le gérant l'affiche à côté du numéro. */
  table: number | null;
  role: Role | null;
}

/** Réseau coupé : PostgREST ne lève pas, il rend un statut 0. On le lève. */
function online<T extends { status: number; error: { message: string } | null }>(result: T): T {
  if (result.status === 0) throw new TypeError(result.error?.message);
  return result;
}

/**
 * La commande d'un code, ou null s'il ne désigne aucune commande du compte.
 * role : celui déjà lu pour son établissement — chaque signal de la commande
 * la relit, pas lui ; absent, il est lu.
 */
export async function fetchRemise(orderId: string, role?: Role | null): Promise<Remise | null> {
  const supabase = createClient();
  const result = online(
    await supabase
      .from("orders")
      .select(
        "*, order_items(*), order_payments(*), etablissements(name, show_table_number), tables(number)"
      )
      .eq("id", orderId)
      .maybeSingle()
  );
  // Un code qui n'est pas un identifiant (22P02) ne désigne aucune commande.
  if (result.error?.code === "22P02") return null;
  if (result.error) throw new Error(result.error.message);
  const row = result.data;
  if (!row) return null;
  return {
    order: rowToOrder(row),
    etablissementId: row.etablissement_id,
    etablissementName: row.etablissements.name,
    table: row.etablissements.show_table_number ? (row.tables?.number ?? null) : null,
    role: role !== undefined ? role : await roleIn(row.etablissement_id),
  };
}

async function roleIn(etablissementId: string): Promise<Role | null> {
  const result = online(
    await createClient().rpc("current_member_role", { etab: etablissementId })
  );
  // Une erreur n'est pas « aucun rôle » : on la lève, la page le dit.
  if (result.error) throw new Error(result.error.message);
  return result.data ?? null;
}

/**
 * Remet la commande : réglée, prête ou pas encore, elle passe « servie ». La
 * condition tient dans la requête — deux téléphones qui scannent le même code
 * ensemble ne la remettent qu'une fois. Rend l'heure de la remise faite ici,
 * null si elle ne pouvait plus l'être (remise ailleurs, annulée…).
 */
export async function handOver(orderId: string): Promise<string | null> {
  const rows = must(
    online(
      await createClient()
        .from("orders")
        .update({ status: "servie" })
        .eq("id", orderId)
        .not("order_number", "is", null)
        .in("status", HANDOVER_STATUSES)
        .select("handed_over_at")
    )
  );
  return rows[0]?.handed_over_at ?? null;
}
