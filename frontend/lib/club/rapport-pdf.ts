import { LAYOUT, pdfWriter } from "@/lib/commercial/pdf";
import { formatCents, formatDateTime, formatHours, formatNight } from "./format";
import { ETAT_LABELS, RAPPORT_PERIMETRE, rapportSections, type Rapport } from "./rapport";

/*
 * Le rapport financier d'une soirée, à imprimer ou à transmettre au
 * comptable. Chargé à la demande depuis la page : pdf-lib n'alourdit pas
 * l'espace de gestion.
 */

export async function rapportPdf(
  club: string,
  event: { title: string; startsAt: string; endsAt: string },
  rapport: Rapport
): Promise<Uint8Array> {
  const title = `Rapport financier — ${event.title}`;
  const doc = await pdfWriter({ title, subject: club, date: new Date(rapport.genere_le) });
  doc.paragraph(title, { font: doc.bold, size: LAYOUT.title });
  doc.paragraph(`${club} · ${formatNight(event.startsAt)} · ${formatHours(event.startsAt, event.endsAt)}`, {
    color: LAYOUT.muted,
  });
  doc.paragraph(`Établi le ${formatDateTime(rapport.genere_le)}`, { color: LAYOUT.muted });

  for (const section of rapportSections(rapport.totaux)) {
    doc.heading(section.title);
    for (const chiffre of section.chiffres) {
      const value = chiffre.money ? formatCents(chiffre.value) : String(chiffre.value);
      doc.row(chiffre.label, chiffre.hint ? `${value} · ${chiffre.hint}` : value);
    }
  }

  doc.heading("Par zone");
  doc.tableRow(["Zone", "Résa.", "Acomptes nets", "Sur place", "Reste"], doc.bold);
  doc.gap();
  for (const zone of rapport.zones) {
    doc.tableRow([
      zone.name,
      String(zone.reservations),
      formatCents(zone.acomptes_nets_cents),
      formatCents(zone.sur_place_cents),
      formatCents(zone.reste_cents),
    ]);
  }

  doc.heading("Détail des réservations");
  doc.tableRow(["Réservation", "Prix", "Acompte net", "Sur place", "Reste"], doc.bold);
  doc.gap();
  for (const ligne of rapport.reservations) {
    const place = ligne.table_label ? `${ligne.zone_name} · ${ligne.table_label}` : `${ligne.zone_name}, à placer`;
    doc.tableRow([
      `${ligne.name} — ${place} — ${ETAT_LABELS[ligne.etat]}`,
      formatCents(ligne.price_cents),
      formatCents(ligne.en_ligne_cents - ligne.rembourse_cents),
      formatCents(ligne.sur_place_cents),
      formatCents(ligne.reste_cents),
    ]);
  }

  doc.heading("Paiements et remboursements");
  if (rapport.paiements.length === 0) doc.paragraph("Aucun paiement enregistré.", { color: LAYOUT.muted });
  for (const paiement of rapport.paiements) {
    const refunded = paiement.status === "remboursee";
    doc.tableRow([
      `${formatDateTime(paiement.paid_at)} — ${paiement.name} — ${paiement.method === "en_ligne" ? "en ligne" : "sur place"}${
        refunded ? ` — remboursé le ${formatDateTime(paiement.refunded_at)}` : ""
      }`,
      formatCents(paiement.amount_cents),
    ]);
  }

  doc.gap();
  doc.gap();
  doc.paragraph(RAPPORT_PERIMETRE, { color: LAYOUT.muted });
  return doc.finish();
}
