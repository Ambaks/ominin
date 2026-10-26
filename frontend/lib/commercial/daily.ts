import { OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { frenchDate } from "@/lib/legal/format";
import type { createAdminClient } from "@/lib/supabase/admin";
import { commercialPrefix } from "@/lib/site";
import { flushOutbox, notifyNewDeclarations } from "./outbox";
import { notifyCommercial } from "./push";

type Admin = ReturnType<typeof createAdminClient>;

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * Option de prolongation (art. 3.3) : à lever au plus tard un mois avant la
 * fin de la durée ferme. L'admin est prévenu une fois, OPTION_REMINDER_DAYS
 * (réglage) avant l'échéance ; sans réglage, pas de rappel.
 */
async function remindOptions(admin: Admin, reminderDays: number | null): Promise<number> {
  if (!reminderDays) return 0;
  const [{ data: commerciaux, error }, { data: settings }] = await Promise.all([
    admin
      .from("commerciaux")
      .select("id, email, first_name, last_name, legal_acceptances(accepted_at)")
      .is("ended_at", null)
      .is("option_exercised_at", null)
      .is("option_reminded_at", null),
    admin.from("commercial_settings").select("term_months").single(),
  ]);
  if (error) throw new Error(error.message);
  let count = 0;
  for (const c of commerciaux) {
    const first = c.legal_acceptances.map((a) => a.accepted_at).sort()[0];
    if (!first || !settings) continue;
    const end = new Date(first);
    end.setMonth(end.getMonth() + settings.term_months);
    if (end.getTime() - reminderDays * DAY_MS > Date.now()) continue;
    await admin.from("commerciaux").update({ option_reminded_at: new Date().toISOString() }).eq("id", c.id);
    await notifyOwners(OWNERS, {
      title: `Option à décider · ${[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}`,
      body: `Son contrat finit le ${frenchDate(end.toISOString())} ; l'option se lève au plus tard un mois avant (art. 3.3).`,
      tag: `option-${c.id}`,
      url: "/commerciaux",
    });
    count++;
  }
  return count;
}

/**
 * Tâche quotidienne (workflow commercial-daily) : idempotente, elle écrit
 * les échéances de la base (confirmations de droit, expirations, fins de
 * contrat), envoie ce qui attend dans la file des e-mails et prévient
 * l'admin de ce qui l'attend.
 */
export async function runDaily(admin: Admin) {
  const call = async (
    fn: "commercial_confirm_due" | "commercial_expire_due" | "commercial_release_ended" | "commercial_draft_statements"
  ) => {
    const { data, error } = await admin.rpc(fn);
    if (error) throw new Error(`${fn} : ${error.message}`);
    return data;
  };
  const confirmed = await call("commercial_confirm_due");
  const expired = await call("commercial_expire_due");
  const released = await call("commercial_release_ended");
  // Brouillons des relevés du mois écoulé, tenus à jour jusqu'à leur envoi.
  const statementDrafts = await call("commercial_draft_statements");
  const { data: settings, error } = await admin
    .from("commercial_settings")
    .select("option_reminder_days, expiry_warning_days")
    .single();
  if (error) throw new Error(error.message);
  const optionReminders = await remindOptions(admin, settings.option_reminder_days);
  const pushed = await pushMorning(admin, settings.expiry_warning_days);
  const declarations = await notifyNewDeclarations(admin);
  const emails = await flushOutbox(admin);
  return { confirmed, expired, released, statementDrafts, optionReminders, pushed, declarations, emails };
}

/*
 * Le matin, à chaque commercial abonné : ses relances du jour et ses
 * réservations qui expirent bientôt (préférences « relance », « expiration »).
 */
async function pushMorning(admin: Admin, expiryWarningDays: number | null): Promise<number> {
  const endOfDay = new Date(Date.now() + DAY_MS).toISOString();
  const [{ data: tasks, error }, { data: expiring, error: expiringError }] = await Promise.all([
    admin
      .from("crm_tasks")
      .select("commercial_declarations!inner(commercial_id, status)")
      .eq("status", "open")
      .lt("due_at", endOfDay)
      .in("commercial_declarations.status", ["pending", "confirmed"]),
    expiryWarningDays
      ? admin
          .from("commercial_declarations")
          .select("commercial_id")
          .eq("status", "confirmed")
          .lt("reserved_until", new Date(Date.now() + expiryWarningDays * DAY_MS).toISOString())
      : Promise.resolve({ data: [] as { commercial_id: string }[], error: null }),
  ]);
  if (error) throw new Error(error.message);
  if (expiringError) throw new Error(expiringError.message);
  const count = (ids: string[]) => ids.reduce((map, id) => map.set(id, (map.get(id) ?? 0) + 1), new Map<string, number>());
  const due = count(tasks.map((task) => task.commercial_declarations.commercial_id));
  const ending = count(expiring.map((row) => row.commercial_id));
  const home = `${commercialPrefix}/espace`;
  for (const [commercialId, n] of due) {
    await notifyCommercial(admin, commercialId, "relance", {
      title: n > 1 ? `${n} relances aujourd’hui` : "Une relance aujourd’hui",
      body: "Appeler, écrire ou reporter : tout est sur Aujourd’hui.",
      tag: "commercial-relances",
      url: home,
    });
  }
  for (const [commercialId, n] of ending) {
    await notifyCommercial(admin, commercialId, "expiration", {
      title: n > 1 ? `${n} réservations expirent bientôt` : "Une réservation expire bientôt",
      body: "Sans inscription d’ici là, le restaurant redevient libre.",
      tag: "commercial-expirations",
      url: home,
    });
  }
  return due.size + ending.size;
}
