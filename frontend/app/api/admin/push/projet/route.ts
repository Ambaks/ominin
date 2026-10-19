import { NextResponse } from "next/server";
import { ASSIGNEE_LABELS, isAssignee, OWNERS, ownersOf } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { requireAdmin } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Ce qu'un changement du suivi fait sonner, appelé par l'admin après
 * l'écriture : une étape confiée à quelqu'un ou aux deux (prévenus), une étape
 * bloquée (les deux le sont), un client dont la dernière étape vient d'être
 * faite (les deux). L'auteur du geste n'est jamais notifié.
 */

type ProjetEvent = "assigned" | "blocked" | "done";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as {
    stepId?: string;
    event?: ProjetEvent;
  } | null;
  if (!body?.stepId || !body.event) {
    return NextResponse.json({ error: "Étape ou évènement manquant." }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: step } = await db
    .from("projet_steps")
    .select("title, owner, status, client_id, projet_clients (name), projet_chantiers (title)")
    .eq("id", body.stepId)
    .maybeSingle();
  if (!step) return NextResponse.json({ error: "Étape introuvable." }, { status: 404 });

  const where = step.projet_clients?.name ?? step.projet_chantiers?.title ?? "Projet";
  const url = step.client_id ? `/projet/${step.client_id}` : "/projet";

  if (body.event === "assigned" && isAssignee(step.owner)) {
    await notifyOwners(
      ownersOf(step.owner),
      {
        title: `${step.owner === "both" ? "À faire à deux" : `Pour toi, ${ASSIGNEE_LABELS[step.owner]}`} · ${where}`,
        body: step.title,
        tag: `etape-${body.stepId}`,
        url,
      },
      auth.userId,
    );
  } else if (body.event === "blocked" && step.status === "blocked") {
    await notifyOwners(
      OWNERS,
      { title: `Bloqué · ${where}`, body: step.title, tag: `etape-${body.stepId}`, url },
      auth.userId,
    );
  } else if (body.event === "done" && step.client_id) {
    const { count } = await db
      .from("projet_steps")
      .select("id", { count: "exact", head: true })
      .eq("client_id", step.client_id)
      .neq("status", "done");
    if (count === 0) {
      await notifyOwners(
        OWNERS,
        {
          title: `${where} est interfacé de bout en bout`,
          body: "Toutes les étapes de sa pipeline sont faites.",
          tag: `client-${step.client_id}`,
          url,
        },
        auth.userId,
      );
    }
  }
  return NextResponse.json({ ok: true });
}
