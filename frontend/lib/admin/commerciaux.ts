import { commercialName } from "@/lib/commercial/record";
import { createClient } from "@/lib/supabase/client";
import { must } from "@/lib/supabase/result";

/*
 * Commerciaux invités et leur signature, lus sous RLS admin. L'invitation
 * passe par la route serveur : elle seule peut créer le lien d'accès.
 */

export interface CommercialRow {
  id: string;
  email: string;
  name: string | null;
  invitedAt: string;
  /** Dernière signature, null tant que le contrat n'est pas signé. */
  signed: { at: string; version: string } | null;
}

export async function fetchCommerciaux(): Promise<CommercialRow[]> {
  const rows = await createClient()
    .from("commerciaux")
    .select(
      "id, email, first_name, last_name, invited_at, legal_acceptances(accepted_at, legal_versions!inner(version))"
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
