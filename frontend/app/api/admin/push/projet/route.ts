import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { notifyStepEvent, type StepEvent } from "@/lib/admin/step-push";

/*
 * Ce qu'un changement du suivi fait sonner, appelé par l'admin après
 * l'écriture : une étape confiée à quelqu'un ou aux deux (prévenus), une
 * étape bloquée (l'autre le sait, avec la raison), une étape à deux faite
 * (l'autre le sait), un client dont la dernière étape vient d'être faite.
 * L'auteur du geste n'est jamais notifié.
 */

const EVENTS: readonly StepEvent[] = ["assigned", "blocked", "done"];

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as {
    stepId?: string;
    event?: StepEvent;
    note?: string;
  } | null;
  if (!body?.stepId || !body.event || !EVENTS.includes(body.event)) {
    return NextResponse.json({ error: "Étape ou évènement manquant." }, { status: 400 });
  }
  const found = await notifyStepEvent(body.stepId, body.event, auth.userId, body.note);
  if (!found) return NextResponse.json({ error: "Étape introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
