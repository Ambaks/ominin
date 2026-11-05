"use client";

import type { CSSProperties, ReactNode } from "react";
import { niceTicks, type Bar } from "@/components/gestion/ui";
import { Accent } from "@/components/hotels/ui";
import { gestion, type Reading, type RoomStatus } from "@/lib/hotels-demo-data";
import { hotelsPrefix } from "@/lib/site";
import { useDemo, useDemoTime } from "../store";

/* Pièces communes de la gestion de l'hôtel : titres, cartes, chiffres, graphiques, l'état des chambres. */

export { isDone } from "../store";

export const gestionBase = `${hotelsPrefix}/demo/gestion`;

export const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
export const percent = new Intl.NumberFormat("fr-FR", { style: "percent" });
/** Un total à l'euro près, « 9 600 € » : les cents ne disent rien d'une journée. */
export const euros = (amount: number) => `${Math.round(amount).toLocaleString("fr-FR")} €`;
/** Une graduation d'axe, « 4 k€ ». */
const axisEuros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 0 });

/** « 17 h 30 » → minutes depuis minuit, pour ranger des heures écrites. */
export function minutesOf(time: string) {
  const [h = 0, m = 0] = time.match(/\d+/g)?.map(Number) ?? [];
  return h * 60 + m;
}

/**
 * Les plages d'un service en minutes depuis minuit : « 11 h – 15 h · 18 h – 23 h »
 * → [[660, 900], [1080, 1380]] ; la fin d'un service de nuit passe minuit.
 */
export function shiftRanges(shift: string): [number, number][] {
  return Array.from(shift.matchAll(/(\d+)\s*h\s*(\d*)\s*[–-]\s*(\d+)\s*h\s*(\d*)/g), ([, h1, m1, h2, m2]) => {
    const start = Number(h1) * 60 + Number(m1 || 0);
    const end = Number(h2) * 60 + Number(m2 || 0);
    return [start, end <= start ? end + 24 * 60 : end];
  });
}

export const inRange = (r: Reading) => !r.target || (r.value >= r.target[0] && r.value <= r.target[1]);
export const readingValue = (r: Reading) => `${decimal.format(r.value)}${r.unit && ` ${r.unit}`}`;

/** Ce que dit un relevé face à sa consigne : dedans, au-dessus, en dessous, ou simple repère. */
export function readingStatus(r: Reading): { text: string; problem: boolean } {
  const { spaces: copy } = gestion;
  if (!r.target) return { text: copy.marker, problem: false };
  const [min, max] = r.target;
  if (r.value > max) return { text: copy.above(decimal.format(max)), problem: true };
  if (r.value < min) return { text: copy.below(decimal.format(min)), problem: true };
  return { text: copy.inRange, problem: false };
}

