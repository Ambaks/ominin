import type { CommercialIdentity, CommercialSignature } from "@/lib/legal/commercial";

/*
 * Relevé de signature : le même dans l'espace, l'e-mail, le PDF et l'admin.
 * Module sans dépendance serveur, importable par les écrans client.
 */

/** Horodatage lu à Paris, à la seconde : c'est l'heure qui fait foi. */
export const parisDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Europe/Paris",
  });

/**
 * Case cochée à la signature, mot pour mot. Recopiée dans le relevé
 * (legal_acceptances.terms) : c'est elle, telle qu'affichée, qui fait
 * l'acceptation.
 */
export const acceptanceStatement = (version: string) =>
  `J’ai lu le contrat de commercial indépendant, version ${version}, notamment sa durée, l’option de prolongation d’Ominin et la commission, et je l’accepte. Je reconnais à cette signature électronique la valeur d’une signature manuscrite.`;

/** Nom d'usage d'un commercial (écrans, notifications) : prénom et nom, à défaut l'adresse. */
export const displayName = (c: { first_name: string | null; last_name: string | null; email: string }) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;

/** Le contrat désigne le Commercial comme entrepreneur individuel. */
export const commercialName = ({
  firstName,
  lastName,
}: Pick<CommercialIdentity, "firstName" | "lastName">) => `${firstName} ${lastName} EI`;

export function signatureRecord(signature: CommercialSignature): [string, string][] {
  const { document, terms } = signature;
  const { identity } = terms;
  return [
    ["Commercial", commercialName(identity)],
    ["SIRET", identity.siret],
    ["Adresse", identity.address],
    ["E-mail", identity.email],
    ["Téléphone", identity.phone],
    ["Contrat", `${document.title}, version ${document.version}`],
    ["Signé le", `${parisDateTime(signature.acceptedAt)} (heure de Paris)`],
    ["Adresse IP", signature.ip ?? "non relevée"],
    ["Navigateur", signature.userAgent ?? "non relevé"],
    ["Empreinte SHA-256", signature.hash],
  ];
}

/** Mention de signature, sous le relevé : qui, quand, et la case cochée. */
export const signatureStatement = ({ acceptedAt, terms }: CommercialSignature) =>
  `Signé électroniquement par ${commercialName(terms.identity)} le ${parisDateTime(acceptedAt)} (heure de Paris), en cochant la case : « ${terms.acceptance} »`;
