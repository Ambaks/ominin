"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FloorPlan, type TableState } from "@/components/club/floor-plan";
import { HoldCountdown } from "@/components/club/hold-countdown";
import { RollingAmount } from "@/components/club/rolling-amount";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_EASE, CLUB_TIMING, CLUB_WARP } from "@/components/club/timing";
import { REFUND_RULE, type ClubConditions } from "@/lib/club/conditions";
import { formatCents } from "@/lib/club/format";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { bookingPath, clubHref } from "@/lib/club/links";
import { fetchLiveTables } from "@/lib/club/live";
import type { EventAvailability } from "@/lib/club/public";
import type { Club, ClubEvent, ClubTable, ClubZone } from "@/lib/club/types";

/*
 * Le cœur de la page d'une soirée : le client choisit SA table sur le plan
 * de la zone (pas une catégorie sur une image), voit le total frais compris
 * avant tout formulaire, accepte les conditions d'entrée, puis paie pendant
 * que la table lui est tenue (TABLE_HOLD_S). Le plan se relit à intervalle
 * et au retour sur l'onglet : une table prise entre-temps s'éteint.
 *
 * Bureau : le plan à gauche, le panneau collé à droite. Téléphone : le plan
 * pleine largeur, à l'échelle 1 (tables touchables) et défilable, le
 * panneau en feuille basse.
 */

type Step = "plan" | "form" | "pay";
type Hold = {
  bookingId: string;
  token: string;
  totalCents: number;
  remainingMs: number;
  provider: Club["paymentProvider"];
};
type Contact = { name: string; phone: string; email: string };

type TonightZone = ClubZone & { tables: ClubTable[]; minSeats: number; maxSeats: number };

const byLabel = (a: ClubTable, b: ClubTable) => a.label.localeCompare(b.label, "fr", { numeric: true });

const seatsRange = (zone: TonightZone) =>
  zone.minSeats === zone.maxSeats ? `${zone.maxSeats} pers.` : `${zone.minSeats} à ${zone.maxSeats} pers.`;

const STATE_LABEL: Record<"libre" | "prise" | "fermee", string> = {
  libre: "libre",
  prise: "déjà réservée",
  fermee: "pas en vente ce soir",
};

