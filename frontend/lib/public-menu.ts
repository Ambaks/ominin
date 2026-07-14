import { assembleCategories } from "@/lib/gestion/mappers";
import type { Restaurant } from "@/lib/menu-data";
import { createPublicClient } from "@/lib/supabase/public";

/*
 * Lecture anonyme du contenu public d'un établissement (policies RLS
 * « public read »), via le client sans cookies : la page appelante reste
 * cacheable (revalidation périodique). Partagée par le menu QR (/m/[slug])
 * et la page click & collect. L'id, l'offre et le réglage paiement sont
 * retournés à part — le domaine Restaurant reste purement présentationnel.
 */
export async function fetchRestaurant(slug: string): Promise<{
  id: string;
  offre: string;
  onlinePayment: boolean;
  restaurant: Restaurant;
} | null> {
  const supabase = createPublicClient();

  // Catégories et items embarqués par PostgREST : un seul aller-retour
  // sur la page la plus consultée (chaque scan de QR code).
  const { data: etablissement, error } = await supabase
    .from("etablissements")
    .select("*, categories(*), items(*)")
    .eq("slug", slug)
    .order("position", { referencedTable: "categories", ascending: true })
    .order("created_at", { referencedTable: "items", ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!etablissement) return null;

  return {
    id: etablissement.id,
    offre: etablissement.offre,
    onlinePayment: etablissement.online_payment,
    restaurant: {
      slug: etablissement.slug,
      name: etablissement.name,
      tagline: etablissement.tagline,
      coverImage: etablissement.cover_image ?? undefined,
      address: etablissement.address,
      phone: etablissement.phone,
      hours: etablissement.hours,
      categories: assembleCategories(
        etablissement.categories,
        etablissement.items
      ).filter((category) => category.items.length > 0),
    },
  };
}
