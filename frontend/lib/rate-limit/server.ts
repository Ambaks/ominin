import { NextResponse } from "next/server";
import { RATE_LIMITS, type RateLimitName } from "@/lib/rate-limit/constants";
import { createAdminClient } from "@/lib/supabase/admin";

/** Adresse du visiteur : Vercel pose x-forwarded-for, la première valeur est la sienne. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}

/**
 * Compte l'appel et répond 429 quand le plafond est atteint, null sinon.
 * Une erreur de base laisse passer : un compteur indisponible ne doit pas
 * couper la route.
 */
export async function rateLimit(
  name: RateLimitName,
  subject: string
): Promise<NextResponse | null> {
  const { max, windowSeconds } = RATE_LIMITS[name];
  const { data: allowed, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: `${name}:${subject}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] compteur indisponible", { name, error });
    return null;
  }
  return allowed
    ? null
    : NextResponse.json(
        { error: "Trop de demandes : réessayez un peu plus tard." },
        { status: 429 }
      );
}
