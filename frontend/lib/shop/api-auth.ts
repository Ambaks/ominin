import { NextResponse } from "next/server";
import { getShopSession } from "./server";
import type { ShopSession } from "./types";

/** Garde des routes /api/shop/gestion/* : membre de sa boutique, ou réponse d'erreur. */
export async function requireShopMember(options: { ownerOnly?: boolean } = {}): Promise<ShopSession | NextResponse> {
  const session = await getShopSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (options.ownerOnly && session.role !== "proprietaire") {
    return NextResponse.json({ error: "Réservé à la propriétaire de la boutique." }, { status: 403 });
  }
  return session;
}

/** Origine publique de la requête (host réel derrière le routage Vercel). */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  return `${url.protocol}//${host}`;
}
