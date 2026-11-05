"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { GlassButton } from "@/components/gestion/ui";
import { LiveDot } from "@/components/hotels/ui";
import { qrPoints, staff, type Activity, type TeamId } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { hotelsPrefix } from "@/lib/site";
import { isDone, minutesSince, useDemo, useDemoTime } from "../store";
import { Choice, Icon, label, type IconName } from "../ui";
import { PageTitle, Stats } from "./kit";

/*
 * Le service en direct : ce que les QR clients envoient, par zone, avec
 * l'endroit où aller : ce que le visiteur de la démo vient d'envoyer en
 * tête, puis le plus ancien d'abord. Un geste ici fait avancer le suivi sur
 * le téléphone du client.
 */

type Zone = TeamId | "all";

const kindIcon = (a: Activity): IconName =>
  a.kind === "commande" ? "receipt" : a.kind === "appel" ? "bell" : a.kind === "reservation" ? "clock" : (a.icon ?? "bell");

/** Un ordinateur ouvre la page du client dans un onglet à côté ; un téléphone y va. */
const finePointer = "(hover: hover) and (pointer: fine)";
function useDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(finePointer);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => matchMedia(finePointer).matches,
    () => false,
  );
}

function ItemCard({ a, ready, waited, onAdvance }: { a: Activity; ready: boolean; waited?: number; onAdvance: () => void }) {
  const done = isDone(a);
  const late = waited !== undefined && waited >= staff.lateAfter;
  const fresh = !a.seed && a.step === 0;
  const { ticket } = a;
  return (
    <article className={`g-plate ${done ? "" : "g-orders"} ${ready ? "g-ready" : ""} ${fresh ? "ring-1 ring-ember-1" : ""} flex flex-col p-3.5 sm:p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          {fresh && (
            <span className="g-chip font-semibold text-ember-1">
              <LiveDot />
              {staff.fresh}
            </span>
          )}
          <p className="g-eyebrow flex min-w-0 items-center gap-2">
            <Icon name={kindIcon(a)} className="size-4" />
            {staff.kinds[a.kind]} · {staff.teams[a.team]}
          </p>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1 whitespace-nowrap text-xs tabular-nums text-faint">
          {a.at}
          {waited !== undefined &&
            (late ? (
              <span className="g-chip g-chip-problem font-semibold">
                <Icon name="clock" />
                {staff.since(waited)}
              </span>
            ) : (
              <span>{staff.since(waited)}</span>
            ))}
        </span>
      </div>
      <h3 className="kit-display mt-1.5 text-[1.55rem] [overflow-wrap:anywhere] sm:mt-2 sm:text-[1.9rem]">{a.where}</h3>
      {a.guest && <p className="text-xs text-muted">{a.guest}</p>}

      {ticket ? (
        <>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {ticket.lines.map((line) => (
              <li key={line.name}>
                <span className="tabular-nums text-muted">{line.qty}×</span> {line.name}
              </li>
            ))}
          </ul>
          {ticket.note && (
            <p className="mt-3 rounded-g-card px-3 py-2 text-sm ring-1 ring-hairline [overflow-wrap:anywhere]">
              <span className="mr-1.5 text-xs font-semibold text-ember-1">{staff.note}</span>« {ticket.note} »
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-hairline pt-3">
            <span className="font-semibold tabular-nums">{formatPrice(ticket.total)}</span>
            <span className="g-chip">{ticket.room ? staff.pay.room(ticket.room) : staff.pay.card}</span>
            {ticket.slot && <span className="g-chip">{staff.slot(ticket.slot)}</span>}
            {ticket.tip > 0 && <span className="text-xs text-muted">{staff.tip(formatPrice(ticket.tip))}</span>}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm font-semibold">{a.title}</p>
      )}

      <p className={`mt-3 flex items-center gap-2 text-sm font-semibold sm:mt-4 ${done ? "text-muted" : "text-ember-1"}`}>
        {done && <Icon name="check" className="size-4 text-ember-1" />}
        {a.steps[a.step]}
      </p>
      <div className="mt-2 flex gap-1" aria-hidden>
        {a.steps.map((step, i) => (
          <span key={step} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= a.step ? "ember-gradient" : "bg-foreground/10"}`} />
        ))}
      </div>
      {!done && (
        <GlassButton variant="primary" className="mt-3 w-full sm:mt-4" onClick={onAdvance}>
          {a.actions[a.step]}
          <Icon name="chevron" />
        </GlassButton>
      )}
    </article>
  );
}

