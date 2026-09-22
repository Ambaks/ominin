import { createClient } from "@/lib/supabase/client";
import { must } from "@/lib/supabase/result";
import { EMAILS_FETCH_LIMIT, PROSPECTS_FETCH_LIMIT } from "./constants";
import type {
  AgentEmailRow,
  AgentMailbox,
  AgentProfile,
  AgentProspect,
  AgentSettings,
  AgentStats,
  PendingDraft,
} from "./types";

/*
 * Surface de données de l'espace Agents. Tout passe par le client Supabase
 * sous RLS — la migration borne ce que le client peut écrire (ses réglages,
 * la validation de ses brouillons, l'exclusion d'un prospect) — sauf Gmail,
 * dont les jetons ne transitent que par les routes /api/agents/gmail.
 */

const EMAIL_SELECT = "*, prospect:agents_prospects(name)";

async function userId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await createClient().auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) {
    window.location.assign("/connexion");
    throw new Error("Session expirée.");
  }
  return user.id;
}

export async function fetchAgent(): Promise<{
  profile: AgentProfile;
  mailbox: AgentMailbox | null;
}> {
  const supabase = createClient();
  const id = await userId();
  const [profile, mailbox] = await Promise.all([
    supabase.from("agents_profiles").select("*").eq("user_id", id).single().then(must),
    supabase
      .from("agents_mailboxes")
      .select("email, error, connected_at")
      .eq("user_id", id)
      .maybeSingle(),
  ]);
  if (mailbox.error) throw new Error(mailbox.error.message);
  return { profile, mailbox: mailbox.data };
}

export async function saveSettings(
  settings: AgentSettings
): Promise<AgentProfile> {
  return createClient()
    .from("agents_profiles")
    .update(settings)
    .eq("user_id", await userId())
    .select("*")
    .single()
    .then(must);
}

export async function fetchStats(): Promise<AgentStats> {
  const supabase = createClient();
  const id = await userId();
  const count = async (query: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  };
  const emails = () =>
    supabase
      .from("agents_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id);
  const [sent, replies, interested, pending] = await Promise.all([
    count(emails().eq("kind", "cold").eq("status", "sent")),
    count(emails().eq("direction", "inbound").neq("classification", "bounce")),
    count(
      supabase
        .from("agents_prospects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id)
        .eq("status", "interested")
    ),
    count(emails().eq("status", "pending_approval")),
  ]);
  return { sent, replies, interested, pending };
}

export async function fetchEmails(): Promise<AgentEmailRow[]> {
  return createClient()
    .from("agents_emails")
    .select(EMAIL_SELECT)
    .eq("user_id", await userId())
    .neq("status", "pending_approval")
    .order("created_at", { ascending: false })
    .limit(EMAILS_FETCH_LIMIT)
    .then(must);
}

export async function fetchPendingDrafts(): Promise<PendingDraft[]> {
  const supabase = createClient();
  const drafts = await supabase
    .from("agents_emails")
    .select(EMAIL_SELECT)
    .eq("user_id", await userId())
    .eq("status", "pending_approval")
    .order("created_at")
    .then(must);
  const inboundIds = drafts.flatMap((d) => (d.in_reply_to ? [d.in_reply_to] : []));
  const inbound = inboundIds.length
    ? await supabase
        .from("agents_emails")
        .select("id, body_text, classification")
        .in("id", inboundIds)
        .then(must)
    : [];
  const byId = new Map(inbound.map((row) => [row.id, row]));
  return drafts.map((draft) => ({
    ...draft,
    inbound: (draft.in_reply_to && byId.get(draft.in_reply_to)) || null,
  }));
}

export async function fetchProspects(): Promise<AgentProspect[]> {
  return createClient()
    .from("agents_prospects")
    .select("*")
    .eq("user_id", await userId())
    .order("created_at", { ascending: false })
    .limit(PROSPECTS_FETCH_LIMIT)
    .then(must);
}

/** Garde sur le statut : un brouillon déjà traité ailleurs n'est pas réécrit. */
export async function approveDraft(
  id: string,
  edits: { subject: string; body_text: string }
): Promise<void> {
  const rows = await createClient()
    .from("agents_emails")
    .update({ ...edits, status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_approval")
    .select("id")
    .then(must);
  if (rows.length === 0) throw new Error("Ce brouillon n'est plus en attente.");
}

/** Un premier e-mail rejeté écarte aussi son prospect : sinon l'agent lui en
 * rédigerait un nouveau au passage suivant. */
export async function rejectDraft(draft: PendingDraft): Promise<void> {
  const supabase = createClient();
  const rows = await supabase
    .from("agents_emails")
    .update({ status: "cancelled" })
    .eq("id", draft.id)
    .eq("status", "pending_approval")
    .select("id")
    .then(must);
  if (rows.length === 0) throw new Error("Ce brouillon n'est plus en attente.");
  if (draft.kind === "cold") await excludeProspect(draft.prospect_id, "rejected");
}

export async function excludeProspect(
  id: string,
  reason: "excluded" | "rejected" = "excluded"
): Promise<void> {
  await createClient()
    .from("agents_prospects")
    .update({ status: "disqualified", disqualify_reason: reason })
    .eq("id", id)
    .in("status", ["pending", "qualified", "no_email"])
    .select("id")
    .then(must);
}

async function postApi<T>(path: string): Promise<T> {
  const response = await fetch(path, { method: "POST" });
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !body) {
    throw new Error(body?.error ?? "Une erreur est survenue.");
  }
  return body;
}

/** Part vers l'écran de consentement Google ; le retour se fait sur les réglages. */
export async function connectGmail(): Promise<void> {
  const { url } = await postApi<{ url: string }>("/api/agents/gmail/connect");
  window.location.assign(url);
}

export async function disconnectGmail(): Promise<void> {
  await postApi<{ ok: true }>("/api/agents/gmail/disconnect");
}
