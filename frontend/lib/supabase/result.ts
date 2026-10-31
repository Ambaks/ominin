/*
 * Déballage des réponses PostgREST ({ data, error }) en valeur ou exception.
 * data est nul exactement quand error est présent (hors maybeSingle, qui ne
 * passe pas par ici) : NonNullable reflète cette garantie côté types.
 */

export function must<T>(result: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  if (result.data == null) throw new Error("Réponse vide de Supabase.");
  return result.data;
}

/** Une page de liste, et tout ce qui correspond à la requête au-delà d'elle. */
export interface ListPage<Row> {
  rows: Row[];
  total: number;
}

/** Pour une requête lue avec `{ count: "exact" }` et `.range()`. */
export function mustPage<Row>(result: {
  data: Row[] | null;
  count: number | null;
  error: { message: string } | null;
}): ListPage<Row> {
  if (result.error) throw new Error(result.error.message);
  return { rows: result.data ?? [], total: result.count ?? 0 };
}

export function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}
