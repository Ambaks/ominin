import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GMAIL_STATE_COOKIE } from "@/lib/agents/constants";
import { exchangeCode, gmailProfile, revokeToken } from "@/lib/agents/google";
import { publicBase } from "@/lib/social/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Retour du consentement Google : vérifie le state, échange le code, lit
 * l'adresse et le curseur d'historique de la boîte, puis range la boîte
 * (agents_mailboxes, lisible par le client) et son jeton (table sans policy)
 * via le service_role. Une reconnexion remplace l'ancien jeton et efface
 * l'erreur qui l'avait rendue nécessaire.
 */
export async function GET(request: Request) {
  const back = (outcome: "ok" | "scopes" | "erreur") => {
    const response = NextResponse.redirect(
      `${publicBase(request)}${reglagesPath(request)}?gmail=${outcome}`
    );
    response.cookies.set(GMAIL_STATE_COOKIE, "", { maxAge: 0, path: "/api/agents/gmail" });
    return response;
  };

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = (await cookies()).get(GMAIL_STATE_COOKIE)?.value;
  if (!code || !state || state !== expected) return back("erreur");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return back("erreur");

  try {
    const grant = await exchangeCode(code, `${publicBase(request)}/api/agents/gmail/callback`);
    if (!grant.complete) {
      await revokeToken(grant.refreshToken);
      return back("scopes");
    }
    const profile = await gmailProfile(grant.accessToken);

    const admin = createAdminClient();
    const { error } = await admin.from("agents_mailboxes").upsert({
      user_id: user.id,
      email: profile.emailAddress,
      history_id: profile.historyId,
      error: null,
      connected_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    const { error: tokenError } = await admin.from("agents_mailbox_tokens").upsert({
      user_id: user.id,
      refresh_token: grant.refreshToken,
      updated_at: new Date().toISOString(),
    });
    if (tokenError) throw new Error(tokenError.message);
    return back("ok");
  } catch (error) {
    console.error("[agents] connexion Gmail impossible", {
      message: error instanceof Error ? error.message : String(error),
    });
    return back("erreur");
  }
}

/** Les réglages vivent à la racine du sous-domaine, sous /agents sinon. */
function reglagesPath(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const prefix = host === process.env.NEXT_PUBLIC_AGENTS_HOST ? "" : "/agents";
  return `${prefix}/espace/reglages`;
}
