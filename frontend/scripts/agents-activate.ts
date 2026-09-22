/*
 * Active (ou suspend) l'agent d'un client Ominin Agents. L'inscription sur
 * agents.ominin.com est libre, mais un agent ne prospecte qu'une fois activé
 * ici : c'est ce qui garde le budget Claude / Google Places et la réputation
 * du client OAuth Google hors de portée d'un inconnu.
 *
 * N'écrit que agents_profiles.activated_at (le profil est créé vide s'il
 * n'existe pas encore). Réglages, boîte mail et historique ne sont pas
 * touchés.
 *
 * Usage, depuis frontend/ :
 *   npm run agents:activate -- client@exemple.fr          # activer
 *   npm run agents:activate -- client@exemple.fr --off    # suspendre
 * Lit ../backend/.env : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. L'hôte visé
 * est affiché avant l'écriture.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import { check } from "../lib/supabase/result";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manque — renseigne backend/.env.`);
  return value;
}

const url = required("SUPABASE_URL");
const db = createClient<Database>(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"))?.toLowerCase();
const off = args.includes("--off");

async function findUser(address: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page });
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => u.email?.toLowerCase() === address);
    if (user) return user;
    if (!data.nextPage) return null;
  }
}

async function main() {
  if (!email) throw new Error("Usage : npm run agents:activate -- <email> [--off]");
  console.log(`Base visée : ${new URL(url).host}`);

  const user = await findUser(email);
  if (!user) {
    throw new Error(`Aucun compte ${email} — le client doit d'abord s'inscrire sur agents.ominin.com.`);
  }

  check(
    await db
      .from("agents_profiles")
      .upsert(
        { user_id: user.id, activated_at: off ? null : new Date().toISOString() },
        { onConflict: "user_id" }
      )
  );
  console.log(off ? `Agent de ${email} suspendu.` : `Agent de ${email} activé.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
