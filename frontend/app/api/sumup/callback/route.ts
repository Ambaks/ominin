import { NextResponse } from "next/server";
import {
  SUMUP_STATE_COOKIE,
  exchangeCode,
  fetchMerchantCode,
  requireGerant,
  upsertSumUpAccount,
} from "@/lib/sumup/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Retour du flux OAuth SumUp : vérifie le state (cookie posé par
 * /api/sumup/connect), échange le code, retrouve le code marchand et range
 * les jetons dans sumup_accounts (service_role — la table n'a aucune policy).
 * Relier son compte vaut choix du fournisseur : payment_provider passe à
 * 'sumup' s'il n'était pas encore décidé.
 */

function stateCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SUMUP_STATE_COOKIE) return rest.join("=");
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams, protocol } = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = `${protocol}//${host}`;
  const fail = () =>
    NextResponse.redirect(`${base}/gestion/etablissement?sumup=erreur`);

  const clearState = (response: NextResponse) => {
    response.cookies.set(SUMUP_STATE_COOKIE, "", {
      maxAge: 0,
      path: "/api/sumup",
    });
    return response;
  };

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || state !== stateCookie(request)) {
    return clearState(fail());
  }

  const auth = await requireGerant();
  if ("error" in auth) return clearState(fail());

  try {
    const tokens = await exchangeCode(code, `${base}/api/sumup/callback`);
    const merchantCode = await fetchMerchantCode(tokens.access_token);
    const admin = createAdminClient();
    const { error } = await upsertSumUpAccount(
      admin,
      auth.etablissementId,
      merchantCode,
      tokens
    );
    if (error) throw new Error(error.message);

    await admin
      .from("etablissements")
      .update({ payment_provider: "sumup" })
      .eq("id", auth.etablissementId)
      .is("payment_provider", null);
  } catch {
    return clearState(fail());
  }

  return clearState(
    NextResponse.redirect(`${base}/gestion/etablissement?sumup=retour`)
  );
}
