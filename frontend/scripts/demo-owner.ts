/*
 * Le compte gérant d'une démonstration (club-demo, bulles-demo) : créé s'il
 * manque, son mot de passe rétabli sinon, et gérant de l'établissement de
 * démo — jamais d'un vrai client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import { check } from "../lib/supabase/result";

export async function ensureDemoOwner(
  db: SupabaseClient<Database>,
  etablissementId: string,
  owner: { email: string; password: string; displayName: string }
) {
  const { email, password, displayName } = owner;
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  let user = list.users.find((candidate) => candidate.email === email);
  if (user) {
    const updated = await db.auth.admin.updateUserById(user.id, { password });
    if (updated.error) throw new Error(updated.error.message);
  } else {
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { visites: [] },
    });
    if (created.error) throw new Error(created.error.message);
    user = created.data.user;
  }
  check(
    await db.from("memberships").upsert(
      {
        user_id: user.id,
        etablissement_id: etablissementId,
        role: "gerant",
        email,
        display_name: displayName,
      },
      { onConflict: "user_id,etablissement_id" }
    )
  );
}
