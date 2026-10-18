import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingWatch, PaidBurst, ResumePayment } from "@/components/club/booking-live";
import { ClubFooter, ClubTop } from "@/components/club/chrome";
import { QrCode } from "@/components/pitch/qr-code";
import { clubConditions } from "@/lib/club/conditions";
import { formatCents, formatHours, formatNight } from "@/lib/club/format";
import { bookingPath, clubHref } from "@/lib/club/links";
import { fetchBookingByToken, type BookingTicket } from "@/lib/club/public";
import { clubSiteUrl } from "@/lib/site";

/* Le statut change sans le client (paiement, porte, remboursement) : relu à chaque visite. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre réservation",
  robots: { index: false, follow: false, nocache: true },
};

type Params = Promise<{ slug: string; token: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type View = "attente" | "expiree" | "sur_place" | "payee" | "arrivee" | "remboursee" | "annulee";

function viewOf(booking: BookingTicket, now: number): View {
  switch (booking.status) {
    case "en_attente":
      if (!booking.holdExpiresAt) return "sur_place";
      return Date.parse(booking.holdExpiresAt) > now ? "attente" : "expiree";
    case "payee":
      return "payee";
    case "arrivee":
      return "arrivee";
    case "remboursee":
      return "remboursee";
    case "annulee":
      return "annulee";
  }
}

const DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });

function statusCopy(view: View, booking: BookingTicket, eventCancelled: boolean) {
  const total = formatCents(booking.totalCents);
  const refunded = booking.refundedAt ? ` le ${DAY.format(new Date(booking.refundedAt))}` : "";
  switch (view) {
    case "attente":
      return {
        pill: "En attente de paiement",
        title: "Votre table vous attend",
        text: `Réglez ${total} pour la confirmer. Tant que le compte à rebours tourne, personne d'autre ne peut la prendre.`,
      };
    case "expiree":
      return {
        pill: "Délai dépassé",
        title: "La table a été remise en vente",
        text: "Le délai de paiement est passé. Rien n'a été débité.",
      };
    case "sur_place":
      return {
        pill: "Réservée par le club",
        title: "Votre table est réservée",
        text: `Le club a noté votre réservation : ${total} à régler sur place.`,
      };
    case "payee":
      return {
        pill: "Payée",
        title: "Votre table est réservée",
        text: "Présentez ce QR code à l'entrée, avec une pièce d'identité.",
      };
    case "arrivee":
      return {
        pill: "Arrivée enregistrée",
        title: "Bienvenue",
        text: "Votre arrivée est enregistrée. Bonne soirée.",
      };
    case "remboursee":
      return eventCancelled
        ? {
            pill: "Soirée annulée",
            title: "Remboursement effectué",
            text: `Le club a annulé la soirée : ${total} vous ont été remboursés automatiquement${refunded}, sur le moyen de paiement utilisé. Le délai d'affichage sur votre compte dépend de votre banque.`,
          }
        : {
            pill: "Remboursée",
            title: "Remboursement effectué",
            text: `${total} vous ont été remboursés${refunded}, sur le moyen de paiement utilisé. Le délai d'affichage sur votre compte dépend de votre banque.`,
          };
    case "annulee":
      return {
        pill: eventCancelled ? "Soirée annulée" : "Annulée",
        title: eventCancelled ? "La soirée est annulée" : "Réservation annulée",
        text: booking.paidAt
          ? "Cette réservation est annulée."
          : "Cette réservation est annulée. Rien n'a été débité.",
      };
  }
}

/* Le parcours de la réservation, étape par étape : où elle en est, sans avoir à demander. */
function trackOf(view: View, eventCancelled: boolean): { label: string; done: boolean }[] | null {
  if (view === "remboursee") {
    return [
      { label: "Payée", done: true },
      { label: eventCancelled ? "Soirée annulée" : "Remboursement", done: true },
      { label: "Remboursée", done: true },
    ];
  }
  if (view !== "attente" && view !== "payee" && view !== "arrivee") return null;
  return [
    { label: "Table tenue", done: true },
    { label: "Payée", done: view !== "attente" },
    { label: "À l'entrée", done: view === "arrivee" },
  ];
}

/* La réservation et l'instant de sa lecture, auquel se jugent l'attente et la fin de soirée. */
async function load(token: string) {
  const booking = await fetchBookingByToken(token);
  return { booking, now: Date.now() };
}