export function Service() {
  const { activity, advance, loaded } = useDemo();
  const { minutes: now } = useDemoTime();
  const desktop = useDesktop();
  const [zone, setZone] = useState<Zone>("all");
  /** Ce qui était là à l'ouverture, une fois l'état relu : seul ce qui arrive ensuite s'allume. */
  const [seen, setSeen] = useState<Set<string> | null>(null);
  if (loaded && seen === null) setSeen(new Set(activity.map((a) => a.id)));

  const items = activity.filter((a) => a.kind !== "reservation");
  const open = items.filter((a) => !isDone(a));
  const shown = items.filter((a) => zone === "all" || a.team === zone);
  const waited = new Map(open.map((a) => [a.id, minutesSince(a.at, now)]));
  /** Ce que le visiteur vient d'envoyer d'abord, puis le plus ancien. */
  const ordered = (list: Activity[]) =>
    [...list].sort((x, y) => Number(Boolean(x.seed)) - Number(Boolean(y.seed)) || (waited.get(y.id) ?? 0) - (waited.get(x.id) ?? 0));
  const columns = {
    new: ordered(shown.filter((a) => !isDone(a) && a.step === 0)),
    doing: ordered(shown.filter((a) => !isDone(a) && a.step > 0)),
    done: shown.filter(isDone),
  };
  const zones: Zone[] = ["all", ...(Object.keys(staff.teams) as TeamId[])];

  return (
    <div className="grid gap-5">
      <PageTitle title={staff.title} sub={staff.subtitle} />
      <div className="-mt-1 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <p className="flex items-center gap-3 text-sm font-semibold text-ember-1">
          <span aria-hidden className="h-px w-6 shrink-0 bg-ember-1" />
          {staff.hint}
        </p>
        <Link href={`${hotelsPrefix}/demo/${qrPoints[0].id}`} target={desktop ? "_blank" : undefined} className="g-btn g-btn-secondary g-press">
          {staff.guestLink}
          <Icon name="chevron" />
        </Link>
      </div>
      <Stats
        items={[
          { label: staff.columns.new.title, value: String(columns.new.length), entity: "g-orders" },
          { label: staff.columns.doing.title, value: String(columns.doing.length), entity: "g-orders" },
          { label: staff.tips, value: formatPrice(shown.reduce((sum, a) => sum + (a.ticket?.tip ?? 0), 0)), entity: "g-money" },
        ]}
      />

      <div
        role="group"
        aria-label={staff.zones}
        className="hd-scroller relative -mx-4 flex scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,transparent,#000_1rem,#000_calc(100%-3rem),transparent)] lg:mx-0 lg:flex-wrap lg:px-0 lg:[mask-image:none]"
      >
        {zones.map((z) => {
          const n = open.filter((a) => z === "all" || a.team === z).length;
          return (
            <Choice key={z} on={zone === z} onClick={() => setZone(z)} className="relative shrink-0">
              {z === "all" ? staff.allZones : staff.teams[z]}
              {n > 0 && (
                <span className="tabular-nums opacity-70">
                  <span aria-hidden>{n}</span>
                  <span className="sr-only">{staff.openCount(n)}</span>
                </span>
              )}
            </Choice>
          );
        })}
      </div>

      <div className="mt-1 grid items-start gap-g-gap md:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(columns) as (keyof typeof columns)[]).map((key) => (
          <section key={key} aria-label={staff.columns[key].title} className={key === "done" ? "md:col-span-2 lg:col-span-1" : ""}>
            <h2 className={`${label} flex items-center gap-2`}>
              {key === "new" && columns.new.length > 0 && <LiveDot />}
              {staff.columns[key].title}
              <span className="tabular-nums text-faint">{columns[key].length}</span>
            </h2>
            <div aria-live={key === "new" ? "polite" : undefined} className={`mt-3 grid gap-3 ${key === "done" ? "md:grid-cols-2 lg:grid-cols-1" : ""}`}>
              {columns[key].length === 0 && <p className="hd-row px-4 py-5 text-sm text-muted">{staff.columns[key].empty}</p>}
              {columns[key].map((a) => (
                <ItemCard key={a.id} a={a} ready={seen !== null && !seen.has(a.id)} waited={waited.get(a.id)} onAdvance={() => advance(a.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
