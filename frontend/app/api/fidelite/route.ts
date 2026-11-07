import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rowToMenuItem } from "@/lib/gestion/mappers";
import {
  LOYALTY_DEVICE_COOKIE,
  LOYALTY_DEVICE_MAX_AGE,
  type LoyaltyHistoryEntry,
  type LoyaltyMember,
  type LoyaltyVoucher,
  type WheelDay,
} from "@/lib/menu/loyalty";
import { deviceFingerprint as fingerprint } from "@/lib/menu/loyalty-device";
import type { LoyaltyWheelConfig } from "@/lib/menu/wheel";
import { loadWheel } from "@/lib/menu/wheel-server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Téléphone reconnu par la fidélité (loyalty_devices). Le navigateur garde une
 * clé aléatoire en cookie httpOnly, posé par le serveur : Safari efface au bout
 * de 7 jours sans visite ce qu'une page stocke elle-même, pas ce cookie. La
 * base n'en garde que l'empreinte. Chaque lecture repousse l'échéance : c'est
 * un an après le dernier scan qu'un téléphone est oublié.
 *
 * GET ?slug=   le client de ce téléphone, vu de ce restaurant (member: null sinon) ;
 *              avec &historique, les lignes de sa carte (history) ; chez une
 *              maison à roue, la roue et où en est son tour du jour (wheel),
 *              et les bons qu'il y a gagnés (vouchers)
 * POST         retenir ce téléphone pour { slug, contact, firstName? }
 * DELETE       « Ce n'est pas moi » : oublier ce téléphone
 */

const COOKIE_PATH = "/api/fidelite";

function withDeviceCookie(
  response: NextResponse,
  request: Request,
  token: string
) {
  response.cookies.set(LOYALTY_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    maxAge: LOYALTY_DEVICE_MAX_AGE,
    path: COOKIE_PATH,
  });
  return response;
}

async function readMember(
  slug: string,
  token: string
): Promise<LoyaltyMember | null> {
  const { data, error } = await createAdminClient().rpc("loyalty_device_member", {
    p_slug: slug,
    p_token_hash: fingerprint(token),
  });
  if (error) throw new Error(error.message);
  const row = data[0];
  return row
    ? {
        contact: row.contact,
        firstName: row.first_name,
        points: row.points,
        since: row.member_since,
      }
    : null;
}

/**
 * La roue de la maison et le tour du jour de ce téléphone : null sans roue,
 * ou sans carte ici. Une erreur ne coûte que la roue, pas l'accueil.
 */
async function readWheel(slug: string, token: string): Promise<(LoyaltyWheelConfig & WheelDay) | null> {
  const wheel = await loadWheel(slug).catch(() => null);
  if (!wheel) return null;
  const { data, error } = await createAdminClient().rpc("loyalty_wheel_state", {
    p_slug: slug,
    p_token_hash: fingerprint(token),
    p_min_order: wheel.minOrder,
  });
  const row = data?.[0];
  return error || !row ? null : { ...wheel, ready: row.ready, played: row.played_today, spins: row.spins };
}

/**
 * Les bons à utiliser, avec l'article de la carte que chacun offre : le
 * panier l'ajoute comme depuis la carte. Une erreur ne coûte que les bons.
 */
async function readVouchers(slug: string, token: string): Promise<LoyaltyVoucher[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("loyalty_device_vouchers", {
    p_slug: slug,
    p_token_hash: fingerprint(token),
  });
  if (error || data.length === 0) return [];
  const itemIds = data.flatMap((row) => (row.item_id ? [row.item_id] : []));
  const { data: items } = itemIds.length
    ? await admin.from("items").select("*").in("id", itemIds)
    : { data: [] };
  const byId = new Map((items ?? []).map((row) => [row.id, rowToMenuItem(row)]));
  return data.map((row) => ({
    id: row.id,
    item: (row.item_id && byId.get(row.item_id)) || null,
    label: row.label,
    image: row.image,
    expiresAt: row.expires_at,
  }));
}

async function readHistory(
  slug: string,
  token: string
): Promise<LoyaltyHistoryEntry[]> {
  const { data, error } = await createAdminClient().rpc("loyalty_device_history", {
    p_slug: slug,
    p_token_hash: fingerprint(token),
  });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    kind: row.kind,
    points: row.points,
    at: row.created_at,
    table: row.table_number,
    rewards: row.rewards,
  }));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug");
  const token = (await cookies()).get(LOYALTY_DEVICE_COOKIE)?.value;
  if (!slug || !token) return NextResponse.json({ member: null, history: [], wheel: null, vouchers: [] });
  const [member, history, wheel, vouchers] = await Promise.all([
    readMember(slug, token),
    params.has("historique") ? readHistory(slug, token) : [],
    readWheel(slug, token),
    readVouchers(slug, token),
  ]);
  const response = NextResponse.json({ member, history, wheel, vouchers });
  return member ? withDeviceCookie(response, request, token) : response;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { slug, contact, firstName } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof slug !== "string" ||
    typeof contact !== "string" ||
    (firstName !== undefined && typeof firstName !== "string")
  ) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const token =
    (await cookies()).get(LOYALTY_DEVICE_COOKIE)?.value ??
    randomBytes(32).toString("base64url");
  const { error } = await createAdminClient().rpc("loyalty_device_remember", {
    p_slug: slug,
    p_token_hash: fingerprint(token),
    p_contact: contact,
    p_first_name: firstName ?? null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const member = await readMember(slug, token);
  return withDeviceCookie(NextResponse.json({ member }), request, token);
}

export async function DELETE() {
  const jar = await cookies();
  const token = jar.get(LOYALTY_DEVICE_COOKIE)?.value;
  if (token) {
    const { error } = await createAdminClient()
      .from("loyalty_devices")
      .delete()
      .eq("token_hash", fingerprint(token));
    if (error) throw new Error(error.message);
  }
  const response = NextResponse.json({ member: null });
  response.cookies.delete({ name: LOYALTY_DEVICE_COOKIE, path: COOKIE_PATH });
  return response;
}
