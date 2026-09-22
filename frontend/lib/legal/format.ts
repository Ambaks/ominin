/*
 * Mise en forme partagée par les documents. Les montants viennent tous de
 * lib/landing-data.ts — aucun prix n'est écrit dans un contrat.
 */

export const euros = (amount: number) =>
  amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });

/*
 * Date lue à Paris, quel que soit le fuseau du serveur. Les dates d'effet
 * sont posées à minuit heure de Paris, soit la veille en UTC : rendue sur
 * Vercel sans fuseau explicite, une version applicable le 22 s'affichait
 * « 21 septembre » sur la page des CGV et dans l'avis envoyé aux clients.
 */
export const frenchDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Paris",
    })
    // Le premier du mois s'écrit « 1er » ; Intl ne le fait pas, et une date
    // d'effet mal écrite se remarque sur un avis contractuel.
    .replace(/^1 /, "1er ");

/*
 * Date d'effet d'une version, à minuit heure de Paris. Écrite en UTC, une
 * date d'effet « 2026-09-22T00:00:00Z » ne prend effet qu'à 2 h du matin à
 * Paris : entre minuit et 2 h, plus aucune version n'est en vigueur et tout
 * ce qui en dépend tombe. Les clients sont en France, la frontière est la
 * leur. Le décalage est mesuré sur la date visée — il vaut 1 h en hiver, 2 h
 * en été, et le passage à l'heure d'hiver ne décale donc rien.
 */
export function parisEffectiveDate(day: string): string {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(utcMidnight)) {
    throw new Error(`Date d'effet illisible : « ${day} » (attendu AAAA-MM-JJ).`);
  }
  // Heure murale parisienne de cet instant, au format « 2026-09-22 02:00:00 ».
  const wall = new Date(utcMidnight).toLocaleString("sv-SE", {
    timeZone: "Europe/Paris",
  });
  const offset = Date.parse(`${wall.replace(" ", "T")}Z`) - utcMidnight;
  return new Date(utcMidnight - offset).toISOString();
}
