import { assembleCategories } from "@/lib/gestion/mappers";
import { applyTarifs, fetchActiveTarifs } from "@/lib/menu/tarifs";
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
  paymentProvider: "stripe" | "sumup" | "square";
  /** Point de vente Square encaisseur — public par conception (SDK carte). */
  squareLocationId: string | null;
  /** Menu QR ouvert : ferme, la page publique n'existe pas pour ce client. */
  qrMenu: boolean;
  /** Le menu propose d'appeler un serveur ; retiré, le bouton n'existe pas. */
  callServer: boolean;
  restaurant: Restaurant;
} | null> {
  const supabase = createPublicClient();

  // Catégories et items embarqués par PostgREST : un seul aller-retour
  // sur la page la plus consultée (chaque scan de QR code).
  const { data: etablissement, error } = await supabase
    .from("etablissements")
    .select("*, categories(*), items!items_etablissement_id_fkey(*), etablissement_settings(features)")
    .eq("slug", slug)
    .order("position", { referencedTable: "categories", ascending: true })
    .order("created_at", { referencedTable: "items", ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!etablissement) return null;

  // Tarifs planifiés en cours. Un second aller-retour, mais la page est mise
  // en cache : c'est la revalidation qui le paie, pas le scan du client. Le
  // prix affiché est ainsi celui que place_order figera sur la commande.
  const tarifs = await fetchActiveTarifs(supabase, etablissement.id);

  // Actifs de marque gérés côté code pour les démos (comme le thème).
  const staticData = getRestaurant(etablissement.slug);
  // Réglages d'Ominin : seuls les écarts à l'offre y figurent, une clé
  // absente vaut donc « comme l'offre » — ici, ouvert.
  const features = etablissement.etablissement_settings?.features as {
    qr?: boolean;
    appel_serveur?: boolean;
  } | null;

  return {
    id: etablissement.id,
    offre: etablissement.offre,
    onlinePayment: etablissement.online_payment,
    paymentProvider: etablissement.payment_provider ?? "stripe",
    squareLocationId: etablissement.square_location_id ?? null,
    qrMenu: features?.qr !== false,
    callServer: features?.appel_serveur !== false,
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
      categories: applyTarifs(
        assembleCategories(
          etablissement.categories,
          etablissement.items
        ).filter((category) => category.items.length > 0),
        tarifs
      ),
    },
  };
}
