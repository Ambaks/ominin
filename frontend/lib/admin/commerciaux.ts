import { commercialName, displayName } from "@/lib/commercial/record";
import type { DiscordMember } from "@/lib/discord";
import { createClient } from "@/lib/supabase/client";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";

/*
 * Commerciaux invités, leurs relevés et les réglages de l'espace, lus sous
 * RLS admin. Les écritures qui engagent le contrat passent par les fonctions
 * admin_* de la base ; l'invitation, par la route serveur (elle seule peut
 * créer le lien d'accès).
 */

export type EndReason = "term" | "resignation" | "termination" | "breach" | "immediate" | "mutual";

export const CONTRACT_END_LABELS: Record<EndReason, string> = {
  term: "Échéance",
  resignation: "Résiliation par le commercial (art. 7.2)",
  termination: "Résiliation par Ominin avec préavis (art. 7.5)",
  breach: "Manquement (art. 7.3)",
  immediate: "Résiliation immédiate (art. 7.4)",
  mutual: "Accord commun (art. 7.1)",
};

export interface CommercialRow {
  id: string;
  email: string;
  name: string | null;
  invitedAt: string;
  /** Dernière signature, null tant que le contrat n'est pas signé. */
  signed: { at: string; version: string } | null;
  optionExercisedAt: string | null;
  noticeGivenAt: string | null;
  endedAt: string | null;
  endReason: EndReason | null;
  discordUserId: string | null;
  signedRestaurants: number;
  /** Taux propre (art. 4.6), null : le taux de base. */
  commissionPercent: number | null;
}

/**
 * Qui a amené chaque client : établissement ou boutique → nom du commercial.
 * L'inscription en cours compte dès qu'elle a créé l'établissement ; le Client
 * Apporté le plus récent l'emporte. Absent de la carte : venu par les fondateurs.
 */
export async function fetchBroughtBy(): Promise<Map<string, string>> {
  const supabase = createClient();
  const [commerciaux, signups, clients] = await Promise.all([
    supabase.from("commerciaux").select("id, email, first_name, last_name").then(must),
    supabase
      .from("commercial_signups")
      .select("etablissement_id, commercial_id")
      .not("etablissement_id", "is", null)
      .then(must),
    supabase
      .from("commercial_clients")
      .select("etablissement_id, shop_id, commercial_id")
      .order("created_at", { ascending: true })
      .then(must),
  ]);
  const names = new Map(commerciaux.map((row) => [row.id, displayName(row)]));
  const broughtBy = new Map<string, string>();
  for (const { etablissement_id, shop_id, commercial_id } of [
    ...signups.map((row) => ({ ...row, shop_id: null })),
    ...clients,
  ]) {
    const scope = etablissement_id ?? shop_id;
    const name = names.get(commercial_id);
    if (scope && name) broughtBy.set(scope, name);
  }
  return broughtBy;
}

export async function fetchCommerciaux(): Promise<CommercialRow[]> {
  const rows = await createClient()
    .from("commerciaux")
    .select(
      "id, email, first_name, last_name, invited_at, option_exercised_at, notice_given_at, ended_at, end_reason, discord_user_id, commission_percent, legal_acceptances(accepted_at, legal_versions!inner(version)), commercial_clients(id)"
    )
    .order("invited_at", { ascending: false })
    .then(must);
  return rows.map((row) => {
    const latest = [...row.legal_acceptances].sort(
      (a, b) => Date.parse(b.accepted_at) - Date.parse(a.accepted_at)
    )[0];
    return {
      id: row.id,
      email: row.email,
      name:
        row.first_name && row.last_name
          ? commercialName({ firstName: row.first_name, lastName: row.last_name })
          : null,
      invitedAt: row.invited_at,
      signed: latest
        ? { at: latest.accepted_at, version: latest.legal_versions.version }
        : null,
      optionExercisedAt: row.option_exercised_at,
      noticeGivenAt: row.notice_given_at,
      endedAt: row.ended_at,
      endReason: row.end_reason as EndReason | null,
      discordUserId: row.discord_user_id,
      signedRestaurants: row.commercial_clients.length,
      commissionPercent: row.commission_percent,
    };
  });
}

