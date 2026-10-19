import { createClient } from "@/lib/supabase/server";

/** Gérant de l'établissement courant — même garde que les routes Stripe. */
export async function requireGerant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise.", status: 401 as const };
  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    return {
      error: "Seul le gérant peut modifier ce réglage.",
      status: 403 as const,
    };
  }
  return { etablissementId: membership.etablissement_id, email: user.email };
}
