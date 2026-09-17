import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  META_STATE_COOKIE,
  adminUrl,
  fetchPages,
  publicBase,
  requireAdmin,
} from "@/lib/social/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Retour du flux OAuth Meta : vérifie le state, récupère les Pages
 * administrées et leurs comptes Instagram, et les range dans social_accounts
 * (jetons dans social_tokens, table sans policy). Un compte déjà connu garde
 * sa marque et son état : seuls son nom et son jeton sont rafraîchis. Un
 * compte nouveau arrive sans marque — l'admin le rattache dans /reseaux.
 */
export async function GET(request: Request) {
  const back = (outcome: string) => {
    const response = NextResponse.redirect(
      adminUrl(request, `/reseaux?meta=${outcome}`)
    );
    response.cookies.set(META_STATE_COOKIE, "", {
      maxAge: 0,
      path: "/api/social/meta",
    });
    return response;
  };

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = (await cookies()).get(META_STATE_COOKIE)?.value;
  if (!code || !state || state !== expected) return back("erreur");

  const auth = await requireAdmin();
  if ("error" in auth) return back("erreur");

  try {
    const pages = await fetchPages(
      code,
      `${publicBase(request)}/api/social/meta/callback`
    );
    const discovered = pages.flatMap((page) => [
      {
        platform: "facebook",
        external_id: page.id,
        handle: page.name,
        token: page.access_token,
      },
      ...(page.instagram_business_account
        ? [
            {
              platform: "instagram",
              external_id: page.instagram_business_account.id,
              handle: page.instagram_business_account.username,
              token: page.access_token,
            },
          ]
        : []),
    ]);
    if (discovered.length === 0) return back("vide");

    const admin = createAdminClient();
    const { data: accounts, error } = await admin
      .from("social_accounts")
      .upsert(
        discovered.map(({ platform, external_id, handle }) => ({
          platform,
          external_id,
          handle,
        })),
        { onConflict: "platform,external_id" }
      )
      .select("id, platform, external_id");
    if (error) throw new Error(error.message);

    const tokenOf = new Map(
      discovered.map((d) => [`${d.platform}:${d.external_id}`, d.token])
    );
    const { error: tokenError } = await admin.from("social_tokens").upsert(
      accounts.map((account) => ({
        account_id: account.id,
        access_token: tokenOf.get(`${account.platform}:${account.external_id}`)!,
        updated_at: new Date().toISOString(),
      }))
    );
    if (tokenError) throw new Error(tokenError.message);
    return back("ok");
  } catch (error) {
    console.error("[social] connexion Meta impossible", {
      message: error instanceof Error ? error.message : String(error),
    });
    return back("erreur");
  }
}
