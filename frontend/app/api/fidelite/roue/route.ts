import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LOYALTY_DEVICE_COOKIE } from "@/lib/menu/loyalty";
import { deviceFingerprint } from "@/lib/menu/loyalty-device";
import { getRestaurant } from "@/lib/menu-data";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le tour de roue du jour d'un téléphone reconnu (cookie de /api/fidelite,
 * dont le chemin couvre celui-ci). Le tirage et le crédit se font en base
 * (loyalty_wheel_spin), une fois par jour et par carte ; les parts et la
 * roue dorée viennent du registre de la carte, jamais du navigateur.
 *
 * POST { slug } → { slice, points, streak } : la part où la roue s'arrête,
 * les points crédités, la série aujourd'hui compris.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const slug = (body as { slug?: unknown } | null)?.slug;
  const wheel = typeof slug === "string" ? getRestaurant(slug)?.loyaltyWheel : undefined;
  const token = (await cookies()).get(LOYALTY_DEVICE_COOKIE)?.value;
  if (typeof slug !== "string" || !wheel || !token) {
    return NextResponse.json({ error: "Pas de tour de roue ici." }, { status: 400 });
  }
  const { data, error } = await createAdminClient().rpc("loyalty_wheel_spin", {
    p_slug: slug,
    p_token_hash: deviceFingerprint(token),
    p_slices: wheel.slices.map(({ points, weight }) => ({ points, weight })),
    p_golden_every: wheel.golden?.every ?? null,
    p_golden_multiplier: wheel.golden?.multiplier ?? null,
  });
  const row = data?.[0];
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Tour refusé." }, { status: 409 });
  }
  return NextResponse.json({ slice: row.slice, points: row.points, streak: row.streak });
}
