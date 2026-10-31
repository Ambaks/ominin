import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareBox, TicketWatch } from "@/components/bulles/live";
import { Ticket, ticketState } from "@/components/bulles/ticket";
import { bulleUrl, isReservationToken, partageUrl } from "@/lib/bulles/links";
import { fetchBulleTicket } from "@/lib/bulles/reservation";
import { formatHours, formatNight } from "@/lib/club/format";

/* Le statut change sans l'organisateur (un ami paie, la bulle se confirme) : relu à chaque visite. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre bulle",
  robots: { index: false, follow: false, nocache: true },
};

export default async function BulleReservationPage({ params }: PageProps<"/menu/w/[slug]/bulle/[token]">) {
  const { slug, token } = await params;
  if (!isReservationToken(token)) notFound();
  const ticket = await fetchBulleTicket({ token });
  if (!ticket || ticket.slug !== slug) notFound();
  const { live, left, ended } = ticketState(ticket);
  const shareText = `Rejoins-moi dans ${ticket.bulle.name} au ${ticket.etablissement}, ${formatNight(ticket.startsAt)} · ${formatHours(ticket.startsAt, ticket.endsAt)}. Paie ta place ici :`;

  return (
    <div className="bo-bulle-page bo-stack-sm">
      <TicketWatch live={live} />
      <Ticket ticket={ticket} />
      {live && left > 0 && (
        <section className="bo-panel bo-stack-sm" aria-labelledby="bo-share-title">
          <h2 id="bo-share-title" className="bo-h3">
            Vos amis paient leur place
          </h2>
          <ShareBox url={partageUrl(slug, ticket.shareToken)} text={shareText} />
          <a className="bo-link-button" href={partageUrl(slug, ticket.shareToken)}>
            Payer d&rsquo;autres places moi-même
          </a>
        </section>
      )}
      {(ticket.status === "remboursee" || ticket.status === "annulee" || ended) && (
        <a className="bo-button bo-button--ghost" href={bulleUrl(slug)}>
          Réserver une autre bulle
        </a>
      )}
    </div>
  );
}
