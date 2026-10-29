import { sendEmail, type MailAttachment } from "@/lib/gmail";
import { card, escapeHtml } from "@/lib/gestion/invite-notify";
import { contactEmail } from "@/lib/landing-data";
import { commercialPrefix, commercialSiteUrl } from "@/lib/site";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { PushEventKey } from "./api";
import { monthLabel } from "./labels";
import { notifyCommercial } from "./push";
import { displayName } from "./record";
import { statementCsv, statementFilename, statementPdf, type StatementLike } from "./statement";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Envoi des e-mails exigés par le contrat (commercial_emails) : la route qui
 * vient d'agir, puis en filet la tâche quotidienne, appellent flushOutbox.
 * sent_at est posé avant l'appel à Gmail : deux envois concurrents ne
 * partent qu'une fois ; un échec le remet à vide, la tâche suivante réessaie.
 */

interface OutboxRow {
  id: string;
  kind: string;
  commerciaux: { id: string; email: string; first_name: string | null; last_name: string | null };
  commercial_statements: StatementLike | null;
}

const EYEBROW = "Espace commercial";

interface Message {
  subject: string;
  heading: string;
  body: string;
  path: string;
  /** Notification push qui accompagne l'e-mail, selon les préférences du commercial. */
  push?: PushEventKey;
  attachments?: () => Promise<MailAttachment[]>;
}

/** Relevé envoyé (art. 5.1), détail des encaissements (art. 5.4), attestation URSSAF due (art. 2.5). */
function compose(row: OutboxRow): Message | null {
  if (row.kind === "urssaf") {
    return {
      subject: "Attestation URSSAF à déposer",
      heading: "Votre attestation de vigilance URSSAF.",
      body: "Vos commissions relev&eacute;es atteignent le seuil de l&rsquo;article 2.5 du contrat : d&eacute;posez dans votre espace, rubrique Compte, une attestation de vigilance URSSAF de moins de six mois.",
      path: "/espace/compte",
    };
  }
  const s = row.commercial_statements;
  if (!s) return null;
  const label = monthLabel(s.month);
  if (row.kind === "statement") {
    return {
      subject: `Votre relevé de commission — ${label}`,
      heading: `Relevé de ${escapeHtml(label)}.`,
      body: `Votre relevé de commission de ${escapeHtml(label)} est en pi&egrave;ce jointe et dans votre espace. Émettez votre facture et d&eacute;posez-la dans votre espace : Ominin la r&egrave;gle dans les d&eacute;lais de l&rsquo;article 5 du contrat.`,
      path: "/espace/argent",
      push: "releve",
      attachments: async () => [
        {
          filename: statementFilename(s.month),
          contentType: "application/pdf",
          content: Buffer.from(await statementPdf(s, displayName(row.commerciaux))),
        },
      ],
    };
  }
  if (row.kind === "detail") {
    return {
      subject: `Détail des encaissements — ${label}`,
      heading: "Le détail des encaissements.",
      body: `Comme demand&eacute; (article 5.4 du contrat), le d&eacute;tail des encaissements de vos Clients Apport&eacute;s pour le relev&eacute; de ${escapeHtml(label)} est en pi&egrave;ce jointe.`,
      path: "/espace/argent",
      attachments: async () => [
        { filename: `detail-${s.month.slice(0, 7)}.csv`, contentType: "text/csv", content: Buffer.from(statementCsv(s.lines), "utf-8") },
      ],
    };
  }
  return null;
}

export async function flushOutbox(admin: Admin): Promise<{ sent: number; failed: number }> {
  const { data, error } = await admin
    .from("commercial_emails")
    .select(
      "id, kind, commerciaux(id, email, first_name, last_name), commercial_statements(month, commission_percent, lines, adjustments, total_cents, sent_at)"
    )
    .is("sent_at", null)
    .order("created_at");
  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;
  for (const row of data as unknown as OutboxRow[]) {
    const message = compose(row);
    if (!message) continue;
    const { data: fenced } = await admin
      .from("commercial_emails")
      .update({ sent_at: new Date().toISOString(), last_error: null })
      .eq("id", row.id)
      .is("sent_at", null)
      .select("id");
    if (!fenced?.length) continue;
    try {
      const gmailId = await sendEmail(
        row.commerciaux.email,
        message.subject,
        card(
          message.heading,
          message.body,
          { label: "Ouvrir mon espace", url: `${commercialSiteUrl}${message.path}` },
          "E-mail envoy&eacute; en application de votre contrat de commercial ind&eacute;pendant Ominin. Conservez-le.",
          EYEBROW
        ),
        contactEmail,
        message.attachments ? await message.attachments() : []
      );
      await admin.from("commercial_emails").update({ gmail_message_id: gmailId }).eq("id", row.id);
      sent++;
      if (message.push) {
        await notifyCommercial(admin, row.commerciaux.id, message.push, {
          title: message.subject,
          body: message.heading,
          tag: `commercial-${row.id}`,
          url: `${commercialPrefix}${message.path}`,
        }).catch((cause) => console.error("[commercial] notification non envoyée", cause));
      }
    } catch (cause) {
      failed++;
      console.error("[commercial] e-mail non envoyé", row.id, cause);
      await admin
        .from("commercial_emails")
        .update({ sent_at: null, last_error: cause instanceof Error ? cause.message : String(cause) })
        .eq("id", row.id);
    }
  }
  return { sent, failed };
}
