import { NextResponse } from "next/server";
import { checkMetaAccount } from "@/lib/social/server";
import { requireAdmin } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Vérification de la connexion Meta, depuis /reseaux : chaque compte
 * Facebook et Instagram est interrogé avec son jeton enregistré. Les jetons
 * ne quittent pas le serveur ; le navigateur ne reçoit que le verdict.
 */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await createAdminClient()
    .from("social_accounts")
    .select("id, platform, external_id, social_tokens(access_token)")
    .in("platform", ["facebook", "instagram"]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = Object.fromEntries(
    await Promise.all(
      data.map(async (account) => {
        const token = account.social_tokens?.access_token;
        const problem =
          token && account.external_id
            ? await checkMetaAccount(
                account.platform as "facebook" | "instagram",
                account.external_id,
                token
              )
            : "Aucun jeton : actualise la connexion Meta.";
        return [account.id, problem] as const;
      })
    )
  );
  return NextResponse.json({ results });
}
