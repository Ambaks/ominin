/*
 * Émet le lien gérant d'un établissement déjà en base : le propriétaire
 * l'ouvre, crée son compte (ou se connecte) et devient gérant
 * (app/menu/rejoindre). Le lien sert une fois ; un seul reste vivant par
 * établissement, en émettre un nouveau révoque le précédent.
 *
 * N'écrit que dans gerant_links. Carte, commandes et comptes ne sont pas
 * touchés.
 *
 * Usage, depuis frontend/ :  npm run menu:gerant -- <slug>
 * Lit ../backend/.env : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. L'hôte visé
 * est affiché avant l'écriture.
 */

import { createClient } from "@supabase/supabase-js";
import { menuSiteUrl } from "../lib/site";
import type { Database } from "../lib/supabase/database.types";
import { check, must } from "../lib/supabase/result";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manque — renseigne backend/.env.`);
  return value;
}

const url = required("SUPABASE_URL");
const db = createClient<Database>(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const slug = process.argv[2];

async function main() {
  if (!slug) throw new Error("Usage : npm run menu:gerant -- <slug>");
  console.log(`Base visée : ${new URL(url).host} · établissement « ${slug} »`);

  const { data: etablissement, error } = await db
    .from("etablissements")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!etablissement) throw new Error(`Aucun établissement « ${slug} » dans cette base.`);

  check(
    await db.from("gerant_links").delete().eq("etablissement_id", etablissement.id)
  );
  const { token } = must(
    await db
      .from("gerant_links")
      .insert({ etablissement_id: etablissement.id })
      .select("token")
      .single()
  );

  console.log(`✓ ${etablissement.name} : ${menuSiteUrl}/rejoindre/${token}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
