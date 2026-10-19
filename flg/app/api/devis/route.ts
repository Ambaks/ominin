import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";
import { clientTypes, maxLength, projectTypes, rateLimit, surfaceRanges, timings } from "@/lib/devis";

const FIELDS = ["client", "type", "surface", "delai", "nom", "ville", "email", "telephone", "message", "site"] as const;
type Payload = Partial<Record<(typeof FIELDS)[number], string>>;

// Mémoire d'instance : un garde-fou contre les envois en boucle, pas un quota
// global (chaque instance serverless a la sienne).
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  for (const [key, times] of hits) if (now - times[times.length - 1] > rateLimit.windowMs) hits.delete(key);
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < rateLimit.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > rateLimit.max;
}

function sameOrigin(origin: string | null, host: string | null) {
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const oneOf = (list: readonly string[], v?: string) => !v || list.includes(v);

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(request: Request) {
  const to = process.env.DEVIS_TO_EMAIL;
  if (!to) return NextResponse.json({ error: "config" }, { status: 503 });

  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "type" }, { status: 415 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "inconnue";
  if (limited(ip)) return NextResponse.json({ error: "rate" }, { status: 429 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const body: Payload = {};
  for (const k of FIELDS) {
    const v = (raw as Record<string, unknown>)?.[k];
    if (typeof v === "string") body[k] = v.trim().slice(0, k === "message" ? maxLength.message : maxLength.field);
  }

  // Champ piège invisible : rempli, c'est un robot. On répond comme si de rien n'était.
  if (body.site) return NextResponse.json({ ok: true });

  const choicesOk =
    oneOf(clientTypes, body.client) && oneOf(projectTypes, body.type) && oneOf(surfaceRanges, body.surface) && oneOf(timings, body.delai);
  if (!body.nom || !body.ville || !body.email || !body.telephone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || !choicesOk) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const rows: [string, string | undefined][] = [
    ["Demandeur", body.client],
    ["Ouvrage", body.type],
    ["Surface", body.surface],
    ["Délai", body.delai],
    ["Nom", body.nom],
    ["Ville du chantier", body.ville],
    ["E-mail", body.email],
    ["Téléphone", body.telephone],
  ];
  const html = `<table style="font-family:sans-serif;font-size:15px;border-collapse:collapse">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6e6559">${k}</td><td>${escape(v!)}</td></tr>`)
    .join("")}</table>${body.message ? `<p style="font-family:sans-serif;font-size:15px;white-space:pre-wrap">${escape(body.message)}</p>` : ""}`;

  try {
    await sendEmail(to, `Demande de devis — ${body.type ?? "chantier"} à ${body.ville}`, html, body.email);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "send" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
