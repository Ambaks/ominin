"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Segmented } from "@/components/gestion/ui";
import { LiveDot } from "@/components/hotels/ui";
import { plan, simulation, staff, type RoomStatus } from "@/lib/hotels-demo-data";
import { useDemo } from "../store";
import { label } from "../ui";
import type { HotelSim, PlanEvent, PlanLevel, PoiId } from "./plan-sim";

/*
 * Le plan 3D des chambres : la maquette du Grand Large et sa vie simulée,
 * les demandes qui s'allument et l'équipe qui y va, le fil de ce qui se passe.
 * Les maquettes se téléchargent dès l'ouverture, en même temps que le code
 * 3D. Animations réduites : l'image fixe rendue dans Blender, rien ne bouge,
 * et la liste des chambres à un geste.
 */

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const legend = [
  { key: "pending", dot: { "data-state": "pending" } },
  { key: "doing", dot: { "data-state": "doing" } },
  { key: "real", dot: { "data-real": "" } },
] as const;

function Legend() {
  return legend.map((item) => (
    <li key={item.key} className="flex items-center gap-2">
      <span className="hd-beacon-dot" {...item.dot} aria-hidden />
      {plan.legend[item.key]}
    </li>
  ));
}

export function Plan3D({ rooms, onRoom }: { rooms: Record<string, RoomStatus>; onRoom: (room: string) => void }) {
  const { activity } = useDemo();
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const engine = useRef<HotelSim | null>(null);
  const openRoom = useRef(onRoom);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const plate = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<PlanLevel>(plan.levels[0].value);
  const [pois, setPois] = useState<PoiId[]>([]);
  const [place, setPlace] = useState<PoiId | "overview" | null>("overview");
  const [edges, setEdges] = useState({ start: false, end: false });
  const [events, setEvents] = useState<(PlanEvent & { id: number })[]>([]);
  const [stats, setStats] = useState({ open: 0, busy: 0, staff: 0 });
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

  useEffect(() => {
    openRoom.current = onRoom;
  }, [onRoom]);

  useEffect(() => {
    if (reduced || !canvas.current || !overlay.current) return;
    const c = canvas.current;
    const o = overlay.current;
    const abort = new AbortController();
    const assets = Promise.all(
      [simulation.model.hotel, simulation.model.figures].map((url) =>
        fetch(url, { signal: abort.signal }).then((r) => {
          if (!r.ok) throw new Error(url);
          return r.arrayBuffer();
        })
      )
    ) as Promise<[ArrayBuffer, ArrayBuffer]>;
    assets.catch(() => undefined);
    let live = true;
    let seq = 0;
    import("./plan-sim")
      .then(({ HotelSim }) => {
        if (!live) return;
        const sim = new HotelSim(c, o, {
          onEvent: (event) => setEvents((list) => [{ ...event, id: ++seq }, ...list].slice(0, simulation.feedLength)),
          onRoom: (room) => openRoom.current(room),
          onReady: (list) => {
            setPois(list);
            setReady(true);
          },
          onError: () => setFailed(true),
          onStats: setStats,
          onInteract: () => setPlace(null),
        });
        engine.current = sim;
        void sim.load(assets);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
      abort.abort();
      engine.current?.dispose();
      engine.current = null;
      setReady(false);
      setFailed(false);
    };
  }, [reduced]);

  useEffect(() => {
    if (ready) engine.current?.setRooms(rooms);
  }, [rooms, ready]);
  useEffect(() => {
    if (ready) engine.current?.setActivity(activity);
  }, [activity, ready]);
  useEffect(() => {
    if (ready) engine.current?.setLevel(level);
  }, [level, ready]);

  /** Sur un petit écran, la maquette entière sous les yeux, entre la barre du haut et celle des onglets. */
  const reveal = () => plate.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  const goTo = (id: PoiId) => {
    const next = engine.current?.goTo(id);
    if (!next) return;
    setLevel(next);
    setPlace(id);
    reveal();
  };
  const overview = () => {
    engine.current?.overview();
    setLevel(plan.levels[0].value);
    setPlace("overview");
    reveal();
  };
  /** La rangée « Aller à » défile sur téléphone et tablette : un fondu au bord tant qu'il reste des boutons de ce côté. */
  const scrolled = (row: HTMLElement) => {
    const start = row.scrollLeft > 1;
    const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
  };

  const still = reduced || failed;
  const real = events.filter((e) => e.real);

  return (
    <div className="grid gap-g-gap lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented label={plan.levelsLabel} glass={false} options={plan.levels} value={level} onChange={setLevel} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              {plan.stats.open} <b className="tabular-nums text-foreground">{stats.open}</b>
            </span>
            <span>
              {plan.stats.busy}{" "}
              <b className="tabular-nums text-foreground">
                {stats.busy} / {stats.staff}
              </b>
            </span>
          </p>
        </div>
        {!still && pois.length > 0 && (
          <nav
            aria-label={plan.goTo}
            ref={(row) => {
              if (row) scrolled(row);
            }}
            onScroll={(e) => scrolled(e.currentTarget)}
            data-start={edges.start || undefined}
            data-end={edges.end || undefined}
            className="hd-goto -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible"
          >
            <span className={`${label} shrink-0`}>{plan.goTo}</span>
            <button type="button" aria-pressed={place === "overview"} className="g-btn g-btn-secondary g-press hd-goto-btn shrink-0" onClick={overview}>
              {plan.overview}
            </button>
            {pois.map((id) => (
              <button key={id} type="button" aria-pressed={place === id} className="g-btn g-btn-secondary g-press hd-goto-btn shrink-0" onClick={() => goTo(id)}>
                {plan.pois[id]}
              </button>
            ))}
          </nav>
        )}
        <div ref={plate} className="hotels-night g-plate hd-plate relative overflow-hidden">
          {(still || !ready) && (
            // eslint-disable-next-line @next/next/no-img-element -- l'image fixe du rendu Blender, déjà à sa taille
            <img src={plan.still} alt={plan.stillAlt} className="absolute inset-0 size-full object-contain p-4" />
          )}
          {!still && (
            <canvas
              ref={canvas}
              role="img"
              aria-label={plan.canvasLabel}
              className={`absolute inset-0 size-full transition-opacity duration-700 ${ready ? "" : "opacity-0"}`}
            />
          )}
          <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />
          {!ready && !still && <p className="g-chip absolute right-3 top-3">{plan.loading}</p>}
          {!still && (
            <>
              <ul aria-label={plan.legendLabel} className="hd-legend pointer-events-none absolute bottom-3 left-3 flex-col gap-1.5 max-sm:hidden sm:flex">
                <Legend />
              </ul>
              <details className="hd-legend-toggle absolute left-3 top-3 sm:hidden">
                <summary aria-label={plan.legendToggle.label} className="g-press">
                  <span aria-hidden>{plan.legendToggle.mark}</span>
                </summary>
                <ul aria-label={plan.legendLabel} className="hd-legend mt-2 flex flex-col gap-1.5">
                  <Legend />
                </ul>
              </details>
            </>
          )}
        </div>
        {still ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            {plan.reduced}
            <Link href={{ query: { [staff.roomsView.param]: plan.views[1].value } }} className="g-btn g-btn-secondary g-press text-foreground">
              {plan.toList}
            </Link>
          </p>
        ) : (
          <p className="text-xs text-muted">{plan.hint}</p>
        )}
      </div>

      <section aria-label={plan.feed} className="g-plate flex flex-col p-4">
        <h2 className={`${label} flex items-center gap-2`}>
          <LiveDot />
          {plan.feed}
        </h2>
        <ul className="mt-3 flex flex-col">
          {events.length === 0 && <li className="text-sm text-muted">{plan.feedEmpty}</li>}
          {events.map((e) => (
            <li key={e.id} className="grid grid-cols-[3.6rem_1fr] gap-2 border-t border-hairline py-2 text-sm first:border-t-0 first:pt-0">
              <span className="tabular-nums text-xs text-faint">{e.at}</span>
              <span className={e.real ? "font-semibold text-ember-1" : e.tone === "done" ? "text-muted" : ""}>{e.text}</span>
            </li>
          ))}
        </ul>
        <div role="log" className="sr-only">
          {real.map((e) => (
            <p key={e.id}>{e.text}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
