import { commercialName } from "@/lib/commercial/record";
import { KIT_DECK_PATH } from "@/lib/commercial/kit";
import type { Product } from "@/lib/commercial/labels";
import { createClient } from "@/lib/supabase/client";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";

/*
 * Commerciaux invités, leurs déclarations et les réglages de l'espace, lus
 * sous RLS admin. Les écritures qui engagent le contrat passent par les
 * fonctions admin_* de la base ; l'invitation, par la route serveur (elle
 * seule peut créer le lien d'accès).
 */

export type EndReason = "term" | "resignation" | "breach" | "immediate" | "mutual";

export const CONTRACT_END_LABELS: Record<EndReason, string> = {
  term: "Échéance",
  resignation: "Résiliation par le commercial (art. 7.2)",
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
  active: number;
  signedRestaurants: number;
}

export async function fetchCommerciaux(): Promise<CommercialRow[]> {
  const rows = await createClient()
    .from("commerciaux")
    .select(
      "id, email, first_name, last_name, invited_at, option_exercised_at, notice_given_at, ended_at, end_reason, legal_acceptances(accepted_at, legal_versions!inner(version)), commercial_declarations(status)"
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
      active: row.commercial_declarations.filter((d) => d.status === "pending" || d.status === "confirmed").length,
      signedRestaurants: row.commercial_declarations.filter((d) => d.status === "signed").length,
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

/** Fin du contrat posée par l'admin (art. 7) ; la tâche du jour libère ses réservations. */
export async function endContract(id: string, endedAt: string, reason: EndReason): Promise<void> {
  check(
    await createClient().from("commerciaux").update({ ended_at: endedAt, end_reason: reason }).eq("id", id)
  );
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
// Déclarations

export type AdminDeclaration =
  Database["public"]["Functions"]["admin_declarations"]["Returns"][number];

export interface EmailState {
  kind: string;
  created_at: string;
  sent_at: string | null;
  gmail_message_id: string | null;
  last_error: string | null;
}

export const fetchDeclarations = () => createClient().rpc("admin_declarations").then(must);

/** Envoie les e-mails du contrat que la décision vient de mettre en file. */
async function flushEmails() {
  await fetch("/api/commercial/envois", { method: "POST" }).catch(() => undefined);
}

export async function decide(id: string, decision: "confirm" | "refuse", reason: string) {
  check(
    await createClient().rpc("admin_decide_declaration", {
      p_declaration: id,
      p_decision: decision,
      p_reason: reason,
    })
  );
  await flushEmails();
}

export async function recordEmailDeclaration(input: {
  commercialId: string;
  restaurantId: string;
  declaredAt: string;
  products: Product[];
  contactRole: string;
}) {
  check(
    await createClient().rpc("admin_record_email_declaration", {
      p_commercial: input.commercialId,
      p_restaurant: input.restaurantId,
      p_declared_at: input.declaredAt,
      p_products: input.products,
      p_contact: { role: input.contactRole } as Json,
    })
  );
  await flushEmails();
}

/** L'accord écrit du titulaire est déposé, puis la réattribution le cite. */
export async function reassign(id: string, commercialId: string, reason: string, agreement: File) {
  const path = `reattributions/${id}/${agreement.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await createClient()
    .storage.from("commercial-docs")
    .upload(path, agreement, { upsert: true });
  if (error) throw new Error(error.message);
  check(
    await createClient().rpc("admin_reassign_declaration", {
      p_declaration: id,
      p_commercial: commercialId,
      p_reason: reason,
      p_document: path,
    })
  );
  await flushEmails();
}

export async function markSigned(id: string, place: { kind: string; id: string }) {
  check(
    await createClient().rpc("admin_mark_signed", {
      p_declaration: id,
      p_etablissement: place.kind === "etablissement" ? place.id : undefined,
      p_shop: place.kind === "shop" ? place.id : undefined,
    })
  );
  await flushEmails();
}

export async function setInTalks(restaurantId: string, value: boolean | null) {
  check(
    await createClient().rpc("admin_set_in_talks", {
      p_restaurant: restaurantId,
      p_value: value as boolean,
    })
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

export async function setClientEnded(restaurantId: string, endedAt: string | null) {
  check(
    await createClient().rpc("admin_set_client_ended", {
      p_restaurant: restaurantId,
      p_ended_at: endedAt as string,
    })
  );
}

// ---------------------------------------------------------------------------
// Réglages et Kit

export type CommercialSettings = Tables<"commercial_settings">;

export const fetchSettings = () =>
  createClient().from("commercial_settings").select("*").single().then(must);

export async function updateSettings(patch: Partial<CommercialSettings>) {
  check(await createClient().from("commercial_settings").update(patch).eq("id", true));
}

export async function uploadDeck(file: File) {
  const { error } = await createClient()
    .storage.from("commercial-docs")
    .upload(KIT_DECK_PATH, file, { upsert: true, contentType: "application/pdf" });
  if (error) throw new Error(error.message);
}

export async function deckUploaded(): Promise<boolean> {
  const { data } = await createClient().storage.from("commercial-docs").list("kit");
  return Boolean(data?.some((file) => `kit/${file.name}` === KIT_DECK_PATH));
}

// ---------------------------------------------------------------------------
// Lot 2 : démos, inscriptions, fusion

export interface DemoRow {
  id: string;
  status: string;
  note: string | null;
  photos: string[];
  demo_url: string | null;
  created_at: string;
  restaurant: string;
  commercial: string;
}

export async function fetchDemoRequests(): Promise<DemoRow[]> {
  const rows = await createClient()
    .from("commercial_demo_requests")
    .select(
      "id, status, note, photos, demo_url, created_at, commercial_declarations(crm_restaurants(name), commerciaux(email, first_name, last_name))"
    )
    .order("created_at", { ascending: false })
    .then(must);
  return rows.map((row) => {
    const who = row.commercial_declarations.commerciaux;
    return {
      id: row.id,
      status: row.status,
      note: row.note,
      photos: row.photos,
      demo_url: row.demo_url,
      created_at: row.created_at,
      restaurant: row.commercial_declarations.crm_restaurants.name,
      commercial: [who.first_name, who.last_name].filter(Boolean).join(" ") || who.email,
    };
  });
}

/** Un fichier du bucket privé commercial-docs, ouvert dans un onglet (lecture admin). */
export async function openDocument(path: string) {
  const { data, error } = await createClient().storage.from("commercial-docs").download(path);
  if (error) throw new Error(error.message);
  window.open(URL.createObjectURL(data), "_blank", "noopener");
}

export async function deliverDemo(id: string, url: string) {
  check(await createClient().rpc("admin_deliver_demo", { p_request: id, p_url: url }));
  await flushEmails();
}

export type SignupMatch = Database["public"]["Functions"]["admin_signup_matches"]["Returns"][number];

export const fetchSignupMatches = () => createClient().rpc("admin_signup_matches").then(must);

export interface PendingClient {
  id: string;
  alert: string | null;
  created_at: string;
  name: string;
  commercial: string;
}

/** Inscriptions par lien trop différentes de la fiche : hors relevé avant validation. */
export async function fetchPendingClients(): Promise<PendingClient[]> {
  const rows = await createClient()
    .from("commercial_clients")
    .select("id, alert, created_at, commercial_declarations(crm_restaurants(name), commerciaux(email, first_name, last_name))")
    .is("validated_at", null)
    .order("created_at")
    .then(must);
  return rows.map((row) => {
    const who = row.commercial_declarations.commerciaux;
    return {
      id: row.id,
      alert: row.alert,
      created_at: row.created_at,
      name: row.commercial_declarations.crm_restaurants.name,
      commercial: [who.first_name, who.last_name].filter(Boolean).join(" ") || who.email,
    };
  });
}

export async function validateClient(id: string) {
  check(await createClient().rpc("admin_validate_client", { p_client: id }));
}

export async function mergeRestaurants(keep: string, drop: string, note: string) {
  check(await createClient().rpc("admin_merge_restaurants", { p_keep: keep, p_drop: drop, p_note: note }));
  await flushEmails();
}

// ---------------------------------------------------------------------------
// Lot 3 : relevés

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
  paid_at: string | null;
}

export async function fetchStatements(): Promise<StatementRow[]> {
  const rows = await createClient()
    .from("commercial_statements")
    .select(
      "id, commercial_id, month, total_cents, status, adjustments, sent_at, invoice_path, invoice_received_at, detail_requested_at, detail_sent_at, contested_at, contest_note, paid_at, commerciaux(email, first_name, last_name)"
    )
    .order("month", { ascending: false })
    .then(must);
  return rows.map(({ commerciaux: who, ...row }) => ({
    ...row,
    adjustments: row.adjustments as unknown as StatementRow["adjustments"],
    commercial: [who.first_name, who.last_name].filter(Boolean).join(" ") || who.email,
  }));
}

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

/** Nouvel établissement du même exploitant (art. 4.4), sur la même déclaration. */
export async function addSameOwner(declarationId: string, place: { kind: string; id: string }) {
  must(
    await createClient().rpc("admin_add_client", {
      p_declaration: declarationId,
      p_etablissement: place.kind === "etablissement" ? place.id : undefined,
      p_shop: place.kind === "shop" ? place.id : undefined,
    })
  );
}