/**
 * Invite, ou renvoie un lien à une adresse déjà invitée : la route choisit
 * l'invitation ou la connexion selon l'état du compte.
 */
export async function inviteCommercial(email: string): Promise<void> {
  const response = await fetch("/api/admin/commerciaux", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error ?? "L'invitation a échoué.");
  }
}

export async function fetchDiscordMembers(): Promise<DiscordMember[]> {
  const response = await fetch("/api/admin/commerciaux/discord");
  const result = (await response.json().catch(() => ({}))) as DiscordMember[] | { error?: string };
  if (!response.ok || !Array.isArray(result)) {
    throw new Error(("error" in result && result.error) || "Membres Discord illisibles.");
  }
  return result;
}

/** Le compte Discord que le site mentionne pour ce commercial. */
export async function setDiscordMember(id: string, discordUserId: string | null): Promise<void> {
  check(await createClient().from("commerciaux").update({ discord_user_id: discordUserId }).eq("id", id));
}

/** Retire une invitation pas encore signée. */
export async function removeCommercial(id: string): Promise<void> {
  // Une suppression que la RLS écarte ne lève rien : seule la ligne rendue
  // prouve qu'elle a eu lieu.
  const removed = await createClient()
    .from("commerciaux")
    .delete()
    .eq("id", id)
    .select("id")
    .then(must);
  if (!removed.length) throw new Error("Invitation introuvable ou déjà retirée.");
}

/** Fin du contrat posée par l'admin (art. 7) ; la tâche du jour libère ses restaurants. */
export async function endContract(id: string, endedAt: string, reason: EndReason): Promise<void> {
  check(
    await createClient().from("commerciaux").update({ ended_at: endedAt, end_reason: reason }).eq("id", id)
  );
}

/** Taux propre du commercial (art. 4.6) : la base refuse une baisse. */
export async function setCommissionPercent(id: string, percent: number): Promise<void> {
  check(await createClient().rpc("admin_set_commission_percent", { p_commercial: id, p_percent: percent }));
}

/** Option de prolongation levée (art. 3.3). */
export async function exerciseOption(id: string): Promise<void> {
  check(
    await createClient()
      .from("commerciaux")
      .update({ option_exercised_at: new Date().toISOString() })
      .eq("id", id)
  );
}

// ---------------------------------------------------------------------------
// Clients et fiches

export type ClientPlace = Database["public"]["Functions"]["admin_client_places"]["Returns"][number];

export const fetchClientPlaces = () => createClient().rpc("admin_client_places").then(must);

export async function linkClient(
  restaurantId: string | null,
  place: { kind: string; id: string }
): Promise<string> {
  return must(
    await createClient().rpc("admin_link_client", {
      p_restaurant: restaurantId as string,
      p_etablissement: place.kind === "etablissement" ? place.id : undefined,
      p_shop: place.kind === "shop" ? place.id : undefined,
    })
  );
}

/** Départ posé par erreur : la fiche redevient cliente, le Client Apporté clos par ce départ est rouvert. */
export async function cancelClientDeparture(restaurantId: string) {
  check(await createClient().rpc("admin_cancel_client_departure", { p_restaurant: restaurantId }));
}

export async function setClientEnded(restaurantId: string, endedAt: string | null) {
  check(
    await createClient().rpc("admin_set_client_ended", {
      p_restaurant: restaurantId,
      p_ended_at: endedAt as string,
    })
  );
}

// ---------------------------------------------------------------------------
// Réglages

export type CommercialSettings = Tables<"commercial_settings">;

export const fetchSettings = () =>
  createClient().from("commercial_settings").select("*").single().then(must);

