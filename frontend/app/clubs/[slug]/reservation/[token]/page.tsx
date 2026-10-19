import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingWatch, PaidBurst, PassActions, QrZoom, ResumePayment } from "@/components/club/booking-live";
import { SeatRing } from "@/components/club/seat-ring";
import { ShareLink, ShareMeter } from "@/components/club/share-live";
import { ClubFooter, ClubTop } from "@/components/club/chrome";
import { EtoileMark } from "@/components/menu/etoile/logo";
import { QrCode } from "@/components/pitch/qr-code";
import { REFUND_RULE } from "@/lib/club/conditions";
import { formatCents, formatHours, formatNight, formatNightShort } from "@/lib/club/format";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { bookingPath, clubHref, sharePath } from "@/lib/club/links";
import { fetchBookingByToken, fetchClub, type BookingTicket } from "@/lib/club/public";
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
      // Partagée et pas encore réglée en entier : réservée, mais il reste un montant.
      if (booking.shared && booking.remainingCents > 0) {
        const remaining = formatCents(booking.remainingCents);
        return {
          pill: `Réservée · ${remaining} à régler`,
          title: "Votre table est réservée",
          text: `${formatCents(booking.totalCents - booking.remainingCents)} déjà payés. Vos amis peuvent payer leur part jusqu'au début de la soirée. Il reste ${remaining} à régler à l'entrée si vos amis ne paient pas.`,
        };
      }
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

/* Le parcours de la réservation : fait (avec son heure quand elle est connue), en cours (il pulse), à venir. */
type Track = { step: string; label: string; state: "done" | "current" | "next"; time?: string }[];

const MOMENT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const moment = (iso: string | null) => (iso ? MOMENT.format(new Date(iso)) : undefined);
const TIME = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

function trackOf(view: View, booking: BookingTicket, eventCancelled: boolean): Track | null {
  if (view === "remboursee") {
    return [
      { step: "payee", label: "Payée", state: "done", time: moment(booking.paidAt) },
      {
        step: "annulation",
        label: eventCancelled ? "Soirée annulée" : "Remboursement",
        state: "done",
        time: moment(booking.event.cancelledAt),
      },
      { step: "remboursee", label: "Remboursée", state: "done", time: moment(booking.refundedAt) },
    ];
  }
  if (view !== "attente" && view !== "payee" && view !== "arrivee") return null;
  const heldAt = booking.holdExpiresAt
    ? new Date(Date.parse(booking.holdExpiresAt) - TABLE_HOLD_S * 1000).toISOString()
    : null;
  return [
    { step: "tenue", label: "Table tenue", state: "done", time: moment(heldAt) },
    { step: "payee", label: "Payée", state: view === "attente" ? "current" : "done", time: moment(booking.paidAt) },
    {
      step: "entree",
      label: "À l'entrée",
      state: view === "arrivee" ? "done" : view === "payee" ? "current" : "next",
      time: view === "arrivee" ? undefined : `dès ${TIME.format(new Date(booking.event.startsAt))}`,
    },
  ];
}

/* La réservation et l'instant de sa lecture, auquel se jugent l'attente et la fin de soirée. */
async function load(token: string) {
  const booking = await fetchBookingByToken(token);
  return { booking, now: Date.now() };
}

const reference = (token: string) => `${token.slice(0, 4)}-${token.slice(4, 8)}`.toUpperCase();

