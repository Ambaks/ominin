"use client";

import { useEffect, useState } from "react";
import { parisParts } from "@/lib/collect/hours";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { formatHeure } from "@/lib/gestion/fermetures";
import { formatWait, useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu/format";
import { type HappyHour, windowAt } from "@/lib/menu/happy-hour";
import { AddToOrder } from "./add-to-order";
import { FormuleOffers } from "./formules";
import { OfferHead, OfferPill } from "./offer-pill";

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
 * La happy hour en cours, en pastille qui ouvre la liste des offres. Elle
 * s'en va d'elle-même à la fin de la fenêtre, sans attendre que la page se
 * recharge.
 */
export function HappyHourPill({ happyHour }: { happyHour: HappyHour }) {
  const [ended, setEnded] = useState(false);
  const until = formatHeure(happyHour.hours.endsAt);

  useEffect(() => {
    const now = new Date();
    const left = windowAt(happyHour.hours, parisParts(now).minutes)?.left ?? 0;
    const timer = setTimeout(() => setEnded(true), Math.max(0, (left * 60 - now.getSeconds()) * 1000));
    return () => clearTimeout(timer);
  }, [happyHour.hours]);

  if (ended) return null;

  return (
    <OfferPill
      className="happy-hour-pill"
      icon={<Glass className="size-4" />}
      label="Happy hour"
      detail={`jusqu’à ${until}`}
      ariaLabel={`${happyHour.title}, jusqu’à ${until}`}
    >
      {(titleId, close) => <Offers happyHour={happyHour} titleId={titleId} close={close} />}
    </OfferPill>
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
  const formules = happyHour.formules.filter(({ formule }) => windowAt(formule.hours, minutes));

  return (
    <>
      <OfferHead kicker="En ce moment" title={happyHour.title} titleId={titleId} close={close}>
        <p className="mt-1 text-sm">
          Jusqu’à {formatHeure(endsAt)}
          {span && <strong> · plus que {formatWait(span.left)}</strong>}
        </p>
        {span && (
          <span className="happy-hour-progress" aria-hidden>
            <span style={{ width: `${(span.elapsed / span.length) * 100}%` }} />
          </span>
        )}
      </OfferHead>
      <div className="offer-list">
        {formules.length > 0 && (
          <section>
            <h3 className="font-display">Formules</h3>
            <FormuleOffers formules={formules} />
          </section>
        )}
        {groups.map((group) => (
          <section key={group.id}>
            <h3 className="font-display">{group.category}</h3>
            <ul>
              {group.offers.map((offer) => (
                <li key={`${offer.item.id}:${offer.format?.id ?? ""}`}>
                  <span className="offer-thumb" aria-hidden>
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
                  <span className="offer-price">
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
    </>
  );
}
