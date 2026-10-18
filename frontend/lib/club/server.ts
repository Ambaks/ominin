import { createClient } from "@/lib/supabase/server";

/*
 * Garde des routes serveur que seul le gérant d'un club appelle
 * (remboursement, annulation de soirée) : la session du navigateur, et son
 * rôle sur CET établissement — pas sur le premier venu de ses comptes.
 */
export async function requireClubGerant(
  etablissementId: string
): Promise<{ ok: true } | { ok: false; error: string; status: 401 | 403 }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise.", status: 401 };
  const { data: role } = await supabase.rpc("current_member_role", { etab: etablissementId });
  if (role !== "gerant") {
    return { ok: false, error: "Réservé au gérant du club.", status: 403 };
  }
  return { ok: true };
}

/** Les champs d'un formulaire client, nettoyés ; null s'ils ne tiennent pas. */
export function cleanContact(body: {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
}): { name: string; phone: string; email: string } | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/[^\d+]/g, "") : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 80) return null;
  if (phone.length < 6 || phone.length > 20) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return null;
  return { name, phone, email };
}

/** Message d'une erreur levée par une fonction SQL du club, pour le client. */
export function rpcMessage(error: { code?: string; message: string }): string | null {
  return error.code === "P0001" ? error.message : null;
}
