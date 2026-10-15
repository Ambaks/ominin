"use client";

import { useId, useState } from "react";
import { AnimatedNumber } from "@/components/demo/reseau/animated-number";
import { Figure } from "@/components/demo/reseau/figure";
import type { Venue } from "@/lib/demo/groupe/data";
import { waitingSince, type GroupOrder, type VenueDay, type VenueSnapshot } from "@/lib/demo/groupe/simulation";
import { formatEuroAmount, formatHourInText, formatInteger, formatWait } from "@/lib/demo/reseau/format";
import { ArrowIcon, Avatar, CARD, LateIcon, Sparkline, Trend } from "./ui";

const hour = (seconds: number) => formatHourInText(Math.round(seconds / 60));

/** Ce que l'adresse fait en ce moment, en une ligne : ouverte, happy hour, bar seul, fermée. */
function Status({ venueDay, snap, t }: { venueDay: VenueDay; snap: VenueSnapshot; t: number }) {
  let label: string;
  if (!snap.open) label = t < venueDay.open ? `Ouvre à ${hour(venueDay.open)}` : "Fermé";
  else if (snap.happyHour && venueDay.happyHour) label = `Happy hour jusqu’à ${hour(venueDay.happyHour.close)}`;
  else if (!snap.kitchenOpen)
    label = t < venueDay.kitchen.open ? `Bar · cuisine à ${hour(venueDay.kitchen.open)}` : "Bar · cuisine fermée";
  else label = `Ouvert jusqu’à ${hour(venueDay.close)}`;
  const accent = snap.open && snap.happyHour;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        accent ? "border-(--venue)/50 text-foreground" : snap.open ? "border-hairline text-muted" : "border-hairline text-faint"
      }`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${snap.open ? "bg-(--venue)" : "bg-faint/60"}`} />
      {label}
    </span>
  );
}

