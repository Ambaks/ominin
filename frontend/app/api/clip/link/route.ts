import { NextResponse } from "next/server";
import { clipProvider } from "@/lib/clip/provider";
import { providerUnavailable, requireClipUser } from "@/lib/clip/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Prépare la connexion des comptes sociaux : garantit le profil chez le
 * prestataire (provider_username = uuid du user) puis renvoie l'URL de sa
 * page de liaison hébergée, qui redirige vers /espace/comptes une fois fait.
 */
export async function POST(request: Request) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Upsert service_role : clip_profiles n'a pas de policy d'écriture.
  const admin = createAdminClient();
  const { error } = await admin
    .from("clip_profiles")
    .upsert(
      { user_id: user.id, provider_username: user.id },
      { onConflict: "user_id" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Host public réel : /api n'est pas réécrit par le proxy, mais request.url
  // peut porter le host interne (même précaution que app/auth/callback).
  const { protocol, origin } = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = host ? `${protocol}//${host}` : origin;

  try {
    await clipProvider.ensureProfile(user.id);
    const url = await clipProvider.createLinkUrl(
      user.id,
      `${base}/espace/comptes`
    );
    return NextResponse.json({ url });
  } catch (cause) {
    return providerUnavailable(cause);
  }
}
