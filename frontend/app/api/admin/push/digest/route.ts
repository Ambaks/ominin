import { NextResponse } from "next/server";
import { OWNER_LABELS, OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le point du matin (workflow admin-digest) : à chacun, ce qui l'attend dans
 * le suivi — en cours, bloqué, à faire — et la prochaine étape. Rien n'est
 * envoyé à qui n'a rien d'ouvert.
 */

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const { data: steps, error } = await createAdminClient()
    .from("projet_steps")
    .select("title, owner, status, position, projet_clients (name), projet_chantiers (title)")
    .in("owner", OWNERS)
    .neq("status", "done")
    .order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sent: Record<string, number> = {};
  for (const owner of OWNERS) {
    const mine = steps.filter((step) => step.owner === owner);
    if (!mine.length) continue;
    const count = (status: string) => mine.filter((step) => step.status === status).length;
    // En cours d'abord, puis bloqué, puis à faire.
    const next =
      mine.find((step) => step.status === "doing") ??
      mine.find((step) => step.status === "blocked") ??
      mine[0];
    const where = next.projet_clients?.name ?? next.projet_chantiers?.title ?? "";
    const parts = [
      count("doing") && `${count("doing")} en cours`,
      count("blocked") && `${count("blocked")} bloquée${count("blocked") > 1 ? "s" : ""}`,
      count("todo") && `${count("todo")} à faire`,
    ].filter(Boolean);
    await notifyOwners([owner], {
      title: `Bonjour ${OWNER_LABELS[owner]} · ${parts.join(" · ")}`,
      body: `Prochaine : ${next.title}${where ? ` (${where})` : ""}`,
      tag: "point-du-matin",
      url: "/projet",
    });
    sent[owner] = mine.length;
  }
  return NextResponse.json({ sent });
}
