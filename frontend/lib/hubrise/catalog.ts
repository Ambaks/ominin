import type { createAdminClient } from "@/lib/supabase/admin";
import type { OptionGroup } from "@/lib/menu-data";
import type { Json } from "@/lib/supabase/database.types";
import { callHubrise, type Connection } from "./connection";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Catalogue HubRise → références. Ominin reste la source de vérité de la
 * carte (prix, photos, textes) : on ne la réécrit pas. On lit le catalogue de
 * la caisse pour en retenir les CODES, que les commandes lui renvoient —
 * c'est par eux qu'une caisse retrouve un produit. Le catalogue est gardé en
 * instantané ; les correspondances article ↔ code en sont tirées d'office
 * quand les noms se recoupent sans ambiguïté, et le gérant fait le reste.
 */

export interface CatalogSku {
  ref: string;
  name: string | null;
  product: string;
  category: string | null;
  price: string | null;
}

export interface CatalogOption {
  ref: string;
  name: string;
  listName: string;
  price: string | null;
}

export interface CatalogDeal {
  ref: string;
  name: string;
}

export interface CatalogSnapshot {
  skus: CatalogSku[];
  options: CatalogOption[];
  /** Absent des instantanés lus avant les formules. */
  deals?: CatalogDeal[];
}

interface HubriseCatalog {
  id: string;
  name: string;
  data?: {
    categories?: { id: string; name: string }[];
    products?: {
      name: string;
      category_id: string | null;
      skus?: { ref: string | null; name: string | null; price: string | null }[];
    }[];
    option_lists?: {
      name: string;
      options?: { ref: string | null; name: string; price: string | null }[];
    }[];
    deals?: { ref: string | null; name: string }[];
  };
}

export function toSnapshot(catalog: HubriseCatalog): CatalogSnapshot {
  const categories = new Map(
    (catalog.data?.categories ?? []).map((category) => [category.id, category.name])
  );
  const skus: CatalogSku[] = [];
  for (const product of catalog.data?.products ?? []) {
    for (const sku of product.skus ?? []) {
      if (!sku.ref) continue;
      skus.push({
        ref: sku.ref,
        name: sku.name,
        product: product.name,
        category: product.category_id ? (categories.get(product.category_id) ?? null) : null,
        price: sku.price,
      });
    }
  }
  const options: CatalogOption[] = [];
  for (const list of catalog.data?.option_lists ?? []) {
    for (const option of list.options ?? []) {
      if (!option.ref) continue;
      options.push({
        ref: option.ref,
        name: option.name,
        listName: list.name,
        price: option.price,
      });
    }
  }
  const deals = (catalog.data?.deals ?? []).flatMap((deal) =>
    deal.ref ? [{ ref: deal.ref, name: deal.name }] : []
  );
  return { skus, options, deals };
}

/** Sans accents, casse ni ponctuation : « Crème brûlée ! » ≈ « creme brulee ». */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** L'unique élément qui correspond ; plusieurs ou aucun, rien (jamais un choix au hasard). */
function only<T>(candidates: T[]): T | null {
  return candidates.length === 1 ? candidates[0] : null;
}

