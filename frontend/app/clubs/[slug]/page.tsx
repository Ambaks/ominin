import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubFooter, ClubTop } from "@/components/club/chrome";
import { Poster } from "@/components/club/poster";
import { CLUB_TIMING } from "@/components/club/timing";
import { Reveal } from "@/components/landing-kit/reveal";
import { EtoileMark } from "@/components/menu/etoile/logo";
import { clubConditions } from "@/lib/club/conditions";
import { formatHours, formatNight } from "@/lib/club/format";
import { clubHref } from "@/lib/club/links";
import { fetchClub, fetchUpcomingEvents } from "@/lib/club/public";

/* Une soirée publiée ou annulée par le club se voit dès le rechargement. */
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const club = await fetchClub((await params).slug);
  if (!club) return {};
  const title = `${club.name} — Réserver une table`;
  const description = `${club.tagline ? `${club.tagline}. ` : ""}Choisissez votre table sur le plan, réglez en ligne, présentez votre QR code à l'entrée.`;
  return { title, description, openGraph: { title, description } };
}

const steps = (wallets: boolean) => [
  {
    title: "Choisissez votre table",
    text: "Sur le plan du club, en direct : vous voyez celles qui restent, leur prix et ce qu'elles comprennent.",
  },
  {
    title: "Réglez en ligne",
    text: `Le total, frais compris, s'affiche avant toute saisie.${wallets ? " Apple Pay, Google Pay ou carte bancaire." : ""}`,
  },
  {
    title: "Présentez votre QR code",
    text: "Il arrive avec votre confirmation. À l'entrée, il suffit de le montrer.",
  },
];

export default async function ClubPage({ params }: { params: Params }) {
  const { slug } = await params;
  const club = await fetchClub(slug);
  if (!club) notFound();
  const events = await fetchUpcomingEvents(club.id);
  const conditions = clubConditions(slug);

  return (
    <main className="club-page">
      <ClubTop slug={slug} name={club.name} />

      <section className="club-hero" data-chapter>
        <div className="club-hero-glow" aria-hidden />
        <EtoileMark className="club-hero-mark" />
        <h1 className="club-wordmark" aria-label={club.name}>
          {[...club.name].map((char, index) => (
            <span key={index} aria-hidden style={{ "--i": index } as React.CSSProperties}>
              {char}
            </span>
          ))}
        </h1>
        {club.tagline && <p className="club-hero-tagline">{club.tagline}</p>}
        {club.address && <p className="club-hero-address">{club.address}</p>}
        <a href="#soirees" className="club-button club-button-ghost club-hero-cta">
          Voir les soirées
        </a>
      </section>

      <section id="soirees" className="club-section" data-chapter aria-labelledby="soirees-titre">
        <header className="club-section-head">
          <p className="club-eyebrow">Programme</p>
          <h2 id="soirees-titre" className="club-h2">
            Prochaines soirées
          </h2>
        </header>
        {events.length === 0 ? (
          <p className="club-empty">Le programme des prochaines soirées arrive bientôt.</p>
        ) : (
          <ul className="club-nights">
            {events.map((event, index) => {
              const href = clubHref(`/${slug}/${event.slug}`);
              const cancelled = Boolean(event.cancelledAt);
              return (
                <Reveal as="li" key={event.id} delay={index * CLUB_TIMING.stagger} className="club-night">
                  <Link href={href} className="club-night-poster" tabIndex={-1} aria-hidden>
                    <Poster
                      event={event}
                      clubName={club.name}
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
                    />
                  </Link>
                  <div className="club-night-body">
                    <p className="club-night-date">
                      {formatNight(event.startsAt)}
                      <span aria-hidden> · </span>
                      <span className="club-nums">{formatHours(event.startsAt, event.endsAt)}</span>
                    </p>
                    <h3 className="club-night-title">
                      <Link href={href}>{event.title}</Link>
                    </h3>
                    {event.tag && event.tag !== event.title && <p className="club-tag">{event.tag}</p>}
                    {cancelled ? (
                      <p className="club-night-cancelled">Soirée annulée</p>
                    ) : (
                      <div className="club-night-actions">
                        <Link href={href} className="club-button club-button-primary">
                          Réserver une table
                        </Link>
                        {event.ticketUrl && (
                          <a
                            href={event.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="club-button club-button-ghost"
                          >
                            Billets
                            <span className="sr-only"> (nouvel onglet)</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
      </section>

      <section className="club-section" data-chapter aria-labelledby="comment-titre">
        <header className="club-section-head">
          <p className="club-eyebrow">Réserver une table</p>
          <h2 id="comment-titre" className="club-h2">
            En trois temps
          </h2>
        </header>
        <ol className="club-steps">
          {steps(club.paymentProvider === "stripe").map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * CLUB_TIMING.stagger} className="club-step">
              <span className="club-step-num" aria-hidden>
                {["I", "II", "III"][index]}
              </span>
              <h3 className="club-step-title">{step.title}</h3>
              <p className="club-step-text">{step.text}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal className="club-door">
          <p className="club-eyebrow">À l&rsquo;entrée</p>
          <ul className="club-chips">
            <li>{conditions.minAge} ans et plus</li>
            <li>{conditions.dress}</li>
            {conditions.refused && <li>{conditions.refused}</li>}
          </ul>
        </Reveal>
      </section>

      <ClubFooter name={club.name} address={club.address} phone={club.phone} />
    </main>
  );
}
