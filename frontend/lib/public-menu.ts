import { assembleCategories, rowToFormule } from "@/lib/gestion/mappers";
import type { Formule } from "@/lib/gestion/types";
import { applyTarifs, fetchActiveTarifs } from "@/lib/menu/tarifs";
import { getRestaurant, type MenuItem, type Restaurant } from "@/lib/menu-data";
import type { LoyaltyProgram } from "@/lib/menu/loyalty";
import { createPublicClient } from "@/lib/supabase/public";

const ISO_DAYS: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/**
 * Jour de service (1 = lundi … 7 = dimanche) à Paris, quel que soit le
 * fuseau du serveur : avant l'heure de bascule, c'est encore la veille —
 * même calcul que formule_du_jour et tarifs_actifs.
 */
function serviceIsoDay(dayEndHour: number): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
  }).format(new Date(Date.now() - dayEndHour * 3_600_000));
  return ISO_DAYS[weekday];
}

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
  /** Programme de fidélité ouvert par Ominin et allumé par le gérant. */
  loyalty: LoyaltyProgram | null;
  /** Formules disponibles, sans les choix dont l'article est épuisé. */
  formules: Formule[];
  restaurant: Restaurant;
} | null> {
  const supabase = createPublicClient();

  // Catégories et items embarqués par PostgREST : un seul aller-retour
  // sur la page la plus consultée (chaque scan de QR code).
  const { data: etablissement, error } = await supabase
    .from("etablissements")
    .select("*, categories(*), items!items_etablissement_id_fkey(*), etablissement_settings(features, day_end_hour), loyalty_rewards(id, label, points, loyalty_reward_items(item_id)), formules(*)")
    .eq("slug", slug)
    .order("position", { referencedTable: "categories", ascending: true })
    .order("position", { referencedTable: "items", ascending: true })
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
    fidelite?: boolean;
  } | null;

  const categories = applyTarifs(
    assembleCategories(etablissement.categories, etablissement.items).filter(
      (category) => category.items.length > 0
    ),
    tarifs
  );

  // Fidélité : fermée tant qu'Ominin n'a pas ouvert la capacité — aucune
  // offre ne la comprend d'office. Les articles de chaque palier sont ceux
  // de la carte affichée, tarifs compris ; un palier vide n'est pas proposé.
  const itemsById = new Map<string, MenuItem>(
    categories.flatMap((category) => category.items.map((item) => [item.id, item]))
  );
  const loyalty: LoyaltyProgram | null =
    (etablissement.offre === "smart" || etablissement.offre === "connect") &&
    features?.fidelite === true &&
    etablissement.loyalty_enabled
      ? {
          pointsPerEuro: Number(etablissement.loyalty_points_per_euro),
          rewards: etablissement.loyalty_rewards
            .map((reward) => ({
              id: reward.id,
              label: reward.label,
              points: reward.points,
              items: reward.loyalty_reward_items.flatMap(({ item_id }) => {
                const item = itemsById.get(item_id);
                return item ? [item] : [];
              }),
            }))
            .filter((reward) => reward.items.length > 0)
            .sort((a, b) => a.points - b.points),
        }
      : null;

  // Un choix dont l'article est supprimé, retiré ou épuisé n'est pas proposé
  // (la base le refuserait) ; une étape obligatoire vidée emporte sa formule.
  // Hors de ses jours, la formule n'apparaît pas (formule_du_jour en base).
  const today = serviceIsoDay(
    etablissement.etablissement_settings?.day_end_hour ?? 0
  );
  const available = new Set(
    etablissement.items
      .filter((item) => item.disponible && item.stock !== 0)
      .map((item) => item.id)
  );
  const formules = etablissement.formules
    .map(rowToFormule)
    .filter(
      (formule) =>
        formule.disponible && (!formule.days || formule.days.includes(today))
    )
    .map((formule) => ({
      ...formule,
      etapes: formule.etapes.map((etape) => ({
        ...etape,
        articles: etape.articles.filter(
          (article) => !article.itemId || available.has(article.itemId)
        ),
      })),
    }))
    .filter((formule) =>
      formule.etapes.every(
        (etape) => !etape.obligatoire || etape.articles.length > 0
      )
    )
    .sort((a, b) => a.price - b.price);

  return {
    id: etablissement.id,
    offre: etablissement.offre,
    onlinePayment: etablissement.online_payment,
    paymentProvider: etablissement.payment_provider ?? "stripe",
    squareLocationId: etablissement.square_location_id ?? null,
    qrMenu: features?.qr !== false,
    callServer: features?.appel_serveur !== false,
    loyalty,
    formules,
    restaurant: {
      slug: etablissement.slug,
      name: etablissement.name,
      tagline: etablissement.tagline,
      coverImage: staticData
        ? staticData.coverImage
        : (etablissement.cover_image ?? undefined),
      logo: staticData?.logo,
      poster: staticData?.poster,
      formulesBanner: staticData?.formulesBanner,
      highlights: staticData?.highlights,
      address: etablissement.address,
      phone: etablissement.phone,
      hours: etablissement.hours,
      googleReviewUrl: etablissement.google_review_url ?? undefined,
      categories,
    },
  };
}
