"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSkyPause } from "@/components/club/club-sky";
import {
  ConditionsBlock,
  ContactFields,
  contactErrors,
  focusFirstError,
  type Contact,
} from "@/components/club/contact-form";
import { OfferVisual } from "@/components/club/offer-visual";
import { RollingAmount } from "@/components/club/rolling-amount";
import { SeatRing } from "@/components/club/seat-ring";
import { Spotlight } from "@/components/club/spotlight";
import { ShareAmount } from "@/components/club/share-amount";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_SHEET, CLUB_TIMING } from "@/components/club/timing";
import { useMagnetic } from "@/components/club/use-magnetic";
import { REFUND_RULE } from "@/lib/club/conditions";
import { formatCents, formatNightShort } from "@/lib/club/format";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { bookingPath, clubHref } from "@/lib/club/links";
import { clubToken, phoneLayout, prefersReducedMotion as reducedMotion } from "@/lib/club/media";
import { allInCents, serviceFeeCents } from "@/lib/club/pricing";
import type { EventAvailability } from "@/lib/club/public";
import type { Club, ClubEvent, ClubZone } from "@/lib/club/types";

/*
 * Le cœur de la page d'une soirée : les offres du club (une par zone), à
 * leur prix frais compris, avec ce qu'elles comprennent. Le client choisit
 * une offre, pas une table : le club l'attribue, et le stock ne se montre
 * jamais — seule une offre vraiment épuisée se dit « Complet ». Puis il
 * choisit comment payer (la table, un acompte, ou sa part en la partageant),
 * accepte les conditions d'entrée et paie pendant que la table lui est tenue
 * (TABLE_HOLD_S).
 *
 * Une seule feuille, trois étapes : Offre → Infos → Paiement. Bureau : elle
 * vit dans le panneau collé à droite des offres. Téléphone : une barre de
 * prix monte au choix ; « Réserver » ouvre la feuille basse, qui se glisse
 * vers le bas pour se fermer. Les offres se relisent au retour sur l'onglet.
 */

type Step = "offre" | "infos" | "paiement";
type Hold = {
  paymentId: string;
  token: string;
  totalCents: number;
  remainingMs: number;
  provider: Club["paymentProvider"];
};
/* Payer la table entière, un acompte (le reste à l'entrée ou par ses amis), ou sa part en la partageant. */
type Mode = "full" | "deposit" | "shared";
type Offer = ClubZone & { offerCents: number; available: boolean; maxParty: number };

/* Le temps de la table tenue, compté depuis l'envoi sur l'horloge de la page, jamais sur celle de l'appareil (qui peut être fausse). */
const holdClock = () => {
  const sentAt = performance.now();
  return () => TABLE_HOLD_S * 1000 - (performance.now() - sentAt);
};

/* La feuille relâchée : elle se ferme (en glissant seulement, d'où le doigt l'a laissée) ou revient en place. */
function releaseSheet(sheet: HTMLElement, backdrop: HTMLElement | null, speed: number, dy: number, close: () => void) {
  sheet.removeAttribute("data-dragging");
  backdrop?.removeAttribute("data-dragging");
  backdrop?.style.removeProperty("opacity");
  if (dy > CLUB_SHEET.dismiss || speed > CLUB_SHEET.velocity) {
    sheet.setAttribute("data-dismissing", "");
    sheet.style.translate = "0 100%";
    sheet.addEventListener(
      "transitionend",
      () => {
        sheet.removeAttribute("data-dismissing");
        sheet.style.translate = "";
      },
      { once: true }
    );
    close();
  } else sheet.style.translate = "";
}

/* Une ligne d'ambiance, tirée du dessin de la zone (« Vue sur Toulouse », « Vue sur la piste ») : rien d'inventé. */
const VIEW = /^vue\b/i;
const ambience = (offer: Offer) =>
  offer.layout.marks.find((mark) => mark.label && VIEW.test(mark.label))?.label ?? null;

const STEPS: { id: Step; label: string }[] = [
  { id: "offre", label: "Offre" },
  { id: "infos", label: "Infos" },
  { id: "paiement", label: "Paiement" },
];

