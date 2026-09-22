import { createHash } from "node:crypto";
import type { LegalDocument } from "./types";

/*
 * Empreinte d'un document. Elle couvre le texte des articles et l'annexe
 * tarifaire, qui est engendrée depuis lib/landing-data.ts : changer un prix
 * change donc l'empreinte. Comme le script de publication refuse de réécrire
 * une version dont l'empreinte a bougé, un changement de tarif impose une
 * nouvelle version — donc le préavis et la réacceptation. C'est le schéma qui
 * tient la procédure, pas la mémoire de qui déploie.
 *
 * Sérialisation explicite plutôt que JSON.stringify de l'objet entier : le
 * jour où LegalDocument gagne un champ d'affichage, l'empreinte des versions
 * déjà signées ne doit pas bouger.
 */
export function documentHash(document: LegalDocument): string {
  const canonical = JSON.stringify([
    document.doc,
    document.version,
    // La date d'effet est contractuelle autant que le texte : c'est elle qui
    // dit à partir de quand le tarif s'applique. Hors empreinte, on pouvait
    // publier une version à quarante jours, puis avancer sa date à
    // aujourd'hui sans que rien ne s'y oppose — le préavis devenait
    // décoratif.
    document.effectiveFrom,
    document.title,
    document.articles.map((article) => [article.heading, article.body]),
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Longueur du repère affiché : de quoi distinguer deux versions à l'œil et
 * recopier sans se tromper, pas un contrôle de sécurité — celui-ci tient à
 * l'empreinte entière, enregistrée avec l'acceptation.
 */
const SHORT_HASH_LENGTH = 12;

/** Empreinte abrégée, affichée en pied de document pour vérification. */
export const shortHash = (hash: string) => hash.slice(0, SHORT_HASH_LENGTH);
