import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubFooter, ClubTop } from "@/components/club/chrome";
import { EventBooking } from "@/components/club/event-booking";
import { GuestList } from "@/components/club/guest-list";
import { Poster } from "@/components/club/poster";
import { formatCents, formatHours, formatNight } from "@/lib/club/format";
import { fromCents } from "@/lib/club/pricing";
import { fetchAvailability, fetchClub, fetchEvent } from "@/lib/club/public";
import type { Club } from "@/lib/club/types";
import { connectedAccount } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/* Réservable en ligne : la démo, ou Stripe activé ET un compte connecté qui encaisse (comme /api/club/reserve et /pay). */
async function isBookable(club: Club): Promise<boolean> {
  if (club.paymentProvider === "demo") return true;
  if (club.paymentProvider !== "stripe" || !club.onlinePayment) return false;
  const account = await connectedAccount(createAdminClient(), club.id);
  return Boolean(account?.chargesEnabled);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { club, event } = found;
  const title = `${event.title} — ${club.name}`;
  const description = `${formatNight(event.startsAt)}, ${formatHours(event.startsAt, event.endsAt)}. Choisissez votre offre et réservez votre table en ligne.`;
  return {
    title,
    description,
    openGraph: { title, description },
    ...(club.paymentProvider === "demo" && { robots: { index: false, follow: false } }),
  };
}

export default async function EventPage({ params }: { params: Params }) {
  const found = await load(params);
  if (!found) notFound();
  const { club, event } = found;
  const [availability, bookable] = await Promise.all([fetchAvailability(event.id), isBookable(club)]);
  const cancelled = Boolean(event.cancelledAt);
  const night = formatNight(event.startsAt);
  const from = fromCents(availability, club.feePercent);

  return (
    <main className="club-page club-calm">
      <ClubTop slug={club.slug} name={club.name} back="Toutes les soirées" />

      <section className="club-event-hero" data-chapter>
        <Poster event={event} clubName={club.name} className="club-event-poster" sizes="(min-width: 1024px) 360px, 34vw" />
        <div className="club-event-info">
          <p className="club-date-chip">
            {night.charAt(0).toUpperCase() + night.slice(1)} ·{" "}
            <span className="club-mono">{formatHours(event.startsAt, event.endsAt)}</span>
          </p>
          <h1 className="club-h1">{event.title}</h1>
          {event.tag && event.tag !== event.title && <p className="club-pill-tag">{event.tag}</p>}
          {event.description && <p className="club-lead">{event.description}</p>}
          {cancelled ? (
            <p className="club-banner" role="status">
              <strong>Soirée annulée par le club.</strong>{" "}Les tables déjà réglées sont remboursées automatiquement,
              sans démarche de votre part.
            </p>
          ) : (
            <>
              {from !== null && (
                <p className="club-from">
                  Tables dès <strong className="club-mono">{formatCents(from)}</strong>, frais compris
                </p>
              )}
              {event.ticketUrl && (
                <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="club-text-link">
                  Billets d&rsquo;entrée (sans table)
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              )}
            </>
          )}
        </div>
      </section>

      {!cancelled && <EventBooking club={club} event={event} availability={availability} bookable={bookable} />}

      {!cancelled && event.guestListOpen && (
        <GuestList eventId={event.id} maxParty={event.guestListMaxParty} initialLeft={availability.guestListLeft} />
      )}

      <ClubFooter name={club.name} address={club.address} phone={club.phone} />
    </main>
  );
}
