import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LOYALTY_DEVICE_COOKIE } from "@/lib/menu/loyalty";
import { deviceFingerprint } from "@/lib/menu/loyalty-device";
import { spinSlices } from "@/lib/menu/wheel";
import { loadWheel } from "@/lib/menu/wheel-server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le tour de roue du jour d'un téléphone reconnu (cookie de /api/fidelite,
 * dont le chemin couvre celui-ci). Le tirage et le crédit se font en base
 * (loyalty_wheel_spin), une fois par jour et par carte, sur une commande
 * réglée le jour même ; les cases, le minimum de commande et la roue dorée
 * viennent de la roue que le gérant a réglée, jamais du navigateur.
 *
 * POST { slug } → { slice, points, spins, voucher } : la case où la roue
 * s'arrête, les points crédités, les tours de la carte, celui-ci compris, et
 * le bon gagné (son lot, son échéance) quand la case est un lot.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const slug = (body as { slug?: unknown } | null)?.slug;
  const token = (await cookies()).get(LOYALTY_DEVICE_COOKIE)?.value;
  if (typeof slug !== "string" || !token) {
    return NextResponse.json({ error: "Pas de tour de roue ici." }, { status: 400 });
  }
  let wheel;
  try {
    wheel = await loadWheel(slug);
  } catch (error) {
    console.error("loyalty_wheel_config", error);
    return NextResponse.json({ error: "Tour indisponible pour le moment." }, { status: 500 });
  }
  if (!wheel) {
    return NextResponse.json({ error: "Pas de tour de roue ici." }, { status: 400 });
  }
  const { data, error } = await createAdminClient().rpc("loyalty_wheel_spin", {
    p_slug: slug,
    p_token_hash: deviceFingerprint(token),
    p_slices: spinSlices(wheel.slices),
    p_min_order: wheel.minOrder,
    p_golden_every: wheel.golden?.every ?? null,
    p_golden_multiplier: wheel.golden?.multiplier ?? null,
  });
  const row = data?.[0];
  // Les refus de la base (tour déjà joué, pas de commande réglée, pas de
  // carte) se disent tels quels ; toute autre erreur reste au serveur.
  if (error?.code === "P0001") {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error || !row) {
    console.error("loyalty_wheel_spin", error);
    return NextResponse.json({ error: "Tour indisponible pour le moment." }, { status: 500 });
  }
  return NextResponse.json({
    slice: row.slice,
    points: row.points,
    spins: row.spins,
    voucher: row.voucher ? { label: row.voucher, expiresAt: row.voucher_expires_at } : null,
  });
}
