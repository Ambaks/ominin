import { NextResponse } from "next/server";
import { TERMINAL_ONLINE_WINDOW_MS } from "@/lib/gestion/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Boîtiers Omilink annoncés mais pas encore rattachés, vus depuis la même
 * adresse publique que le navigateur du gérant — c'est-à-dire derrière la
 * même box que lui. En développement tout passe par localhost : le filtre
 * est levé.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const etablissementId = new URL(request.url).searchParams.get("etablissement_id");
  if (!etablissementId) {
    return NextResponse.json(
      { error: "Paramètre requis : etablissement_id." },
      { status: 400 }
    );
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    return NextResponse.json(
      { error: "Seul le gérant gère les terminaux." },
      { status: 403 }
    );
  }

  // Vercel pose x-forwarded-for ; la première valeur est le client réel.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  let query = createAdminClient()
    .from("omilink_enrollments")
    .select("serial, hostname, lan_ip, last_seen_at")
    .gte("last_seen_at", new Date(Date.now() - TERMINAL_ONLINE_WINDOW_MS).toISOString())
    .order("last_seen_at", { ascending: false });
  if (process.env.NODE_ENV !== "development") query = query.eq("public_ip", ip);

  const { data: devices, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ devices });
}
