import type { Tables } from "@/lib/supabase/database.types";

export type AgentProfile = Tables<"agents_profiles">;
export type AgentMailbox = Pick<
  Tables<"agents_mailboxes">,
  "email" | "error" | "connected_at"
>;
export type AgentProspect = Tables<"agents_prospects">;
export type AgentEmail = Tables<"agents_emails">;

export type AgentMode = "auto" | "approval";

export type ProspectStatus =
  | "pending"
  | "qualified"
  | "no_email"
  | "disqualified"
  | "contacted"
  | "interested"
  | "not_interested";

/** Colonnes que le client peut écrire (grants par colonne de la migration). */
export type AgentSettings = Pick<
  AgentProfile,
  | "company_name"
  | "sender_name"
  | "sender_role"
  | "phone"
  | "website"
  | "offer"
  | "strengths"
  | "call_to_action"
  | "reply_notes"
  | "targets"
  | "cities"
  | "mode"
  | "enabled"
  | "send_days"
  | "send_start_hour"
  | "send_end_hour"
  | "daily_limit"
>;

/** Ce qui empêche (ou non) l'agent de prospecter, dans l'ordre de résolution. */
export type AgentStatus =
  | "awaiting_activation"
  | "no_mailbox"
  | "mailbox_error"
  | "incomplete"
  | "paused"
  | "running";

/** E-mail avec le nom du prospect — les listes n'affichent jamais un id. */
export type AgentEmailRow = AgentEmail & { prospect: { name: string } | null };

/** Brouillon à valider, avec le message du prospect auquel il répond. */
export type PendingDraft = AgentEmailRow & {
  inbound: Pick<AgentEmail, "body_text" | "classification"> | null;
};

export interface AgentStats {
  sent: number;
  replies: number;
  interested: number;
  pending: number;
}
