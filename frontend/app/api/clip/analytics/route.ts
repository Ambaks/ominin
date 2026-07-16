import { NextResponse } from "next/server";
import { clipProvider } from "@/lib/clip/provider";
import { providerUnavailable, requireClipUser } from "@/lib/clip/server";

/*
 * Analytics par plateforme, agrégées par le prestataire depuis les comptes
 * connectés. Lues à la demande (bouton Actualiser côté client) — pas de
 * snapshot local tant que l'historique du prestataire suffit.
 */
export async function GET() {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const { data: profile } = await supabase
    .from("clip_profiles")
    .select("provider_username")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ analytics: [] });

  try {
    const accounts = await clipProvider.listConnectedAccounts(
      profile.provider_username
    );
    const analytics = await clipProvider.getAnalytics(
      profile.provider_username,
      accounts.map((account) => account.platform)
    );
    return NextResponse.json({ analytics });
  } catch (cause) {
    return providerUnavailable(cause);
  }
}
