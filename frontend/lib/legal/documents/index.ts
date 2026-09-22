import { LegalVersionError, type LegalDoc, type LegalDocument, type SignedDoc } from "../types";
import { cgv } from "./cgv";
import { confidentialite } from "./confidentialite";
import { dpa } from "./dpa";

/*
 * Toutes les versions publiées de chaque document, de la plus ancienne à la
 * plus récente. Une nouvelle version s'ajoute au tableau, on ne remplace
 * jamais : les acceptations déjà signées pointent les précédentes, et leur
 * texte doit rester lisible.
 *
 * Attention avant de toucher au texte d'une version publiée, même pour une
 * coquille, même dans la politique de confidentialité : son empreinte ne
 * correspondrait plus à celle enregistrée, et le serveur refuserait alors
 * toute signature — donc tout paiement — jusqu'à publication d'une nouvelle
 * version. C'est voulu (on ne fait pas signer un texte que l'empreinte ne
 * décrit plus), mais la correction passe par une version nouvelle, jamais
 * par une retouche. Changer un tarif dans lib/landing-data.ts a le même
 * effet sur les CGV.
 */
export const documents: Record<LegalDoc, LegalDocument[]> = {
  cgv: [cgv],
  dpa: [dpa],
  confidentialite: [confidentialite],
};

const byEffectiveDate = (a: LegalDocument, b: LegalDocument) =>
  Date.parse(a.effectiveFrom) - Date.parse(b.effectiveFrom);

/**
 * Version en vigueur : la plus récente déjà entrée en vigueur. Une version
 * publiée pour une date future court son préavis — elle est annoncée, mais
 * n'engage encore personne.
 */
export function versionInForce(doc: LegalDoc, at = new Date()): LegalDocument {
  const live = documents[doc]
    .filter((version) => Date.parse(version.effectiveFrom) <= at.getTime())
    .sort(byEffectiveDate);
  const current = live.at(-1);
  if (!current) {
    // Un document sans version en vigueur ne peut pas être signé. L'erreur est
    // typée : les appelants la traduisent en message lisible — la laisser
    // remonter en Error nue ferait tomber les pages publiques et les deux
    // routes de paiement d'un coup.
    throw new LegalVersionError(`Aucune version en vigueur pour « ${doc} ».`);
  }
  return current;
}

/**
 * Retrouve la version d'un document par son numéro. Sert à confronter chaque
 * ligne de legal_versions au texte que le dépôt sert encore.
 */
export const findVersion = (doc: string, version: string) =>
  documents[doc as LegalDoc]?.find(
    (candidate) => candidate.version === version
  );

/** Version publiée mais pas encore en vigueur, s'il y en a une : le préavis. */
export function pendingVersion(
  doc: LegalDoc,
  at = new Date()
): LegalDocument | undefined {
  return documents[doc]
    .filter((version) => Date.parse(version.effectiveFrom) > at.getTime())
    .sort(byEffectiveDate)[0];
}

/** Les versions que le client signe, telles qu'elles courent aujourd'hui. */
export const signedVersionsInForce = (
  at = new Date()
): Record<SignedDoc, string> => ({
  cgv: versionInForce("cgv", at).version,
  dpa: versionInForce("dpa", at).version,
});

export { cgv, confidentialite, dpa };
