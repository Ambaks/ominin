/** Variable d'environnement du workflow social-render, absente = erreur
 * claire plutôt qu'un appel qui échoue plus loin. */
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante`);
  return value;
}
