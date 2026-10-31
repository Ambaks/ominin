"use client";

import { useId, useState } from "react";
import { useCart } from "@/lib/menu/cart";
import { ALLERGEN_LABELS, BADGE_LABELS, formatPrice, hasFormats, lineName } from "@/lib/menu/format";
import type { Allergen, MenuItem } from "@/lib/menu-data";
import { AddToOrder } from "./add-to-order";
import { AllergenIcon } from "./allergen-icon";
import { DishIndicators } from "./dish-indicators";
import { keepHyphenated } from "./keep-hyphenated";
import { RewardHint } from "./reward-hint";
import { Sheet } from "./sheet";

/*
 * Toute la carte d'un plat ouvre sa fiche : la photo en grand, la
 * description entière, les allergènes un par un (pas pour une boisson). Un bouton posé sur elle, en
 * dernier : le titre reste tel que les thèmes le composent (capitales,
 * pointillés jusqu'au prix). Le bouton d'ajout passe au-dessus (.dish-action,
 * z-1 sans position : le compte au panier garde la carte pour repère) et
 * ajoute sans ouvrir ; le reste de sa rangée laisse passer le toucher.
 */
export function DishOpener({ item, drink }: { item: MenuItem; drink?: boolean }) {
  const { markViewed } = useCart();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(event) => {
          // Safari ne donne pas le focus au bouton cliqué : la feuille le rend à ce qui l'a en s'ouvrant.
          event.currentTarget.focus({ preventScroll: true });
          setOpen(true);
          markViewed(item.id);
        }}
        aria-label={`Voir la fiche : ${lineName(item)}`}
        className="dish-open absolute inset-0 cursor-pointer outline-none"
      />
      {open && (
        <Sheet card backdropCloses labelledBy={titleId} onClosed={() => setOpen(false)}>
          {(close) => <DishDetails item={item} drink={drink} titleId={titleId} close={close} />}
        </Sheet>
      )}
    </>
  );
}

/** 44 px à toucher, 36 px dessinés. */
function CloseButton({ close, onPhoto }: { close: () => void; onPhoto: boolean }) {
  return (
    <button
      type="button"
      onClick={close}
      aria-label="Fermer"
      className={`-m-1 grid size-11 shrink-0 cursor-pointer place-items-center ${onPhoto ? "absolute right-3 top-3" : ""}`}
    >
      <span
        className={`grid size-9 place-items-center rounded-full ${
          onPhoto ? "bg-black/45 text-white backdrop-blur-md" : "border border-foreground/25 text-foreground"
        }`}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M3.5 3.5l9 9m0-9-9 9" />
        </svg>
      </span>
    </button>
  );
}

function Mark({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-ember-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d={d} />
    </svg>
  );
}

/** Dans l'ordre du règlement, quel que soit celui de la saisie. */
const inOrder = (allergens: Allergen[]) =>
  (Object.keys(ALLERGEN_LABELS) as Allergen[]).filter((allergen) => allergens.includes(allergen));

function Allergens({ allergens }: { allergens?: Allergen[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <h3 id={headingId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Allergènes
      </h3>
      {/* Déclaré sans, ou pas renseigné : une coche, ou un « i » dans un encadré —
          le client allergique ne doit pas confondre les deux d'un coup d'œil. */}
      {allergens?.length === 0 ? (
        <p className="flex min-h-10 items-center gap-2.5 self-start rounded-[1.25rem] bg-surface-raised py-2 pl-2.5 pr-4 text-sm">
          <Mark d="M8 12.5l2.5 2.5L16 9.5" />
          Aucun des 14 allergènes
        </p>
      ) : allergens ? (
        <ul className="flex flex-wrap gap-2">
          {inOrder(allergens).map((allergen) => (
            <li
              key={allergen}
              className="flex min-h-10 items-center gap-2 rounded-full bg-surface-raised pl-2.5 pr-3.5 text-sm"
            >
              <AllergenIcon allergen={allergen} className="size-[18px] shrink-0 text-ember-1" />
              {ALLERGEN_LABELS[allergen]}
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface-raised p-3.5 text-sm leading-relaxed">
          <Mark d="M12 11v5M12 8h.01" />
          <span>
            <strong className="font-semibold">Une allergie&nbsp;? Demandez à l&apos;équipe avant de commander.</strong>{" "}
            <span className="text-muted">Allergènes non renseignés en ligne.</span>
          </span>
        </p>
      )}
    </section>
  );
}

function DishDetails({
  item,
  drink,
  titleId,
  close,
}: {
  item: MenuItem;
  drink?: boolean;
  titleId: string;
  close: () => void;
}) {
  const lines = [...(item.description?.split("\n") ?? []), ...(item.tarifs ? [item.tarifs] : [])];
  return (
    <>
      {item.image && (
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image */}
          <img src={item.image} alt="" className="size-full object-cover" />
          <CloseButton close={close} onPhoto />
        </div>
      )}
      <div className="flex flex-col gap-5 px-5 pb-5 pt-5 sm:px-6">
        <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            {item.badges?.length ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ember-1">
                {item.badges.map((badge) => BADGE_LABELS[badge]).join(" · ")}
              </p>
            ) : null}
            <h2 id={titleId} className="font-display text-2xl font-medium leading-tight">
              {keepHyphenated(item.name)}
              {item.detail && (
                <span className="ml-2 whitespace-nowrap text-base font-normal text-muted">{item.detail}</span>
              )}
            </h2>
          </div>
          {!item.image && <CloseButton close={close} onPhoto={false} />}
        </div>
        <DishIndicators item={item} />
        {lines.length > 0 && (
          <div className="flex flex-col gap-1.5 text-[15px] leading-relaxed text-muted">
            {lines.map((line, i) => (
              <p key={i}>{keepHyphenated(line)}</p>
            ))}
          </div>
        )}
        </div>
        {item.noticeHours ? (
          <p className="text-sm font-semibold text-ember-2">À commander {item.noticeHours}&nbsp;h à l&apos;avance</p>
        ) : null}
        {!drink && <Allergens allergens={item.allergens} />}
        {item.pairing && <p className="font-display text-[15px] italic text-ember-1/85">{item.pairing}</p>}
        <RewardHint itemId={item.id} />
      </div>
      <div className="sticky bottom-0 mt-auto flex min-h-18 items-center justify-between gap-4 border-t border-hairline bg-surface px-5 py-3 sm:px-6">
        <span className="flex flex-col">
          <span className="dish-sheet-price font-display text-2xl text-ember-1">
            {hasFormats(item) && "dès "}
            {formatPrice(item.price)}
          </span>
          {item.tarif && (
            <span className="text-[11px] leading-tight text-faint">
              {item.tarif.basePrice > item.price && (
                <span className="mr-1 line-through">{formatPrice(item.tarif.basePrice)}</span>
              )}
              {item.tarif.name}
            </span>
          )}
        </span>
        <AddToOrder item={item} />
      </div>
    </>
  );
}
