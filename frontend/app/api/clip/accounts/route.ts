import { NextResponse } from "next/server";
import { clipProvider } from "@/lib/clip/provider";
import { providerUnavailable, requireClipUser } from "@/lib/clip/server";

/*
 * Comptes sociaux connectés, lus en direct chez le prestataire (pas de table
 * locale à synchroniser — l'état reauth_required reste toujours frais).
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
  // Pas encore de profil : aucun compte, ce n'est pas une erreur.
  if (!profile) return NextResponse.json({ accounts: [] });

  try {
    const accounts = await clipProvider.listConnectedAccounts(
      profile.provider_username
    );
    return NextResponse.json({ accounts });
  } catch (cause) {
    return providerUnavailable(cause);
  }
}
