import { normalizeText } from "./format";

/** « Le Petit Restaurant », « Palavas » → « le-petit-restaurant-palavas ». */
export function slugify(...parts: (string | null | undefined)[]): string {
  const slug = normalizeText(parts.filter(Boolean).join(" "))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "restaurant";
}

/**
 * Rend le slug unique contre l'ensemble fourni (suffixe -2, -3…) et l'y
 * ajoute : les appels successifs d'un même lot ne se marchent pas dessus.
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  let candidate = base;
  for (let i = 2; taken.has(candidate); i += 1) {
    candidate = `${base}-${i}`;
  }
  taken.add(candidate);
  return candidate;
}
