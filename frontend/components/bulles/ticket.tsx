import type { CSSProperties } from "react";
import type { BulleTicket } from "@/lib/bulles/reservation";
import { formatCents, formatHours, formatNight } from "@/lib/club/format";

/*
 * Une réservation de bulle telle que le client la lit : la bulle, le soir,
 * le créneau, où en sont les places, et ce qu'elle devient. La même carte
 * sert de pass à l'accueil une fois confirmée.
 */

/**
 * Où en est la réservation, lue à la requête. Les places se paient jusqu'à
 * la fin du créneau : arrivé dans la bulle, le groupe paie ce qui manque
 * pour commander.
 */
export function ticketState(ticket: BulleTicket) {
  const ended = Date.parse(ticket.endsAt) <= Date.now();
  const left = ticket.partySize - ticket.placesPaid;
  const open = ticket.status === "en_attente" || ticket.status === "confirmee" || ticket.status === "arrivee";
  return { ended, left, live: open && !ended };
}

function headline(ticket: BulleTicket, missing: number) {
  switch (ticket.status) {
    case "en_attente":
      return {
        pill: "En attente",
        title: `Encore ${missing} place${missing > 1 ? "s" : ""} à payer`,
        text: `La bulle est confirmée dès ${ticket.minParty} places payées. Si un autre groupe la confirme avant, vous passez sur une bulle libre du créneau ; s'il n'en reste plus, chacun est remboursé.`,
      };
    case "confirmee":
      return {
        pill: "Confirmée",
        title: `${ticket.bulle.name} est à vous`,
        text:
          ticket.placesPaid < ticket.partySize
            ? "Présentez cette page à l'accueil. Pour commander depuis la bulle, toutes les places du groupe doivent être payées."
            : "Présentez cette page à l'accueil. Toutes les places sont payées : la carte de la bulle s'ouvre au début du créneau.",
      };
    case "arrivee":
      return { pill: "Bienvenue", title: "Bonne soirée au jardin", text: "Votre arrivée est enregistrée." };
    case "remboursee":
      return {
        pill: "Remboursée",
        title: "Cette réservation est remboursée",
        text: "Les bulles du créneau ont été prises par des groupes confirmés avant le vôtre. Chaque paiement revient sur sa carte sous 5 à 10 jours.",
      };
    case "annulee":
      return { pill: "Annulée", title: "Cette réservation est annulée", text: "Aucun paiement n'y a été enregistré." };
  }
}

export function Ticket({ ticket }: { ticket: BulleTicket }) {
  const missing = Math.max(ticket.minParty - ticket.placesPaid, 0);
  const left = ticket.partySize - ticket.placesPaid;
  const copy = headline(ticket, missing);
  const confirmed = ticket.status === "confirmee" || ticket.status === "arrivee";
  const filled = Math.min(ticket.placesPaid, ticket.partySize);
  return (
    <article className="bo-ticket" data-status={ticket.status} style={{ "--orb": ticket.bulle.color } as CSSProperties}>
      <span className="bo-orb bo-ticket-orb" aria-hidden />
      <p className="bo-pill">{copy.pill}</p>
      <h1 className="bo-ticket-title">{copy.title}</h1>
      <p className="bo-ticket-text">{copy.text}</p>

      <dl className="bo-ticket-facts">
        <div>
          <dt>Bulle</dt>
          <dd>{ticket.bulle.name}</dd>
        </div>
        <div>
          <dt>Soir</dt>
          <dd>{formatNight(ticket.startsAt)}</dd>
        </div>
        <div>
          <dt>Créneau</dt>
          <dd>{formatHours(ticket.startsAt, ticket.endsAt)}</dd>
        </div>
        <div>
          <dt>Au nom de</dt>
          <dd>{ticket.organiser}</dd>
        </div>
      </dl>

      {(ticket.status === "en_attente" || confirmed) && (
        <div className="bo-places">
          <div className="bo-seats" role="img" aria-label={`${filled} places payées sur ${ticket.partySize}`}>
            {Array.from({ length: ticket.partySize }, (_, index) => (
              <span
                key={index}
                data-paid={index < filled || undefined}
                data-minimum={index < ticket.minParty || undefined}
              />
            ))}
          </div>
          <p>
            <strong>
              {ticket.placesPaid} / {ticket.partySize}
            </strong>{" "}
            places payées
            {confirmed && left > 0 && (
              <>
                {" "}
                · reste {formatCents(left * ticket.placeCents)} avant de commander
              </>
            )}
          </p>
          {ticket.payers.length > 0 && (
            <ul className="bo-payers">
              {ticket.payers.map((payer, index) => (
                <li key={index}>
                  {payer.name}
                  {payer.places > 1 ? ` · ${payer.places} places` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="bo-ticket-foot">
        {ticket.etablissement}
        {ticket.address ? ` · ${ticket.address}` : ""}
      </p>
    </article>
  );
}
