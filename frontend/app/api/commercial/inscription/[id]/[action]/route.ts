import { NextResponse } from "next/server";
import { HUBRISE_SIGNUP_COOKIE, HUBRISE_STATE_COOKIE, hubriseAuthorizeUrl } from "@/lib/hubrise/client";
import { HUBRISE } from "@/lib/hubrise/config";
import { SignupError, createSignupAccount, finishSignup, getSignup, signupProgress, type Signup } from "@/lib/commercial/signup";
import type { SignupAccountInput } from "@/lib/commercial/signup-form";
import { publicRequestOrigin } from "@/lib/request-origin";
import { commercialPrefix } from "@/lib/site";
import { connectOnboardingLink } from "@/lib/stripe/connect";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Les étapes du questionnaire d'inscription, autorisées par son jeton :
 *   compte    → compte du gérant, établissement, réponses, CGV
 *   stripe    → lien d'onboarding Stripe Connect, retour au questionnaire
 *   hubrise   → URL d'autorisation HubRise (le retour passe par /api/hubrise/callback)
 *   plus-tard → Stripe ou HubRise remis à plus tard
 *   photos    → une photo du menu
 *   fin       → Projet, Discord
 */

type Admin = ReturnType<typeof createAdminClient>;

function withEtablissement(signup: Signup): string {
  if (!signup.etablissement_id) throw new SignupError("Créez d’abord le compte du restaurant.", 409);
  return signup.etablissement_id;
}

async function act(action: string, request: Request, admin: Admin, signup: Signup): Promise<NextResponse> {
  const questionnaire = `${publicRequestOrigin(request)}${commercialPrefix}/inscription/${signup.id}`;
  switch (action) {
    case "compte": {
      const input = (await request.json().catch(() => null)) as SignupAccountInput | null;
      if (!input) throw new SignupError("Réponses manquantes.", 400);
      await createSignupAccount(admin, signup, input, request);
      return NextResponse.json({ ok: true });
    }
    case "stripe": {
      const etablissementId = withEtablissement(signup);
      const { data } = await admin.from("memberships").select("email").eq("etablissement_id", etablissementId).eq("role", "gerant").limit(1).single();
      const url = await connectOnboardingLink(admin, getStripe(), {
        etablissementId,
        email: data?.email,
        refreshUrl: `${questionnaire}?etape=stripe`,
        returnUrl: `${questionnaire}?etape=stripe`,
      });
      return NextResponse.json({ url });
    }
    case "hubrise": {
      withEtablissement(signup);
      const origin = publicRequestOrigin(request);
      const state = crypto.randomUUID();
      const response = NextResponse.json({ url: hubriseAuthorizeUrl(state, `${origin}/api/hubrise/callback`) });
      const cookie = { httpOnly: true, secure: origin.startsWith("https://"), sameSite: "lax" as const, maxAge: HUBRISE.oauthStateTtlS, path: "/api/hubrise" };
      response.cookies.set(HUBRISE_STATE_COOKIE, state, cookie);
      response.cookies.set(HUBRISE_SIGNUP_COOKIE, signup.id, cookie);
      return response;
    }
    case "plus-tard": {
      const { step } = (await request.json().catch(() => ({}))) as { step?: string };
      if (step !== "stripe" && step !== "hubrise") throw new SignupError("Étape inconnue.", 400);
      const { error } = await admin.from("commercial_signups").update(step === "stripe" ? { stripe_later: true } : { hubrise_later: true }).eq("id", signup.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    case "photos": {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File) || !file.type.startsWith("image/")) throw new SignupError("Photo manquante.", 400);
      // Dans le dossier du commercial : il la relit, comme l'admin.
      const path = `${signup.commercial_id}/inscriptions/${signup.id}/${crypto.randomUUID()}`;
      const { error } = await admin.storage.from("commercial-docs").upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const { error: rowError } = await admin.from("commercial_signups").update({ photos: [...signup.photos, path] }).eq("id", signup.id);
      if (rowError) throw new Error(rowError.message);
      return NextResponse.json({ ok: true });
    }
    case "fin": {
      await finishSignup(admin, signup, await signupProgress(admin, getStripe(), signup));
      return NextResponse.json({ ok: true });
    }
    default:
      throw new SignupError("Étape inconnue.", 404);
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/commercial/inscription/[id]/[action]">) {
  const { id, action } = await params;
  const admin = createAdminClient();
  try {
    const signup = await getSignup(admin, id);
    if (signup.finished_at) throw new SignupError("Cette inscription est terminée.", 409);
    return await act(action, request, admin, signup);
  } catch (cause) {
    if (cause instanceof SignupError) return NextResponse.json({ error: cause.message }, { status: cause.status });
    console.error("[inscription]", action, cause);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 500 });
  }
}
