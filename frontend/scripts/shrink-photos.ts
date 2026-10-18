/*
 * Ré-encode les photos de plats déjà en ligne au format des nouveaux envois
 * (lib/gestion/photo.ts) : WebP, PHOTO_MAX_EDGE px de grand côté. Chaque
 * visiteur du menu les télécharge, leur poids pèse sur l'egress Supabase.
 *
 * Chaque photo référencée par items.image est réécrite à côté de
 * l'originale (<uuid>.webp), puis les plats pointent vers la nouvelle URL.
 * Les originaux restent dans le bucket : rien n'est supprimé.
 *
 * Usage, depuis frontend/ :  npm run photos:shrink            (aperçu)
 *                            npm run photos:shrink -- --apply (écrit)
 * Lit ../backend/.env : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. L'hôte visé
 * est affiché avant tout.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { PHOTO_MAX_EDGE, PHOTO_QUALITY } from "../lib/gestion/photo";
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
const bucket = db.storage.from("photos");
const prefix = bucket.getPublicUrl("").data.publicUrl;
const apply = process.argv.includes("--apply");

async function main() {
  console.log(`Base visée : ${new URL(url).host} · ${apply ? "ÉCRITURE" : "aperçu"}`);

  const items = must(
    await db.from("items").select("image").like("image", `${prefix}%`)
  );
  const urls = [...new Set(items.map((item) => item.image!))].filter(
    (image) => !image.endsWith(".webp")
  );

  let before = 0;
  let after = 0;
  for (const oldUrl of urls) {
    const path = oldUrl.slice(prefix.length);
    const original = Buffer.from(await must(await bucket.download(path)).arrayBuffer());
    const webp = await sharp(original)
      .rotate()
      .resize(PHOTO_MAX_EDGE, PHOTO_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: Math.round(PHOTO_QUALITY * 100) })
      .toBuffer();
    before += original.length;
    after += webp.length;
    console.log(
      `${path} : ${Math.round(original.length / 1e3)} → ${Math.round(webp.length / 1e3)} Ko`
    );
    if (!apply) continue;

    const newPath = path.replace(/\.\w+$/, ".webp");
    check(
      await bucket.upload(newPath, webp, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      })
    );
    check(
      await db
        .from("items")
        .update({ image: bucket.getPublicUrl(newPath).data.publicUrl })
        .eq("image", oldUrl)
    );
  }

  console.log(
    `${urls.length} photos : ${Math.round(before / 1e3)} → ${Math.round(after / 1e3)} Ko` +
      (apply ? "" : " (aperçu, relancer avec --apply pour écrire)")
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
