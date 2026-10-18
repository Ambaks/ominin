import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubFooter, ClubTop } from "@/components/club/chrome";
import { EventBooking } from "@/components/club/event-booking";
import { GuestList } from "@/components/club/guest-list";
import { Poster } from "@/components/club/poster";
import { formatCents, formatHours, formatNight } from "@/lib/club/format";
import { allInCents } from "@/lib/club/pricing";
import { fetchAvailability, fetchClub, fetchEvent } from "@/lib/club/public";

/* Les tables prises changent à chaque réservation : jamais de rendu en cache. */
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; event: string }>;

async function load(params: Params) {
  const { slug, event: eventSlug } = await params;
  const club = await fetchClub(slug);
  if (!club) return null;
  const event = await fetchEvent(club.id, eventSlug);
  return event ? { club, event } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { club, event } = found;
  const title = `${event.title} — ${club.name}`;
  const description = `${formatNight(event.startsAt)}, ${formatHours(event.startsAt, event.endsAt)}. Choisissez votre table sur le plan et réservez-la en ligne.`;
  return { title, description, openGraph: { title, description } };
}

export default async function EventPage({ params }: { params: Params }) {
  const found = await load(params);
  if (!found) notFound();
  const { club, event } = found;
  const availability = await fetchAvailability(club, event.id);
  const cancelled = Boolean(event.cancelledAt);
  const bookable = club.paymentProvider === "demo" || (club.paymentProvider === "stripe" && club.onlinePayment);
  const night = formatNight(event.startsAt);
  const prices = availability.zones.map((zone) => zone.priceCents);
  const from = prices.length ? allInCents(Math.min(...prices), club.feePercent) : null;

  return (
    <main className="club-page">
      <ClubTop slug={club.slug} name={club.name} back="Toutes les soirées" />

      <section className="club-event-hero" data-chapter>
        <Poster
          event={event}
          clubName={club.name}
          className="club-event-poster"
          sizes="(min-width: 1024px) 420px, 92vw"
        />
        <div className="club-event-info">
          <p className="club-eyebrow club-rise" style={{ "--rise": 0 } as React.CSSProperties}>
            {night.charAt(0).toUpperCase() + night.slice(1)}
          </p>
          <h1 className="club-h1 club-rise" style={{ "--rise": 1 } as React.CSSProperties}>
            {event.title}
          </h1>
          <p className="club-event-meta club-rise" style={{ "--rise": 2 } as React.CSSProperties}>
            <span className="club-nums">{formatHours(event.startsAt, event.endsAt)}</span>
            {event.tag && event.tag !== event.title && <span className="club-tag">{event.tag}</span>}
          </p>
          {event.description && (
            <p className="club-event-description club-rise" style={{ "--rise": 3 } as React.CSSProperties}>
              {event.description}
            </p>
          )}
          {cancelled ? (
            <p className="club-banner" role="status">
              <strong>Soirée annulée par le club.</strong> Les tables déjà réglées sont remboursées
              automatiquement, sans démarche de votre part.
            </p>
          ) : (
            <div className="club-event-actions club-rise" style={{ "--rise": 4 } as React.CSSProperties}>
              <a href="#plan" className="club-button club-button-primary">
                Choisir ma table
              </a>
              {from !== null && (
                <p className="club-event-from">
                  Tables à partir de <strong className="club-nums">{formatCents(from)}</strong>, frais compris
                </p>
              )}
              {event.ticketUrl && (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="club-button club-button-ghost"
                >
                  Billets d&rsquo;entrée
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {!cancelled && (
        <EventBooking
          club={club}
          event={event}
          availability={availability}
          bookable={bookable}
        />
      )}

      {!cancelled && event.guestListOpen && (
        <GuestList
          eventId={event.id}
          maxParty={event.guestListMaxParty}
          initialLeft={availability.guestListLeft}
        />
      )}

      <ClubFooter name={club.name} address={club.address} phone={club.phone} />
    </main>
  );
}
