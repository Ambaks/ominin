import { NextResponse } from "next/server";
import { ACCOUNT_BAN_DURATION } from "@/lib/admin/constants";
import {
  ACCESS_KIND_LABELS,
  eventLabel,
  type AccountAction,
  type AccountEvent,
} from "@/lib/admin/comptes";
import { requireAdmin } from "@/lib/admin/server";
import { postDiscord } from "@/lib/discord";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Toutes les actions de l'écran Comptes : chacune laisse une ligne au journal
 * de la base, annoncée ensuite dans #journal. Rôles et admin passent par les
 * fonctions gardées, avec la session de l'admin. La suspension passe par le
 * service_role : c'est l'API d'administration de Supabase.
 * Discord en panne, l'action reste faite et l'écran le signale.
 */

type Db = ReturnType<typeof createAdminClient>;

const actorOf = async (db: Db, userId: string): Promise<string> => {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);
  return data.user.email ?? data.user.phone ?? "";
};

async function suspend(db: Db, actorId: string, userId: string, suspended: boolean): Promise<AccountEvent> {
  const actorEmail = await actorOf(db, actorId);
  const { data, error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? ACCOUNT_BAN_DURATION : "none",
  });
  if (error) throw new Error(error.message);
  const { data: event, error: logError } = await db
    .from("admin_account_events")
    .insert({
      actor_id: actorId,
      actor_email: actorEmail,
      target_id: userId,
      target_email: data.user.email ?? data.user.phone ?? "",
      action: suspended ? "suspend" : "restore",
    })
    .select()
    .single();
  if (logError) throw new Error(logError.message);
  return event;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const action = (await request.json().catch(() => null)) as AccountAction | null;
  if (!action?.userId) return NextResponse.json({ error: "Compte manquant." }, { status: 400 });
  if (action.userId === auth.userId && action.type !== "admin") {
    return NextResponse.json(
      { error: "Vos propres accès se changent depuis un autre compte admin." },
      { status: 400 }
    );
  }

  let event: AccountEvent | null;
  try {
    const supabase = await createClient();
    const db = createAdminClient();
    switch (action.type) {
      case "admin": {
        const { data, error } = await supabase.rpc("admin_account_set_admin", {
          p_user: action.userId,
          p_admin: action.admin,
        });
        if (error) throw new Error(error.message);
        event = data;
        break;
      }
      case "access": {
        if (!(action.kind in ACCESS_KIND_LABELS)) throw new Error("Type d'accès inconnu.");
        const { data, error } = await supabase.rpc("admin_account_set_access", {
          p_user: action.userId,
          p_kind: action.kind,
          p_scope: action.scopeId,
          p_role: action.role as string,
        });
        if (error) throw new Error(error.message);
        event = data;
        break;
      }
      case "suspend":
        event = await suspend(db, auth.userId, action.userId, action.suspended);
        break;
      default:
        return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Une erreur est survenue." },
      { status: 400 }
    );
  }

  if (!event?.id) return NextResponse.json({ ok: true });
  try {
    await postDiscord("journal", `🔐 **${event.target_email}** : ${eventLabel(event)}\npar ${event.actor_email}`);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error("[comptes] journal Discord", cause);
    return NextResponse.json({ ok: true, journalFailed: true });
  }
}
