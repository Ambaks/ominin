import { createClient } from "@/lib/supabase/server";

/** Garde des route handlers de l'admin : session, puis allowlist is_admin. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { error: "Authentification requise.", status: 401 as const };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Réservé à l'admin.", status: 403 as const };
  return { userId: user.id };
}
