"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { GlassButton, Segmented, Sheet } from "@/components/gestion/ui";
import { LiveDot } from "@/components/hotels/ui";
import { gestion, guest, plan, roomLabel, staff, type RoomStatus } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { isDone, useDemo } from "../store";
import { Choice, Icon, label } from "../ui";
import { PageTitle, Stats, roomArrivals, roomGuests, roomOrder, roomTone, useRooms } from "./kit";
import { Plan3D } from "./plan-3d";

/*
 * Les chambres, étage par étage : qui part, qui arrive, ce qui reste à
 * préparer. Un départ effectué la passe à préparer, une chambre faite la
 * passe prête ; une chambre prête dont l'heure d'arrivée est passée, à
 * l'horloge de la démo, est occupée. La réception et les étages voient la
 * même chose. Le plan 3D ou la liste se choisit dans l'adresse, pour que
 * « retour » y ramène.
 */

const { rooms: copy } = gestion;
const { roomsView } = staff;
type View = (typeof plan.views)[number]["value"];
const defaultView = plan.views[0].value;
const isView = (value: string | null): value is View => plan.views.some((option) => option.value === value);

/** Une chambre occupée dont l'arrivée du jour est passée, à l'horloge de la démo : son client est là. */
const hasArrived = (r: { n: string; shown: RoomStatus }) => r.shown === "occupee" && roomArrivals[r.n] !== undefined;

const slates = new Map(staff.notes.slates.map((s) => [s.room, s.lines.reduce((sum, l) => sum + l.amount, 0)]));

