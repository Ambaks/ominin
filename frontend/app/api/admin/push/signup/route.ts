import { NextResponse } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Appelé par le parcours d'inscription juste après la création d'un
 * établissement ou d'une boutique. Rien ne vient du corps de la requête :
 * on retrouve, pour l'utilisateur connecté, ce qu'il vient de créer (moins
 * de 15 minutes), et chaque inscription n'est annoncée qu'une fois.
 */

const RECENT_MS = 15 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const since = new Date(Date.now() - RECENT_MS).toISOString();
  const db = createAdminClient();
  const [{ data: memberships }, { data: shopMembers }] = await Promise.all([
    db
      .from("memberships")
      .select("etablissements (id, name, created_at)")
      .eq("user_id", user.id),
    db.from("shop_members").select("shops (id, name, created_at)").eq("user_id", user.id),
  ]);

  const created = [
    ...(memberships ?? []).flatMap(({ etablissements: e }) =>
      e && e.created_at >= since
        ? [{ id: e.id, name: e.name, kind: "Menu", url: "/clients" }]
        : [],
    ),
    ...(shopMembers ?? []).flatMap(({ shops: s }) =>
      s && s.created_at >= since
        ? [{ id: s.id, name: s.name, kind: "Shop", url: "/shop/clients" }]
        : [],
    ),
  ];

  for (const place of created) {
    await raiseAlert("inscription", place.id, {
      title: `${place.name} s'est inscrit (${place.kind})`,
      body: user.email ?? "Sans e-mail",
      url: place.url,
    });
  }
  return NextResponse.json({ ok: true });
}
