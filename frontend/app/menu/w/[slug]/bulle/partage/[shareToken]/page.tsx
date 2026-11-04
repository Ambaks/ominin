import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Contribute, TicketWatch } from "@/components/bulles/live";
import { Ticket, ticketState } from "@/components/bulles/ticket";
import { bulleUrl, isShareToken } from "@/lib/bulles/links";
import { fetchBulleTicket } from "@/lib/bulles/reservation";

/* Les places se prennent pendant qu'on lit la page : relu à chaque visite. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rejoindre une bulle",
  robots: { index: false, follow: false, nocache: true },
};

export default async function BullePartagePage({ params }: PageProps<"/menu/w/[slug]/bulle/partage/[shareToken]">) {
  const { slug, shareToken } = await params;
  if (!isShareToken(shareToken)) notFound();
  const ticket = await fetchBulleTicket({ shareToken });
  if (!ticket || ticket.slug !== slug) notFound();
  const { live, left, leftCents } = ticketState(ticket);
  // En attente, le lien ne s'ouvre qu'après la part de l'organisateur ; une
  // réservation prise par l'accueil, confirmée sans rien payé, s'ouvre d'emblée
  // (contribuer_bulle).
  const open = live && left > 0 && (ticket.status !== "en_attente" || ticket.placesPaid > 0);

  return (
    <div className="bo-bulle-page bo-stack-sm">
      <TicketWatch live={live} />
      <p className="bo-muted-night bo-text-center">{ticket.organiser} vous invite dans sa bulle.</p>
      <Ticket ticket={ticket} />
      {open ? (
        <Contribute
          target={{ shareToken }}
          placeCents={ticket.placeCents}
          placesLeft={left}
          resteCents={leftCents}
          notReserved={ticket.status === "en_attente"}
        />
      ) : (
        <a className="bo-button bo-button--ghost" href={bulleUrl(slug)}>
          Réserver ma propre bulle
        </a>
      )}
    </div>
  );
}
