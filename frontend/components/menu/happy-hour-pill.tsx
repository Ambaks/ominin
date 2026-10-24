"use client";

import { useEffect, useId, useState } from "react";
import { parisParts } from "@/lib/collect/hours";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { formatHeure } from "@/lib/gestion/fermetures";
import { formatWait, useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu/format";
import { type HappyHour, windowAt } from "@/lib/menu/happy-hour";
import { AddToOrder } from "./add-to-order";
import { Sheet } from "./sheet";

/** Un verre à cocktail, sa rondelle sur le bord. */
function Glass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16l-8 8z" />
      <path d="M12 13v7M8 20h8" />
      <path d="M7.5 8h9" opacity=".6" />
      <circle cx="17.5" cy="4.5" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * La happy hour en cours, en bas à gauche : une pastille dont la pièce tourne
 * de temps en temps (globals.css), qui ouvre la liste des offres. Elle s'en va
 * d'elle-même à la fin de la fenêtre, sans attendre que la page se recharge.
 */
export function HappyHourPill({ happyHour }: { happyHour: HappyHour }) {
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const titleId = useId();
  const until = formatHeure(happyHour.hours.endsAt);

  useEffect(() => {
    const now = new Date();
    const left = windowAt(happyHour.hours, parisParts(now).minutes)?.left ?? 0;
    const timer = setTimeout(() => setEnded(true), Math.max(0, (left * 60 - now.getSeconds()) * 1000));
    return () => clearTimeout(timer);
  }, [happyHour.hours]);

  if (ended) return null;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${happyHour.title}, jusqu’à ${until}`}
        onClick={() => setOpen(true)}
        className="happy-hour-pill"
      >
        <span className="happy-hour-coin" aria-hidden>
          <Glass className="size-4" />
        </span>
        <span className="flex flex-col text-left leading-tight">
          Happy hour
          <small>jusqu’à {until}</small>
        </span>
      </button>
      {open && (
        <Sheet card backdropCloses labelledBy={titleId} onClosed={() => setOpen(false)}>
          {(close) => <Offers happyHour={happyHour} titleId={titleId} close={close} />}
        </Sheet>
      )}
    </>
  );
}

function Offers({
  happyHour,
  titleId,
  close,
}: {
  happyHour: HappyHour;
  titleId: string;
  close: () => void;
}) {
  const minutes = parisParts(useNow(WAIT_TICK_MS)).minutes;
  const span = windowAt(happyHour.hours, minutes);
  const endsAt = happyHour.hours.endsAt;
  // Une offre dont la règle finit plus tôt (la pizza à 19 h) quitte la liste à son heure.
  const groups = happyHour.groups.flatMap((group) => {
    const offers = group.offers.filter((offer) => windowAt(offer.hours, minutes));
    return offers.length > 0 ? [{ ...group, offers }] : [];
  });

  return (
    <div className="happy-hour-sheet">
      <header className="happy-hour-head">
        <button type="button" onClick={close} aria-label="Fermer" className="happy-hour-close">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M3.5 3.5l9 9m0-9-9 9" />
          </svg>
        </button>
        <p className="happy-hour-kicker">En ce moment</p>
        <h2 id={titleId} className="font-display text-2xl leading-tight">
          {happyHour.title}
        </h2>
        <p className="mt-1 text-sm">
          Jusqu’à {formatHeure(endsAt)}
          {span && <strong> · plus que {formatWait(span.left)}</strong>}
        </p>
        {span && (
          <span className="happy-hour-progress" aria-hidden>
            <span style={{ width: `${(span.elapsed / span.length) * 100}%` }} />
          </span>
        )}
      </header>
      <div className="happy-hour-offers">
        {groups.map((group) => (
          <section key={group.id}>
            <h3 className="font-display">{group.category}</h3>
            <ul>
              {group.offers.map((offer) => (
                <li key={`${offer.item.id}:${offer.format?.id ?? ""}`}>
                  <span className="happy-hour-thumb" aria-hidden>
                    {offer.item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
                      <img src={offer.item.image} alt="" loading="lazy" />
                    ) : (
                      [...offer.item.name][0]
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display leading-tight">{offer.item.name}</span>
                    {(offer.format || offer.hours.endsAt !== endsAt) && (
                      <small>
                        {[offer.format?.name, offer.hours.endsAt !== endsAt && `jusqu’à ${formatHeure(offer.hours.endsAt)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    )}
                  </span>
                  <span className="happy-hour-price">
                    <s>{formatPrice(offer.basePrice)}</s>
                    <b className="font-display">{formatPrice(offer.price)}</b>
                  </span>
                  <div className="dish-action">
                    <AddToOrder item={offer.item} format={offer.format?.id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
