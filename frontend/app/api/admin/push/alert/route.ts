import { NextResponse } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";

/*
 * Alerte venue d'ailleurs : un workflow GitHub en échec (X-Cron-Secret) ou
 * le backend Render (X-Agent-Secret : réponse chaude d'un prospect, run de
 * Léa ou de l'agent social en échec). La clé regroupe les répétitions.
 */

export async function POST(request: Request) {
  const cron = process.env.CRON_SECRET;
  const agent = process.env.AGENT_TRIGGER_SECRET;
  const fromCron = Boolean(cron) && request.headers.get("x-cron-secret") === cron;
  const fromBackend = Boolean(agent) && request.headers.get("x-agent-secret") === agent;
  if (!fromCron && !fromBackend) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    body?: string;
    key?: string;
    url?: string;
  } | null;
  if (!body?.title || !body.key) {
    return NextResponse.json({ error: "Titre et clé requis." }, { status: 400 });
  }
  const sent = await raiseAlert(fromCron ? "cron" : "backend", body.key, {
    title: body.title,
    body: body.body ?? "",
    url: body.url ?? "/projet",
  });
  return NextResponse.json({ sent });
}
