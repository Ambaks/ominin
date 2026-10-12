import { createClient } from "@/lib/supabase/client";

/*
 * Inscription aux visites guidées, à part des visites elles-mêmes : les
 * pages d'inscription et de lien gérant n'embarquent pas tout leur texte.
 */

/** Clé des métadonnées du compte : visites vues, absente = jamais inscrit. */
export const VISITES_METADATA_KEY = "visites";

/**
 * Inscrit le compte connecté, qui vient de devenir gérant : les visites
 * s'ouvriront d'elles-mêmes à son arrivée dans l'espace. Un compte déjà
 * inscrit garde ce qu'il a vu. Au mieux — un échec ne lui coûte que la
 * visite, jamais son arrivée.
 */
export async function enrollVisites(): Promise<void> {
  const supabase = createClient();
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user || Array.isArray(user.user_metadata?.[VISITES_METADATA_KEY]))
      return;
    const { error: writeError } = await supabase.auth.updateUser({
      data: { [VISITES_METADATA_KEY]: [] },
    });
    if (writeError) throw writeError;
  } catch (error) {
    console.error("Inscription aux visites guidées impossible :", error);
  }
}