/* L'itinéraire vers le club : la recherche d'adresse de Google Maps, qui ouvre l'app sur téléphone. */
const MAPS_SEARCH = "https://www.google.com/maps/search/?api=1&query=";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug, token }, query] = await Promise.all([params, searchParams]);
  const [{ booking, now }, club] = await Promise.all([load(token), fetchClub(slug)]);
  if (!booking || !club || booking.club.slug !== slug) notFound();

  const view = viewOf(booking, now);
  const eventCancelled = Boolean(booking.event.cancelledAt);
  const eventOver = Date.parse(booking.event.endsAt) <= now;
  const eventStarted = Date.parse(booking.event.startsAt) <= now;
  const copy = statusCopy(view, booking, eventCancelled);
  const track = trackOf(view, booking, eventCancelled);
  const { conditions } = club;
  const holding = view === "payee" || view === "sur_place";
  const passValid = view === "payee" || view === "arrivee";
  const eventHref = clubHref(`/${slug}/${booking.event.slug}`);
  const url = `${clubSiteUrl}${bookingPath(slug, booking.token)}`;

  return (
    <main className="club-page club-pass-page">
      <ClubTop slug={slug} name={club.name} />
      {/* « En attente » n'est pas relu : le paiement en cours (vérification, expiration) rafraîchit lui-même. */}
      <BookingWatch live={holding && !eventOver} />
      {query.paye !== undefined && view === "payee" && <PaidBurst />}

      <section className="club-pass-layout" data-chapter>
        <header className="club-status" data-view={view}>
          <p className="club-pill">
            <span aria-hidden />
            {copy.pill}
          </p>
          <h1 className="club-h1">{copy.title}</h1>
          <p className="club-lead">{copy.text}</p>
          {track && (
            <ol className="club-track" aria-label="Où en est votre réservation">
              {track.map((item) => (
                <li
                  key={item.step}
                  data-step={item.step}
                  data-state={item.state}
                  aria-current={item.state === "current" ? "step" : undefined}
                >
                  <span aria-hidden />
                  {item.label}
                  {item.time && <small className="club-mono">{item.time}</small>}
                  <span className="sr-only">
                    {item.state === "done" ? " : fait" : item.state === "current" ? " : en cours" : " : à venir"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </header>

        {view === "attente" && booking.holdExpiresAt && booking.pendingPaymentId && (
          <ResumePayment
            paymentId={booking.pendingPaymentId}
            provider={booking.club.paymentProvider}
            totalCents={booking.shared ? null : booking.totalCents}
            remainingMs={Date.parse(booking.holdExpiresAt) - now}
            recap={[
              formatNightShort(booking.event.startsAt).replace(/^./, (letter) => letter.toUpperCase()),
              booking.table.zone,
              `${booking.partySize} pers.`,
              `${formatCents(booking.totalCents)} tout compris`,
            ].join(" · ")}
          />
        )}

        {booking.shared && booking.shareToken && passValid && (
          <section className="club-share-panel" aria-labelledby="partage-titre">
            <h2 id="partage-titre" className="club-h2">
              Table partagée
            </h2>
            <SeatRing
              seats={booking.partySize}
              priceCents={booking.totalCents}
              shares={booking.payers.map((payer) => ({
                id: payer.id,
                name: payer.name,
                amountCents: payer.amountCents,
                tone: payer.organiser ? "you" : "friend",
              }))}
              label={`${booking.partySize} pers.`}
              freshId={booking.payers.at(-1)?.id}
            />
            <ShareMeter paidCents={booking.totalCents - booking.remainingCents} priceCents={booking.totalCents} />
            {booking.remainingCents > 0 ? (
              <ShareLink
                url={`${clubSiteUrl}${sharePath(slug, booking.shareToken)}`}
                text={`Je réserve une table pour ${booking.event.title} au ${club.name}, ${formatNight(booking.event.startsAt)}. Ta part, en deux minutes :`}
                startsAt={booking.event.startsAt}
                remainingCents={booking.remainingCents}
              />
            ) : (
              <p className="club-share-closed" data-tone="success">
                Toutes les parts sont payées : la table est entièrement réglée.
              </p>
            )}
          </section>
        )}

        <article className="club-pass" data-view={view} aria-label="Votre réservation">
          <header className="club-pass-head">
            <span className="club-pass-brand">
              <EtoileMark className="club-pass-mark" />
              <span className="club-wordmark-sm">{club.name}</span>
            </span>
            <span className="club-pass-date club-mono">{formatNightShort(booking.event.startsAt)}</span>
          </header>
          <div className="club-pass-primary">
            <p className="club-label">Votre table vous attend</p>
            <p className="club-pass-table">{booking.table.zone}</p>
          </div>
          <dl className="club-pass-fields">
            <div className="club-pass-wide">
              <dt>Soirée</dt>
              <dd>{booking.event.title}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{capitalize(formatNight(booking.event.startsAt))}</dd>
            </div>
            <div>
              <dt>Horaires</dt>
              <dd className="club-mono">{formatHours(booking.event.startsAt, booking.event.endsAt)}</dd>
            </div>
            <div>
              <dt>Au nom de</dt>
              <dd>{booking.name}</dd>
            </div>
            <div>
              <dt>Personnes</dt>
              <dd className="club-mono">
                {booking.partySize}
              </dd>
            </div>
            {booking.table.inclus && (
              <div className="club-pass-wide">
                <dt>Inclus</dt>
                <dd>{booking.table.inclus}</dd>
              </div>
            )}
          </dl>

          {passValid && (
            <div className="club-pass-qr">
              <QrZoom label={`QR code de la réservation, ${booking.table.zone}`} arrived={view === "arrivee"}>
                <QrCode value={url} label={`QR code de la réservation, ${booking.table.zone}`} className="club-qr" />
              </QrZoom>
              <p className="club-pass-ref">
                Code <span className="club-mono">{reference(booking.token)}</span>
              </p>
              {booking.shared && booking.remainingCents > 0 && (
                <p className="club-pass-caption">
                  Valable à l&rsquo;entrée. Reste{" "}
                  <strong className="club-mono">{formatCents(booking.remainingCents)}</strong>{" "}à régler par
                  l&rsquo;hôte si vos amis n&rsquo;ont pas payé.
                </p>
              )}
            </div>
          )}

          {booking.shared ? (
            <dl className="club-lines club-pass-lines">
              <div>
                <dt>Table, tout compris</dt>
                <dd className="club-mono">{formatCents(booking.totalCents)}</dd>
              </div>
              <div>
                <dt>Déjà payé, toutes parts</dt>
                <dd className="club-mono">{formatCents(booking.totalCents - booking.remainingCents)}</dd>
              </div>
              <div className="club-lines-total">
                <dt>{eventStarted ? "Reste à régler à l'entrée" : "Reste à payer"}</dt>
                <dd className="club-mono">{formatCents(booking.remainingCents)}</dd>
              </div>
            </dl>
          ) : (
            <dl className="club-lines club-pass-lines">
              <div>
                <dt>Table</dt>
                <dd className="club-mono">{formatCents(booking.priceCents)}</dd>
              </div>
              <div>
                <dt>Frais de service</dt>
                <dd className="club-mono">{formatCents(booking.feeCents)}</dd>
              </div>
              <div className="club-lines-total">
                <dt>{passValid ? "Total payé" : view === "remboursee" ? "Total remboursé" : "Total"}</dt>
                <dd className="club-mono">{formatCents(booking.totalCents)}</dd>
              </div>
            </dl>
          )}
        </article>

        <div className="club-pass-actions">
          {(view === "expiree" || view === "annulee") && !eventCancelled && !eventOver ? (
            <Link href={eventHref} className="club-button club-button-primary club-button-block">
              Choisir une table
            </Link>
          ) : (
            (holding || view === "attente") &&
            !eventOver && (
              <a
                href={clubHref(`${bookingPath(slug, booking.token)}/agenda`)}
                className="club-button club-button-primary club-button-block"
              >
                Ajouter au calendrier
              </a>
            )
          )}
          <div className="club-pass-links">
            {club.address && (
              <a href={`${MAPS_SEARCH}${encodeURIComponent(club.address)}`} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                Itinéraire
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            )}
            {passValid && <PassActions url={url} title={`${booking.event.title} — ${club.name}`} />}
            <Link href={eventHref}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <rect x="4" y="5" width="16" height="15" rx="3" />
                <path d="M4 10h16M9 3v4M15 3v4" />
              </svg>
              Voir la soirée
            </Link>
          </div>
        </div>

        <aside className="club-door" aria-labelledby="conditions-titre">
          <h2 id="conditions-titre" className="club-label">
            Conditions et contact
          </h2>
          <ul className="club-chips">
            <li>{conditions.minAge} ans et plus, pièce d&rsquo;identité</li>
            {conditions.dress && <li>{conditions.dress}</li>}
            {conditions.refused && <li>{conditions.refused}</li>}
          </ul>
          <p className="club-door-text">{REFUND_RULE}</p>
          {club.phone && (
            <p className="club-door-text">
              Une question ? Le club au{" "}
              <a className="club-link club-mono" href={`tel:${club.phone.replace(/\s/g, "")}`}>
                {club.phone}
              </a>
            </p>
          )}
        </aside>
      </section>

      <ClubFooter name={club.name} address={club.address} phone={club.phone} />
    </main>
  );
}