const reference = (token: string) => `${token.slice(0, 4)}-${token.slice(4, 8)}`.toUpperCase();

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug, token }, query] = await Promise.all([params, searchParams]);
  const { booking, now } = await load(token);
  if (!booking || booking.club.slug !== slug) notFound();

  const view = viewOf(booking, now);
  const eventCancelled = Boolean(booking.event.cancelledAt);
  const eventOver = Date.parse(booking.event.endsAt) <= now;
  const copy = statusCopy(view, booking, eventCancelled);
  const track = trackOf(view, eventCancelled);
  const conditions = clubConditions(slug);
  const holding = view === "attente" || view === "payee" || view === "sur_place";
  const eventHref = clubHref(`/${slug}/${booking.event.slug}`);
  const night = formatNight(booking.event.startsAt);

  return (
    <main className="club-page">
      <ClubTop slug={slug} name={booking.club.name} />
      {(view === "attente" || view === "payee" || view === "sur_place") && !eventOver && <BookingWatch />}

      <section className="club-booking-page" data-chapter>
        <header className="club-status" data-view={view}>
          <p className="club-pill">
            <span aria-hidden />
            {copy.pill}
          </p>
          <h1 className="club-h1">{copy.title}</h1>
          <p className="club-status-text">{copy.text}</p>
          {track && (
            <ol className="club-track" aria-label="Où en est votre réservation">
              {track.map((item) => (
                <li key={item.label} data-done={item.done || undefined}>
                  <span aria-hidden />
                  {item.label}
                  <span className="sr-only">{item.done ? " : fait" : " : à venir"}</span>
                </li>
              ))}
            </ol>
          )}
        </header>

        {view === "attente" && booking.holdExpiresAt && (
          <ResumePayment
            bookingId={booking.id}
            provider={booking.club.paymentProvider}
            totalCents={booking.totalCents}
            remainingMs={Date.parse(booking.holdExpiresAt) - now}
          />
        )}

        <article className="club-ticket" data-view={view}>
          <header className="club-ticket-head">
            <p className="club-wordmark-sm">{booking.club.name}</p>
            <h2 className="club-ticket-title">{booking.event.title}</h2>
            <p className="club-ticket-date">
              {night.charAt(0).toUpperCase() + night.slice(1)}
              <span aria-hidden> · </span>
              <span className="club-nums">{formatHours(booking.event.startsAt, booking.event.endsAt)}</span>
            </p>
          </header>

          {(view === "payee" || view === "arrivee") && (
            <div className="club-ticket-qr">
              {query.paye !== undefined && view === "payee" && <PaidBurst />}
              <div className="club-qr-plate">
                <QrCode
                  value={`${clubSiteUrl}${bookingPath(slug, booking.token)}`}
                  label={`QR code de la réservation, table ${booking.table.label}`}
                  className="club-qr"
                />
              </div>
              <p className="club-ticket-ref">
                N° <span className="club-nums">{reference(booking.token)}</span>
              </p>
            </div>
          )}

          <div className="club-ticket-perf" aria-hidden />

          <dl className="club-ticket-grid">
            <div>
              <dt>Au nom de</dt>
              <dd>{booking.name}</dd>
            </div>
            <div>
              <dt>Table</dt>
              <dd className="club-nums">{booking.table.label}</dd>
            </div>
            <div>
              <dt>Zone</dt>
              <dd>{booking.table.zone}</dd>
            </div>
            <div>
              <dt>Personnes</dt>
              <dd className="club-nums">
                {booking.partySize} sur {booking.table.seats}
              </dd>
            </div>
            {booking.table.inclus && (
              <div className="club-ticket-wide">
                <dt>Ce qui est inclus</dt>
                <dd>{booking.table.inclus}</dd>
              </div>
            )}
          </dl>

          <dl className="club-lines">
            <div>
              <dt>Table</dt>
              <dd className="club-nums">{formatCents(booking.priceCents)}</dd>
            </div>
            <div>
              <dt>Frais de service</dt>
              <dd className="club-nums">{formatCents(booking.feeCents)}</dd>
            </div>
            <div className="club-lines-total">
              <dt>
                {view === "payee" || view === "arrivee"
                  ? "Total payé"
                  : view === "remboursee"
                    ? "Total remboursé"
                    : "Total"}
              </dt>
              <dd className="club-nums">{formatCents(booking.totalCents)}</dd>
            </div>
          </dl>
        </article>

        <div className="club-ticket-actions">
          {holding && !eventOver && (
            <a href={clubHref(`${bookingPath(slug, booking.token)}/agenda`)} className="club-button club-button-ghost">
              Ajouter au calendrier
            </a>
          )}
          {(view === "expiree" || view === "annulee") && !eventCancelled && !eventOver ? (
            <Link href={eventHref} className="club-button club-button-primary">
              Choisir une table
            </Link>
          ) : (
            <Link href={eventHref} className="club-button club-button-ghost">
              Voir la soirée
            </Link>
          )}
        </div>

        {(view === "payee" || view === "sur_place") && (
          <aside className="club-door">
            <p className="club-eyebrow">À l&rsquo;entrée</p>
            <ul className="club-chips">
              <li>{conditions.minAge} ans et plus, pièce d&rsquo;identité</li>
              <li>{conditions.dress}</li>
              {conditions.refused && <li>{conditions.refused}</li>}
            </ul>
          </aside>
        )}
      </section>

      <ClubFooter name={booking.club.name} address={booking.club.address} phone={null} />
    </main>
  );
}
