"use client";

import { gestion, staff, type TeamId } from "@/lib/hotels-demo-data";
import { useDemoTime } from "../store";
import { PageTitle, Stats, euros, shiftRanges, useLive } from "./kit";

/*
 * L'équipe du jour par zone : qui est en poste à l'heure de la démo, qui est
 * en coupure, qui a fini, qui arrive ; ce que chacun a traité, ses pourboires.
 */

const { team: copy } = gestion;
const { hourOf } = gestion.today;
const day = 24 * 60;

type Member = (typeof copy.members)[number];
type Duty = { state: "on" | "break" | "ended" | "later"; note: string };

/** Où en est le service de chacun à `now` (minutes de la démo), coupure et service de nuit compris. */
function duty(m: Member, now: number): Duty {
  const ranges = shiftRanges(m.shift);
  if (ranges.some(([start, end]) => (now >= start && now < end) || (now + day >= start && now + day < end))) {
    return { state: "on", note: copy.onDuty };
  }
  const next = ranges.find(([start]) => start > now);
  if (next) return ranges[0][0] < now ? { state: "break", note: copy.resumes(hourOf(next[0])) } : { state: "later", note: copy.later(hourOf(next[0])) };
  return { state: "ended", note: copy.ended(hourOf(ranges[ranges.length - 1][1])) };
}

const membersOf = (team: TeamId) => copy.members.filter((m) => m.team === team);
const zones = (Object.keys(staff.teams) as TeamId[]).filter((team) => membersOf(team).length > 0);
/** La zone la plus nombreuse prend toute la largeur ; les autres s'équilibrent en colonnes. */
const wide = zones.reduce((a, b) => (membersOf(b).length > membersOf(a).length ? b : a));
const others = zones.filter((team) => team !== wide);
const unitOf = (team: TeamId) => (team in copy.handled ? copy.handled[team as keyof typeof copy.handled] : copy.handled.orders);
const outlets = new Set(Object.keys(gestion.today.bySpace));
const sumHandled = (keep: (team: TeamId) => boolean) => copy.members.reduce((sum, m) => sum + (keep(m.team) ? m.handled : 0), 0);
const served = sumHandled((team) => outlets.has(team));
const roomsDone = sumHandled((team) => team === "etages");

function Team({ team, now, wide = false }: { team: TeamId; now: number; wide?: boolean }) {
  const unit = unitOf(team);
  return (
    <section className={`g-plate p-5 ${wide ? "" : "mb-g-gap break-inside-avoid"}`}>
      <h2 className="kit-display text-[1.65rem]">{staff.teams[team]}</h2>
      <ul className={`mt-2 grid gap-x-8 overflow-hidden ${wide ? "sm:grid-cols-2 xl:grid-cols-3" : ""}`}>
        {membersOf(team).map((m) => {
          const { state, note } = duty(m, now);
          return (
            <li key={m.name} className="-mt-px grid grid-cols-[1fr_auto] items-center gap-x-4 border-t border-hairline py-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold">
                  <span className={`size-2 shrink-0 rounded-full ${state === "on" ? "bg-ember-2" : "bg-foreground/20"}`} aria-hidden />
                  {m.name}
                  {state === "on" && <span className="sr-only">{note}</span>}
                </span>
                <span className="block pl-4 text-xs text-muted">
                  {m.role} · {m.shift}
                </span>
                {(state === "ended" || state === "break") && <span className="block pl-4 text-xs text-muted">{note}</span>}
              </span>
              {state === "later" ? (
                <span className="text-right text-xs text-muted">{note}</span>
              ) : (
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums">{m.tips > 0 ? euros(m.tips) : copy.noTips}</span>
                  <span className="block text-xs whitespace-nowrap tabular-nums text-muted">{unit(m.handled)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Equipe() {
  const { orders, tips } = useLive();
  const { minutes, label } = useDemoTime();
  const onDuty = copy.members.filter((m) => duty(m, minutes).state === "on").length;
  return (
    <div className="grid gap-5">
      <PageTitle title={copy.title} sub={copy.sub} />
      <Stats
        items={[
          { label: copy.stats.onDuty(label), value: `${onDuty} / ${copy.members.length}`, entity: "g-orders" },
          { label: copy.stats.served, value: (served + orders.length).toLocaleString("fr-FR"), entity: "g-orders" },
          { label: copy.stats.rooms, value: roomsDone.toLocaleString("fr-FR"), entity: "g-orders" },
          { label: copy.stats.tips, value: euros(tips), entity: "g-money" },
        ]}
      />
      <Team team={wide} now={minutes} wide />
      <div className="gap-g-gap md:columns-2 xl:columns-3">
        {others.map((team) => (
          <Team key={team} team={team} now={minutes} />
        ))}
      </div>
    </div>
  );
}
