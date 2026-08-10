import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, clipSiteUrl, collectSiteUrl } from "@/lib/site";

const trustedOrigins = new Set([siteUrl, clipSiteUrl, collectSiteUrl]);

/** Échange le code OAuth/PKCE (Google, liens email) contre une session. */
export async function GET(request: Request) {
  const { searchParams, origin, protocol } = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = host ? `${protocol}//${host}` : origin;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");

  const next = resolveNext(requestedNext, base);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(next);
  }

  return NextResponse.redirect(`${base}/connexion?error=auth`);
}

function resolveNext(raw: string | null, base: string): string {
  if (!raw) return `${base}/gestion`;
  if (raw.startsWith("/") && !raw.startsWith("//")) return `${base}${raw}`;
  try {
    const url = new URL(raw);
    if (trustedOrigins.has(url.origin)) return raw;
  } catch {}
  return `${base}/gestion`;
}
