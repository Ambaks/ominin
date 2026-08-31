import type { Role } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";
import { check } from "@/lib/supabase/result";
import { ROLE_DEFAULT_PREFS, type PushEvent } from "./events";

/*
 * Préférences de notification du membre connecté (une ligne par membership,
 * RLS « own prefs »). Sans ligne enregistrée, les défauts du rôle valent —
 * les mêmes que ceux appliqués à l'envoi (lib/push/server.ts).
 */

export type PrefValues = Record<PushEvent, boolean>;

async function requireUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expirée : reconnectez-vous.");
  return user;
}

export async function loadPrefs(
  etablissementId: string,
  role: Role
): Promise<PrefValues> {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("nouvelle_commande, commande_prete, commande_annulee, appel_serveur")
    .eq("user_id", user.id)
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { ...ROLE_DEFAULT_PREFS[role] };
}

export async function savePrefs(
  etablissementId: string,
  values: PrefValues
): Promise<void> {
  const supabase = createClient();
  const user = await requireUser(supabase);
  check(
    await supabase.from("notification_prefs").upsert({
      user_id: user.id,
      etablissement_id: etablissementId,
      ...values,
      updated_at: new Date().toISOString(),
    })
  );
}
