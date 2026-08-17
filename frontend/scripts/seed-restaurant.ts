/*
 * Insère un restaurant du registre statique (lib/menu-data) dans Supabase —
 * démo client sur le vrai produit menu (/m/<slug>), commandes à table
 * comprises (offre connect, paiement au comptoir).
 *
 * Usage, depuis frontend/ :
 *   npm run seed:restaurant -- <slug> [email mot-de-passe]
 * email + mot de passe (optionnels, vont ensemble) créent le compte gérant
 * de démo pour l'espace de gestion. Lit SUPABASE_URL et
 * SUPABASE_SERVICE_ROLE_KEY depuis ../backend/.env (clé service_role : le
 * script bypasse RLS, ne jamais l'exposer au front).
 *
 * Idempotent : l'établissement existant est purgé puis réinséré (cascade sur
 * les tables filles, memberships comprises) ; le compte auth est réutilisé
 * s'il existe déjà.
 */

import { createClient } from "@supabase/supabase-js";
import { SEED_TABLE_COUNT } from "../lib/gestion/constants";
import { getRestaurant } from "../lib/menu-data";
import type { Database, Json, TablesInsert } from "../lib/supabase/database.types";
import { must } from "../lib/supabase/result";

const [slug, email, password] = process.argv.slice(2);
const restaurant = slug ? getRestaurant(slug) : undefined;
if (!restaurant) {
  throw new Error(
    "Usage : npm run seed:restaurant -- <slug> [email mot-de-passe] — " +
      "le slug doit exister dans le registre lib/menu-data."
  );
}
if (Boolean(email) !== Boolean(password)) {
  throw new Error("email et mot de passe vont ensemble (les deux ou aucun).");
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent — renseigne backend/.env."
  );
}

const db = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
});

const toJson = (value: unknown): Json => value as Json;

async function main() {
  // Purge de la version précédente (cascade sur toutes les tables filles).
  const { error: purgeError } = await db
    .from("etablissements")
    .delete()
    .eq("slug", restaurant!.slug);
  if (purgeError) throw new Error(purgeError.message);

  const etab = must(
    await db
      .from("etablissements")
      .insert({
        slug: restaurant!.slug,
        name: restaurant!.name,
        tagline: restaurant!.tagline,
        address: restaurant!.address,
        phone: restaurant!.phone,
        hours: restaurant!.hours,
        offre: "connect",
        cover_image: restaurant!.coverImage ?? null,
      })
      .select("id")
      .single()
  );

  // La démo reste utilisable sans passer par Stripe.
  const { error: subscriptionError } = await db.from("subscriptions").insert({
    etablissement_id: etab.id,
    status: "active",
  });
  if (subscriptionError) throw new Error(subscriptionError.message);

  const categories = must(
    await db
      .from("categories")
      .insert(
        restaurant!.categories.map((category, position) => ({
          etablissement_id: etab.id,
          name: category.name,
          tagline: category.tagline ?? null,
          position,
        }))
      )
      .select("id")
  );

  const itemSeeds = restaurant!.categories.flatMap((category, i) =>
    category.items.map((item) => ({ categoryId: categories[i].id, item }))
  );
  const items = must(
    await db
      .from("items")
      .insert(
        itemSeeds.map(({ categoryId, item }): TablesInsert<"items"> => ({
          etablissement_id: etab.id,
          category_id: categoryId,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          image: item.image ?? null,
          badges: item.badges ?? [],
          pairing: item.pairing ?? null,
          detail: item.detail ?? null,
          disponible: item.disponible ?? true,
          stock: item.stock ?? null,
          options: toJson(item.options ?? []),
        }))
      )
      .select("id")
  );

  const tables = must(
    await db
      .from("tables")
      .insert(
        Array.from({ length: SEED_TABLE_COUNT }, (_, i) => ({
          etablissement_id: etab.id,
          number: i + 1,
        }))
      )
      .select("id")
  );

  let accountNote = "sans compte de gestion";
  if (email && password) {
    // Compte gérant de démo — réutilisé s'il existe déjà.
    const { data: created, error: userError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    let userId = created?.user?.id;
    if (!userId) {
      const { data: list, error: listError } = await db.auth.admin.listUsers();
      if (listError) throw new Error(listError.message);
      userId = list.users.find((user) => user.email === email)?.id;
      if (!userId) {
        throw new Error(
          `Création du compte impossible : ${userError?.message ?? "inconnu"}`
        );
      }
    }
    const { error: memberError } = await db.from("memberships").insert({
      user_id: userId,
      email,
      etablissement_id: etab.id,
      role: "gerant",
    });
    if (memberError) throw new Error(memberError.message);
    accountNote = `compte gérant : ${email}`;
  }

  console.log(
    `« ${restaurant!.name} » inséré (offre connect) : ${categories.length} catégories, ` +
      `${items.length} plats, ${tables.length} tables — ${accountNote}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
