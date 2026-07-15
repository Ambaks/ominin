import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { STORAGE_RETENTION_DAYS } from "@/lib/clip/provider/config";
import type { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/*
 * Garde commune des routes /api/clip : session Supabase requise. Pas de
 * contrôle sur user_metadata.product — les inscriptions Google n'en portent
 * pas. Comme pour la page /espace, l'authentification fait foi ; la RLS et
 * l'onboarding manuel des clients portent la vraie autorisation.
 */
export async function requireClipUser(): Promise<
  { user: User; supabase: ServerClient } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 }
    );
  }
  return { user, supabase };
}

/** Réponse uniforme quand le prestataire de publication ne répond pas. */
export function providerUnavailable(cause: unknown): NextResponse {
  console.error("Prestataire de publication indisponible :", cause);
  return NextResponse.json(
    { error: "Le service de publication ne répond pas." },
    { status: 502 }
  );
}

/**
 * Purge les clips du clipper plus vieux que la rétention. Best effort,
 * appelée à chaque publication : le bucket gratuit plafonne à 1 Go et aucun
 * cron ne tourne. Les objets récents (échecs réessayables) sont conservés.
 */
export async function purgeStaleClips(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<void> {
  const cutoff = Date.now() - STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const { data } = await admin.storage.from("clips").list(userId);
  const stale = (data ?? [])
    .filter((object) => new Date(object.created_at).getTime() < cutoff)
    .map((object) => `${userId}/${object.name}`);
  if (stale.length > 0) {
    await admin.storage.from("clips").remove(stale);
  }
}
