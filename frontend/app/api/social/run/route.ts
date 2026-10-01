import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/social/server";

/*
 * Lancement à la main des deux jobs de l'agent social, depuis /reseaux.
 * Le backend exige le secret partagé des crons (X-Agent-Secret) : il ne
 * quitte jamais le serveur, le navigateur ne fait que demander le run.
 */

const JOB_PATHS = {
  social_post: "social-post",
  social_research: "social-research",
} as const;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { job } = (await request.json().catch(() => ({}))) as { job?: string };
  if (!job || !(job in JOB_PATHS)) {
    return NextResponse.json({ error: "Job inconnu." }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL;
  const secret = process.env.AGENT_TRIGGER_SECRET;
  if (!backendUrl || !secret) {
    return NextResponse.json(
      { error: "BACKEND_URL / AGENT_TRIGGER_SECRET manquants sur Vercel." },
      { status: 500 }
    );
  }

  // Render (offre gratuite) peut être endormi : le premier appel le réveille,
  // ce qui prend jusqu'à une minute avant la réponse 202.
  const response = await fetch(
    `${backendUrl}/agent/${JOB_PATHS[job as keyof typeof JOB_PATHS]}`,
    { method: "POST", headers: { "X-Agent-Secret": secret } }
  ).catch(() => null);

  if (response?.status === 409) {
    return NextResponse.json(
      { error: "Un run de ce type tourne déjà." },
      { status: 409 }
    );
  }
  if (!response?.ok) {
    return NextResponse.json(
      { error: `Backend injoignable (${response?.status ?? "réseau"}).` },
      { status: 502 }
    );
  }
  return NextResponse.json(await response.json(), { status: 202 });
}
