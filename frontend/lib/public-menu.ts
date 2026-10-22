import type { OpeningHours } from "@/lib/collect/hours";
import { assembleCategories, rowToAffiche, rowToFormule } from "@/lib/gestion/mappers";
import type { Formule, ServiceMode } from "@/lib/gestion/types";
import { fetchClosedItems } from "@/lib/menu/fermetures";
import { applyTarifs, fetchActiveTarifs } from "@/lib/menu/tarifs";
import { getRestaurant, type CategoryLayout, type MenuCategory, type MenuItem, type Restaurant } from "@/lib/menu-data";
import type { LoyaltyProgram } from "@/lib/menu/loyalty";
import {
  resolveFormuleOffers,
  resolvePairings,
  type FormuleOffer,
  type Pairing,
} from "@/lib/menu/pairings";
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

/**
 * Piment, mentions, allergènes et nom dans la langue de la cuisine : la base
 * ne les porte pas encore, le registre statique si. Rattachés par nom, la
 * carte en ligne imprime ce que montre /menu/demo ; sans registre, rien.
 */
function withPrintedDetails(categories: MenuCategory[], registry: Restaurant | undefined): MenuCategory[] {
  if (!registry) return categories;
  const kickers = new Map(registry.categories.map((category) => [category.name, category.kicker]));
  const printed = new Map(registry.categories.flatMap((category) => category.items.map((item) => [item.name, item])));
  return categories.map((category) => ({
    ...category,
    kicker: kickers.get(category.name),
    items: category.items.map((item) => {
      const source = printed.get(item.name);
      return source ? { ...item, spice: source.spice, tags: source.tags, allergens: source.allergens } : item;
    }),
  }));
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
  paymentProvider: "stripe" | "sumup" | "square" | "demo";
  /** Point de vente Square encaisseur — public par conception (SDK carte). */
  squareLocationId: string | null;
  /** Menu QR ouvert : ferme, la page publique n'existe pas pour ce client. */
  qrMenu: boolean;
  /** Restaurant (commande depuis la table) ou fast food (au comptoir, numérotée). */
  serviceMode: ServiceMode;
  /** Le menu propose d'appeler un serveur ; retiré, le bouton n'existe pas. */
  callServer: boolean;
  /** Programme de fidélité ouvert par Ominin et allumé par le gérant. */
  loyalty: LoyaltyProgram | null;
  /** Formules disponibles, sans les choix dont l'article est épuisé. */
  formules: Formule[];
  /** Sous ce total, le règlement par carte n'est pas proposé ; null ⇒ aucun minimum. */
  onlineMinOrder: number | null;
  /**
   * Articles coupés au rendu (cuisine fermée…). Les formules ne s'en
   * délestent pas ici : la page en cache survivrait à la réouverture ; le
   * menu les filtre d'après l'état relu (components/menu/formules.tsx).
   */
  closedItems: string[];
  /** L'accord du chef, par id de plat ; absent ⇒ le restaurant n'en propose pas. */
  pairings: Record<string, Pairing[]> | undefined;
  /** Les formules que l'accord du chef propose de compléter ; absent avec lui. */
  formuleOffers: FormuleOffer[] | undefined;
  /** Horaires structurés : les créneaux de retrait du click & collect. */
  openingHours: OpeningHours | null;
  collectSlotMinutes: number;
  restaurant: Restaurant;
} | null> {
  const supabase = createPublicClient();

  // Catégories et items embarqués par PostgREST : un seul aller-retour
  // sur la page la plus consultée (chaque scan de QR code).
  const { data: etablissement, error } = await supabase
    .from("etablissements")
    .select("*, categories(*), items!items_etablissement_id_fkey(*), etablissement_settings(features, day_end_hour), loyalty_rewards(id, label, points, loyalty_reward_items(item_id)), formules(*), affiches(*)")
    .eq("slug", slug)
    .order("position", { referencedTable: "categories", ascending: true })
    .order("position", { referencedTable: "items", ascending: true })
    .order("created_at", { referencedTable: "items", ascending: true })
    .order("created_at", { referencedTable: "affiches", ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!etablissement) return null;

  // Tarifs planifiés en cours. Un second aller-retour, mais la page est mise
  // en cache : c'est la revalidation qui le paie, pas le scan du client. Le
  // prix affiché est ainsi celui que place_order figera sur la commande.
  const [tarifs, closedItems] = await Promise.all([
    fetchActiveTarifs(supabase, etablissement.id),
    fetchClosedItems(supabase, etablissement.id),
  ]);

  // Actifs de marque gérés côté code pour les démos (comme le thème).
  const staticData = getRestaurant(etablissement.slug);
  // Réglages d'Ominin : seuls les écarts à l'offre y figurent, une clé
  // absente vaut donc « comme l'offre » — ici, ouvert.
  const features = etablissement.etablissement_settings?.features as {
    qr?: boolean;
    appel_serveur?: boolean;
    fidelite?: boolean;
  } | null;

  const categories = withPrintedDetails(
    applyTarifs(
      assembleCategories(etablissement.categories, etablissement.items).filter(
        (category) => category.items.length > 0
      ),
      tarifs
    ),
    staticData
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
  // (la base le refuserait) ; une étape obligatoire vidée emporte sa formule,
  // une facultative disparaît (formule_line n'exige que les obligatoires), et
  // une formule sans plus aucune étape ne se vend pas à vide.
  // Hors de ses jours, la formule n'apparaît pas (formule_du_jour en base).
  const today = serviceIsoDay(
    etablissement.etablissement_settings?.day_end_hour ?? 0
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
        // Un article de la carte suit sa fiche : ses options du moment,
        // comme formule_line en base.
        articles: etape.articles.flatMap((article) => {
          if (!article.itemId) return [article];
          const item = itemsById.get(article.itemId);
          return item && item.disponible !== false && item.stock !== 0
            ? [{ ...article, options: item.options }]
            : [];
        }),
      })),
    }))
    .filter((formule) =>
      formule.etapes.every(
        (etape) => !etape.obligatoire || etape.articles.length > 0
      )
    )
    .map((formule) => ({
      ...formule,
      etapes: formule.etapes.filter((etape) => etape.articles.length > 0),
    }))
    .filter((formule) => formule.etapes.length > 0)
    .sort((a, b) => a.price - b.price);

  // Une affiche se montre avec les formules du jour placées dessus ; sans
  // aucune, elle n'aurait rien à ouvrir.
  const affiches = etablissement.affiches
    .map((row) => ({
      ...rowToAffiche(row),
      formules: formules
        .filter((formule) => formule.affiche?.id === row.id)
        .sort((a, b) => (a.affiche?.rang ?? 0) - (b.affiche?.rang ?? 0)),
    }))
    .filter((affiche) => affiche.formules.length > 0);

  return {
    id: etablissement.id,
    offre: etablissement.offre,
    onlinePayment: etablissement.online_payment,
    onlineMinOrder:
      etablissement.online_min_order === null
        ? null
        : Number(etablissement.online_min_order),
    closedItems,
    paymentProvider: etablissement.payment_provider ?? "stripe",
    squareLocationId: etablissement.square_location_id ?? null,
    qrMenu: features?.qr !== false,
    serviceMode: etablissement.service_mode,
    // Au comptoir, personne ne vient à table : pas de serveur à appeler.
    callServer:
      features?.appel_serveur !== false && etablissement.service_mode === "restaurant",
    loyalty,
    formules,
    pairings: resolvePairings(categories, staticData?.pairings),
    formuleOffers: staticData?.pairings ? resolveFormuleOffers(formules, categories) : undefined,
    openingHours: etablissement.opening_hours as OpeningHours | null,
    collectSlotMinutes: etablissement.collect_slot_minutes,
    restaurant: {
      slug: etablissement.slug,
      name: etablissement.name,
      brandName: staticData?.brandName,
      tagline: etablissement.tagline,
      coverImage: staticData
        ? staticData.coverImage
        : (etablissement.cover_image ?? undefined),
      logo: staticData?.logo,
      logoIsName: staticData?.logoIsName,
      whiteLogo: staticData?.whiteLogo,
      footerLogo: staticData?.footerLogo,
      icons: staticData?.icons,
      themeColor: staticData?.themeColor,
      placeId: staticData?.placeId,
      allergensUrl: staticData?.allergensUrl,
      loyaltyMotif: staticData?.loyaltyMotif,
      suivi: staticData?.suivi,
      poster: staticData?.poster,
      affiches,
      highlights: staticData?.highlights,
      ticker: staticData?.ticker,
      categoryLayout: etablissement.category_layout as CategoryLayout,
      glossary: staticData?.glossary,
      address: etablissement.address,
      phone: etablissement.phone,
      hours: etablissement.hours,
      googleReviewUrl: etablissement.google_review_url ?? undefined,
      categories,
    },
  };
}
