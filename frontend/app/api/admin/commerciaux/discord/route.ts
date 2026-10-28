import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { discordMembers } from "@/lib/discord";

/* Les membres du serveur Discord de l'équipe, pour relier chaque commercial à son compte. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    return NextResponse.json(await discordMembers());
  } catch (cause) {
    console.error("[discord] membres illisibles", cause);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 502 });
  }
}
