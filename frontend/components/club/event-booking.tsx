"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSkyPause } from "@/components/club/club-sky";
import type { TableState } from "@/components/club/floor-plan";
import { PlanView } from "@/components/club/plan-view";
import { RollingAmount } from "@/components/club/rolling-amount";
import { SeatRing } from "@/components/club/seat-ring";
import { ShareAmount } from "@/components/club/share-amount";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_SHEET, CLUB_TIMING } from "@/components/club/timing";
import { useMagnetic } from "@/components/club/use-magnetic";
import { REFUND_RULE } from "@/lib/club/conditions";
import { formatCents, formatNightShort, tableName } from "@/lib/club/format";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { bookingPath, clubHref } from "@/lib/club/links";
import { fetchLiveTables } from "@/lib/club/live";
import { clubToken, phoneLayout, prefersReducedMotion as reducedMotion } from "@/lib/club/media";
import { allInCents, serviceFeeCents } from "@/lib/club/pricing";
import type { EventAvailability } from "@/lib/club/public";
import type { Club, ClubEvent, ClubTable, ClubZone } from "@/lib/club/types";

/*
 * Le cœur de la page d'une soirée : le client choisit SA table sur le plan
 * de la zone (pas une catégorie sur une image), voit le total frais compris
 * avant tout formulaire, accepte les conditions d'entrée, puis paie pendant
 * que la table lui est tenue (TABLE_HOLD_S). Le plan se relit à intervalle
 * et au retour sur l'onglet : une table prise entre-temps s'éteint.
 *
 * Une seule feuille, trois étapes : Table → Infos → Paiement. Bureau : elle
 * vit dans le panneau collé à droite du plan. Téléphone : une barre de prix
 * monte à la sélection ; « Réserver » ouvre la feuille basse, qui se glisse
 * vers le bas pour se fermer.
 */

type Step = "table" | "infos" | "paiement";
type Hold = {
  paymentId: string;
  token: string;
  tableId: string;
  totalCents: number;
  remainingMs: number;
  provider: Club["paymentProvider"];
};
type Contact = { name: string; phone: string; email: string };
/* Payer la table entière, ou sa part en la partageant avec ses amis. */
type Mode = "full" | "shared";
type TonightZone = ClubZone & { tables: ClubTable[]; minSeats: number; maxSeats: number };

const STEPS: { id: Step; label: string }[] = [
  { id: "table", label: "Table" },
  { id: "infos", label: "Infos" },
  { id: "paiement", label: "Paiement" },
];

const byLabel = (a: ClubTable, b: ClubTable) => a.label.localeCompare(b.label, "fr", { numeric: true });

const seatsRange = (zone: TonightZone) =>
  zone.minSeats === zone.maxSeats ? `${zone.maxSeats} pers.` : `${zone.minSeats}–${zone.maxSeats} pers.`;