/** Relie d'office ce qui se recoupe sans ambiguïté ; ne touche à rien d'existant. */
export async function autoMatch(
  admin: Admin,
  etablissementId: string,
  snapshot: CatalogSnapshot
): Promise<number> {
  const [{ data: items }, { data: existing }, { data: formules }, { data: existingFormules }] =
    await Promise.all([
      admin.from("items").select("id, name, options").eq("etablissement_id", etablissementId),
      admin
        .from("hubrise_ref_map")
        .select("item_id, group_id, choice_id")
        .eq("etablissement_id", etablissementId),
      admin.from("formules").select("id, name").eq("etablissement_id", etablissementId),
      admin
        .from("hubrise_formule_map")
        .select("formule_id")
        .eq("etablissement_id", etablissementId),
    ]);
  const taken = new Set(
    (existing ?? []).map((row) => `${row.item_id}|${row.group_id ?? ""}|${row.choice_id ?? ""}`)
  );

  const skus = snapshot.skus.map((sku) => ({
    sku,
    names: [
      normalize(sku.product),
      ...(sku.name ? [normalize(`${sku.product} ${sku.name}`)] : []),
    ],
    // Un produit à un seul SKU se reconnaît à son nom ; à plusieurs, au nom complet.
    single: snapshot.skus.filter((other) => other.product === sku.product).length === 1,
  }));

  const rows: {
    etablissement_id: string;
    item_id: string;
    group_id: string | null;
    choice_id: string | null;
    target: "sku" | "option";
    ref: string;
    option_list_name: string | null;
    hubrise_name: string;
    matched_by: "auto";
  }[] = [];

  for (const item of items ?? []) {
    const name = normalize(item.name);
    if (!taken.has(`${item.id}||`)) {
      const match = only(
        skus.filter((entry) =>
          entry.single ? entry.names[0] === name : entry.names[1] === name
        )
      );
      if (match) {
        rows.push({
          etablissement_id: etablissementId,
          item_id: item.id,
          group_id: null,
          choice_id: null,
          target: "sku",
          ref: match.sku.ref,
          option_list_name: null,
          hubrise_name: [match.sku.product, match.sku.name].filter(Boolean).join(" — "),
          matched_by: "auto",
        });
      }
    }
    for (const group of (item.options as unknown as OptionGroup[]) ?? []) {
      for (const choice of group.choices) {
        if (taken.has(`${item.id}|${group.id}|${choice.id}`)) continue;
        const choiceName = normalize(choice.name);
        const sameName = snapshot.options.filter(
          (option) => normalize(option.name) === choiceName
        );
        const match =
          only(sameName.filter((option) => normalize(option.listName) === normalize(group.name))) ??
          only(sameName);
        if (!match) continue;
        rows.push({
          etablissement_id: etablissementId,
          item_id: item.id,
          group_id: group.id,
          choice_id: choice.id,
          target: "option",
          ref: match.ref,
          option_list_name: match.listName,
          hubrise_name: `${match.listName} — ${match.name}`,
          matched_by: "auto",
        });
      }
    }
  }
  const formuleTaken = new Set((existingFormules ?? []).map((row) => row.formule_id));
  const formuleRows = (formules ?? []).flatMap((formule) => {
    if (formuleTaken.has(formule.id)) return [];
    const match = only(
      (snapshot.deals ?? []).filter((deal) => normalize(deal.name) === normalize(formule.name))
    );
    return match
      ? [
          {
            formule_id: formule.id,
            etablissement_id: etablissementId,
            ref: match.ref,
            hubrise_name: match.name,
            matched_by: "auto" as const,
          },
        ]
      : [];
  });

  const inserts = await Promise.all([
    rows.length ? admin.from("hubrise_ref_map").insert(rows) : null,
    formuleRows.length ? admin.from("hubrise_formule_map").insert(formuleRows) : null,
  ]);
  const error = inserts.find((insert) => insert?.error)?.error;
  if (error) throw new Error(error.message);
  return rows.length + formuleRows.length;
}

/** Relit le catalogue de la caisse, en garde l'instantané et relie ce qui peut l'être. */
export async function pullCatalog(admin: Admin, connection: Connection): Promise<void> {
  if (!connection.catalog_id) return;
  const catalog = await callHubrise<HubriseCatalog>(
    admin,
    connection,
    `/catalogs/${connection.catalog_id}`
  );
  const snapshot = toSnapshot(catalog);
  const { error } = await admin
    .from("hubrise_connections")
    .update({
      catalog_snapshot: snapshot as unknown as Json,
      catalog_name: catalog.name,
      catalog_synced_at: new Date().toISOString(),
      catalog_dirty_at: null,
    })
    .eq("etablissement_id", connection.etablissement_id);
  if (error) throw new Error(error.message);
  await autoMatch(admin, connection.etablissement_id, snapshot);
}
