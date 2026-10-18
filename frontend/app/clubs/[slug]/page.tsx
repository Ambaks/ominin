import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ClubFooter, ClubTop } from "@/components/club/chrome";
import { MagneticLink } from "@/components/club/magnetic-link";
import { Poster } from "@/components/club/poster";
import { Reveal } from "@/components/club/reveal";
import { Spotlight } from "@/components/club/spotlight";
import { CLUB_TIMING } from "@/components/club/timing";
import { formatCents, formatHours, formatNight, formatNightShort } from "@/lib/club/format";
import { clubHref } from "@/lib/club/links";
import { nightSummary } from "@/lib/club/pricing";
import { fetchAvailability, fetchClub, fetchUpcomingEvents } from "@/lib/club/public";

/* Une soirée publiée ou annulée, une table réservée : visibles dès le rechargement. */
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const club = await fetchClub((await params).slug);
  if (!club) return {};
  const title = `${club.name} — Réserver une table`;
  const description = `${club.tagline ? `${club.tagline}. ` : ""}Choisissez votre table sur le plan, réglez en ligne, présentez votre QR code à l'entrée.`;
  return { title, description, openGraph: { title, description } };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default async function ClubPage({ params }: { params: Params }) {
  const { slug } = await params;
  const club = await fetchClub(slug);
  if (!club) notFound();
  const events = await fetchUpcomingEvents(club.id);
  const next = events.find((event) => !event.cancelledAt);
  const summary = next ? nightSummary(club, await fetchAvailability(club, next.id)) : null;
  const later = events.filter((event) => event.id !== next?.id);
  const { conditions } = club;
  const wallets = club.paymentProvider === "stripe";
  const nextHref = next ? clubHref(`/${slug}/${next.slug}`) : null;

  return (
    <main className="club-page club-home">
      <ClubTop slug={slug} name={club.name} tagline={club.tagline} />

      {next && nextHref && summary ? (
        <section className="club-feature" data-chapter aria-labelledby="prochaine-titre">
          <Link href={nextHref} className="club-feature-poster" tabIndex={-1} aria-hidden>
            <Poster event={next} clubName={club.name} sizes="(min-width: 1024px) 520px, 100vw" />
          </Link>
          <div className="club-feature-info">
            <p className="club-date-chip">
              <span className="club-live-dot" aria-hidden />
              {capitalize(formatNight(next.startsAt))} · <span className="club-mono">{formatHours(next.startsAt, next.endsAt)}</span>
            </p>
            <h1 id="prochaine-titre" className="club-h1">
              {next.title}
            </h1>
            {next.description && <p className="club-lead">{next.description}</p>}
            {summary.fromCents !== null && (
              <p className="club-from">
                Tables dès <strong className="club-mono">{formatCents(summary.fromCents)}</strong>, frais compris
              </p>
            )}
            {summary.total > 0 && (
              <div className="club-meter" aria-label={`${summary.reserved} tables réservées sur ${summary.total}`}>
                <p>
                  <span className="club-mono">
                    {summary.reserved} / {summary.total}
                  </span>{" "}
                  tables réservées
                </p>
                <span
                  className="club-meter-bar"
                  style={{ "--fill": summary.reserved / summary.total } as CSSProperties}
                  aria-hidden
                />
              </div>
            )}
            <div className="club-feature-actions">
              <MagneticLink href={`${nextHref}#plan`} className="club-button club-button-primary">
                Choisir ma table
              </MagneticLink>
              {next.ticketUrl && (
                <a href={next.ticketUrl} target="_blank" rel="noopener noreferrer" className="club-button club-button-ghost">
                  Billets d&rsquo;entrée (sans table)
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              )}
            </div>
          </div>
          <div className="club-dock">
            <Link href={`${nextHref}#plan`} className="club-button club-button-primary club-button-block">
              Choisir ma table · {formatNightShort(next.startsAt)}
            </Link>
          </div>
        </section>
      ) : (
        <section className="club-section" data-chapter>
          <h1 className="club-h1">{club.name}</h1>
          <p className="club-empty">Le programme des prochaines soirées arrive bientôt.</p>
        </section>
      )}

      {later.length > 0 && (
        <section className="club-section club-later" data-chapter aria-labelledby="soirees-titre">
          <header className="club-section-row">
            <h2 id="soirees-titre" className="club-h2">
              Les soirées suivantes
            </h2>
            <p className="club-section-note">Faites glisser</p>
          </header>
          <Spotlight className="club-rail">
            <ul className="club-rail-list">
              {later.map((event, index) => {
                const href = clubHref(`/${slug}/${event.slug}`);
                const cancelled = Boolean(event.cancelledAt);
                return (
                  <Reveal as="li" key={event.id} delay={index * CLUB_TIMING.stagger} className="club-card">
                    <Link href={href} className="club-card-link" data-spotlight>
                      <Poster event={event} clubName={club.name} sizes="(min-width: 1024px) 300px, 72vw" />
                      <span className="club-card-body">
                        <span className="club-card-date">{capitalize(formatNight(event.startsAt))}</span>
                        <span className="club-card-title">{event.title}</span>
                        <span className="club-card-meta">
                          {cancelled ? (
                            <span className="club-card-cancelled">Soirée annulée</span>
                          ) : (
                            <>
                              <span className="club-mono">{formatHours(event.startsAt, event.endsAt)}</span>
                              {event.tag && event.tag !== event.title && <span className="club-pill-tag">{event.tag}</span>}
                            </>
                          )}
                        </span>
                      </span>
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </Spotlight>
        </section>
      )}

      <section className="club-section" data-chapter aria-labelledby="comment-titre">
        <h2 id="comment-titre" className="club-h2">
          Votre table en trois gestes
        </h2>
        <ol className="club-steps">
          <Reveal as="li" className="club-step-card">
            <span className="club-step-num club-mono">01</span>
            <h3>Choisissez la table</h3>
            <p>Sur le plan du club, en direct : celles qui restent, ce qu&rsquo;elles comprennent, leur prix.</p>
          </Reveal>
          <Reveal as="li" delay={CLUB_TIMING.stagger} className="club-step-card">
            <span className="club-step-num club-mono">02</span>
            <h3>Réglez en ligne</h3>
            <p>
              Le total, frais compris, s&rsquo;affiche avant toute saisie.
              {wallets ? " Apple Pay, Google Pay ou carte." : ""}
            </p>
          </Reveal>
          <Reveal as="li" delay={CLUB_TIMING.stagger * 2} className="club-step-card">
            <span className="club-step-num club-mono">03</span>
            <h3>Montrez votre QR code</h3>
            <p>Il arrive avec votre confirmation. À l&rsquo;entrée, il suffit de le présenter.</p>
          </Reveal>
        </ol>
        <ul className="club-chips club-door-chips" aria-label="Conditions d'entrée">
          <li>{conditions.minAge} ans et plus</li>
          {conditions.dress && <li>{conditions.dress}</li>}
          {conditions.refused && <li>{conditions.refused}</li>}
        </ul>
      </section>

      <ClubFooter name={club.name} address={club.address} phone={club.phone} />
    </main>
  );
}
