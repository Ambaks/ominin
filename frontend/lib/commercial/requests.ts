import { editDiscord, postDiscord } from "@/lib/discord";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Les demandes de visite, côté Discord : le message de #demandes avec ses
 * boutons, puis sa réécriture à chaque issue (accepté, refusé, libéré,
 * gardé). Les règles vivent en base (commercial_request_visit,
 * commercial_answer_request, commercial_release_requests).
 */

export const REQUEST_BUTTON = "demande";

interface Person {
  first_name: string | null;
  email: string;
  discord_user_id: string | null;
}

interface RequestRow {
  id: string;
  created_at: string;
  discord_message_id: string | null;
  restaurant: { name: string };
  requester: Person;
  holder: Person;
}

const nameOf = (person: Person) => person.first_name ?? person.email;
const mention = (person: Person) => (person.discord_user_id ? `<@${person.discord_user_id}>` : nameOf(person));

async function loadRequest(admin: Admin, id: string): Promise<RequestRow> {
  const { data, error } = await admin
    .from("commercial_visit_requests")
    .select(
      "id, created_at, discord_message_id, restaurant:crm_restaurants(name), requester:commerciaux!commercial_visit_requests_requester_id_fkey(first_name, email, discord_user_id), holder:commerciaux!commercial_visit_requests_holder_id_fkey(first_name, email, discord_user_id)"
    )
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as RequestRow;
}

function requestText(row: RequestRow, days: number | null): string {
  const rule = days
    ? `\nSans réponse ou refusée, la demande libère le restaurant pour tous dans ${days} jours, sauf s'il avance d'ici là.`
    : "";
  return `🙋 ${mention(row.holder)}, ${mention(row.requester)} demande à visiter **${row.restaurant.name}**.${rule}`;
}

/** Poste la demande dans #demandes, avec les boutons pour celui qui suit le restaurant. */
export async function announceRequest(admin: Admin, id: string): Promise<void> {
  const [row, { data: settings }] = await Promise.all([
    loadRequest(admin, id),
    admin.from("commercial_settings").select("visit_request_days").single(),
  ]);
  const messageId = await postDiscord("demandes", requestText(row, settings?.visit_request_days ?? null), {
    mentions: [row.holder.discord_user_id, row.requester.discord_user_id].filter((value): value is string => value !== null),
    buttons: [
      { label: "Accepter", customId: `${REQUEST_BUTTON}:accept:${id}`, style: "success" },
      { label: "Refuser", customId: `${REQUEST_BUTTON}:refuse:${id}`, style: "secondary" },
    ],
  });
  const { error } = await admin.from("commercial_visit_requests").update({ discord_message_id: messageId }).eq("id", id);
  if (error) throw new Error(error.message);
}

export type RequestOutcome = "accepted" | "refused" | "released" | "kept";

/** Le texte de la demande, suivi de son issue : ce que devient le message de #demandes. */
export async function outcomeText(admin: Admin, id: string, outcome: RequestOutcome): Promise<string> {
  const [row, { data: settings }] = await Promise.all([
    loadRequest(admin, id),
    admin.from("commercial_settings").select("visit_request_days").single(),
  ]);
  const restaurant = row.restaurant.name;
  const line = {
    accepted: `✅ **Accepté** : ${restaurant} est libre, ${nameOf(row.requester)} peut y aller.`,
    refused: `❌ **Refusé** : ${nameOf(row.holder)} garde ${restaurant} pour l'instant.`,
    released: `🔓 **Libéré** : ${restaurant} est ouvert à tous.`,
    kept: `📌 ${nameOf(row.holder)} a avancé : ${restaurant} lui reste.`,
  }[outcome];
  return `${requestText(row, settings?.visit_request_days ?? null)}\n${line}`;
}

/** Tâche quotidienne : traite les demandes échues et réécrit leur message. */
export async function releaseRequests(admin: Admin): Promise<number> {
  const { data, error } = await admin.rpc("commercial_release_requests");
  if (error) throw new Error(`commercial_release_requests : ${error.message}`);
  for (const row of data) {
    if (!row.discord_message_id) continue;
    try {
      await editDiscord("demandes", row.discord_message_id, await outcomeText(admin, row.id, row.status as RequestOutcome));
    } catch (cause) {
      console.error("[discord] issue de la demande non affichée", row.id, cause);
    }
  }
  return data.length;
}