export function EventBooking({
  club,
  event,
  availability,
  bookable,
}: {
  club: Club;
  event: ClubEvent;
  availability: EventAvailability;
  bookable: boolean;
}) {
  const router = useRouter();
  const { conditions } = club;
  useSkyPause(true);
  const fee = (price: number) => serviceFeeCents(price, club.feePercent);
  const allIn = useCallback((price: number) => allInCents(price, club.feePercent), [club.feePercent]);

  const offers = useMemo<Offer[]>(() => {
    const tonight = new Map(availability.offers.map((offer) => [offer.zoneId, offer]));
    return club.zones.flatMap((zone) => {
      const offer = tonight.get(zone.id);
      return offer
        ? [{ ...zone, offerCents: offer.priceCents, available: offer.available, maxParty: offer.maxParty }]
        : [];
    });
  }, [club.zones, availability.offers]);

  const [offerId, setOfferId] = useState<string | null>(null);
  const [party, setParty] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("offre");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contact, setContact] = useState<Contact>({ name: "", phone: "", email: "" });
  const [accepted, setAccepted] = useState(false);
  // Les erreurs du formulaire ne s'affichent qu'après un premier essai de paiement.
  const [triedPay, setTriedPay] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = contactErrors(contact, accepted);
  const formValid = Object.keys(errors).length === 0;
  const shownErrors = triedPay ? errors : {};
  const [mode, setModeState] = useState<Mode>("full");
  // Le sens d'un changement (étape, mode de paiement) : ce qui arrive vient du bon côté.
  const [back, setBack] = useState(false);
  // Le curseur du montant est tenu : chiffres et places suivent sans animation.
  const [scrubbing, setScrubbing] = useState(false);
  const [shareCents, setShareCents] = useState<number | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Pendant un paiement, l'offre reste affichée même si cette table était sa dernière.
  const selected = offers.find((offer) => offer.id === offerId && (offer.available || hold !== null)) ?? null;
  const price = selected?.offerCents ?? 0;
  const people = selected ? Math.min(party ?? selected.maxParty, selected.maxParty) : 1;
  /*
   * Une table a un seul prix, frais de réservation compris ; acompte et parts
   * se prennent sur ce prix. Le plus petit premier paiement de l'organisateur :
   * l'acompte du club s'il en demande un, sinon une part égale — jamais moins
   * que les frais, pris dessus. Mêmes bornes en base.
   */
  const tablePrice = allIn(price);
  const floor = fee(price) + 1;
  const deposit =
    club.depositPercent !== null ? Math.max(Math.ceil((tablePrice * club.depositPercent) / 100), floor) : null;
  const equalPart = Math.max(Math.ceil(tablePrice / people), floor);
  const part = deposit ?? equalPart;
  const shared = mode === "shared";
  const share =
    mode === "deposit" && deposit !== null ? deposit : Math.min(tablePrice, Math.max(part, shareCents ?? equalPart));
  const partial = mode !== "full";
  const total = partial ? share : tablePrice;
  const modes: { id: Mode; label: string }[] = [
    { id: "full", label: "Table complète" },
    ...(deposit !== null ? [{ id: "deposit" as const, label: "Acompte" }] : []),
    { id: "shared", label: "Partager" },
  ];
  const modeIndex = modes.findIndex((item) => item.id === mode);
  const setMode = (next: Mode) => {
    setBack(modes.findIndex((item) => item.id === next) < modeIndex);
    setModeState(next);
  };
  const goStep = (next: Step) => {
    setBack(STEPS.findIndex((item) => item.id === next) < STEPS.findIndex((item) => item.id === step));
    setStep(next);
  };
  // Flèches dans le choix du mode de paiement (boutons radio, un seul arrêt de tabulation).
  const onModesKey = (keyEvent: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(keyEvent.key)) return;
    keyEvent.preventDefault();
    const by = keyEvent.key === "ArrowRight" || keyEvent.key === "ArrowDown" ? 1 : -1;
    const next = modes[(modeIndex + by + modes.length) % modes.length];
    setMode(next.id);
    keyEvent.currentTarget.querySelector<HTMLElement>(`[data-mode="${next.id}"]`)?.focus();
  };
  const paying = step === "paiement" && hold !== null;
  // La barre de prix garde sa dernière offre le temps de sortir.
  const [barOffer, setBarOffer] = useState<Offer | null>(null);
  if (selected && selected.id !== barOffer?.id) setBarOffer(selected);

  /* ---------- Offres relues au retour sur l'onglet (jamais pendant un paiement) ---------- */
  const live = useRef({ paying, sheetOpen });
  useEffect(() => {
    live.current = { paying, sheetOpen };
  }, [paying, sheetOpen]);
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && !live.current.paying) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // L'offre choisie s'est épuisée entre-temps (offres relues) : on le dit, sans rien inventer d'autre.
  const lost = offerId !== null && hold === null && !offers.find((offer) => offer.id === offerId)?.available;
  const shownNotice = lost
    ? "Cette offre est complète ce soir. Choisissez-en une autre : vos coordonnées sont gardées."
    : notice;
  const open = sheetOpen && selected !== null;

  /* ---------- Choisir une offre ---------- */
  const choose = (offer: Offer) => {
    if (!offer.available || paying) return;
    setNotice(null);
    setFormError(null);
    setOfferId(offer.id);
    setParty((current) => (current === null ? offer.maxParty : Math.min(current, offer.maxParty)));
    // La barre de prix monte : la carte choisie reste visible au-dessus (scroll-margin de .club-offer).
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-offer="${offer.id}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" })
    );
  };
  // Flèches : d'une offre ouverte à la suivante (groupe de boutons radio).
  const onOffersKey = (keyEvent: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(keyEvent.key)) return;
    keyEvent.preventDefault();
    const open = offers.filter((offer) => offer.available);
    const at = open.findIndex((offer) => offer.id === offerId);
    const by = keyEvent.key === "ArrowRight" || keyEvent.key === "ArrowDown" ? 1 : -1;
    const next = open[(at + by + open.length) % open.length];
    if (!next) return;
    choose(next);
    keyEvent.currentTarget.querySelector<HTMLElement>(`[data-offer="${next.id}"]`)?.focus();
  };

  /* ---------- Feuille basse (téléphone) ---------- */
  const sheetRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const closeSheet = useCallback(() => {
    if (live.current.paying) return;
    setSheetOpen(false);
  }, []);

  // Défilement de la page figé pendant que la feuille est ouverte (body fixé à sa place).
  useEffect(() => {
    if (!open || !phoneLayout()) return;
    const y = window.scrollY;
    const body = document.body.style;
    const previous = { position: body.position, top: body.top, width: body.width };
    Object.assign(body, { position: "fixed", top: `-${y}px`, width: "100%" });
    return () => {
      Object.assign(body, previous);
      window.scrollTo(0, y);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (keyEvent: globalThis.KeyboardEvent) => {
      if (keyEvent.key !== "Escape" || live.current.paying) return;
      if (live.current.sheetOpen) setSheetOpen(false);
      else setOfferId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // La poignée et l'en-tête : la feuille suit le doigt, le voile s'éclaircit ; relâchée, elle se ferme ou revient.
  const drag = useRef<{ y: number; time: number; dy: number } | null>(null);
  const onHandleDown = (pointer: ReactPointerEvent) => {
    if (!phoneLayout() || paying || (pointer.target as Element).closest("button")) return;
    drag.current = { y: pointer.clientY, time: pointer.timeStamp, dy: 0 };
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    sheetRef.current?.setAttribute("data-dragging", "");
    backdropRef.current?.setAttribute("data-dragging", "");
  };
  const onHandleMove = (pointer: ReactPointerEvent) => {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    const dy = Math.max(0, pointer.clientY - drag.current.y);
    drag.current.dy = dy;
    sheet.style.translate = `0 ${dy}px`;
    backdropRef.current?.style.setProperty("opacity", String(1 - Math.min(dy / sheet.offsetHeight, 1)));
  };
  const onHandleUp = (pointer: ReactPointerEvent) => {
    const sheet = sheetRef.current;
    const state = drag.current;
    drag.current = null;
    if (!sheet || !state) return;
    releaseSheet(sheet, backdropRef.current, state.dy / Math.max(pointer.timeStamp - state.time, 1), state.dy, closeSheet);
  };
  /*
   * Tirée vers le bas depuis son contenu, quand il est déjà en haut : la
   * feuille suit le doigt comme par sa poignée. Écouteurs tactiles non
   * passifs : vers le bas en haut du contenu, le geste est à la feuille.
   */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !open) return;
    let start: { y: number; time: number } | null = null;
    let dy = 0;
    const onStart = (touch: TouchEvent) => {
      start = sheet.scrollTop <= 0 && !live.current.paying ? { y: touch.touches[0].clientY, time: touch.timeStamp } : null;
      dy = 0;
    };
    const onMove = (touch: TouchEvent) => {
      if (!start) return;
      dy = touch.touches[0].clientY - start.y;
      if (dy <= 0) {
        start = null;
        return;
      }
      touch.preventDefault();
      sheet.setAttribute("data-dragging", "");
      backdropRef.current?.setAttribute("data-dragging", "");
      sheet.style.translate = `0 ${dy}px`;
      backdropRef.current?.style.setProperty("opacity", String(1 - Math.min(dy / sheet.offsetHeight, 1)));
    };
    const onEnd = (touch: TouchEvent) => {
      if (!start || dy <= 0) return;
      releaseSheet(sheet, backdropRef.current, dy / Math.max(touch.timeStamp - start.time, 1), dy, closeSheet);
      start = null;
    };
    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
    };
  }, [open, closeSheet]);
  const dragHandlers = {
    onPointerDown: onHandleDown,
    onPointerMove: onHandleMove,
    onPointerUp: onHandleUp,
    onPointerCancel: onHandleUp,
  };

  /* ---------- Étapes : la feuille épouse la hauteur de chaque étape ---------- */
  const stageRef = useRef<HTMLDivElement>(null);
  const stageHeight = useRef(0);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const from = stageHeight.current;
    const to = stage.offsetHeight;
    stageHeight.current = to;
    if (!from || from === to || reducedMotion()) return;
    stage.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: CLUB_TIMING.step,
      easing: clubToken("--c-ease"),
    });
  }, [step, offerId, hold, mode, people]);

  useEffect(() => {
    if (step !== "offre") headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const reserve = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!selected || submitting) return;
    if (!formValid) {
      setTriedPay(true);
      focusFirstError(formRef.current, errors);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const remaining = holdClock();
    try {
      const response = await fetch("/api/club/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          zoneId: selected.id,
          ...contact,
          partySize: people,
          accepted,
          ...(partial ? { shareCents: share } : {}),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Hold> & { error?: string };
      if (!response.ok || !body.paymentId || !body.token) {
        setFormError(body.error ?? (response.status === 400 ? "Vérifiez vos coordonnées." : "Réservation impossible pour le moment."));
        if (response.status === 409) router.refresh();
        return;
      }
      setHold({
        paymentId: body.paymentId,
        token: body.token,
        totalCents: body.totalCents ?? total,
        remainingMs: remaining(),
        provider: body.provider ?? club.paymentProvider,
      });
      setStep("paiement");
    } catch {
      setFormError("Connexion perdue. Vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const onPaid = useCallback(() => {
    if (hold) router.push(`${clubHref(bookingPath(club.slug, hold.token))}?paye=1`);
  }, [hold, router, club.slug]);

  const onExpired = useCallback(
    (message?: string) => {
      setHold(null);
      setStep("offre");
      setNotice(
        message ??
          `Les ${TABLE_HOLD_S / 60} minutes sont passées sans paiement enregistré : rien n'a été débité. Vous pouvez réserver à nouveau.`
      );
      router.refresh();
    },
    [router]
  );

  const reserveRef = useMagnetic<HTMLButtonElement>();

  if (!offers.length) {
    return (
      <section id="offres" className="club-section" data-chapter>
        <p className="club-empty">Aucune table n&rsquo;est en vente pour cette soirée.</p>
      </section>
    );
  }

  const openOffers = offers.filter((offer) => offer.available);
  const cheapest = [...openOffers].sort((a, b) => a.offerCents - b.offerCents)[0];
  const firstOpen = offers.findIndex((offer) => offer.available);
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <section id="offres" className="club-section club-booking" data-chapter aria-labelledby="offres-titre">
      <header className="club-section-head">
        <h2 id="offres-titre" className="club-h2">
          Choisissez votre table
        </h2>
        <p className="club-conditions-line">
          {openOffers.length > 0 ? "Tables limitées · réservation conseillée" : "Toutes les offres sont complètes ce soir."}
          <span aria-hidden> · </span>
          <span className="sr-only">Conditions d&rsquo;entrée : </span>
          {[`${conditions.minAge}+`, conditions.dress, conditions.refused].filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className="club-booking-grid">
        <div className="club-offers-col">
          <p className="club-notice" role="status" aria-live="polite">
            {shownNotice}
          </p>
          <Spotlight className="club-offers" role="radiogroup" aria-labelledby="offres-titre" onKeyDown={onOffersKey}>
            {offers.map((offer, index) => {
              const checked = offer.id === selected?.id;
              return (
                <button
                  key={offer.id}
                  type="button"
                  role="radio"
                  data-offer={offer.id}
                  className="club-offer"
                  aria-checked={checked}
                  aria-disabled={!offer.available || !bookable || undefined}
                  tabIndex={checked || (!selected && index === firstOpen) ? 0 : -1}
                  data-tone={offer.layout.tone ?? "nuit"}
                  data-spotlight
                  style={{ "--i": index } as CSSProperties}
                  onClick={() => bookable && choose(offer)}
                >
                  <span className="club-offer-art">
                    <OfferVisual layout={offer.layout} />
                    {!offer.available ? (
                      <span className="club-offer-badge" data-full>
                        Complet
                      </span>
                    ) : (
                      checked && (
                        <span className="club-offer-badge">
                          <svg viewBox="0 0 16 16" aria-hidden>
                            <path d="M3 8.5l3.2 3L13 4.5" />
                          </svg>
                          Choisie
                        </span>
                      )
                    )}
                  </span>
                  <span className="club-offer-body">
                    <span className="club-offer-name">{offer.name}</span>
                    {ambience(offer) && <span className="club-offer-ambience">{ambience(offer)}</span>}
                    <span className="club-offer-price club-mono">{formatCents(allIn(offer.offerCents))}</span>
                    <span className="club-offer-meta">Jusqu&rsquo;à {offer.maxParty} personnes · frais compris</span>
                    {offer.inclus && <span className="club-offer-inclus">{offer.inclus}</span>}
                  </span>
                </button>
              );
            })}
          </Spotlight>
          {!bookable && <p className="club-fine">La réservation en ligne n&rsquo;est pas encore ouverte pour ce club.</p>}
        </div>

        {barOffer && (
          <div
            className="club-pricebar"
            role="region"
            aria-label="Offre choisie"
            data-shown={(Boolean(selected) && !open) || undefined}
            inert={!selected || open}
          >
            <p>
              <span className="club-pricebar-table">
                {barOffer.name} · {people} pers.
              </span>
              <span className="club-pricebar-total">
                <RollingAmount cents={allIn(barOffer.offerCents)} className="club-mono" /> tout compris
              </span>
            </p>
            <button type="button" className="club-button club-button-primary" onClick={() => setSheetOpen(true)}>
              Réserver
            </button>
          </div>
        )}

        <div ref={backdropRef} className="club-sheet-backdrop" data-on={open || undefined} onClick={closeSheet} aria-hidden />
        <aside ref={sheetRef} className="club-sheet" data-open={open || undefined} aria-label="Votre réservation">
          <div className="club-sheet-handle" {...dragHandlers} aria-hidden />
          {!selected ? (
            <div className="club-sheet-idle">
              <p className="club-label">Ce soir</p>
              <p className="club-sheet-title">Choisissez une offre</p>
              {cheapest ? (
                <p className="club-sheet-text">
                  Tables dès <span className="club-mono">{formatCents(allIn(cheapest.offerCents))}</span>, frais compris.
                  Le club vous attribue la table de l&rsquo;offre choisie.
                </p>
              ) : (
                <p className="club-sheet-text">Toutes les offres sont complètes ce soir.</p>
              )}
            </div>
          ) : (
            <div className="club-sheet-body">
              <div className="club-sheet-head" {...dragHandlers}>
                {step === "infos" ? (
                  <button type="button" className="club-icon-button" onClick={() => goStep("offre")} aria-label="Revenir à l'offre">
                    <svg viewBox="0 0 16 16" aria-hidden>
                      <path d="M10 3 5 8l5 5" />
                    </svg>
                  </button>
                ) : (
                  <span className="club-icon-spacer" aria-hidden />
                )}
                <ol className="club-stepper-nav" aria-label="Étapes">
                  {STEPS.map((item, index) => (
                    <li
                      key={item.id}
                      data-state={index < stepIndex ? "done" : index === stepIndex ? "current" : "next"}
                      aria-current={index === stepIndex ? "step" : undefined}
                    >
                      {item.label}
                    </li>
                  ))}
                </ol>
                {!paying && (
                  <button
                    type="button"
                    className="club-icon-button club-sheet-close"
                    onClick={() => (open ? closeSheet() : setOfferId(null))}
                    aria-label={open ? "Fermer" : "Changer d'offre"}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden>
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="club-sheet-table">
                <h3 ref={headingRef} tabIndex={-1} className="club-sheet-title">
                  {selected.name}
                </h3>
                <p className="club-sheet-text">Jusqu&rsquo;à {selected.maxParty} personnes · table attribuée par le club</p>
              </div>

              <div ref={stageRef} className="club-stage" data-back={back || undefined}>
                {step === "offre" && (
                  <div className="club-step" key="offre">
                    {selected.inclus && (
                      <div className="club-included">
                        <p className="club-label">Inclus</p>
                        <p>{selected.inclus}</p>
                      </div>
                    )}
                    <div className="club-party">
                      <span id="party-label">Vous serez</span>
                      <div className="club-stepper" role="group" aria-labelledby="party-label">
                        <button
                          type="button"
                          onClick={() => setParty(Math.max(1, people - 1))}
                          disabled={people <= 1}
                          aria-label="Une personne de moins"
                        >
                          −
                        </button>
                        <output className="club-mono" aria-live="polite">
                          {people}
                        </output>
                        <button
                          type="button"
                          onClick={() => setParty(Math.min(selected.maxParty, people + 1))}
                          disabled={people >= selected.maxParty}
                          aria-label="Une personne de plus"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div
                      className="club-mode"
                      role="radiogroup"
                      aria-label="Paiement de la table"
                      style={{ "--modes": modes.length, "--mode": modeIndex } as CSSProperties}
                      onKeyDown={onModesKey}
                    >
                      <span className="club-mode-pill" aria-hidden />
                      {modes.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          data-mode={item.id}
                          aria-checked={mode === item.id}
                          tabIndex={mode === item.id ? 0 : -1}
                          onClick={() => setMode(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {mode === "deposit" && deposit !== null && (
                      <div className="club-deposit" key="deposit">
                        <p className="club-label">Acompte de {club.depositPercent} %</p>
                        <p className="club-share-value">
                          <RollingAmount cents={deposit} className="club-mono" />
                        </p>
                        <p className="club-share-sub">
                          Reste <span className="club-mono">{formatCents(tablePrice - deposit)}</span>{" "}à régler à
                          l&rsquo;entrée — ou partagez le lien avec vos amis, ils paient leur part en ligne.
                        </p>
                      </div>
                    )}
                    {shared && people > 1 && (
                      <div className="club-share" key="share">
                        <SeatRing
                          seats={people}
                          priceCents={tablePrice}
                          shares={[{ id: "vous", name: contact.name || "Vous", amountCents: share, tone: "preview" }]}
                          label={`${people} pers.`}
                          scrubbing={scrubbing}
                        />
                        <ShareAmount
                          value={share}
                          min={part}
                          max={tablePrice}
                          part={equalPart}
                          note={
                            <>
                              Vos amis : <RollingAmount cents={tablePrice - share} instant={scrubbing} className="club-mono" />
                            </>
                          }
                          presets={[
                            ...(deposit !== null ? [{ label: `Acompte minimum ${formatCents(deposit)}`, cents: deposit }] : []),
                            { label: "1 part", cents: equalPart },
                            ...(people > 2 ? [{ label: "2 parts", cents: equalPart * 2 }] : []),
                            { label: "La moitié", cents: Math.ceil(tablePrice / 2) },
                            { label: "Tout", cents: tablePrice },
                          ].filter((preset, index, all) => all.findIndex((other) => other.cents === preset.cents) === index)}
                          onChange={setShareCents}
                          onScrub={setScrubbing}
                        />
                        <p className="club-fine club-share-note">
                          La table est à vous dès ce paiement. Vos amis reçoivent un lien privé pour payer leur part
                          jusqu&rsquo;au début de la soirée ; ce qui reste se règle à l&rsquo;entrée.
                        </p>
                      </div>
                    )}
                    {shared && people <= 1 && (
                      <p className="club-fine club-share-note">Ajoutez des personnes pour partager la table.</p>
                    )}
                    <dl className="club-lines">
                      <div>
                        <dt>Table, tout compris</dt>
                        <dd className="club-mono">{formatCents(tablePrice)}</dd>
                      </div>
                      {partial && (
                        <div>
                          <dt>{shared ? "Vos amis" : "Reste à l'entrée ou par vos amis"}</dt>
                          <dd>
                            <RollingAmount cents={tablePrice - share} instant={scrubbing} className="club-mono" />
                          </dd>
                        </div>
                      )}
                      <div className="club-lines-total">
                        <dt>{shared ? "Votre part, maintenant" : partial ? "Acompte, maintenant" : "À payer"}</dt>
                        <dd>
                          <RollingAmount cents={total} instant={scrubbing} className="club-mono" />
                        </dd>
                      </div>
                    </dl>
                    <div className="club-sticky-cta">
                      <button
                        ref={reserveRef}
                        type="button"
                        className="club-button club-button-primary club-button-block club-magnet"
                        onClick={() => goStep("infos")}
                        disabled={shared && people <= 1}
                      >
                        Continuer · <RollingAmount cents={total} instant={scrubbing} />
                      </button>
                      <p className="club-fine club-fee-note">
                        {`Dont ${formatCents(fee(price))} de frais de réservation (${club.feePercent} %)${partial ? ", pris sur ce premier paiement" : ""} · aucun autre frais.`}
                      </p>
                    </div>
                  </div>
                )}

                {step === "infos" && (
                  <form ref={formRef} className="club-step club-form" key="infos" onSubmit={reserve} noValidate>
                    <ContactFields
                      value={contact}
                      onChange={setContact}
                      errors={shownErrors}
                      emailHint="Votre confirmation et votre QR code y arrivent."
                    />
                    <ConditionsBlock
                      conditions={conditions}
                      refund={REFUND_RULE}
                      holdNote={`La table vous est tenue ${TABLE_HOLD_S / 60} minutes dès que vous passez au paiement.`}
                      accepted={accepted}
                      onAccept={setAccepted}
                      error={shownErrors.accepted}
                    />
                    {formError && (
                      <p className="club-error" role="alert">
                        {formError}
                      </p>
                    )}
                    <div className="club-sticky-cta">
                      <button
                        type="submit"
                        className="club-button club-button-primary club-button-block"
                        disabled={submitting}
                        aria-busy={submitting || undefined}
                      >
                        {submitting ? (
                          <>
                            <span className="club-spinner" aria-hidden />
                            Un instant…
                          </>
                        ) : (
                          <>
                            Payer <span className="club-mono">{formatCents(total)}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {step === "paiement" && hold && (
                  <div className="club-step" key="paiement">
                    <TablePayment
                      provider={hold.provider}
                      paymentId={hold.paymentId}
                      totalCents={hold.totalCents}
                      remainingMs={hold.remainingMs}
                      recap={[
                        formatNightShort(event.startsAt).replace(/^./, (letter) => letter.toUpperCase()),
                        selected.name,
                        `${people} pers.`,
                        partial
                          ? `${shared ? "votre part" : "acompte"} ${formatCents(hold.totalCents)}`
                          : `${formatCents(hold.totalCents)} tout compris`,
                      ].join(" · ")}
                      onPaid={onPaid}
                      onExpired={onExpired}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
