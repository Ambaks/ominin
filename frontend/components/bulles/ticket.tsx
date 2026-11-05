import type { CSSProperties } from "react";
import {
  bulleManquePourConfirmer,
  bullePlacesCouvertes,
  bullePlacesFacturees,
  bulleReste,
  capitalize,
  formatBulleNight,
} from "@/lib/bulles/format";
import type { BulleTicket } from "@/lib/bulles/reservation";
import { formatCents, formatHours } from "@/lib/club/format";

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
  const { cents: leftCents, places: left } = bulleReste(ticket);
  const open = ticket.status === "en_attente" || ticket.status === "confirmee" || ticket.status === "arrivee";
  return { ended, left, leftCents, live: open && !ended };
}

function headline(ticket: BulleTicket, missing: number, guest: boolean) {
  switch (ticket.status) {
    case "en_attente":
      return {
        pill: "Pas encore réservée",
        title: guest
          ? `La bulle de ${ticket.organiser} n'est pas encore réservée`
          : "Votre bulle n'est pas encore réservée",
        text: `Elle le sera dès que ${ticket.confirmPlaces} places sont payées : encore ${missing}. Si un autre groupe la confirme avant, vous passez sur une bulle libre du créneau ; s'il n'en reste plus, chacun est remboursé.`,
      };
    case "confirmee":
      return {
        pill: "Confirmée",
        title: `${ticket.bulle.name} est confirmée`,
        text:
          bulleReste(ticket).cents > 0
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

export function Ticket({
  ticket,
  guest = false,
}: {
  ticket: BulleTicket;
  /** Lu par un ami, depuis le lien de partage : la bulle est celle de l'organisateur. */
  guest?: boolean;
}) {
  const missing = bulleManquePourConfirmer(ticket, ticket.confirmPlaces);
  const { cents: leftCents } = bulleReste(ticket);
  const copy = headline(ticket, missing, guest);
  const confirmed = ticket.status === "confirmee" || ticket.status === "arrivee";
  // Seul au Boho, on paie deux places : les sièges disent les places facturées.
  const seats = bullePlacesFacturees(ticket.partySize, ticket.minBilledPlaces);
  const filled = bullePlacesCouvertes(ticket);
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
          <dd>{capitalize(formatBulleNight(ticket.startsAt, ticket.dayEndHour))}</dd>
        </div>
        <div>
          <dt>Créneau</dt>
          <dd>{formatHours(ticket.startsAt, ticket.endsAt)}</dd>
        </div>
        <div>
          <dt>Groupe</dt>
          <dd>
            {ticket.partySize} personne{ticket.partySize > 1 ? "s" : ""}
            {ticket.partySize < seats ? `, payé au prix de ${seats}` : ""}
          </dd>
        </div>
        <div>
          <dt>Au nom de</dt>
          <dd>{ticket.organiser}</dd>
        </div>
      </dl>

      {(ticket.status === "en_attente" || confirmed) && (
        <div className="bo-places">
          <div className="bo-seats" role="img" aria-label={`${filled} places payées sur ${seats}`}>
            {Array.from({ length: seats }, (_, index) => (
              <span
                key={index}
                data-paid={index < filled || undefined}
                data-minimum={index < ticket.confirmPlaces || undefined}
              />
            ))}
          </div>
          <p>
            <strong>
              {filled} / {seats}
            </strong>{" "}
            places payées
            {confirmed && leftCents > 0 && (
              <>
                {" "}
                · reste {formatCents(leftCents)} avant de commander
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
