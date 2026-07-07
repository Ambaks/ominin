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

export function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}
