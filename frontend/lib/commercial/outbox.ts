import { OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { sendEmail, type MailAttachment } from "@/lib/gmail";
import { card, escapeHtml } from "@/lib/gestion/invite-notify";
import { contactEmail } from "@/lib/landing-data";
import { frenchDate } from "@/lib/legal/format";
import { commercialPrefix, commercialSiteUrl } from "@/lib/site";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { MonthLine, PushEventKey, Statement } from "./api";
import { END_LABELS, LEA_LABELS, REFUSAL_LABELS, type EndReason, type RefusalReason } from "./labels";
import { notifyCommercial } from "./push";
import { monthLabel, statementCsv, statementFilename, statementPdf } from "./statement";

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
  detail: string | null;
  declaration_id: string | null;
  commerciaux: { id: string; email: string; first_name: string | null; last_name: string | null };
  commercial_statements: (Pick<Statement, "month" | "adjustments" | "total_cents" | "sent_at"> & { lines: MonthLine[] }) | null;
  commercial_declarations: {
    restaurant_id: string;
    declared_at: string;
    confirm_deadline: string | null;
    reserved_until: string | null;
    ended_at: string | null;
    decision_note: string | null;
    refusal_reason: RefusalReason | null;
    end_reason: EndReason | null;
    crm_restaurants: { name: string; address: string | null; city: string | null };
  } | null;
}

const EYEBROW = "Espace commercial";

const where = (r: { name: string; address: string | null; city: string | null }) =>
  escapeHtml([r.name, [r.address, r.city].filter(Boolean).join(", ")].filter(Boolean).join(", "));

interface Message {
  subject: string;
  heading: string;
  body: string;
  path: string;
  /** Notification push qui accompagne l'e-mail, selon les préférences du commercial. */
  push?: PushEventKey;
  attachments?: () => Promise<MailAttachment[]>;
}

const fullName = (row: OutboxRow) =>
  [row.commerciaux.first_name, row.commerciaux.last_name].filter(Boolean).join(" ") || row.commerciaux.email;