/** La consigne en clair sur une ligne, et le relevé posé dessus. */
export function RangeBar({ reading }: { reading: Reading }) {
  if (!reading.target) return null;
  const [min, max] = reading.target;
  const pad = (max - min) * gestion.spaces.rangePad;
  const lo = Math.min(min - pad, reading.value);
  const hi = Math.max(max + pad, reading.value);
  const at = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <span className="relative block h-1.5 rounded-full bg-foreground/10" aria-hidden>
      <span className="absolute inset-y-0 rounded-full bg-foreground/30" style={{ left: `${at(min)}%`, width: `${at(max) - at(min)}%` }} />
      <span
        className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${inRange(reading) ? "bg-foreground" : "bg-ember-3"}`}
        style={{ left: `${at(reading.value)}%` }}
      />
    </span>
  );
}

/** La couleur de chaque état de chambre : les braises de laiton, puis le filet. */
export const roomTone: Record<RoomStatus, string> = {
  occupee: "bg-ember-2",
  depart: "bg-ember-1",
  "a-faire": "bg-ember-3",
  prete: "bg-foreground/55",
  libre: "bg-foreground/15",
};
export const roomOrder: RoomStatus[] = ["occupee", "depart", "a-faire", "prete", "libre"];

/** Ce qu'une chambre sera cette nuit : occupée, arrivée attendue (chambre prête ou non), libre. */
export type Night = keyof typeof gestion.today.occupancy.night;
export const nightOrder = Object.keys(gestion.today.occupancy.night) as Night[];

const initialRooms: Record<string, RoomStatus | undefined> = gestion.rooms.set;
export const roomArrivals: Record<string, { time: string; guest: string; vip?: boolean } | undefined> = gestion.rooms.arrivals;
export const roomGuests: Record<string, string | undefined> = gestion.rooms.guests;
/**
 * L'hôtel était plein hier soir sauf les chambres libres : une chambre a vu un départ aujourd'hui si elle
 * attend une arrivée, ou si elle part, est à préparer ou déjà prête.
 */
const vacatedToday = new Set<RoomStatus | undefined>(["depart", "a-faire", "prete"]);
const departsToday = (n: string) => roomArrivals[n] !== undefined || vacatedToday.has(initialRooms[n]);

/** Ce que sera la chambre cette nuit ; une arrivée passée à l'horloge de la démo dans une chambre prête est un client installé. */
function nightOf(n: string, status: RoomStatus, now: number): Night {
  if (status === "occupee" || status === "libre") return status;
  const arrival = roomArrivals[n];
  if (!arrival) return "libre";
  if (status === "prete") return minutesOf(arrival.time) <= now ? "occupee" : "prete";
  return "a-faire";
}

/** Les chambres de l'hôtel, avec ce que l'équipe a changé, et leurs comptes du jour à l'heure de la démo. */
export function useRooms() {
  const { rooms: changed } = useDemo();
  const { minutes } = useDemoTime();
  const { floors, perFloor } = gestion.rooms;
  const list = floors.flatMap((floor) =>
    Array.from({ length: perFloor }, (_, i) => {
      const n = `${floor}${String(i + 1).padStart(2, "0")}`;
      const status = changed[n] ?? initialRooms[n] ?? "occupee";
      const night = nightOf(n, status, minutes);
      /** L'état montré à l'heure de la démo : une chambre prête dont le client est arrivé se montre occupée. */
      const shown: RoomStatus = status === "prete" && night === "occupee" ? "occupee" : status;
      return { n, floor, status, shown, night };
    })
  );
  const departures = list.filter((r) => departsToday(r.n)).length;
  return {
    list,
    total: list.length,
    tonight: list.filter((r) => r.night !== "libre").length,
    arrivals: Object.keys(roomArrivals).length,
    /** Les arrivées encore attendues, la plus proche d'abord. */
    arriving: list
      .flatMap((r) => {
        const arrival = roomArrivals[r.n];
        return arrival && (r.night === "prete" || r.night === "a-faire") ? [{ ...r, ...arrival }] : [];
      })
      .sort((a, b) => minutesOf(a.time) - minutesOf(b.time)),
    departures,
    departed: departures - list.filter((r) => r.status === "depart").length,
    toPrepare: list.filter((r) => r.status === "a-faire").length,
  };
}

const teamTips = gestion.team.members.reduce((sum, m) => sum + m.tips, 0);

/** Les commandes passées depuis les QR de la démo, et les pourboires du jour : ceux de l'équipe, plus les leurs. */
export function useLive() {
  const { activity } = useDemo();
  const orders = activity.filter((a) => !a.seed && a.kind === "commande" && a.ticket);
  return { orders, tips: teamTips + orders.reduce((sum, a) => sum + (a.ticket?.tip ?? 0), 0) };
}

/**
 * Les barres du kit, l'axe en euros : le maximum étiqueté, la dernière
 * colonne estompée quand l'heure est entamée, la moyenne en pointillé ;
 * serrées, une étiquette sur deux au téléphone, en partant de la dernière.
 */
export function MoneyBars({
  data,
  lines,
  label,
  dense = false,
  partial = false,
  average,
}: {
  data: readonly Bar[];
  /** Le nombre de lignes de grille visé. */
  lines: number;
  label: string;
  dense?: boolean;
  partial?: boolean;
  average?: (amount: string) => string;
}) {
  const values = data.map((bar) => bar.value);
  const max = Math.max(...values);
  const maxIndex = values.indexOf(max);
  const ticks = niceTicks(max, lines);
  const top = ticks.at(-1) || 1;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return (
    <div
      role="img"
      aria-label={label}
      className={`g-bars g-money ${dense ? "g-bars-dense" : ""}`}
      style={{ "--g-top": top, "--g-n": data.length, "--g-gut": "var(--g-gutter)" } as CSSProperties}
    >
      <div className="g-bars-grid">
        {ticks.map((tick) => (
          <i key={tick} style={{ "--g-y": tick } as CSSProperties}>
            {tick > 0 && <span className="whitespace-nowrap">{axisEuros.format(tick)}</span>}
          </i>
        ))}
      </div>
      <div className="g-bars-plot">
        {data.map((bar, index) => (
          <i
            key={bar.label}
            className={`g-bar ${partial && index === data.length - 1 ? "opacity-45" : ""}`}
            style={{ "--g-v": bar.value } as CSSProperties}
            title={`${bar.label} · ${euros(bar.value)}`}
          >
            {index === maxIndex && max > 0 && <b>{euros(max)}</b>}
          </i>
        ))}
      </div>
      {average && (
        <div className="pointer-events-none absolute inset-[0_var(--g-gut)_var(--g-ax)_0]" aria-hidden>
          <span className="absolute inset-x-0 border-t border-dashed border-ember-1/70" style={{ bottom: `${(mean / top) * 100}%` }}>
            <b className="absolute bottom-1 left-0 rounded-full bg-surface/85 px-2 py-0.5 text-g-axis font-semibold whitespace-nowrap text-ember-1">
              {average(euros(mean))}
            </b>
          </span>
        </div>
      )}
      <div className="g-bars-axis">
        {data.map((bar, index) => (
          <span key={bar.label} className={dense && (data.length - 1 - index) % 2 === 1 ? "max-sm:invisible" : undefined}>
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="kit-display text-[2.5rem] sm:text-5xl">
          <Accent text={title} />
        </h1>
        {sub && <p className="mt-3 text-pretty text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

/** Une carte titrée ; `action` en pied, `aside` à droite du titre (un sous-titre ou un lien). */
export function Card({
  title,
  sub,
  aside,
  action,
  className = "",
  children,
}: {
  title: string;
  sub?: string;
  aside?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`g-plate flex flex-col p-5 ${className}`}>
      <div className={`mb-4 flex flex-wrap justify-between gap-x-4 gap-y-2 ${aside ? "items-center" : "items-baseline"}`}>
        <h2 className="kit-display text-[1.65rem]">{title}</h2>
        {sub && <p className="text-xs text-muted">{sub}</p>}
        {aside}
      </div>
      {children}
      {action && <div className="mt-auto flex justify-end pt-4">{action}</div>}
    </section>
  );
}

/** Une rangée de chiffres sur une plaque : trois côte à côte, quatre en deux rangs au téléphone. */
export function Stats({ items }: { items: { label: string; value: string; entity: "g-orders" | "g-money" | "g-problem" }[] }) {
  return (
    <dl className={`g-plate grid gap-y-4 divide-hairline py-4 ${items.length === 3 ? "grid-cols-3 divide-x" : "grid-cols-2 sm:grid-cols-4 sm:divide-x"}`}>
      {items.map((stat) => (
        <div key={stat.label} className={`${stat.entity} px-4 sm:px-5`}>
          <dt className="flex items-center gap-2 text-xs text-muted">
            <span className="size-1.5 shrink-0 rounded-full bg-g-entity" aria-hidden />
            {stat.label}
          </dt>
          <dd className="mt-1.5 text-xl font-semibold tabular-nums sm:text-g-kpi">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
