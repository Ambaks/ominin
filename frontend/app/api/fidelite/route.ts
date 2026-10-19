import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  LOYALTY_DEVICE_COOKIE,
  LOYALTY_DEVICE_MAX_AGE,
  type LoyaltyHistoryEntry,
  type LoyaltyMember,
} from "@/lib/menu/loyalty";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Téléphone reconnu par la fidélité (loyalty_devices). Le navigateur garde une
 * clé aléatoire en cookie httpOnly, posé par le serveur : Safari efface au bout
 * de 7 jours sans visite ce qu'une page stocke elle-même, pas ce cookie. La
 * base n'en garde que l'empreinte. Chaque lecture repousse l'échéance : c'est
 * un an après le dernier scan qu'un téléphone est oublié.
 *
 * GET ?slug=   le client de ce téléphone, vu de ce restaurant (member: null sinon) ;
 *              avec &historique, les lignes de sa carte (history)
 * POST         retenir ce téléphone pour { slug, contact, firstName? }
 * DELETE       « Ce n'est pas moi » : oublier ce téléphone
 */

const COOKIE_PATH = "/api/fidelite";

const fingerprint = (token: string) =>
  createHash("sha256").update(token).digest("hex");

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
  if (!slug || !token) return NextResponse.json({ member: null, history: [] });
  const [member, history] = await Promise.all([
    readMember(slug, token),
    params.has("historique") ? readHistory(slug, token) : [],
  ]);
  const response = NextResponse.json({ member, history });
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
