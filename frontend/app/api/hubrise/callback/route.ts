import { after, NextResponse } from "next/server";
import { exchangeCode, HUBRISE_STATE_COOKIE } from "@/lib/hubrise/client";
import { getConnection } from "@/lib/hubrise/connection";
import { releaseBlocked } from "@/lib/hubrise/outbox";
import { kickHubrise, registerCallback, syncAll } from "@/lib/hubrise/sync";
import { publicRequestOrigin } from "@/lib/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGerant } from "@/lib/supabase/gerant";

/*
 * Retour du flux OAuth HubRise : vérifie le state (cookie posé par
 * /api/hubrise/connect), échange le code, range le jeton dans
 * hubrise_connections (service_role — aucune policy), inscrit nos callbacks
 * et lance la première lecture (horaires, catalogue, stocks). Reconnecter un
 * lieu déjà relié garde les réglages de la caisse et relâche les envois
 * bloqués par le 401.
 */

function stateCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === HUBRISE_STATE_COOKIE) return rest.join("=");
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const base = publicRequestOrigin(request);
  const back = (outcome: string, detail?: string) => {
    const url = new URL("/gestion/etablissement", base);
    url.searchParams.set("hubrise", outcome);
    if (detail) url.searchParams.set("hubrise_error", detail);
    const response = NextResponse.redirect(url);
    response.cookies.set(HUBRISE_STATE_COOKIE, "", { maxAge: 0, path: "/api/hubrise" });
    return response;
  };

  if (searchParams.get("error")) {
    console.error("[hubrise] autorisation refusée", { error: searchParams.get("error") });
    return back("erreur", "autorisation_refusee");
  }
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = stateCookie(request);
  if (!code || !state || state !== cookieState) {
    return back("erreur", "session_invalide");
  }
  const auth = await requireGerant();
  if ("error" in auth) return back("erreur", "session_gerant");

  try {
    const tokens = await exchangeCode(code);
    const admin = createAdminClient();
    const { error } = await admin.from("hubrise_connections").upsert({
      etablissement_id: auth.etablissementId,
      access_token: tokens.access_token,
      account_id: tokens.account_id,
      location_id: tokens.location_id,
      catalog_id: tokens.catalog_id ?? null,
      customer_list_id: tokens.customer_list_id ?? null,
      account_name: tokens.account_name ?? null,
      location_name: tokens.location_name ?? null,
      catalog_name: tokens.catalog_name ?? null,
      customer_list_name: tokens.customer_list_name ?? null,
      connected_at: new Date().toISOString(),
      last_failed_at: null,
    });
    if (error) throw new Error(error.message);

    const connection = await getConnection(admin, auth.etablissementId);
    if (!connection) throw new Error("Connexion introuvable après enregistrement.");
    await registerCallback(admin, connection, `${base}/api/hubrise/webhook`);
    await releaseBlocked(admin, auth.etablissementId);
    kickHubrise();
    after(async () => {
      await syncAll(admin, connection);
    });
    return back("retour");
  } catch (error) {
    console.error("[hubrise] connexion impossible", {
      etablissementId: auth.etablissementId,
      message: error instanceof Error ? error.message : String(error),
    });
    return back("erreur", "configuration");
  }
}
