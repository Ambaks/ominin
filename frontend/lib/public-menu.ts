import { assembleCategories } from "@/lib/gestion/mappers";
import { getRestaurant, type Restaurant } from "@/lib/menu-data";
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
  /** Null pour un établissement en click & collect seul (pas de salle). */
  offre: string | null;
  onlinePayment: boolean;
  /** Fournisseur du paiement à table ; non choisi ⇒ Stripe (historique). */
  paymentProvider: "stripe" | "sumup";
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

  // Actifs de marque gérés côté code pour les démos (comme le thème).
  const staticData = getRestaurant(etablissement.slug);

  return {
    id: etablissement.id,
    offre: etablissement.offre,
    onlinePayment: etablissement.online_payment,
    // Colonne de la migration 20260817000001 (types à régénérer).
    paymentProvider:
      (etablissement as { payment_provider?: "stripe" | "sumup" | null })
        .payment_provider ?? "stripe",
    restaurant: {
      slug: etablissement.slug,
      name: etablissement.name,
      tagline: etablissement.tagline,
      coverImage: staticData
        ? staticData.coverImage
        : (etablissement.cover_image ?? undefined),
      logo: staticData?.logo,
      address: etablissement.address,
      phone: etablissement.phone,
      hours: etablissement.hours,
      googleReviewUrl: etablissement.google_review_url ?? undefined,
      categories: assembleCategories(
        etablissement.categories,
        etablissement.items
      ).filter((category) => category.items.length > 0),
    },
  };
}
