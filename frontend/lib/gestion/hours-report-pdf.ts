import { LAYOUT, pdfWriter } from "@/lib/commercial/pdf";
import { formatDifference, type HoursReport, type ReportPeriod, type ReportRow } from "./hours-report";
import { formatDuration } from "./temps";

/*
 * Le rapport d'heures à imprimer. Chargé à la demande depuis la feuille :
 * pdf-lib n'alourdit pas l'espace de gestion pour un geste de fin de mois.
 */

const cells = (row: ReportRow) => [
  row.open > 0 ? `${row.name} (${row.open} en cours)` : row.name,
  formatDuration(row.planned),
  formatDuration(row.worked),
  formatDifference(row.difference),
];

export async function hoursReportPdf(
  restaurant: string,
  { rows, total }: HoursReport,
  period: ReportPeriod
): Promise<Uint8Array> {
  const title = `Rapport d'heures — ${period.label}`;
  const doc = await pdfWriter({ title, subject: restaurant, date: new Date() });
  doc.paragraph(title, { font: doc.bold, size: LAYOUT.title });
  doc.paragraph(restaurant, { color: LAYOUT.muted });
  doc.gap();
  doc.gap();
  doc.tableRow(["Personne", "Prévu", "Badgé", "Écart"], doc.bold);
  doc.gap();
  for (const row of rows) doc.tableRow(cells(row));
  doc.gap();
  doc.tableRow(cells(total), doc.bold);
  doc.gap();
  doc.gap();
  doc.paragraph("Un créneau ou un pointage de nuit compte sur la journée où il commence.", { color: LAYOUT.muted });
  if (total.open > 0) {
    doc.paragraph(
      `Pointages en cours : ${total.open}, sans heure de départ, donc non comptés dans le badgé.`,
      { color: LAYOUT.muted }
    );
  }
  return doc.finish();
}
