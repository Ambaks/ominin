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