export async function updateSettings(patch: Partial<CommercialSettings>) {
  check(await createClient().from("commercial_settings").update(patch).eq("id", true));
}

// ---------------------------------------------------------------------------
// Relevés

/** Un fichier du bucket privé commercial-docs, ouvert dans un onglet (lecture admin). */
export async function openDocument(path: string) {
  const { data, error } = await createClient().storage.from("commercial-docs").download(path);
  if (error) throw new Error(error.message);
  window.open(URL.createObjectURL(data), "_blank", "noopener");
}

export interface StatementRow {
  id: string;
  commercial_id: string;
  commercial: string;
  month: string;
  total_cents: number;
  status: string;
  adjustments: { label: string; cents: number; month?: string; auto: boolean }[];
  sent_at: string | null;
  invoice_path: string | null;
  invoice_received_at: string | null;
  detail_requested_at: string | null;
  detail_sent_at: string | null;
  contested_at: string | null;
  contest_note: string | null;
  contest_resolved_at: string | null;
  contest_resolution: string | null;
  paid_at: string | null;
}

export async function fetchStatements(): Promise<StatementRow[]> {
  const rows = await createClient()
    .from("commercial_statements")
    .select(
      "id, commercial_id, month, total_cents, status, adjustments, sent_at, invoice_path, invoice_received_at, detail_requested_at, detail_sent_at, contested_at, contest_note, contest_resolved_at, contest_resolution, paid_at, commerciaux(email, first_name, last_name)"
    )
    .order("month", { ascending: false })
    .then(must);
  return rows.map(({ commerciaux: who, ...row }) => ({
    ...row,
    adjustments: row.adjustments as unknown as StatementRow["adjustments"],
    commercial: displayName(who),
  }));
}

/** Envoie les e-mails du contrat que le geste vient de mettre en file. */
const flushEmails = (): Promise<void> =>
  fetch("/api/commercial/envois", { method: "POST" }).then(
    () => undefined,
    () => undefined
  );

export async function draftStatement(commercialId: string, month: string) {
  must(await createClient().rpc("admin_statement_draft", { p_commercial: commercialId, p_month: month }));
}

export async function adjustStatement(id: string, label: string, cents: number) {
  check(await createClient().rpc("admin_statement_adjust", { p_statement: id, p_label: label, p_cents: cents }));
}

export async function sendStatement(id: string) {
  check(await createClient().rpc("admin_statement_send", { p_statement: id }));
  await flushEmails();
}

export async function markStatementPaid(id: string) {
  check(await createClient().rpc("admin_statement_paid", { p_statement: id }));
}

/** Réponse d'Ominin à une contestation (art. 5.4), lue par le commercial dans Argent. */
export async function resolveContest(id: string, resolution: string) {
  check(await createClient().rpc("admin_statement_resolve", { p_statement: id, p_resolution: resolution }));
}

export async function markDetailSent(id: string) {
  check(await createClient().rpc("admin_statement_detail_sent", { p_statement: id }));
  await flushEmails();
}

export async function recordPayment(input: { kind: string; id: string; cents: number; paidAt: string; note: string }) {
  must(
    await createClient().rpc("admin_record_payment", {
      p_etablissement: input.kind === "etablissement" ? input.id : (null as unknown as string),
      p_shop: input.kind === "shop" ? input.id : (null as unknown as string),
      p_cents: input.cents,
      p_paid_at: input.paidAt,
      p_note: input.note,
    })
  );
}

/** Commission estimée d'un commercial pour le mois en cours (heure de Paris). */
export async function monthCommission(commercialId: string): Promise<number> {
  const month = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 7) + "-01";
  const lines = await createClient().rpc("admin_month_lines", { p_commercial: commercialId, p_month: month }).then(must);
  return (lines as { commission_cents: number }[]).reduce((sum, line) => sum + line.commission_cents, 0);
}
