/* Montants et dates d'Ominin Club, à l'heure de Paris quel que soit l'appareil. */

const EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const EUROS_CENTS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 105000 → « 1 050 € », 26250 → « 262,50 € » : les centimes n'apparaissent que s'il y en a, et alors tous les deux. */
export function formatCents(cents: number): string {
  return (cents % 100 === 0 ? EUROS : EUROS_CENTS).format(cents / 100).replace(/ /g, " ");
}

const PARIS = "Europe/Paris";

const DAY = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const DAY_SHORT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const TIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  hour: "2-digit",
  minute: "2-digit",
});

/** « samedi 24 octobre ». */
export const formatNight = (iso: string) => DAY.format(new Date(iso));
/** « sam. 24 oct. ». */
export const formatNightShort = (iso: string) => DAY_SHORT.format(new Date(iso));
/** « 23:00 – 06:00 ». */
export const formatHours = (startsAt: string, endsAt: string) =>
  `${TIME.format(new Date(startsAt))} – ${TIME.format(new Date(endsAt))}`;

/** Une table comme la porte la lit, partout (plan, passe, liste de la porte) : « VIP Salon Rouge · 03 ». */
export const tableName = (zone: string, label: string) => `${zone} · ${label}`;