/** Relevé envoyé (art. 5.1) et détail des encaissements (art. 5.4). */
function composeStatement(row: OutboxRow): Message | null {
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
          content: Buffer.from(await statementPdf(s, fullName(row))),
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

/** Sujet et corps HTML de chaque sorte d'e-mail. */
function compose(row: OutboxRow): Message | null {
  const d = row.commercial_declarations;
  if (!d) return composeStatement(row);
  const r = d.crm_restaurants;
  const declared = frenchDate(d.declared_at);
  const path = `/espace/restaurants/${d.restaurant_id}`;
  switch (row.kind) {
    case "confirmed":
      return {
        subject: `Déclaration confirmée : ${r.name}`,
        heading: "Déclaration confirmée.",
        body:
          (row.detail === "tacit"
            ? `Ominin n&rsquo;a pas r&eacute;pondu dans le d&eacute;lai pr&eacute;vu &agrave; l&rsquo;article 4.3 du contrat : votre d&eacute;claration du ${declared} pour ${where(r)} est confirm&eacute;e de droit le ${frenchDate(d.confirm_deadline!)}.`
            : row.detail === "reassigned"
              ? `Avec l&rsquo;accord &eacute;crit du commercial qui l&rsquo;avait d&eacute;clar&eacute;, Ominin vous attribue ${where(r)}.`
              : `Ominin confirme l&rsquo;enregistrement de votre d&eacute;claration du ${declared} pour ${where(r)} (article 4.3 du contrat).`) +
          ` Le restaurant vous est r&eacute;serv&eacute; jusqu&rsquo;au ${frenchDate(d.reserved_until!)} : s&rsquo;il s&rsquo;inscrit d&rsquo;ici l&agrave;, il devient votre Client Apport&eacute;.`,
        path,
      };
    case "refused":
      return {
        subject: `Déclaration refusée : ${r.name}`,
        heading: "Déclaration non enregistrée.",
        body: `Ominin ne peut pas enregistrer votre d&eacute;claration du ${declared} pour ${where(r)} : ${escapeHtml(REFUSAL_LABELS[d.refusal_reason ?? "admin"])}${d.decision_note ? ` (${escapeHtml(d.decision_note)})` : ""}. Article 4.3 du contrat.`,
        path,
      };
    case "signed":
      return {
        subject: `${r.name} s'est inscrit chez Ominin`,
        heading: "Votre restaurant s’est inscrit.",
        body: `${where(r)}, que vous avez d&eacute;clar&eacute; le ${declared}, a sign&eacute; avec Ominin le ${frenchDate(d.ended_at!)}. C&rsquo;est un Client Apport&eacute; (articles 4.3 et 6.2 du contrat).`,
        path: "/espace/clients",
        push: "inscription",
      };
    case "demo_ready":
      return {
        subject: `Démo prête : ${r.name}`,
        heading: "Sa démo est prête.",
        body: `La d&eacute;mo &agrave; ses couleurs de ${where(r)} est en ligne : ${escapeHtml(row.detail ?? "")}. Elle est aussi sur la fiche du restaurant, dans votre espace.`,
        path,
        push: "demo",
      };
    case "opposition":
      return {
        subject: `${r.name} ne veut plus être contacté`,
        heading: "Le restaurant s’oppose à la prospection.",
        body: `${where(r)} a demand&eacute; &agrave; ne plus &ecirc;tre contact&eacute;. Votre d&eacute;claration est close : merci de ne plus le d&eacute;marcher (article 6.1 du contrat).`,
        path,
      };
    case "lea_reply":
      return {
        subject: `${r.name} a répondu à Ominin`,
        heading: "Le restaurant a répondu à Ominin.",
        body: `${where(r)}, que vous avez d&eacute;clar&eacute;, a r&eacute;pondu &agrave; un ancien e-mail d&rsquo;Ominin : ${escapeHtml(LEA_LABELS[row.detail ?? ""] ?? "r&eacute;ponse")}. Ominin la traite ; votre d&eacute;claration n&rsquo;est pas modifi&eacute;e.`,
        path,
      };
    case "released":
      return {
        subject: `Déclaration close : ${r.name}`,
        heading: "Déclaration close.",
        body: `Votre d&eacute;claration du ${declared} pour ${where(r)} est close : ${escapeHtml(END_LABELS[d.end_reason ?? "other"].toLowerCase())}${d.decision_note ? ` (${escapeHtml(d.decision_note)})` : ""}.`,
        path,
      };
    default:
      return null;
  }
}

export async function flushOutbox(admin: Admin): Promise<{ sent: number; failed: number }> {
  const { data, error } = await admin
    .from("commercial_emails")
    .select(
      "id, kind, detail, declaration_id, commerciaux(id, email, first_name, last_name), commercial_statements(month, lines, adjustments, total_cents, sent_at), commercial_declarations(restaurant_id, declared_at, confirm_deadline, reserved_until, ended_at, decision_note, refusal_reason, end_reason, crm_restaurants(name, address, city))"
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

/*
 * Chaque nouvelle déclaration prévient les admins, pour qu'elle soit tranchée
 * avant sa confirmation de droit ; celles qui lèvent l'alerte « déjà client ? »
 * en urgence.
 */
export async function notifyNewDeclarations(admin: Admin): Promise<number> {
  const { data, error } = await admin
    .from("commercial_declarations")
    .select("id, client_alert, confirm_deadline, crm_restaurants(name)")
    .eq("status", "pending")
    .is("admin_notified_at", null);
  if (error) throw new Error(error.message);
  for (const row of data) {
    const { data: claimed } = await admin
      .from("commercial_declarations")
      .update({ admin_notified_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("admin_notified_at", null)
      .select("id");
    if (!claimed?.length) continue;
    await notifyOwners(OWNERS, {
      title: row.client_alert
        ? `Déjà client ? ${row.crm_restaurants?.name ?? ""}`
        : `Déclaration à confirmer · ${row.crm_restaurants?.name ?? ""}`,
      body: `${row.client_alert ? `${row.client_alert}. ` : ""}Confirmée de droit le ${frenchDate(row.confirm_deadline!)} sans réponse.`,
      tag: `declaration-${row.id}`,
      url: "/commerciaux?onglet=declarations",
      urgent: Boolean(row.client_alert),
    });
  }
  return data.length;
}
