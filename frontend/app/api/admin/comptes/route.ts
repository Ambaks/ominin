import { NextResponse } from "next/server";
import { ACCOUNT_BAN_DURATION } from "@/lib/admin/constants";
import {
  ACCESS_KIND_LABELS,
  FEE_FIELDS,
  eventLabel,
  type AccountAction,
  type AccountEvent,
} from "@/lib/admin/comptes";
import { requireAdmin } from "@/lib/admin/server";
import { postDiscord } from "@/lib/discord";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/*
 * Toutes les actions de l'écran Comptes : chacune laisse une ligne au journal
 * de la base, annoncée ensuite dans #journal. Rôles et admin passent par les
 * fonctions gardées, avec la session de l'admin. Suspension et commission
 * passent par le service_role : l'API d'administration de Supabase pour l'une,
 * le verrou de la commission (enforce_etablissement_fee_rights) pour l'autre.
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

async function setCommission(
  db: Db,
  actorId: string,
  action: Extract<AccountAction, { type: "commission" }>
): Promise<AccountEvent | null> {
  const field = FEE_FIELDS[action.kind].find((candidate) => candidate.key === action.field);
  if (!field) throw new Error("Commission inconnue.");
  const percent = Number(action.percent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("La commission va de 0 à 100 %.");
  }

  const table = action.kind === "menu" ? "etablissements" : "shops";
  const { data: scope, error: scopeError } = await db
    .from(table)
    .select(`name, ${action.field}`)
    .eq("id", action.scopeId)
    .single();
  if (scopeError) throw new Error(scopeError.message);
  const row = scope as unknown as Record<string, string | number | null>;
  const from = row[action.field] === null ? null : Number(row[action.field]);
  if (from === percent) return null;

  const { error } = await (action.kind === "menu"
    ? db
        .from("etablissements")
        .update({ [action.field]: percent } as TablesUpdate<"etablissements">)
        .eq("id", action.scopeId)
    : db.from("shops").update({ platform_fee_percent: percent }).eq("id", action.scopeId));
  if (error) throw new Error(error.message);

  const [actorEmail, { data: target, error: targetError }] = await Promise.all([
    actorOf(db, actorId),
    db.auth.admin.getUserById(action.userId),
  ]);
  if (targetError) throw new Error(targetError.message);
  const { data: event, error: logError } = await db
    .from("admin_account_events")
    .insert({
      actor_id: actorId,
      actor_email: actorEmail,
      target_id: action.userId,
      target_email: target.user.email ?? target.user.phone ?? "",
      action: "commission",
      detail: { kind: action.kind, name: row.name, field: action.field, from, to: percent },
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
      case "commission":
        event = await setCommission(db, auth.userId, action);
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
