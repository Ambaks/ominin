import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/shop/checkout";
import { getCurrentUser, getShopBySlug } from "@/lib/shop/server";
import { parseCheckout } from "@/lib/shop/validation";

/*
 * Passage en caisse d'une boutique : valide le corps, recalcule tout côté
 * serveur (lib/shop/checkout.ts) et renvoie l'URL Stripe Checkout. L'origine
 * publique vient des en-têtes (host réel derrière le routage Vercel).
 */
export async function POST(request: Request) {
  const parsed = parseCheckout(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const shop = await getShopBySlug(parsed.value.slug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });

  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const origin = `${requestUrl.protocol}//${host}`;
  const user = await getCurrentUser();

  try {
    const result = await createCheckoutSession(shop, parsed.value, origin, user?.id ?? null);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[shop checkout]", error);
    return NextResponse.json({ error: "Le paiement est momentanément indisponible. Réessaie dans un instant." }, { status: 500 });
  }
}
