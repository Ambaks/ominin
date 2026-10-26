import type { Json } from "@/lib/supabase/database.types";
import type { createAdminClient } from "@/lib/supabase/admin";
import {
  COMMERCIAL_COMMISSION_PERCENT,
  COMMERCIAL_OPTION_YEARS,
  COMMERCIAL_TERM_MONTHS,
} from "./constants";
import { acceptanceStatement } from "@/lib/commercial/record";
import { findVersion, versionInForce } from "./documents";
import { documentHash, shortHash } from "./hash";
import { requestFingerprint } from "./server";
import { LegalVersionError, type LegalDocument } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Signature du contrat de commercial. Même preuve que le contrat client —
 * version publiée à l'empreinte vérifiée, horodatage, IP, navigateur, écrits
 * par le service_role seul — mais un signataire différent : une personne, pas
 * un établissement, et une seule pièce signée.
 */

/** Identité déclarée à la signature : c'est elle que désigne « le Commercial ». */
export interface CommercialIdentity {
  firstName: string;
  lastName: string;
  siret: string;
  address: string;
  email: string;
  phone: string;
}

/**
 * Relevé recopié dans legal_acceptances.terms. Les chiffres du contrat y sont
 * figés : les constantes bougeront pour les signataires suivants, pas pour
 * celui-ci.
 */
export interface CommercialTerms {
  context: "commercial";
  version: string;
  identity: CommercialIdentity;
  /** Texte de la case cochée, tel qu'affiché. */
  acceptance: string;
  commissionPercent: number;
  termMonths: number;
  optionYears: number;
}

export interface CommercialSignature {
  id: string;
  acceptedAt: string;
  ip: string | null;
  userAgent: string | null;
  document: LegalDocument;
  hash: string;
  terms: CommercialTerms;
}

const SIRET = /^[0-9]{14}$/;

/**
 * Identité nettoyée, ou la liste de ce qui manque. Le SIRET s'accepte avec
 * espaces, comme il s'écrit sur un avis de situation.
 */
export function parseIdentity(
  input: unknown,
  email: string
): { identity: CommercialIdentity } | { missing: string[] } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const text = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
  const identity: CommercialIdentity = {
    firstName: text("firstName"),
    lastName: text("lastName"),
    siret: text("siret").replace(/\s+/g, ""),
    address: text("address"),
    email,
    phone: text("phone"),
  };
  const missing = [
    !identity.firstName && "prénom",
    !identity.lastName && "nom",
    !SIRET.test(identity.siret) && "SIRET (14 chiffres)",
    !identity.address && "adresse",
    !identity.phone && "téléphone",
  ].filter((field): field is string => Boolean(field));
  return missing.length ? { missing } : { identity };
}

/**
 * Version en vigueur, publiée en base avec la même empreinte — ou une
 * LegalVersionError. Un texte que l'empreinte enregistrée ne décrit plus ne
 * se fait pas signer.
 */
export async function publishedCommercialVersion(admin: Admin) {
  const document = versionInForce("commercial");
  const hash = documentHash(document);
  const { data, error } = await admin
    .from("legal_versions")
    .select("id, body_sha256")
    .eq("doc", "commercial")
    .eq("version", document.version)
    .maybeSingle();
  if (error) throw new LegalVersionError(`Contrat introuvable : ${error.message}`);
  if (!data) {
    throw new LegalVersionError(
      `Contrat de commercial ${document.version} absent de legal_versions — exécuter npm run legal:publish.`
    );
  }
  if (data.body_sha256 !== hash) {
    throw new LegalVersionError(
      `Le contrat de commercial ${document.version} ne correspond plus à sa version publiée ` +
        `(${shortHash(data.body_sha256)} ≠ ${shortHash(hash)}) — publier une nouvelle version.`
    );
  }
  return { id: data.id, document, hash };
}

const toSignature = (
  row: { id: string; accepted_at: string; ip: unknown; user_agent: string | null; terms: Json },
  document: LegalDocument
): CommercialSignature => ({
  id: row.id,
  acceptedAt: row.accepted_at,
  ip: typeof row.ip === "string" ? row.ip : null,
  userAgent: row.user_agent,
  document,
  hash: documentHash(document),
  terms: row.terms as unknown as CommercialTerms,
});

/**
 * Dernière signature de ce commercial, avec le texte qu'elle désigne. Le
 * texte vient du dépôt, retrouvé par sa version : le dépôt garde toutes les
 * versions publiées (documents/index.ts).
 */
export async function latestCommercialSignature(
  admin: Admin,
  commercialId: string
): Promise<CommercialSignature | null> {
  const { data, error } = await admin
    .from("legal_acceptances")
    .select("id, accepted_at, ip, user_agent, terms, legal_versions!inner(doc, version)")
    .eq("commercial_id", commercialId)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  // La jointure !inner rend un objet, typé en tableau par le client.
  const { version } = data.legal_versions as unknown as { version: string };
  const document = findVersion("commercial", version);
  if (!document) {
    throw new Error(`Contrat de commercial ${version} absent du dépôt.`);
  }
  return toSignature(data, document);
}

/**
 * Enregistre la signature de la version en vigueur — l'appelant a vérifié que
 * c'est celle affichée à l'écran. Rend null si elle est déjà signée.
 */
export async function signCommercialContract(
  admin: Admin,
  {
    userId,
    commercialId,
    identity,
    request,
  }: {
    userId: string;
    commercialId: string;
    identity: CommercialIdentity;
    request: Request;
  }
): Promise<CommercialSignature | null> {
  const { id: versionId, document } = await publishedCommercialVersion(admin);

  const terms: CommercialTerms = {
    context: "commercial",
    version: document.version,
    identity,
    acceptance: acceptanceStatement(document.version),
    commissionPercent: COMMERCIAL_COMMISSION_PERCENT,
    termMonths: COMMERCIAL_TERM_MONTHS,
    optionYears: COMMERCIAL_OPTION_YEARS,
  };
  const { data, error } = await admin
    .from("legal_acceptances")
    .insert({
      version_id: versionId,
      user_id: userId,
      signatory_email: identity.email,
      scope: "commercial",
      scope_label: `${identity.firstName} ${identity.lastName} EI — SIRET ${identity.siret}`,
      commercial_id: commercialId,
      ...requestFingerprint(request),
      terms: terms as unknown as Json,
    })
    .select("id, accepted_at, ip, user_agent, terms")
    .single();
  // Version déjà signée (index unique) : null, l'appelant répond 409.
  if (error?.code === "23505") return null;
  if (error) throw new Error(error.message);
  return toSignature(data, document);
}