export function EventBooking({
  club,
  event,
  availability,
  conditions,
  bookable,
}: {
  club: Club;
  event: ClubEvent;
  availability: EventAvailability;
  conditions: ClubConditions;
  bookable: boolean;
}) {
  const router = useRouter();
  const fee = useCallback((price: number) => Math.round((price * club.feePercent) / 100), [club.feePercent]);

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
  const [taken, setTaken] = useState(() => new Set(availability.taken));
  const [blocked, setBlocked] = useState(() => new Set(availability.blocked));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [party, setParty] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("plan");
  const [contact, setContact] = useState<Contact>({ name: "", phone: "", email: "" });
  const [accepted, setAccepted] = useState(false);
  const [hold, setHold] = useState<Hold | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fit, setFit] = useState(false);

  const zone = zones.find((candidate) => candidate.id === zoneId) ?? zones[0];
  const selected = selectedId ? (club.tables.find((table) => table.id === selectedId) ?? null) : null;
  const selectedZone = selected ? zones.find((candidate) => candidate.id === selected.zoneId) : undefined;
  const price = selectedZone?.priceCents ?? zone?.priceCents ?? 0;
  const total = price + fee(price);

  const states = useMemo(() => {
    const out: Record<string, TableState> = {};
    for (const table of club.tables)
      out[table.id] = blocked.has(table.id) ? "fermee" : taken.has(table.id) ? "prise" : "libre";
    return out;
  }, [club.tables, taken, blocked]);

  const freeCount = (candidate: TonightZone) =>
    candidate.tables.filter((table) => states[table.id] === "libre").length;

  /* ---------- Relecture du plan ---------- */
  const live = useRef({ step, selectedId });
  useEffect(() => {
    live.current = { step, selectedId };
  }, [step, selectedId]);

  const refresh = useCallback(async () => {
    const next = await fetchLiveTables(event.id);
    if (!next) return;
    const nextTaken = new Set(next.taken);
    const nextBlocked = new Set(next.blocked);
    setTaken(nextTaken);
    setBlocked(nextBlocked);
    const { step: current, selectedId: id } = live.current;
    // La table du client pendant qu'il paie est prise… par lui.
    if (!id || current === "pay" || (!nextTaken.has(id) && !nextBlocked.has(id))) return;
    const label = club.tables.find((table) => table.id === id)?.label;
    setSelectedId(null);
    setStep("plan");
    setFormError(null);
    setNotice(
      `La table ${label} vient d'être réservée par quelqu'un d'autre. Choisissez-en une autre : vos coordonnées sont gardées.`
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

  /* ---------- Plan : changement de zone en « saut » ---------- */
  const frameRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef<HTMLDivElement>(null);
  const previousZone = useRef(zoneId);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) / 2;
    const from = previousZone.current;
    previousZone.current = zoneId;
    if (from === zoneId || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const direction =
      zones.findIndex((candidate) => candidate.id === zoneId) > zones.findIndex((candidate) => candidate.id === from)
        ? 1
        : -1;
    frame.querySelector("svg")?.animate(
      [
        { opacity: 0, transform: `translateX(${direction * CLUB_WARP.shift}%) scale(${CLUB_WARP.scale})` },
        { opacity: 1, transform: "none" },
      ],
      { duration: CLUB_TIMING.warp, easing: CLUB_EASE }
    );
    frame.querySelectorAll(".plan-table").forEach((table, index) =>
      table.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: CLUB_TIMING.warp,
        delay: index * CLUB_TIMING.tableStagger,
        easing: CLUB_EASE,
        fill: "backwards",
      })
    );
    warpRef.current?.animate(
      [
        { opacity: 0, transform: `translateX(${-direction * CLUB_WARP.streak}%) scaleX(${CLUB_WARP.streakFrom})` },
        { opacity: 1, offset: CLUB_WARP.streakPeak },
        { opacity: 0, transform: `translateX(${direction * CLUB_WARP.streak}%) scaleX(${CLUB_WARP.streakTo})` },
      ],
      { duration: CLUB_TIMING.warp, easing: "ease-out" }
    );
  }, [zoneId, zones]);

  /* ---------- Feuille (téléphone) : la table choisie reste visible au-dessus ---------- */
  const sheetRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const sheet = sheetRef.current;
    const table = frameRef.current?.querySelector<SVGGElement>(".plan-table[data-selected]");
    if (!sheet || !table || step !== "plan" || getComputedStyle(sheet).position !== "fixed") return;
    const raf = requestAnimationFrame(() => {
      // La feuille arrive encore : sa place finale, pas sa position du moment.
      const sheetTop = window.innerHeight - sheet.offsetHeight;
      const box = table.getBoundingClientRect();
      const overlap = box.bottom + box.height - sheetTop;
      if (overlap > 0) {
        window.scrollBy({
          top: overlap,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedId, step]);

  useEffect(() => {
    if (step !== "plan") headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const close = useCallback(() => {
    if (live.current.step === "pay") return;
    if (live.current.step === "form") setStep("plan");
    else setSelectedId(null);
  }, []);
  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  /* ---------- Actions ---------- */
  const select = (table: ClubTable) => {
    if (step === "pay") return;
    const state = states[table.id];
    if (state !== "libre") {
      setNotice(`Table ${table.label} : ${STATE_LABEL[state as keyof typeof STATE_LABEL]}.`);
      return;
    }
    setNotice(null);
    setFormError(null);
    setSelectedId(table.id);
    setParty((current) => (current === null ? table.seats : Math.min(current, table.seats)));
  };

  const switchZone = (id: string) => {
    if (id === zoneId || step === "pay") return;
    setZoneId(id);
    setNotice(null);
    if (step === "plan") setSelectedId(null);
  };

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
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Hold> & { error?: string };
      if (!response.ok || !body.bookingId || !body.token) {
        setFormError(
          response.status === 400
            ? (body.error ?? "Vérifiez vos coordonnées.")
            : (body.error ?? "Réservation impossible pour le moment.")
        );
        if (response.status === 409) await refresh();
        return;
      }
      // Compté depuis l'envoi, jamais depuis l'horloge de l'appareil (qui peut être fausse).
      const remainingMs = TABLE_HOLD_S * 1000 - (performance.now() - sentAt);
      setHold({
        bookingId: body.bookingId,
        token: body.token,
        totalCents: body.totalCents ?? total,
        remainingMs,
        provider: body.provider ?? club.paymentProvider,
      });
      setStep("pay");
    } catch {
      setFormError("Connexion perdue. Vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const onPaid = useCallback(() => {
    if (!hold) return;
    router.push(`${clubHref(bookingPath(club.slug, hold.token))}?paye=1`);
  }, [hold, router, club.slug]);

  const onExpired = useCallback(() => {
    setHold(null);
    setStep("plan");
    setNotice(
      `Les ${TABLE_HOLD_S / 60} minutes sont passées : rien n'a été débité et la table est remise en vente. Si elle est toujours libre, réservez-la à nouveau.`
    );
    void refresh();
  }, [refresh]);

  if (!zone) {
    return (
      <section id="plan" className="club-section" data-chapter>
        <p className="club-empty">Aucune table n&rsquo;est en vente pour cette soirée.</p>
      </section>
    );
  }

  const sheetOpen = Boolean(selected) || step !== "plan";
  const describe = (table: ClubTable, state: TableState) => {
    const zonePrice = zones.find((candidate) => candidate.id === table.zoneId)?.priceCents ?? 0;
    const status = STATE_LABEL[state as keyof typeof STATE_LABEL] ?? state;
    return `Table ${table.label}, jusqu'à ${table.seats} personnes, ${formatCents(zonePrice + fee(zonePrice))} tout compris, ${status}`;
  };

  return (
    <section id="plan" className="club-section club-booking" data-chapter aria-labelledby="plan-titre">
      <header className="club-section-head">
        <p className="club-eyebrow">Tables</p>
        <h2 id="plan-titre" className="club-h2">
          Choisissez votre table
        </h2>
        <ul className="club-chips" aria-label="Conditions d'entrée">
          <li>{conditions.minAge} ans et plus</li>
          <li>{conditions.dress}</li>
          {conditions.refused && <li>{conditions.refused}</li>}
        </ul>
      </header>

      <div className="club-zones" role="group" aria-label="Zones du club">
        {zones.map((candidate) => {
          const free = freeCount(candidate);
          return (
            <button
              key={candidate.id}
              type="button"
              className="club-zone"
              aria-pressed={candidate.id === zone.id}
              disabled={step === "pay" && candidate.id !== zone.id}
              onClick={() => switchZone(candidate.id)}
            >
              <span className="club-zone-name">{candidate.name}</span>
              <span className="club-zone-price club-nums">
                {formatCents(candidate.priceCents + fee(candidate.priceCents))}
              </span>
              <span className="club-zone-meta">
                {seatsRange(candidate)} · {free === 0 ? "complet" : `${free} libre${free > 1 ? "s" : ""}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="club-booking-grid">
        <div className="club-plan-wrap">
          <div className="club-plan-bar">
            <ul className="club-legend" aria-label="Légende">
              <li data-state="libre">Libre</li>
              <li data-state="prise">Réservée</li>
              <li data-state="fermee">Pas en vente</li>
            </ul>
            <button type="button" className="club-plan-fit" aria-pressed={fit} onClick={() => setFit((value) => !value)}>
              {fit ? "Agrandir" : "Vue d'ensemble"}
            </button>
          </div>
          <div
            ref={frameRef}
            className="club-plan-frame"
            data-fit={fit || undefined}
            style={{ "--plan-w": zone.layout.w } as React.CSSProperties}
          >
            <div ref={warpRef} className="club-plan-warp" aria-hidden />
            <FloorPlan
              key={zone.id}
              layout={zone.layout}
              tables={zone.tables}
              states={states}
              selectedId={selectedId}
              onSelect={bookable && step !== "pay" ? select : undefined}
              describe={describe}
              className="club-plan"
            />
          </div>
          <p className="club-plan-hint">
            {bookable
              ? `${zone.name} : touchez une table libre pour voir ce qu'elle comprend.`
              : "La réservation en ligne n'est pas encore ouverte pour ce club."}
          </p>
          <p className="club-notice" role="status" aria-live="polite">
            {notice}
          </p>
          <svg width="0" height="0" className="club-defs" aria-hidden>
            <defs>
              <radialGradient id="club-star-glow">
                <stop offset="0" stopColor="#fff6dc" stopOpacity="0.95" />
                <stop offset="0.3" stopColor="#e2c48f" stopOpacity="0.45" />
                <stop offset="1" stopColor="#d4b98a" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="club-sheet-backdrop" data-on={(sheetOpen && step !== "plan") || undefined} onClick={close} aria-hidden />
        <aside
          ref={sheetRef}
          className="club-sheet"
          data-open={sheetOpen || undefined}
          data-expanded={step !== "plan" || undefined}
          aria-label="Votre table"
        >
          {!selected || !selectedZone ? (
            <div className="club-sheet-idle">
              <p className="club-eyebrow">{zone.name}</p>
              <p className="club-sheet-title">Une table, sa place exacte.</p>
              <p className="club-sheet-text">
                Touchez une table libre sur le plan : vous voyez tout de suite ce qu&rsquo;elle comprend et son
                total, frais compris.
              </p>
              <dl className="club-lines">
                <div>
                  <dt>Table</dt>
                  <dd className="club-nums">{formatCents(zone.priceCents)}</dd>
                </div>
                <div>
                  <dt>Frais de service ({club.feePercent} %)</dt>
                  <dd className="club-nums">{formatCents(fee(zone.priceCents))}</dd>
                </div>
                <div className="club-lines-total">
                  <dt>Total</dt>
                  <dd className="club-nums">{formatCents(zone.priceCents + fee(zone.priceCents))}</dd>
                </div>
              </dl>
              {zone.inclus && <p className="club-sheet-text">Inclus : {zone.inclus}.</p>}
            </div>
          ) : (
            <div className="club-sheet-body">
              {step !== "pay" && (
                <button type="button" className="club-sheet-close" onClick={close} aria-label={step === "form" ? "Revenir à la table" : "Fermer"}>
                  <svg viewBox="0 0 16 16" aria-hidden>
                    {step === "form" ? <path d="M10 3 5 8l5 5" /> : <path d="M4 4l8 8M12 4l-8 8" />}
                  </svg>
                </button>
              )}
              <p className="club-eyebrow">{selectedZone.name}</p>
              <h3 ref={headingRef} tabIndex={-1} className="club-sheet-title">
                Table {selected.label}
              </h3>
              <p className="club-sheet-text">Jusqu&rsquo;à {selected.seats} personnes</p>

              {step === "plan" && (
                <>
                  {selectedZone.inclus && (
                    <div className="club-included">
                      <p className="club-eyebrow">Ce qui est inclus</p>
                      <p>{selectedZone.inclus}</p>
                    </div>
                  )}
                  <dl className="club-lines">
                    <div>
                      <dt>Table</dt>
                      <dd className="club-nums">{formatCents(price)}</dd>
                    </div>
                    <div>
                      <dt>Frais de service ({club.feePercent} %)</dt>
                      <dd className="club-nums">{formatCents(fee(price))}</dd>
                    </div>
                    <div className="club-lines-total">
                      <dt>Total, tout compris</dt>
                      <dd>
                        <RollingAmount cents={total} />
                      </dd>
                    </div>
                  </dl>
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
                      <output className="club-nums" aria-live="polite">
                        {party} {party === 1 ? "personne" : "personnes"}
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
                  <button type="button" className="club-button club-button-primary club-button-block" onClick={() => setStep("form")}>
                    Réserver cette table
                  </button>
                  <p className="club-sheet-fine">Aucun frais ne s&rsquo;ajoute ensuite.</p>
                </>
              )}

              {step === "form" && (
                <form className="club-form" onSubmit={reserve}>
                  <p className="club-recap club-nums">
                    {party} pers. · {formatCents(total)} tout compris
                  </p>
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
                    <p className="club-eyebrow">Conditions du club</p>
                    <ul>
                      <li>Entrée à partir de {conditions.minAge} ans, pièce d&rsquo;identité à l&rsquo;appui.</li>
                      <li>
                        {conditions.dress}
                        {conditions.refused ? ` : ${conditions.refused.charAt(0).toLowerCase()}${conditions.refused.slice(1)}.` : "."}
                      </li>
                      <li>{REFUND_RULE}</li>
                      <li>La table vous est tenue {TABLE_HOLD_S / 60} minutes, le temps de régler.</li>
                    </ul>
                    <label className="club-check">
                      <input
                        type="checkbox"
                        required
                        checked={accepted}
                        onChange={(input) => setAccepted(input.target.checked)}
                      />
                      <span>J&rsquo;ai lu et j&rsquo;accepte ces conditions.</span>
                    </label>
                  </div>
                  {formError && (
                    <p className="club-error" role="alert">
                      {formError}
                    </p>
                  )}
                  <button type="submit" className="club-button club-button-primary club-button-block" disabled={submitting} aria-busy={submitting || undefined}>
                    {submitting ? (
                      <>
                        <span className="club-spinner" aria-hidden />
                        Un instant…
                      </>
                    ) : (
                      <>Payer {formatCents(total)}</>
                    )}
                  </button>
                </form>
              )}

              {step === "pay" && hold && (
                <div className="club-paystep">
                  <div className="club-paystep-head">
                    <HoldCountdown remainingMs={hold.remainingMs} totalMs={TABLE_HOLD_S * 1000} onExpire={onExpired} />
                    <p>
                      <strong>Table tenue pour vous.</strong> Réglez {formatCents(hold.totalCents)} avant la fin du
                      compte à rebours.
                    </p>
                  </div>
                  <TablePayment
                    provider={hold.provider}
                    bookingId={hold.bookingId}
                    totalCents={hold.totalCents}
                    onPaid={onPaid}
                    onExpired={onExpired}
                  />
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
