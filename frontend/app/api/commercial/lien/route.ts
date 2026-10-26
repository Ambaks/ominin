import { NextResponse, after } from "next/server";
import { normalizeEmail, sendAccessLink } from "@/lib/commercial/access";
import { clientIp, rateLimit } from "@/lib/rate-limit/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Nouveau lien de connexion à l'espace commercial. La réponse est la même, et
 * part aussi vite, que l'adresse soit invitée ou non : la recherche et
 * l'envoi se font après la réponse. Le plafond par adresse ne compte que les
 * vrais commerciaux, sans quoi n'importe qui pourrait épuiser les liens d'un
 * commercial en saisissant son adresse.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  const limited = await rateLimit("commercialLink", clientIp(request));
  if (limited) return limited;

  after(async () => {
    const admin = createAdminClient();
    const { data: commercial, error } = await admin
      .from("commerciaux")
      .select("id, email, user_id")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      console.error("[commercial] fiche illisible", { email, error: error.message });
      return;
    }
    if (!commercial || (await rateLimit("commercialLink", email))) return;
    try {
      await sendAccessLink(admin, commercial, "connexion");
    } catch (cause) {
      console.error("[commercial] lien de connexion non envoyé", { email, cause });
    }
  });
  return NextResponse.json({ ok: true });
}