function RoomSheet({ n, status, arrived, onClose }: { n: string; status: RoomStatus; arrived: boolean; onClose: () => void }) {
  const { activity, total, setRoom } = useDemo();
  const [changed, setChanged] = useState<RoomStatus | null>(null);
  const arrival = roomArrivals[n];
  const name = roomGuests[n];
  const bill = n === guest.room ? total : slates.get(n);
  const open = activity.filter((a) => a.where === roomLabel(n) && a.kind !== "reservation" && !isDone(a));
  const action = status === "depart" || status === "a-faire" ? status : null;
  const facts = [
    name && !arrived && status !== "libre" && status !== "prete" && status !== "a-faire" ? { label: copy.guest, value: name } : null,
    arrival ? { label: copy.arrival, value: arrived ? roomsView.arrivedAt(arrival.time, arrival.guest) : `${arrival.time} · ${arrival.guest}` } : null,
    bill !== undefined && status !== "libre" ? { label: copy.note, value: formatPrice(bill) } : null,
  ].filter((fact) => fact !== null);
  return (
    <Sheet
      title={roomLabel(n)}
      description={copy.statuses[status]}
      onClose={onClose}
      footer={
        (changed || action) && (
          <div className="flex flex-col gap-3">
            <p role="status" className="flex items-center gap-2 text-sm font-semibold empty:hidden">
              {changed && (
                <>
                  <Icon name="check" className="size-4 shrink-0 text-ember-1" />
                  {roomsView.changed(copy.statuses[changed])}
                </>
              )}
            </p>
            {action && (
              <GlassButton
                variant="primary"
                onClick={() => {
                  setRoom(n, copy.after[action]);
                  setChanged(copy.after[action]);
                }}
              >
                {roomsView.action(copy.actions[action], copy.statuses[copy.after[action]])}
              </GlassButton>
            )}
          </div>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-2">
        {facts.map((fact) => (
          <div key={fact.label} className="hd-row px-3.5 py-3">
            <dt className="text-xs text-muted">{fact.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <h3 className={`${label} mt-6`}>{copy.requests}</h3>
      {open.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{copy.noRequest}</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {open.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-3 border-t border-hairline py-2.5 text-sm first:border-t-0">
              <span className="font-semibold">{a.title}</span>
              <span className="shrink-0 text-xs text-ember-1">{a.steps[a.step]}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function RoomList({ onOpen }: { onOpen: (n: string) => void }) {
  const { activity } = useDemo();
  const rooms = useRooms();
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const asked = new Set(activity.filter((a) => a.kind === "demande" && !isDone(a)).map((a) => a.where));
  const { list } = rooms;
  const shown = list.filter((r) => filter === "all" || r.shown === filter);
  const floors = copy.floors
    .map((floor) => ({ floor, rooms: shown.filter((r) => r.floor === floor) }))
    .filter((f) => f.rooms.length > 0);

  return (
    <>
      <div role="group" aria-label={copy.title} className="flex flex-wrap gap-2">
        <Choice on={filter === "all"} onClick={() => setFilter("all")}>
          {copy.all}
        </Choice>
        {roomOrder.map((status) => (
          <Choice key={status} on={filter === status} onClick={() => setFilter(status)}>
            <span className={`size-2 rounded-full ${roomTone[status]}`} aria-hidden />
            {copy.statuses[status]}
            <span className="tabular-nums opacity-70">{list.filter((r) => r.shown === status).length}</span>
          </Choice>
        ))}
      </div>

      {floors.length === 0 && <p className="hd-row px-4 py-5 text-sm text-muted">{roomsView.empty}</p>}
      {floors.map(({ floor, rooms: onFloor }) => (
        <section key={floor} aria-label={copy.floor(floor)}>
          <h2 className={label}>{copy.floor(floor)}</h2>
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9">
            {onFloor.map((r) => {
              const mine = r.n === guest.room;
              const arrived = hasArrived(r);
              const arrival = arrived ? undefined : roomArrivals[r.n];
              const name = roomGuests[r.n] ?? (arrived || r.status === "a-faire" || r.status === "prete" ? roomArrivals[r.n]?.guest : undefined);
              return (
                <li key={r.n}>
                  <button
                    type="button"
                    onClick={() => onOpen(r.n)}
                    aria-label={`${roomLabel(r.n)} · ${copy.statuses[r.shown]}${mine ? ` · ${roomsView.yours}` : ""}`}
                    className={`g-plate g-press flex h-full min-h-[4.25rem] w-full flex-col items-start gap-1 p-2.5 text-left ${r.shown === "a-faire" ? "ring-1 ring-ember-3" : mine ? "ring-1 ring-ember-1" : ""}`}
                  >
                    <span className="flex w-full items-center justify-between gap-1">
                      <span className={`text-base font-semibold tabular-nums ${mine ? "text-ember-1" : ""}`}>{r.n}</span>
                      {asked.has(roomLabel(r.n)) && <LiveDot />}
                    </span>
                    {mine ? (
                      <span className="text-xs font-semibold leading-tight text-ember-1">{roomsView.yours}</span>
                    ) : (
                      name && <span className="hidden w-full truncate text-xs leading-tight sm:block">{roomsView.surname(name)}</span>
                    )}
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                      <span className={`size-1.5 shrink-0 rounded-full ${roomTone[r.shown]}`} aria-hidden />
                      {r.shown !== "occupee" && copy.short[r.shown]}
                    </span>
                    {arrival && (
                      <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold tabular-nums text-ember-1">
                        <Icon name="clock" className="size-3 shrink-0" />
                        {arrival.time}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

/** La page ; `view` vide tant que l'adresse n'est pas lue. */
function Board({ view, onView }: { view: View | null; onView: (view: View) => void }) {
  const rooms = useRooms();
  const [open, setOpen] = useState<string | null>(null);
  const opened = rooms.list.find((r) => r.n === open);
  /** Les états pour le plan 3D, rebâtis seulement quand l'un change. */
  const signature = rooms.list.map((r) => `${r.n}:${r.shown}`).join(",");
  const statuses = useMemo(() => Object.fromEntries(signature.split(",").map((pair) => pair.split(":"))) as Record<string, RoomStatus>, [signature]);

  return (
    <div className="grid gap-5">
      <PageTitle
        title={copy.title}
        sub={copy.sub}
        right={<Segmented label={plan.viewsLabel} options={plan.views} value={view ?? defaultView} onChange={onView} />}
      />
      <Stats
        items={[
          { label: copy.stats.occupied, value: `${rooms.tonight} / ${rooms.total}`, entity: "g-orders" },
          { label: copy.stats.arrivals, value: String(rooms.arrivals), entity: "g-orders" },
          { label: roomsView.departures(rooms.departed), value: String(rooms.departures), entity: "g-orders" },
          { label: copy.stats.toPrepare, value: String(rooms.toPrepare), entity: "g-problem" },
        ]}
      />

      {view === "plan" && <Plan3D rooms={statuses} onRoom={setOpen} />}
      {view === "liste" && <RoomList onOpen={setOpen} />}

      {opened && (
        <RoomSheet
          key={opened.n}
          n={opened.n}
          status={opened.shown}
          arrived={hasArrived(opened)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function BoardFromUrl() {
  const params = useSearchParams();
  const asked = params.get(roomsView.param);
  /** Une valeur inconnue dans l'adresse : le plan, et l'adresse nettoyée. */
  useEffect(() => {
    if (asked === null || isView(asked)) return;
    const query = new URLSearchParams(params.toString());
    query.delete(roomsView.param);
    const search = query.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [asked, params]);
  const choose = (next: View) => {
    const query = new URLSearchParams(params.toString());
    if (next === defaultView) query.delete(roomsView.param);
    else query.set(roomsView.param, next);
    const search = query.toString();
    window.history.pushState(null, "", search ? `?${search}` : window.location.pathname);
  };
  return <Board view={isView(asked) ? asked : defaultView} onView={choose} />;
}

export function Chambres() {
  return (
    <Suspense fallback={<Board view={null} onView={() => {}} />}>
      <BoardFromUrl />
    </Suspense>
  );
}
