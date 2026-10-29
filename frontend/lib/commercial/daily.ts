import { OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { frenchDate } from "@/lib/legal/format";
import { getStripe } from "@/lib/stripe/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { flushOutbox } from "./outbox";
import { displayName } from "./record";
import { releaseRequests } from "./requests";
import { settleSignups } from "./signup";

type Admin = ReturnType<typeof createAdminClient>;

type Job =
  | "commercial_release_ended"
  | "commercial_release_holds"
  | "commercial_draft_statements"
  | "commercial_urssaf_reminders";

/**
 * Tâche quotidienne (workflow commercial-daily) : idempotente, elle écrit
 * les échéances de la base (fins de contrat et restaurants rendus libres,
 * brouillons des relevés, rappels URSSAF, demandes de visite échues,
 * inscriptions devenues clientes), envoie ce qui attend dans la file des
 * e-mails et prévient l'admin de ce qui l'attend. Toutes les dates se
 * calculent en base.
 */
export async function runDaily(admin: Admin) {
  const call = async (fn: Job) => {
    const { data, error } = await admin.rpc(fn);
    if (error) throw new Error(`${fn} : ${error.message}`);
    return data;
  };
  const released = await call("commercial_release_ended");
  const holds = await call("commercial_release_holds");
  // Brouillons des relevés du mois écoulé, tenus à jour jusqu'à leur envoi.
  const statementDrafts = await call("commercial_draft_statements");
  const urssafReminders = await call("commercial_urssaf_reminders");
  // Demandes de visite échues : libérées pour tous, ou gardées par qui a avancé.
  const visitRequests = await releaseRequests(admin);
  // Inscriptions finies après coup (Stripe, HubRise depuis la gestion) : clients.
  const signups = await settleSignups(admin, getStripe);
  const optionReminders = await remindOptions(admin);
  const finalStatements = await remindFinalStatements(admin);
  const emails = await flushOutbox(admin);
  return {
    released,
    holds,
    statementDrafts,
    urssafReminders,
    visitRequests,
    signups,
    optionReminders,
    finalStatements,
    emails,
  };
}

/*
 * Option de prolongation (art. 3.3) : à lever au plus tard un mois avant la
 * fin de la durée ferme. L'admin est prévenu une fois, OPTION_REMINDER_DAYS
 * (réglage) avant l'échéance ; sans réglage, pas de rappel.
 */
async function remindOptions(admin: Admin): Promise<number> {
  const { data, error } = await admin.rpc("commercial_option_reminders");
  if (error) throw new Error(`commercial_option_reminders : ${error.message}`);
  for (const row of data) {
    await notifyOwners(OWNERS, {
      title: `Option à décider · ${row.name}`,
      body: `Son contrat finit le ${frenchDate(row.contract_end)} ; l'option se lève au plus tard un mois avant (art. 3.3).`,
      tag: `option-${row.id}`,
      url: "/commerciaux",
    });
  }
  return data.length;
}

/*
 * Relevé final (art. 8.1) : chaque jour jusqu'à son envoi, l'admin voit
 * l'échéance ; le brouillon du mois de la fin est tenu à jour en base.
 */
async function remindFinalStatements(admin: Admin): Promise<number> {
  const { data, error } = await admin.rpc("commercial_final_statements");
  if (error) throw new Error(`commercial_final_statements : ${error.message}`);
  if (!data.length) return 0;
  const { data: people, error: peopleError } = await admin
    .from("commerciaux")
    .select("id, email, first_name, last_name")
    .in("id", data.map((row) => row.commercial_id));
  if (peopleError) throw new Error(peopleError.message);
  for (const row of data) {
    const who = people.find((person) => person.id === row.commercial_id);
    await notifyOwners(OWNERS, {
      title: `Relevé final à envoyer · ${who ? displayName(who) : ""}`,
      body: `Contrat terminé : le relevé final part au plus tard le ${frenchDate(row.due_at)} (art. 8.1).`,
      tag: `releve-final-${row.commercial_id}`,
      url: "/commerciaux?onglet=releves",
    });
  }
  return data.length;
}

