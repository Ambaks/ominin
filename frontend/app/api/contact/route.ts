import { NextResponse } from "next/server";
import { CONTACT_LIMITS, type ContactPayload } from "@/lib/portal/contact";
import { notifyContactRequest } from "@/lib/portal/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Enregistrement d'une demande « sur mesure » (portail, /sur-mesure).
 *
 * Pas d'auth : le formulaire est public. L'écriture passe par la clé
 * service_role parce que contact_requests n'a aucune policy RLS — c'est
 * délibéré, l'anon key ne peut donc pas insérer en tapant l'API REST
 * directement, seul ce handler le peut.
 *
 * Ordre des opérations : on écrit d'abord, on notifie ensuite. Une panne du
 * prestataire d'e-mail ne doit pas perdre une demande ni afficher une erreur
 * au visiteur, dont la demande est bel et bien enregistrée.
 */

/** Le piège à robots : un champ invisible que seul un script remplit. */
const HONEYPOT_FIELD = "website";

/*
 * Garde-fou anti-abus : N envois par IP sur une fenêtre glissante, compté en
 * mémoire. Volontairement simple (pas de Redis sur les tiers gratuits) :
 * chaque instance serverless a son propre compteur, donc un attaquant
 * distribué peut dépasser la limite globale — mais une boucle naïve depuis
 * une machine est bloquée, ce qui protège la base et le quota e-mail Resend
 * (100/jour en gratuit) du scénario réaliste.
 */
const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };
const sentAtByIp = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const cutoff = Date.now() - RATE_LIMIT.windowMs;
  // Purge à chaque appel : borne la mémoire sans minuterie.
  for (const [key, times] of sentAtByIp) {
    const alive = times.filter((t) => t > cutoff);
    if (alive.length === 0) sentAtByIp.delete(key);
    else sentAtByIp.set(key, alive);
  }
  const times = sentAtByIp.get(ip) ?? [];
  if (times.length >= RATE_LIMIT.max) return true;
  times.push(Date.now());
  sentAtByIp.set(ip, times);
  return false;
}

function invalid(reason: string) {
  return NextResponse.json({ error: reason }, { status: 400 });
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return invalid("Requête illisible.");

  // Robot : on répond comme si tout s'était bien passé, sans rien écrire.
  if (readString(body, HONEYPOT_FIELD)) {
    return NextResponse.json({ ok: true });
  }

  // Vercel pose x-forwarded-for ; la première valeur est le client réel.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const payload: ContactPayload = {
    name: readString(body, "name"),
    email: readString(body, "email"),
    company: readString(body, "company"),
    message: readString(body, "message"),
    locale: readString(body, "locale") === "en" ? "en" : "fr",
  };

  for (const [field, { min, max }] of Object.entries(CONTACT_LIMITS)) {
    const value = payload[field as keyof typeof CONTACT_LIMITS];
    if (value.length < min || value.length > max) {
      return invalid(`Champ « ${field} » invalide.`);
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return invalid("Adresse e-mail invalide.");
  }

  const db = createAdminClient();
  const { error } = await db.from("contact_requests").insert({
    name: payload.name,
    email: payload.email,
    company: payload.company || null,
    message: payload.message,
    locale: payload.locale,
  });
  if (error) throw new Error(error.message);

  try {
    await notifyContactRequest(payload);
  } catch (cause) {
    // La demande est en base : on journalise et on rend quand même un succès.
    console.error("Notification de demande sur mesure échouée", cause);
  }

  return NextResponse.json({ ok: true });
}
