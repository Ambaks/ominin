/*
 * Accès à l'espace de gestion d'une boutique : crée le compte de la gérante
 * s'il n'existe pas, remet son mot de passe s'il existe déjà, et la rattache
 * à la boutique comme propriétaire.
 *
 * À la différence de `seed:shop`, qui supprime la boutique et la réinsère
 * — commandes comprises, donc à ne jamais lancer sur la production —, ce
 * script n'écrit que dans le compte et dans `shop_members`. Le catalogue,
 * les commandes et les réglages ne sont pas touchés.
 *
 * Usage, depuis frontend/ :  npm run shop:owner
 * Lit ../backend/.env : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SHOP_OWNER_PHONE, SHOP_OWNER_PASSWORD, et SHOP_SLUG (défaut « mybox »).
 * Il agit sur la base que SUPABASE_URL désigne : l'hôte visé est affiché
 * avant la première écriture.
 */

import { createClient } from "@supabase/supabase-js";
import { normalizePhone, phoneToLoginEmail } from "../lib/shop/phone";
import type { Database } from "../lib/supabase/database.types";
import { check } from "../lib/supabase/result";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manque — renseigne backend/.env.`);
  return value;
}

function requiredPhone(): string {
  const phone = normalizePhone(required("SHOP_OWNER_PHONE"));
  if (!phone) throw new Error("SHOP_OWNER_PHONE n'est pas un numéro valide.");
  return phone;
}

const url = required("SUPABASE_URL");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
const password = required("SHOP_OWNER_PASSWORD");
const phone = requiredPhone();
const slug = process.env.SHOP_SLUG ?? "mybox";

const db = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`Base visée : ${new URL(url).host} · boutique « ${slug} »`);

  const { data: shop, error: shopError } = await db
    .from("shops")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (shopError) throw new Error(shopError.message);
  if (!shop) throw new Error(`Aucune boutique « ${slug} » dans cette base.`);

  // L'adresse technique dérivée du numéro : Supabase exige un e-mail, le
  // numéro reste le seul identifiant que la gérante voit (lib/shop/phone.ts).
  const email = phoneToLoginEmail(phone);
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  const existing = list.users.find((user) => user.email === email) ?? null;

  let userId: string;
  if (existing) {
    const updated = await db.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updated.error) throw new Error(updated.error.message);
    userId = existing.id;
    console.log("Compte déjà présent : mot de passe remplacé.");
  } else {
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { product: "shop", phone },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Création du compte impossible.");
    }
    userId = created.data.user.id;
    console.log("Compte créé.");
  }

  check(
    await db
      .from("shop_members")
      .upsert(
        { user_id: userId, shop_id: shop.id, role: "proprietaire", email },
        { onConflict: "user_id,shop_id" }
      )
  );

  console.log(
    `✓ ${shop.name} : connexion sur /connexion avec le numéro ${phone}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