/** Ce qui demande un geste en salle : les retards, puis les commandes bloquées au comptoir ; sinon l'état du service. */
function Watch({ venueDay, snap, t }: { venueDay: VenueDay; snap: VenueSnapshot; t: number }) {
  const oldest = (orders: GroupOrder[], since: (order: GroupOrder) => number) => formatWait(Math.max(...orders.map(since)) / 60);
  const late = snap.late.length;
  const stuck = snap.stuck.length;
  const lines: string[] = [];
  if (late === 1) lines.push(`1 commande en retard : elle attend depuis ${oldest(snap.late, (o) => waitingSince(o, t) ?? 0)}`);
  else if (late > 1) lines.push(`${late} commandes en retard, la plus ancienne attend depuis ${oldest(snap.late, (o) => waitingSince(o, t) ?? 0)}`);
  if (stuck)
    lines.push(
      `${stuck} commande${stuck > 1 ? "s" : ""} à payer au comptoir depuis plus de ${oldest(snap.stuck, (o) => t - o.createdAt)}, ticket en attente`
    );
  if (lines.length) {
    return (
      <div className="mt-4 flex gap-2 rounded-lg bg-(--late)/10 px-3 py-2 text-[0.8125rem] leading-snug text-(--late)">
        <LateIcon className="mt-0.5 size-3.5 shrink-0" />
        <p className="flex flex-col gap-0.5">
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </div>
    );
  }
  return (
    <p className="mt-4 rounded-lg bg-foreground/4 px-3 py-2 text-[0.8125rem] text-faint">
      {snap.open ? "Aucune commande en retard" : t < venueDay.open ? `Pas encore ouvert : ouverture à ${hour(venueDay.open)}` : "Service terminé"}
    </p>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className={`rounded-lg bg-foreground/4 px-2 py-1.5 ${value ? "" : "text-faint"}`}>
      <p className="font-display text-lg leading-none font-medium tabular-nums">{value}</p>
      <p className="mt-1 text-[0.6875rem] leading-tight text-balance text-muted">{label}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-faint">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * Une adresse du groupe : l'encaissé du jour contre la semaine dernière à la
 * même heure, et la fin de journée à ce rythme ; ce qui se passe en salle —
 * préparation, service, tables, additions ouvertes, équipe — et ce qui
 * demande un geste. Un liseré à sa couleur s'allume à chaque nouvelle
 * commande. Au téléphone, le détail se déplie à la demande.
 */
export function VenuePanel({
  venue,
  name,
  address,
  venueDay,
  snap,
  previousRevenue,
  lastWeekday,
  projected,
  trend,
  ghost,
  span,
  tail,
  t,
  freshSeconds,
  tweenMs,
  clientTable,
  order,
}: {
  venue: Venue;
  name: string;
  address: string;
  venueDay: VenueDay;
  snap: VenueSnapshot;
  /** L'encaissé du même jour la semaine dernière, à la même heure (centimes). */
  previousRevenue: number;
  /** « vendredi dernier ». */
  lastWeekday: string;
  /** La fin de journée au rythme de la semaine dernière (centimes) ; null trop tôt pour le dire. */
  projected: number | null;
  trend: number[];
  ghost: number[];
  span: number;
  /** La part écoulée de la tranche en cours : où tombe le dernier point. */
  tail: number;
  t: number;
  freshSeconds: number;
  tweenMs: number;
  clientTable: number;
  order: number;
}) {
  const [open, setOpen] = useState(false);
  const details = useId();
  const fresh = snap.lastOrderAt != null && t - snap.lastOrderAt < freshSeconds;
  const occupancy = venue.tables ? snap.occupiedTables / venue.tables : 0;
  return (
    <article
      className={`groupe-rise relative flex min-w-0 flex-col p-4 sm:p-5 ${CARD}`}
      style={{ "--venue": venue.color, "--i": order } as React.CSSProperties}
      aria-labelledby={`${details}-nom`}
    >
      {fresh && <span key={snap.lastOrderAt} aria-hidden className="groupe-flash pointer-events-none absolute inset-0 rounded-2xl" />}
      <header className="flex items-center gap-3">
        <Avatar venue={venue} size={40} />
        <div className="min-w-0 flex-1">
          <h3 id={`${details}-nom`} className="truncate text-[1.0625rem] font-semibold leading-tight">
            {name}
          </h3>
          <p className="truncate text-[0.8125rem] text-faint">{address}</p>
        </div>
      </header>
      <div className="mt-3">
        <Status venueDay={venueDay} snap={snap} t={t} />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-xs text-faint">Encaissé TTC</p>
          <p className="mt-1 font-display text-[2rem] font-medium leading-none tabular-nums sm:text-[2.25rem]">
            <Figure value={<AnimatedNumber value={Math.round(snap.revenue / 100)} format={formatInteger} duration={tweenMs} />} unit="€" />
          </p>
        </div>
        <p className="pb-0.5 text-[0.8125rem] leading-snug">
          <Trend ratio={previousRevenue ? snap.revenue / previousRevenue - 1 : null} suffix={`vs ${lastWeekday}`} />
        </p>
      </div>
      <p className="mt-1.5 min-h-5 text-[0.8125rem] text-muted">
        {projected != null && snap.open && (
          <>
            ≈&nbsp;<span className="font-medium text-foreground tabular-nums">{formatEuroAmount(projected)}&nbsp;€</span> à la fermeture
          </>
        )}
      </p>
      <div className="mt-2">
        <Sparkline values={trend} ghost={ghost} span={span} tail={tail} color={venue.color} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5" role="group" aria-label="Commandes en cours">
        <Count value={snap.bar} label="au bar" />
        <Count value={snap.cuisine} label="en cuisine" />
        <Count value={snap.toServe} label="à servir" />
        <Count value={snap.awaitingPayment} label="à encaisser" />
      </div>

      <Watch venueDay={venueDay} snap={snap} t={t} />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={details}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-hairline py-1.5 text-[0.8125rem] font-medium text-muted transition-colors hover:text-foreground md:hidden"
      >
        {open ? "Moins de détails" : "Tables, service, équipe…"}
        <svg viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div id={details} className={`flex-1 flex-col ${open ? "flex" : "hidden md:flex"}`}>
        <dl className="mt-4 flex flex-col gap-2.5">
          <div>
            <Row label="Tables occupées">
              {snap.occupiedTables}
              <span className="text-faint"> / {venue.tables}</span>
            </Row>
            <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/8">
              <span
                className="block h-full origin-left rounded-full bg-(--venue) transition-transform duration-700 ease-out motion-reduce:transition-none"
                style={{ transform: `scaleX(${occupancy})` }}
              />
            </div>
          </div>
          <Row label="Service">
            {snap.serviceBar != null || snap.serviceKitchen != null ? (
              <>
                {snap.serviceBar != null && <>boissons {formatWait(snap.serviceBar)}</>}
                {snap.serviceBar != null && snap.serviceKitchen != null && <span className="text-faint"> · </span>}
                {snap.serviceKitchen != null && <>plats {formatWait(snap.serviceKitchen)}</>}
              </>
            ) : (
              "—"
            )}
          </Row>
          <Row label="À encaisser">
            {snap.toCollect ? (
              <>
                {formatEuroAmount(snap.toCollect)}&nbsp;€
                <span className="text-faint">
                  {" "}
                  · {snap.awaitingPayment} commande{snap.awaitingPayment > 1 ? "s" : ""}
                </span>
              </>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Équipe">
            {snap.staff ? (
              <>
                {snap.staff} en poste
                {snap.staffHours > 0 && (
                  <span className="text-faint"> · {formatEuroAmount(snap.revenue / snap.staffHours)}&nbsp;€/h travaillée</span>
                )}
              </>
            ) : (
              "—"
            )}
          </Row>
        </dl>

        <div className="mt-4 border-t border-hairline pt-3">
          <p className="text-xs text-faint">Ce qui rapporte le plus aujourd’hui</p>
          {snap.top.length ? (
            <ol className="mt-2 flex flex-col gap-1.5 text-sm">
              {snap.top.map((item) => (
                <li key={item.id} className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 text-xs text-faint tabular-nums">{item.quantity}×</span>
                  <span className="w-16 shrink-0 text-right font-medium tabular-nums">{formatEuroAmount(item.revenue)}&nbsp;€</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-faint">Pas encore de commande</p>
          )}
        </div>

        <a
          href={`/menu/demo/${venue.slug}?table=${clientTable}`}
          target="_blank"
          rel="noopener"
          aria-label={`${name} : sa carte, côté client (nouvel onglet)`}
          className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-[0.8125rem] font-medium text-muted transition-colors hover:text-foreground"
        >
          Sa carte, côté client
          <ArrowIcon />
        </a>
      </div>
    </article>
  );
}
