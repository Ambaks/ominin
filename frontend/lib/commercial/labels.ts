import { formatEuros } from "@/lib/admin/format";

/** Mois d'un relevé (son premier jour) en toutes lettres, à Paris : « octobre 2026 ». */
export const monthLabel = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });

/** Centimes affichés en euros. */
export const euros = (cents: number) => formatEuros(cents / 100);
