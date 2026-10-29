import { OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { frenchDate } from "@/lib/legal/format";
import type { createAdminClient } from "@/lib/supabase/admin";
import { commercialPrefix } from "@/lib/site";
import { flushOutbox, notifyNewDeclarations } from "./outbox";
import { notifyCommercial } from "./push";
import { releaseRequests } from "./requests";
import { displayName } from "./record";

type Admin = ReturnType<typeof createAdminClient>;

type Job =
  | "commercial_confirm_due"
  | "commercial_expire_due"
  | "commercial_release_ended"
  | "commercial_draft_statements"
  | "commercial_urssaf_reminders"
  | "commercial_appointment_followups";

/**
 * Tâche quotidienne (workflow commercial-daily) : idempotente, elle écrit
 * les échéances de la base (confirmations de droit, expirations, fins de
 * contrat, brouillons des relevés, rappels URSSAF, relances après un
 * rendez-vous), envoie ce qui attend
 * dans la file des e-mails et prévient l'admin et les commerciaux de ce qui
 * les attend. Toutes les dates se calculent en base.
 */
export async function runDaily(admin: Admin) {
  const call = async (fn: Job) => {
    const { data, error } = await admin.rpc(fn);
    if (error) throw new Error(`${fn} : ${error.message}`);
    return data;
  };
  const confirmed = await call("commercial_confirm_due");
  const expired = await call("commercial_expire_due");
  const released = await call("commercial_release_ended");
  // Brouillons des relevés du mois écoulé, tenus à jour jusqu'à leur envoi.
  const statementDrafts = await call("commercial_draft_statements");
  const urssafReminders = await call("commercial_urssaf_reminders");
  // Relances J+n après un rendez-vous, avant le push du matin qui les compte.
  const followups = await call("commercial_appointment_followups");
  // Demandes de visite échues : libérées pour tous, ou gardées par qui a avancé.
  const visitRequests = await releaseRequests(admin);
  const optionReminders = await remindOptions(admin);
  const finalStatements = await remindFinalStatements(admin);
  const pushed = await pushMorning(admin);
  const declarations = await notifyNewDeclarations(admin);
  const emails = await flushOutbox(admin);
  return {
    confirmed,
    expired,
    released,
    statementDrafts,
    urssafReminders,
    followups,
    visitRequests,
    optionReminders,
    finalStatements,
    pushed,
    declarations,
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

/*
 * Le matin, à chaque commercial abonné : ses relances dues d'ici la fin de
 * la journée (heure de Paris) et ses réservations qui expirent bientôt
 * (préférences « relance », « expiration »), comptées en base.
 */
async function pushMorning(admin: Admin): Promise<number> {
  const { data, error } = await admin.rpc("commercial_morning");
  if (error) throw new Error(`commercial_morning : ${error.message}`);
  const home = `${commercialPrefix}/espace`;
  for (const { commercial_id, tasks, expiring } of data) {
    if (tasks > 0) {
      await notifyCommercial(admin, commercial_id, "relance", {
        title: tasks > 1 ? `${tasks} relances aujourd’hui` : "Une relance aujourd’hui",
        body: "Appeler, écrire ou reporter : tout est sur Aujourd’hui.",
        tag: "commercial-relances",
        url: home,
      });
    }
    if (expiring > 0) {
      await notifyCommercial(admin, commercial_id, "expiration", {
        title: expiring > 1 ? `${expiring} réservations expirent bientôt` : "Une réservation expire bientôt",
        body: "Sans inscription d’ici là, le restaurant redevient libre.",
        tag: "commercial-expirations",
        url: home,
      });
    }
  }
  return data.length;
}
