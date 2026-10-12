import type Stripe from "stripe";
import { compose, describeAnswers, parseAnswers, type Answers } from "@/lib/composer";
import { sendEmail } from "@/lib/gmail";
import { contactEmail, starterKit } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { check, must } from "@/lib/supabase/result";

/*
 * E-mail de commande de démarrage, envoyé à l'équipe quand Stripe confirme
 * le paiement (webhook) : à qui livrer, ce qui a été réglé, ce qu'il reste à
 * acheter pour le client (matériel au prix pas encore fixé), et sa salle
 * telle qu'il l'a décrite dans le composeur. starter_setups.notified_at
 * empêche un second envoi quand Stripe relivre l'événement.
 */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const list = (rows: [string, string][]) =>
  `<ul>${rows
    .map(([label, value]) => `<li><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</li>`)
    .join("")}</ul>`;

const euros = (cents: number | null) => formatPrice((cents ?? 0) / 100);

/** Le contenu de l'e-mail, sans entrée-sortie : testable sur un exemple. */
export function starterOrderEmail({
  etablissement,
  session,
  paid,
  answers,
}: {
  etablissement: { name: string; slug: string };
  session: Pick<Stripe.Checkout.Session, "amount_total" | "customer_details" | "collected_information">;
  paid: Pick<Stripe.LineItem, "description" | "quantity" | "amount_total">[];
  answers: Answers | null;
}): { subject: string; html: string } {
  const customer = session.customer_details;
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;

  const sections = [
    `<h2>Commande de démarrage — ${escapeHtml(etablissement.name)}</h2>`,
    list([
      ["Établissement", `${etablissement.name} (/m/${etablissement.slug})`],
      ["Contact", customer?.name ?? "—"],
      ["E-mail", customer?.email ?? "—"],
      ["Téléphone", customer?.phone ?? "—"],
    ]),
    "<h3>Livraison</h3>",
    address
      ? `<p>${[
          shipping.name,
          address.line1,
          address.line2,
          `${address.postal_code ?? ""} ${address.city ?? ""}`.trim(),
          address.country,
        ]
          .filter(Boolean)
          .map((line) => escapeHtml(String(line)))
          .join("<br>")}</p>`
      : "<p>Aucune adresse saisie.</p>",
    "<h3>Réglé</h3>",
    list([
      ...paid.map((line): [string, string] => [
        `${line.description ?? "—"} × ${line.quantity ?? 1}`,
        euros(line.amount_total),
      ]),
      ["Total", euros(session.amount_total)],
    ]),
  ];

  if (answers) {
    const composition = compose(answers);
    // Tout ce qui part dans le carton, hors Cachets (imprimés par nous) et
    // livraison : à acheter ou à préparer, réglé ou pas encore chiffré.
    const shop: Record<string, { model: string; href: string }> = {
      [starterKit.printer.id]: starterKit.printer,
      [starterKit.ethernetCable.id]: starterKit.ethernetCable,
    };
    const toPrepare = composition.lines.filter(
      (line) => line.id !== starterKit.cachet.id && line.id !== starterKit.shipping.id
    );
    if (toPrepare.length) {
      sections.push(
        "<h3>À préparer</h3>",
        `<ul>${toPrepare
          .map((line) => {
            const source = shop[line.id];
            const link = source ? ` — <a href="${source.href}">${escapeHtml(source.model)}</a>` : "";
            const status = line.amount === null ? "sur devis, non réglé" : "réglé";
            return `<li>${escapeHtml(line.label)} × ${line.quantity} (${status})${link}</li>`;
          })
          .join("")}</ul>`
      );
    }
    sections.push(
      "<h3>Sa salle</h3>",
      list(describeAnswers(answers)),
      "<h3>Ce que le composeur lui a dit</h3>",
      `<ul>${composition.notes
        .map((note) => `<li>${note.tone === "check" ? "À vérifier — " : ""}${escapeHtml(note.text)}</li>`)
        .join("")}</ul>`
    );
  } else {
    sections.push("<p>Commande passée sans le composeur : pas de détail de la salle.</p>");
  }


  return {
    subject: `Commande de démarrage — ${etablissement.name}`,
    html: sections.join(""),
  };
}

export async function notifyStarterOrder(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  etablissementId: string
): Promise<void> {
  const db = createAdminClient();
  const [etablissement, setup] = await Promise.all([
    db.from("etablissements").select("name, slug").eq("id", etablissementId).single().then(must),
    db
      .from("starter_setups")
      .select("answers, notified_at")
      .eq("etablissement_id", etablissementId)
      .maybeSingle()
      .then((result) => {
        if (result.error) throw new Error(result.error.message);
        return result.data;
      }),
  ]);
  if (setup?.notified_at) return;

  const { data: paid } = await stripe.checkout.sessions.listLineItems(session.id);
  const { subject, html } = starterOrderEmail({
    etablissement,
    session,
    paid,
    answers: setup ? parseAnswers(setup.answers) : null,
  });

  await sendEmail(contactEmail, subject, html, session.customer_details?.email ?? undefined);

  if (setup) {
    check(
      await db
        .from("starter_setups")
        .update({ notified_at: new Date().toISOString() })
        .eq("etablissement_id", etablissementId)
    );
  }
}
