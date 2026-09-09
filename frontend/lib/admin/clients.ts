import { FEATURES } from "@/lib/gestion/constants";
import { planFeature, resolveFeatures } from "@/lib/gestion/permissions";
import type { ActiveProducts, Feature } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";
import { check, must } from "@/lib/supabase/result";

/*
 * Les clients d'Ominin — les établissements qui tournent, pas les prospects du
 * CRM. On les liste pour n'y faire qu'une chose : ouvrir et fermer des
 * capacités. L'offre donne le lot habituel, les réglages l'ajustent ; l'écran
 * montre les deux, sans quoi une case décochée serait indéchiffrable.
 */
export interface Client {
  id: string;
  name: string;
  slug: string;
  products: ActiveProducts;
  /** Écarts enregistrés à l'offre : seules les clés posées y figurent. */
  overrides: Partial<Record<Feature, boolean>>;
}

function isFeature(key: string): key is Feature {
  return (FEATURES as string[]).includes(key);
}

/** Le jsonb est libre : on ne garde que les clés qu'on sait interpréter. */
function toOverrides(features: unknown): Partial<Record<Feature, boolean>> {
  if (features == null || typeof features !== "object") return {};
  const overrides: Partial<Record<Feature, boolean>> = {};
  for (const [key, value] of Object.entries(features)) {
    if (typeof value === "boolean" && isFeature(key)) overrides[key] = value;
  }
  return overrides;
}

export async function fetchClients(): Promise<Client[]> {
  const supabase = createClient();
  const [etablissements, subscriptions, settings] = await Promise.all([
    supabase
      .from("etablissements")
      .select("id, name, slug, offre")
      .order("name", { ascending: true })
      .then(must),
    supabase
      .from("subscriptions")
      .select("etablissement_id, product, status")
      .then(must),
    supabase
      .from("etablissement_settings")
      .select("etablissement_id, features")
      .then(must),
  ]);

  const active = new Map<string, Set<string>>();
  for (const subscription of subscriptions) {
    if (subscription.status !== "active") continue;
    const products = active.get(subscription.etablissement_id) ?? new Set();
    products.add(subscription.product);
    active.set(subscription.etablissement_id, products);
  }
  const featuresById = new Map(
    settings.map((row) => [row.etablissement_id, toOverrides(row.features)])
  );

  return etablissements.map((etablissement) => {
    const products = active.get(etablissement.id);
    return {
      id: etablissement.id,
      name: etablissement.name,
      slug: etablissement.slug,
      products: {
        offre: products?.has("offre") ? etablissement.offre : null,
        collect: products?.has("collect") ?? false,
      },
      overrides: featuresById.get(etablissement.id) ?? {},
    };
  });
}

/**
 * Une capacité revient à son défaut quand elle vaut ce que l'offre en dit :
 * l'écart disparaît des réglages, et le client suivra ses évolutions.
 */
export function nextOverrides(
  client: Client,
  feature: Feature,
  open: boolean
): Partial<Record<Feature, boolean>> {
  const overrides = { ...client.overrides };
  if (open === planFeature(client.products, feature)) delete overrides[feature];
  else overrides[feature] = open;
  return overrides;
}

export function clientFeatures(client: Client): Record<Feature, boolean> {
  return resolveFeatures(client.products, client.overrides);
}

export async function saveOverrides(
  etablissementId: string,
  overrides: Partial<Record<Feature, boolean>>
): Promise<void> {
  check(
    await createClient()
      .from("etablissement_settings")
      .upsert(
        {
          etablissement_id: etablissementId,
          features: overrides,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "etablissement_id" }
      )
  );
}
