import { NextResponse } from "next/server";
import { TOKEN_REFRESH_LEAD_DAYS, refreshAccount } from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Renouvellement quotidien des jetons Square (workflow square-refresh.yml).
 * Un jeton d'accès Square vit 30 jours : sans ce passage, un restaurant
 * cesserait d'encaisser sans cause visible — le pire des symptômes, parce
 * qu'il ne se voit que quand un client est déjà devant l'addition.
 *
 * Le rafraîchissement à l'usage (getMerchantToken) reste la seconde
 * ceinture ; celui-ci couvre les comptes sans commande par carte depuis
 * longtemps, précisément ceux que l'usage ne sauverait pas.
 */

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const deadline = new Date(
    Date.now() + TOKEN_REFRESH_LEAD_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const admin = createAdminClient();
  const { data: accounts, error } = await admin
    .from("square_accounts")
    .select("etablissement_id, refresh_token")
    .lt("access_token_expires_at", deadline);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const failed: string[] = [];
  let refreshed = 0;
  // En série : quelques comptes, et un renouvellement écrit en base à chaque
  // fois — rien à gagner à les paralléliser, du bruit à y perdre.
  for (const account of accounts ?? []) {
    try {
      await refreshAccount(admin, account.etablissement_id, account);
      refreshed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[square] renouvellement du jeton impossible", {
        etablissementId: account.etablissement_id,
        message,
      });
      failed.push(account.etablissement_id);
    }
  }

  return NextResponse.json({ refreshed, failed });
}