const STATE_LABEL: Record<"libre" | "prise" | "fermee", string> = {
  libre: "libre",
  prise: "réservée",
  fermee: "pas en vente ce soir",
};

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

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

  const zones = useMemo<TonightZone[]>(() => {
    const tonight = new Map(availability.zones.map((zone) => [zone.zoneId, zone.priceCents]));
    return club.zones.flatMap((zone) => {
      const price = tonight.get(zone.id);
      const tables = club.tables.filter((table) => table.zoneId === zone.id).sort(byLabel);
      if (price === undefined || !tables.length) return [];
      const seats = tables.map((table) => table.seats);
      return [{ ...zone, priceCents: price, tables, minSeats: Math.min(...seats), maxSeats: Math.max(...seats) }];
    });
  }, [club, availability.zones]);

  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [taken, setTaken] = useState(() => new Set(availability.taken));
  const [blocked, setBlocked] = useState(() => new Set(availability.blocked));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [party, setParty] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("table");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contact, setContact] = useState<Contact>({ name: "", phone: "", email: "" });
  const [accepted, setAccepted] = useState(false);
  const [mode, setMode] = useState<Mode>("full");
  const [shareCents, setShareCents] = useState<number | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const zone = zones.find((candidate) => candidate.id === zoneId) ?? zones[0];
  const selected = selectedId ? (club.tables.find((table) => table.id === selectedId) ?? null) : null;
  const selectedZone = selected ? zones.find((candidate) => candidate.id === selected.zoneId) : undefined;
  const price = selectedZone?.priceCents ?? zone?.priceCents ?? 0;
  // Une part égale, plus petite part de l'organisateur (contrôlée en base aussi).
  const part = Math.ceil(price / (party ?? 1));
  const share = Math.min(price, Math.max(part, shareCents ?? part));
  const shared = mode === "shared";
  const total = shared ? share + fee(share) : allIn(price);
  const paying = step === "paiement" && hold !== null;
  // La barre de prix garde sa dernière table le temps de sortir.
  const [barTable, setBarTable] = useState<ClubTable | null>(null);
  if (selected && selected !== barTable) setBarTable(selected);
  const barZone = barTable ? zones.find((candidate) => candidate.id === barTable.zoneId) : undefined;

  const states = useMemo(() => {
    const out: Record<string, TableState> = {};
    for (const table of club.tables)
      out[table.id] = blocked.has(table.id) ? "fermee" : taken.has(table.id) ? "prise" : "libre";
    return out;
  }, [club.tables, taken, blocked]);

  const freeIn = useCallback(
    (candidate: TonightZone) => candidate.tables.filter((table) => states[table.id] === "libre"),
    [states]
  );

  /* ---------- Relecture du plan ---------- */
  const live = useRef({ paying, selectedId });
  useEffect(() => {
    live.current = { paying, selectedId };
  }, [paying, selectedId]);
  /* La table rendue à l'expiration : le serveur la libère un instant après nous. */
  const released = useRef<{ id: string; until: number } | null>(null);

  const refresh = useCallback(async () => {
    const next = await fetchLiveTables(event.id);
    if (!next) return;
    const nextTaken = new Set(next.taken);
    const grace = released.current;
    if (grace && performance.now() < grace.until) nextTaken.delete(grace.id);
    const nextBlocked = new Set(next.blocked);
    setTaken(nextTaken);
    setBlocked(nextBlocked);
    const { paying: busy, selectedId: id } = live.current;
    // La table du client pendant qu'il paie est prise… par lui.
    if (!id || busy || (!nextTaken.has(id) && !nextBlocked.has(id))) return;
    const label = club.tables.find((table) => table.id === id)?.label;
    setSelectedId(null);
    setSheetOpen(false);
    setStep("table");
    setFormError(null);
    setNotice(
      nextBlocked.has(id)
        ? `Le club vient de retirer la table ${label} de la vente. Choisissez-en une autre : vos coordonnées sont gardées.`
        : `La table ${label} vient d'être réservée par quelqu'un d'autre. Choisissez-en une autre : vos coordonnées sont gardées.`
    );
  }, [event.id, club.tables]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(onVisible, CLUB_TIMING.refresh);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  /* ---------- Zones : pastille glissante sous la zone active ---------- */
  const chipsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-zone="${zoneId}"]`);
    if (!row || !chip) return;
    const measure = () => {
      row.style.setProperty("--pill-x", `${chip.offsetLeft}px`);
      row.style.setProperty("--pill-w", `${chip.offsetWidth}px`);
    };
    measure();
    // La puce active, centrée dans la rangée (sans défiler la page).
    row.scrollTo({
      left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [zoneId]);

  /* La rangée des zones dit qu'elle continue : fondu du côté où il reste des puces. */
  useEffect(() => {
    const row = chipsRef.current;
    if (!row) return;
    const edges = () => {
      row.toggleAttribute("data-more-left", row.scrollLeft > 1);
      row.toggleAttribute("data-more-right", row.scrollLeft < row.scrollWidth - row.clientWidth - 1);
    };
    edges();
    row.addEventListener("scroll", edges, { passive: true });
    const observer = new ResizeObserver(edges);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", edges);
      observer.disconnect();
    };
  }, []);

  const switchZone = useCallback(
    (id: string) => {
      if (id === zoneId || live.current.paying) return;
      const index = (candidate: string) => zones.findIndex((item) => item.id === candidate);
      setDirection(index(id) > index(zoneId) ? 1 : -1);
      setZoneId(id);
      setNotice(null);
      if (!sheetOpen) {
        setSelectedId(null);
        setStep("table");
      }
    },
    [zoneId, zones, sheetOpen]
  );

  const shiftZone = useCallback(
    (by: 1 | -1) => {
      const next = zones[zones.findIndex((item) => item.id === zoneId) + by];
      if (next) switchZone(next.id);
    },
    [zones, zoneId, switchZone]
  );

  const onChipsKey = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key !== "ArrowRight" && keyEvent.key !== "ArrowLeft") return;
    keyEvent.preventDefault();
    const next = zones[zones.findIndex((item) => item.id === zoneId) + (keyEvent.key === "ArrowRight" ? 1 : -1)];
    if (!next) return;
    switchZone(next.id);
    chipsRef.current?.querySelector<HTMLElement>(`[data-zone="${next.id}"]`)?.focus();
  };

  /* ---------- Sélection ---------- */
  const select = useCallback(
    (table: ClubTable) => {
      if (live.current.paying) return;
      setNotice(null);
      setFormError(null);
      setSelectedId(table.id);
      setParty((current) => (current === null ? table.seats : Math.min(current, table.seats)));
    },
    []
  );

  const describe = (table: ClubTable, state: TableState) => {
    const zonePrice = zones.find((candidate) => candidate.id === table.zoneId)?.priceCents ?? 0;
    const status = STATE_LABEL[state as keyof typeof STATE_LABEL] ?? state;
    return `Table ${table.label}, jusqu'à ${table.seats} personnes, ${formatCents(allIn(zonePrice))} tout compris, ${status}`;
  };
  const tooltip = (table: ClubTable): [string, string] => {
    const zonePrice = zones.find((candidate) => candidate.id === table.zoneId)?.priceCents ?? 0;
    const state = states[table.id];
    return [
      `Table ${table.label} · ${table.seats} pers.`,
      state === "libre" ? `${formatCents(allIn(zonePrice))} tout compris` : STATE_LABEL[state as keyof typeof STATE_LABEL],
    ];
  };
  const refusal = (table: ClubTable, state: TableState) => {
    const free = zone ? freeIn(zone).length : 0;
    const status = state === "prise" ? "réservée" : "pas en vente ce soir";
    return `Table ${table.label} ${status} · ${free === 0 ? "plus aucune table libre ici" : `${plural(free, "table")} ${free > 1 ? "libres" : "libre"} dans cette zone`}`;
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
    if (!sheetOpen || !phoneLayout()) return;
    const y = window.scrollY;
    const body = document.body.style;
    const previous = { position: body.position, top: body.top, width: body.width };
    Object.assign(body, { position: "fixed", top: `-${y}px`, width: "100%" });
    return () => {
      Object.assign(body, previous);
      window.scrollTo(0, y);
    };
  }, [sheetOpen]);

  useEffect(() => {
    const onKey = (keyEvent: globalThis.KeyboardEvent) => {
      if (keyEvent.key !== "Escape" || live.current.paying) return;
      if (sheetOpen) setSheetOpen(false);
      else setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  // La poignée : la feuille suit le doigt, le voile s'éclaircit ; relâchée, elle se ferme ou revient.
  const drag = useRef<{ y: number; time: number; dy: number } | null>(null);
  const onHandleDown = (pointer: ReactPointerEvent) => {
    if (!phoneLayout() || paying || (pointer.target as Element).closest("button")) return;
    drag.current = { y: pointer.clientY, time: pointer.timeStamp, dy: 0 };
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    sheetRef.current?.setAttribute("data-dragging", "");
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
    sheet.removeAttribute("data-dragging");
    sheet.style.translate = "";
    backdropRef.current?.style.removeProperty("opacity");
    const speed = state.dy / Math.max(pointer.timeStamp - state.time, 1);
    if (state.dy > CLUB_SHEET.dismiss || speed > CLUB_SHEET.velocity) closeSheet();
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
    stage.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: CLUB_TIMING.step, easing: clubToken("--c-ease") });
  }, [step, selectedId, hold, mode]);

  useEffect(() => {
    if (step !== "table") headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const reserve = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!selected || !party || submitting) return;
    setSubmitting(true);
    setFormError(null);
    const sentAt = performance.now();
    try {
      const response = await fetch("/api/club/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          tableId: selected.id,
          ...contact,
          partySize: party,
          accepted,
          ...(shared ? { shareCents: share } : {}),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Hold> & { error?: string };
      if (!response.ok || !body.paymentId || !body.token) {
        setFormError(body.error ?? (response.status === 400 ? "Vérifiez vos coordonnées." : "Réservation impossible pour le moment."));
        if (response.status === 409) await refresh();
        return;
      }
      released.current = null;
      setHold({
        paymentId: body.paymentId,
        token: body.token,
        tableId: selected.id,
        totalCents: body.totalCents ?? total,
        // Compté depuis l'envoi, jamais depuis l'horloge de l'appareil (qui peut être fausse).
        remainingMs: TABLE_HOLD_S * 1000 - (performance.now() - sentAt),
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

  const onExpired = useCallback((message?: string) => {
    if (hold) {
      released.current = { id: hold.tableId, until: performance.now() + CLUB_TIMING.releaseGrace };
      setTaken((current) => {
        const next = new Set(current);
        next.delete(hold.tableId);
        return next;
      });
    }
    setHold(null);
    setStep("table");
    setNotice(
      message ??
        `Les ${TABLE_HOLD_S / 60} minutes sont passées sans paiement enregistré : la table est remise en vente. Vous pouvez la réserver à nouveau.`
    );
  }, [hold]);

  const reserveRef = useMagnetic<HTMLButtonElement>();

  if (!zone) {
    return (
      <section id="plan" className="club-section" data-chapter>
        <p className="club-empty">Aucune table n&rsquo;est en vente pour cette soirée.</p>
      </section>
    );
  }

  const cheapest = zones
    .filter((candidate) => freeIn(candidate).length > 0)
    .sort((a, b) => a.priceCents - b.priceCents)[0];
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <section id="plan" className="club-section club-booking" data-chapter aria-labelledby="plan-titre">
      <header className="club-section-head">
        <h2 id="plan-titre" className="club-h2">
          Choisissez votre table
        </h2>
        <p className="club-conditions-line">
          <span className="sr-only">Conditions d&rsquo;entrée : </span>
          {[`${conditions.minAge}+`, conditions.dress, conditions.refused].filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className="club-zones-bar">
      <p className="club-zones-count">
        {zones.length} zones · {zones.reduce((sum, candidate) => sum + freeIn(candidate).length, 0)} tables libres
      </p>
      <div
        ref={chipsRef}
        className="club-zones"
        role="group"
        aria-label="Zones du club (flèches gauche et droite pour changer)"
        onKeyDown={onChipsKey}
      >
        <span className="club-zones-pill" aria-hidden />
        {zones.map((candidate) => {
          const free = freeIn(candidate).length;
          return (
            <button
              key={candidate.id}
              type="button"
              data-zone={candidate.id}
              className="club-zone"
              aria-pressed={candidate.id === zone.id}
              disabled={paying && candidate.id !== zone.id}
              onClick={() => switchZone(candidate.id)}
            >
              <span className="club-zone-name">{candidate.name}</span>
              <span className="club-zone-meta">
                <span className="club-mono">{formatCents(allIn(candidate.priceCents))}</span>
                <span aria-hidden> · </span>
                {seatsRange(candidate)}
              </span>
              <span className="club-zone-count" data-empty={free === 0 || undefined}>
                {free === 0 ? "Complet" : `${free} libre${free > 1 ? "s" : ""}`}
              </span>
            </button>
          );
        })}
      </div>

      </div>

      <div className="club-booking-grid">
        <div className="club-plan-col">
          <div className="club-plan-bar">
            <ul className="club-legend" aria-label="Légende">
              <li data-state="libre">Libre</li>
              <li data-state="prise">Réservée</li>
              <li data-state="fermee">Pas en vente</li>
            </ul>
            <p className="club-plan-help">
              {bookable ? (
                <>
                  <span className="club-touch-only">Touchez une table · pincez ou double-touchez pour zoomer</span>
                  <span className="club-mouse-only">Cliquez une table · Ctrl + molette ou + pour zoomer</span>
                </>
              ) : (
                "Réservation en ligne pas encore ouverte"
              )}
            </p>
          </div>
          <p className="club-notice" role="status" aria-live="polite">
            {notice}
          </p>
          <PlanView
            zone={zone}
            direction={direction}
            states={states}
            selectedId={selectedId}
            interactive={bookable && !paying}
            describe={describe}
            tooltip={tooltip}
            refusal={refusal}
            onSelect={select}
            onSwipe={shiftZone}
          />
        </div>

        {barTable && barZone && (
          <div
            className="club-pricebar"
            role="region"
            aria-label="Table choisie"
            data-shown={(Boolean(selected) && !sheetOpen) || undefined}
            inert={!selected || sheetOpen}
          >
            <p>
              <span className="club-pricebar-table">
                {barZone.name} · <span className="club-code">{barTable.label}</span> · {party} pers.
              </span>
              <span className="club-pricebar-total">
                <RollingAmount cents={allIn(barZone.priceCents)} className="club-mono" /> tout compris
              </span>
            </p>
            <button type="button" className="club-button club-button-primary" onClick={() => setSheetOpen(true)}>
              Réserver
            </button>
          </div>
        )}

        <div
          ref={backdropRef}
          className="club-sheet-backdrop"
          data-on={sheetOpen || undefined}
          onClick={closeSheet}
          aria-hidden
        />
        <aside
          ref={sheetRef}
          className="club-sheet"
          data-open={sheetOpen || undefined}
          aria-label="Votre réservation"
        >
          <div
            className="club-sheet-handle"
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            aria-hidden
          />
          {!selected || !selectedZone ? (
            <div className="club-sheet-idle">
              <p className="club-label">Ce soir</p>
              <p className="club-sheet-title">Choisissez une table sur le plan</p>
              {cheapest ? (
                <button type="button" className="club-cheapest" onClick={() => switchZone(cheapest.id)}>
                  <span>
                    Dès <span className="club-mono">{formatCents(allIn(cheapest.priceCents))}</span>, frais compris
                  </span>
                  <span className="club-cheapest-zone">
                    {cheapest.name} · {seatsRange(cheapest)}
                  </span>
                </button>
              ) : (
                <p className="club-sheet-text">Toutes les tables sont réservées ce soir.</p>
              )}
              <ul className="club-zone-summary">
                {zones.map((candidate) => {
                  const free = freeIn(candidate).length;
                  return (
                    <li key={candidate.id}>
                      <button type="button" onClick={() => switchZone(candidate.id)} aria-pressed={candidate.id === zone.id}>
                        <span>{candidate.name}</span>
                        <span className="club-zone-summary-meta">
                          {free === 0 ? "complet" : `${free} libre${free > 1 ? "s" : ""}`}
                          <span className="club-mono">{formatCents(allIn(candidate.priceCents))}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="club-sheet-body">
              <div
                className="club-sheet-head"
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
              >
                {step === "infos" ? (
                  <button type="button" className="club-icon-button" onClick={() => setStep("table")} aria-label="Revenir à la table">
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
                    onClick={() => (sheetOpen ? closeSheet() : setSelectedId(null))}
                    aria-label={sheetOpen ? "Fermer" : "Désélectionner la table"}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden>
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="club-sheet-table">
                <h3 ref={headingRef} tabIndex={-1} className="club-sheet-title">
                  {selectedZone.name} · <span className="club-code">{selected.label}</span>
                </h3>
                <p className="club-sheet-text">Jusqu&rsquo;à {selected.seats} personnes</p>
              </div>

              <div ref={stageRef} className="club-stage">
                {step === "table" && (
                  <div className="club-step" key="table">
                    {selectedZone.inclus && (
                      <div className="club-included">
                        <p className="club-label">Inclus</p>
                        <p>{selectedZone.inclus}</p>
                      </div>
                    )}
                    <div className="club-party">
                      <span id="party-label">Vous serez</span>
                      <div className="club-stepper" role="group" aria-labelledby="party-label">
                        <button
                          type="button"
                          onClick={() => setParty((value) => Math.max(1, (value ?? 1) - 1))}
                          disabled={(party ?? 1) <= 1}
                          aria-label="Une personne de moins"
                        >
                          −
                        </button>
                        <output className="club-mono" aria-live="polite">
                          {party}
                        </output>
                        <button
                          type="button"
                          onClick={() => setParty((value) => Math.min(selected.seats, (value ?? 1) + 1))}
                          disabled={(party ?? 1) >= selected.seats}
                          aria-label="Une personne de plus"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="club-mode" role="radiogroup" aria-label="Paiement de la table">
                      <span className="club-mode-pill" data-mode={mode} aria-hidden />
                      <button type="button" role="radio" aria-checked={!shared} onClick={() => setMode("full")}>
                        Table complète
                      </button>
                      <button type="button" role="radio" aria-checked={shared} onClick={() => setMode("shared")}>
                        Partager avec mes amis
                      </button>
                    </div>
                    {shared && (party ?? 1) > 1 && (
                      <div className="club-share" key="share">
                        <SeatRing
                          seats={party ?? 1}
                          priceCents={price}
                          shares={[{ id: "vous", name: contact.name || "Vous", amountCents: share, tone: "preview" }]}
                          label={selected.label}
                        />
                        <ShareAmount
                          value={share}
                          min={part}
                          max={price}
                          part={part}
                          feePercent={club.feePercent}
                          othersLabel="vos amis"
                          presets={[
                            { label: "1 part", cents: part },
                            ...((party ?? 1) > 2 ? [{ label: "2 parts", cents: part * 2 }] : []),
                            { label: "La moitié", cents: Math.ceil(price / 2) },
                            { label: "Tout", cents: price },
                          ].filter((preset, index, all) => all.findIndex((other) => other.cents === preset.cents) === index)}
                          onChange={setShareCents}
                        />
                        <p className="club-fine club-share-note">
                          La table est à vous dès ce paiement. Vos amis reçoivent un lien privé pour payer leur part
                          jusqu&rsquo;au début de la soirée ; ce qui reste se règle à l&rsquo;entrée.
                        </p>
                      </div>
                    )}
                    {shared && (party ?? 1) <= 1 && (
                      <p className="club-fine club-share-note">Ajoutez des personnes pour partager la table.</p>
                    )}
                    <dl className="club-lines">
                      <div>
                        <dt>{shared ? "Votre part" : "Table"}</dt>
                        <dd className="club-mono">{formatCents(shared ? share : price)}</dd>
                      </div>
                      <div>
                        <dt>Frais de service ({club.feePercent} %)</dt>
                        <dd className="club-mono">{formatCents(fee(shared ? share : price))}</dd>
                      </div>
                      {shared && (
                        <div>
                          <dt>Reste pour vos amis</dt>
                          <dd className="club-mono">{formatCents(price - share)}</dd>
                        </div>
                      )}
                      <div className="club-lines-total">
                        <dt>{shared ? "À payer maintenant" : "Total, tout compris"}</dt>
                        <dd>
                          <RollingAmount cents={total} className="club-mono" />
                        </dd>
                      </div>
                    </dl>
                    <div className="club-sticky-cta">
                      <button
                        ref={reserveRef}
                        type="button"
                        className="club-button club-button-primary club-button-block club-magnet"
                        onClick={() => setStep("infos")}
                        disabled={shared && (party ?? 1) <= 1}
                      >
                        Continuer
                      </button>
                      <p className="club-fine">Aucun frais ne s&rsquo;ajoute ensuite.</p>
                    </div>
                  </div>
                )}

                {step === "infos" && (
                  <form className="club-step club-form" key="infos" onSubmit={reserve}>
                    <label className="club-field">
                      <span>Nom et prénom</span>
                      <input
                        name="name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={80}
                        value={contact.name}
                        onChange={(input) => setContact({ ...contact, name: input.target.value })}
                      />
                    </label>
                    <label className="club-field">
                      <span>Téléphone</span>
                      <input
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={contact.phone}
                        onChange={(input) => setContact({ ...contact, phone: input.target.value })}
                      />
                    </label>
                    <label className="club-field">
                      <span>E-mail</span>
                      <input
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={contact.email}
                        onChange={(input) => setContact({ ...contact, email: input.target.value })}
                      />
                      <small>Votre confirmation et votre QR code y arrivent.</small>
                    </label>
                    <div className="club-conditions">
                      <ul className="club-conditions-list">
                        <li>
                          <svg viewBox="0 0 24 24" aria-hidden>
                            <rect x="3" y="5" width="18" height="14" rx="3" />
                            <circle cx="9" cy="11" r="2.2" />
                            <path d="M6 16c.8-1.6 1.9-2.4 3-2.4s2.2.8 3 2.4M14 10h4M14 13.5h3" />
                          </svg>
                          <span>{`${conditions.minAge} ans et plus, pièce d’identité à l’appui`}</span>
                        </li>
                        {(conditions.dress || conditions.refused) && (
                          <li>
                            <svg viewBox="0 0 24 24" aria-hidden>
                              <path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3c-.5 1.4-1.7 2.2-3 2.2S9.5 4.4 9 3Z" />
                            </svg>
                            <span>{[conditions.dress, conditions.refused].filter(Boolean).join(" · ")}</span>
                          </li>
                        )}
                        <li>
                          <svg viewBox="0 0 24 24" aria-hidden>
                            <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
                            <path d="M12 8v4l3 2" />
                          </svg>
                          <span>{REFUND_RULE}</span>
                        </li>
                      </ul>
                      <label className="club-check">
                        <input type="checkbox" required checked={accepted} onChange={(input) => setAccepted(input.target.checked)} />
                        <span>J&rsquo;accepte les conditions du club</span>
                      </label>
                      <p className="club-fine club-hold-note">
                        La table vous est tenue {TABLE_HOLD_S / 60} minutes dès que vous passez au paiement.
                      </p>
                    </div>
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
                        tableName(selectedZone.name, selected.label),
                        `${party} pers.`,
                        shared ? `votre part ${formatCents(hold.totalCents)} frais compris` : `${formatCents(hold.totalCents)} tout compris`,
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
