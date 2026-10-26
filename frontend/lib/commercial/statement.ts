import { formatEuros } from "@/lib/admin/format";
import { COMMERCIAL_COMMISSION_PERCENT, COMMERCIAL_PAYMENT_DAYS } from "@/lib/legal/constants";
import type { MonthLine, Statement } from "./api";
import { LAYOUT, pdfWriter } from "./pdf";

/*
 * Relevé mensuel (art. 5.1) : par Client Apporté, l'assiette et la commission,
 * puis les régularisations et le total. Le même relevé en PDF (envoi par
 * e-mail, téléchargement) et en CSV (détail des encaissements, export).
 */

type StatementLike = Pick<Statement, "month" | "lines" | "adjustments" | "total_cents" | "sent_at">;

const euros = (cents: number) => formatEuros(cents / 100);

export const monthLabel = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });

export const statementFilename = (month: string) => `releve-ominin-${month.slice(0, 7)}.pdf`;

export async function statementPdf(statement: StatementLike, commercial: string): Promise<Uint8Array> {
  const label = monthLabel(statement.month);
  const doc = await pdfWriter({
    title: `Relevé de commission — ${label}`,
    subject: `Relevé de ${commercial}`,
    date: new Date(statement.sent_at ?? `${statement.month}T00:00:00Z`),
  });
  doc.paragraph(`Relevé de commission — ${label}`, { font: doc.bold, size: LAYOUT.title });
  doc.paragraph(`${commercial} · commission de ${COMMERCIAL_COMMISSION_PERCENT} % du chiffre d'affaires net encaissé par Ominin (article 4).`, {
    color: LAYOUT.muted,
  });

  doc.heading("Clients apportés");
  for (const line of statement.lines) {
    doc.paragraph(line.name, { font: doc.bold });
    doc.row("Commandes en ligne", euros(line.menu_cents));
    doc.row("Boutique", euros(line.shop_cents));
    doc.row("Réservations club", euros(line.club_cents));
    doc.row("Factures Ominin", euros(line.invoice_cents));
    doc.row("Assiette", euros(line.base_cents));
    doc.row("Commission", euros(line.commission_cents));
    doc.gap();
  }
  if (statement.adjustments.length) {
    doc.heading("Régularisations");
    for (const adjustment of statement.adjustments) doc.row(euros(adjustment.cents), adjustment.label);
  }
  doc.heading("Total");
  doc.row("Commission due", euros(statement.total_cents));
  doc.gap();
  doc.paragraph(
    `Sur la base de ce relevé, émettez votre facture et déposez-la dans votre espace : Ominin la règle par virement dans les ${COMMERCIAL_PAYMENT_DAYS} jours suivant sa réception (article 5).`
  );
  return doc.finish();
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Détail des encaissements par client et par source, en euros. */
export function statementCsv(lines: MonthLine[]): string {
  const header = ["Client", "Commandes en ligne", "Boutique", "Club", "Factures", "Assiette", "Commission"];
  const rows = lines.map((line) =>
    [line.name, line.menu_cents, line.shop_cents, line.club_cents, line.invoice_cents, line.base_cents, line.commission_cents]
      .map((value, index) => (index === 0 ? value : (Number(value) / 100).toFixed(2).replace(".", ",")))
  );
  return [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}
