import { BOHO_DEMO_SLUG } from "@/lib/bulles/demo";
import { hasBespokeSite } from "@/lib/sites/bespoke";
import { createPublicClient } from "@/lib/supabase/public";

/** Le site est-il visible du public ? Il faut qu'il existe et qu'Ominin l'ait ouvert ; la démonstration l'est toujours. */
export async function isSiteOpen(slug: string): Promise<boolean> {
  if (slug === BOHO_DEMO_SLUG) return true;
  if (!hasBespokeSite(slug)) return false;
  const { data, error } = await createPublicClient()
    .from("etablissements")
    .select("etablissement_settings(features)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const features = data?.etablissement_settings?.features as { site?: boolean } | null | undefined;
  return features?.site === true;
}
