import { NextResponse } from "next/server";
import {
  SQUARE_STATE_COOKIE,
  fetchLocations,
  getMerchantToken,
  requireGerant,
  squareAuthorizeUrl,
  withFreshToken,
} from "@/lib/square/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Connexion du compte marchand Square du restaurant (pendant Square de
 * /api/stripe/connect). GET → statut, et la liste des points de vente tant
 * qu'aucun n'est choisi. POST → URL d'autorisation OAuth, avec state
 * anti-CSRF posé en cookie httpOnly. Les jetons ne transitent jamais par le
 * navigateur.
 */

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const [{ data: account }, { data: etab }] = await Promise.all([
    admin
      .from("square_accounts")
      .select("merchant_id")
      .eq("etablissement_id", auth.etablissementId)
      .maybeSingle(),
    admin
      .from("etablissements")
      .select("square_location_id")
      .eq("id", auth.etablissementId)
      .single(),
  ]);
  if (!account) return NextResponse.json({ connected: false });

  const locationId = etab?.square_location_id ?? null;
  if (locationId) {
    return NextResponse.json({ connected: true, locationId });
  }

  // Point de vente pas encore désigné : le gérant doit choisir celui auquel
  // les QR codes appartiennent.
  try {
    const merchant = await getMerchantToken(admin, auth.etablissementId);
    if (!merchant) return NextResponse.json({ connected: false });
    const locations = await withFreshToken(
      admin,
      auth.etablissementId,
      merchant,
      fetchLocations
    );
    return NextResponse.json({ connected: true, locationId: null, locations });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[square] points de vente illisibles", {
      etablissementId: auth.etablissementId,
      message,
    });
    return NextResponse.json({ connected: true, locationId: null, locations: [] });
  }
}

export async function POST(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const requestUrl = new URL(request.url);
  const state = crypto.randomUUID();
  const response = NextResponse.json({ url: squareAuthorizeUrl(state) });
  response.cookies.set(SQUARE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: requestUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/square",
  });
  return response;
}

/** Choix du point de vente auquel les QR codes appartiennent. */
export async function PATCH(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { locationId } = (await request.json().catch(() => ({}))) as {
    locationId?: string;
  };
  if (!locationId) {
    return NextResponse.json(
      { error: "Point de vente manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const merchant = await getMerchantToken(admin, auth.etablissementId);
  if (!merchant) {
    return NextResponse.json({ error: "Compte Square non relié." }, { status: 409 });
  }

  // Le point de vente doit appartenir au marchand qui vient d'autoriser :
  // l'identifiant vient du navigateur, il se vérifie.
  const locations = await withFreshToken(
    admin,
    auth.etablissementId,
    merchant,
    fetchLocations
  );
  if (!locations.some((location) => location.id === locationId)) {
    return NextResponse.json(
      { error: "Point de vente inconnu de ce compte Square." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("etablissements")
    .update({ square_location_id: locationId })
    .eq("id", auth.etablissementId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ locationId });
}
