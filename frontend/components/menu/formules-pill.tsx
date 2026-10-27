"use client";

import { preload } from "react-dom";
import type { Formule } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import type { AfficheMenu } from "@/lib/menu-data";
import { FormuleOffers } from "./formules";
import { OfferHead, OfferPill } from "./offer-pill";

/** Une cloche de service ; son couvercle se soulève (globals.css). */
function Cloche({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g className="cloche-lid">
        <path d="M4 16a8 8 0 0 1 16 0z" />
        <path d="M8 13a4.5 4.5 0 0 1 3-3.2" opacity=".6" />
        <circle cx="12" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </g>
      <path d="M2.5 19h19" />
    </svg>
  );
}

/**
 * Les formules dans une pastille plutôt qu'en tête de carte
 * (Restaurant.formulesPill) : les affiches du gérant, puis chaque formule à
 * composer d'un toucher.
 */
export function FormulesPill({
  affiches,
  formules,
}: {
  affiches: AfficheMenu[];
  /** Celles qu'aucune affiche ne porte. */
  formules: Formule[];
}) {
  const all = [...affiches.flatMap((affiche) => affiche.formules), ...formules];
  const from = formatPrice(Math.min(...all.map((formule) => formule.price)));
  // Chargée à l'ouverture seulement, une affiche ferait grandir la feuille sous le doigt.
  for (const affiche of affiches) preload(affiche.image, { as: "image" });

  return (
    <OfferPill
      className="formules-pill"
      icon={<Cloche className="size-4" />}
      label="Formules"
      detail={all.length > 1 ? `dès ${from}` : from}
    >
      {(titleId, close) => (
        <>
          <OfferHead kicker="Nos offres" title="Formules" titleId={titleId} close={close} />
          <div className="offer-list">
            {affiches.length > 0 && (
              <div className="formules-affiches">
                {affiches.map((affiche) => (
                  // eslint-disable-next-line @next/next/no-img-element -- URL téléversée ou saisie par le gérant
                  <img
                    key={affiche.id}
                    src={affiche.image}
                    alt={`Affiche : ${affiche.formules.map((formule) => formule.name).join(", ")}`}
                  />
                ))}
              </div>
            )}
            <FormuleOffers formules={all.map((formule) => ({ formule }))} />
          </div>
        </>
      )}
    </OfferPill>
  );
}
