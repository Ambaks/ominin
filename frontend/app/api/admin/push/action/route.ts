import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { notifyStepEvent, ownerOfUser } from "@/lib/admin/step-push";
import type { PushAction } from "@/lib/push/events";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Un bouton d'une notification du suivi (« Fait », « Je prends »,
 * « Débloquer »), appelé par le service worker avec la session de l'appareil.
 */

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as {
    stepId?: string;
    action?: PushAction;
  } | null;
  if (!body?.stepId || !body.action) {
    return NextResponse.json({ error: "Étape ou geste manquant." }, { status: 400 });
  }

  let patch: { status: "done" | "todo" } | { owner: string };
  if (body.action === "done") patch = { status: "done" };
  else if (body.action === "unblock") patch = { status: "todo" };
  else if (body.action === "take") {
    const owner = await ownerOfUser(auth.userId);
    if (!owner) return NextResponse.json({ error: "Appareil sans identité." }, { status: 400 });
    patch = { owner };
  } else {
    return NextResponse.json({ error: "Geste inconnu." }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("projet_steps")
    .update(patch)
    .eq("id", body.stepId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.action === "done") await notifyStepEvent(body.stepId, "done", auth.userId);
  return NextResponse.json({ ok: true });
}
