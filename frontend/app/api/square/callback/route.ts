import { NextResponse } from "next/server";
import {
  SQUARE_STATE_COOKIE,
  exchangeCode,
  fetchLocations,
  requireGerant,
  upsertSquareAccount,
} from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Retour du flux OAuth Square : vérifie le state (cookie posé par
 * /api/square/connect), échange le code et range les jetons dans
 * square_accounts (service_role — la table n'a aucune policy). Relier son
 * compte vaut choix du fournisseur : payment_provider passe à 'square' s'il
 * n'était pas encore décidé.
 *
 * Un compte mono-site voit son point de vente choisi d'office ; un compte
 * multi-sites revient sur ?square=lieu, où le gérant désigne celui auquel les
 * QR codes appartiennent.
 */

function stateCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SQUARE_STATE_COOKIE) return rest.join("=");
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams, protocol } = new URL(request.url);
  // Host public réel : request.url peut porter le host interne (routage Vercel).
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = `${protocol}//${host}`;
  const back = (outcome: string) =>
    NextResponse.redirect(`${base}/gestion/etablissement?square=${outcome}`);

  const clearState = (response: NextResponse) => {
    response.cookies.set(SQUARE_STATE_COOKIE, "", {
      maxAge: 0,
      path: "/api/square",
    });
    return response;
  };

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || state !== stateCookie(request)) {
    return clearState(back("erreur"));
  }

  const auth = await requireGerant();
  if ("error" in auth) return clearState(back("erreur"));

  try {
    const tokens = await exchangeCode(code, `${base}/api/square/callback`);
    const admin = createAdminClient();
    const { error } = await upsertSquareAccount(
      admin,
      auth.etablissementId,
      tokens
    );
    if (error) throw new Error(error.message);

    // Relier son compte vaut choix du fournisseur. La carte est coupée le
    // temps de la bascule : tant qu'aucun point de vente n'est désigné,
    // Square ne peut pas encaisser — et la garde en base refuserait de
    // toute façon un online_payment sans encaisseur capable. Le panneau de
    // gestion la rallume dès que le compte est opérationnel.
    await admin
      .from("etablissements")
      .update({ payment_provider: "square", online_payment: false })
      .eq("id", auth.etablissementId)
      .is("payment_provider", null);

    const locations = await fetchLocations(tokens.access_token);
    if (locations.length === 1) {
      const { error: locationError } = await admin
        .from("etablissements")
        .update({ square_location_id: locations[0].id })
        .eq("id", auth.etablissementId);
      if (locationError) throw new Error(locationError.message);
      return clearState(back("retour"));
    }
    return clearState(back("lieu"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[square] connexion du compte marchand impossible", {
      etablissementId: auth.etablissementId,
      message,
    });
    return clearState(back("erreur"));
  }
}
