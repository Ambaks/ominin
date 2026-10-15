import { getRestaurant, type Restaurant } from "@/lib/menu-data";
import type { GroupFixture, Kind, Venue } from "./data";
import { tableRevenueOf, type Catalog, type VenueInput } from "./simulation";

/*
 * Les cartes du groupe, lues dans le registre côté serveur et passées à la
 * vue avec la recette d'une table déjà mesurée : le navigateur ne charge pas
 * le registre, et n'a pas d'étalonnage à refaire.
 */

/**
 * Le nom court d'un article : sa garniture suit la première virgule (« 4,5° »
 * n'en est pas une), l'appellation d'un vin le point médian.
 */
const shortName = (name: string) => name.split(/, | · /)[0].trim();

/**
 * La carte d'une adresse rangée par genre : chaque catégorie pèse selon son
 * nombre d'articles (à la puissance `categoryExponent` : deux cocktails
 * signature ne pèsent pas autant que vingt-deux classiques), ses premiers
 * articles — ceux que la carte met en tête — se commandent plus souvent, et
 * au-delà du plafond du genre (une bouteille de champagne, une planche
 * géante), presque jamais. Deux articles d'une adresse ne partagent pas un
 * nom : le fil et le classement les confondraient.
 */
function catalogOf(fixture: GroupFixture, venue: Venue, restaurant: Restaurant): Catalog {
  const { rankDecay, categoryExponent, overCapWeight, lunchBoost } = fixture.catalog;
  const catalog: Catalog = {};
  const names = new Map<string, string>();
  const shelfOf = (kind: Kind) => (catalog[kind] ??= { lunch: [], other: [] });
  for (const [categoryKind, ids] of Object.entries(venue.kinds) as [Kind, string[]][]) {
    for (const id of ids) {
      const category = restaurant.categories.find((c) => c.id === id);
      if (!category) throw new Error(`Catégorie introuvable : ${venue.slug}/${id}`);
      const items = category.items.filter((item) => item.disponible !== false);
      const ranks = items.map((_, i) => 1 / (1 + rankDecay * i));
      const rankSum = ranks.reduce((s, r) => s + r, 0);
      const lunchOnly = venue.lunchOnly?.includes(id) ?? false;
      items.forEach((item, i) => {
        const kind = venue.itemKinds?.[item.id] ?? categoryKind;
        const shelf = shelfOf(kind);
        const name = venue.names?.[item.id] ?? shortName(item.printName ?? item.name);
        const twin = names.get(name);
        if (twin && twin !== item.id) throw new Error(`Deux articles nommés « ${name} » : ${venue.slug}/${twin} et ${item.id}`);
        names.set(name, item.id);
        const weight =
          ((items.length ** categoryExponent * ranks[i]) / rankSum) *
          (item.price > fixture.priceCaps[kind] ? overCapWeight : 1);
        const product = { id: item.id, name, price: Math.round(item.price * 100), weight };
        shelf.lunch.push(lunchOnly ? { ...product, weight: weight * lunchBoost } : product);
        if (!lunchOnly) shelf.other.push(product);
      });
    }
  }
  return catalog;
}

export interface GroupVenue extends VenueInput {
  name: string;
  address: string;
}

/**
 * Les cartes ne changent pas d'une requête à l'autre : lues et étalonnées une
 * fois par processus (≈ 1 s pour quatre adresses), et toujours le même objet,
 * que le cache des journées reconnaît.
 */
const built = new WeakMap<GroupFixture, GroupVenue[]>();

export function groupVenues(fixture: GroupFixture): GroupVenue[] {
  const cached = built.get(fixture);
  if (cached) return cached;
  const venues = fixture.venues.map((venue) => {
    const restaurant = getRestaurant(venue.slug);
    if (!restaurant) throw new Error(`Carte introuvable : ${venue.slug}`);
    const catalog = catalogOf(fixture, venue, restaurant);
    return {
      name: restaurant.brandName ?? restaurant.name,
      address: restaurant.address.replace(/, \d{5} .*$/, ""),
      catalog,
      tableRevenue: tableRevenueOf(fixture, venue, catalog),
    };
  });
  built.set(fixture, venues);
  return venues;
}
