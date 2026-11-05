"use client";

import { GlassButton, RankedList, StatTile } from "@/components/gestion/ui";
import { LiveDot, Ring } from "@/components/hotels/ui";
import { gestion, staff } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { useDemo } from "../store";
import { Icon, label } from "../ui";
import {
  Card,
  MoneyBars,
  PageTitle,
  RangeBar,
  decimal,
  euros,
  gestionBase,
  inRange,
  isDone,
  minutesOf,
  nightOrder,
  percent,
  readingStatus,
  readingValue,
  roomTone,
  useLive,
  useRooms,
  type Night,
} from "./kit";

/*
 * La journée du directeur : ce qui demande son attention, la restauration
 * depuis ce matin, les chambres de ce soir et ce qu'elles rapportent, ce qui
 * attend l'équipe, les arrivées, l'affluence, les relevés, et demain.
 */

const { today } = gestion;
const dayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(Date.parse(`${today.date}T00:00:00Z`));
const date = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
const outlets = Object.keys(today.bySpace) as (keyof typeof today.bySpace)[];
const outOfRange = gestion.spaces.readings.filter((r) => !inRange(r));
const readings = [...gestion.spaces.readings].sort((a, b) => Number(inRange(a)) - Number(inRange(b))).slice(0, today.readings.shown);
const timed = outlets.flatMap((team) => {
  const { orders, wait } = today.bySpace[team];
  return wait === undefined ? [] : [{ team, orders, wait }];
});
const wait = Math.round(timed.reduce((sum, s) => sum + s.orders * s.wait, 0) / timed.reduce((sum, s) => sum + s.orders, 0));
const slow = timed.filter((s) => s.wait >= today.alerts.slowAfter);
const tomorrow = gestion.analyses.forecast.days[0];

type Rooms = ReturnType<typeof useRooms>;

/** Les arrivées encore attendues, heure par heure : chambre prête en bas, à préparer au-dessus. */
function ArrivalsByHour({ arriving }: { arriving: Rooms["arriving"] }) {
  const { occupancy } = today;
  if (arriving.length === 0) return null;
  const hours = arriving.map((r) => Math.floor(minutesOf(r.time) / 60));
  const first = Math.min(...hours);
  const bins = Array.from({ length: Math.max(...hours) - first + 1 }, (_, i) => {
    const inHour = arriving.filter((_, j) => hours[j] === first + i);
    return { hour: today.hourOf((first + i) * 60), ready: inHour.filter((r) => r.night === "prete").length, total: inHour.length };
  });
  const peak = Math.max(...bins.map((b) => b.total));
  return (
    <figure className="mt-5" role="img" aria-label={`${occupancy.arrivalsChart(arriving.length)} : ${bins.map((b) => occupancy.arrivalsHour(b.hour, b.total)).join(", ")}`}>
      <figcaption className="text-g-meta text-muted" aria-hidden>
        {occupancy.arrivalsChart(arriving.length)}
      </figcaption>
      <ol className="mt-2 grid auto-cols-fr grid-flow-col gap-1.5" aria-hidden>
        {bins.map((b) => (
          <li key={b.hour} className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold tabular-nums">{b.total > 0 ? b.total : ""}</span>
            <span className="flex h-10 w-full flex-col-reverse overflow-hidden rounded-sm bg-foreground/5">
              <span className={roomTone.prete} style={{ height: `${(b.ready / peak) * 100}%` }} />
              <span className={roomTone["a-faire"]} style={{ height: `${((b.total - b.ready) / peak) * 100}%` }} />
            </span>
            <span className="text-g-axis whitespace-nowrap tabular-nums text-muted">{b.hour}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function Tonight({ rooms }: { rooms: Rooms }) {
  const { occupancy } = today;
  const count = (night: Night) => rooms.list.filter((r) => r.night === night).length;
  const revenue = rooms.tonight * occupancy.adr;
  return (
    <div className="mt-5 flex flex-1 flex-col">
      <div
        role="img"
        aria-label={`${occupancy.chart} : ${nightOrder.map((n) => `${occupancy.night[n]} ${count(n)}`).join(", ")}`}
        className="flex h-2.5 overflow-hidden rounded-full bg-foreground/10"
      >
        {nightOrder.map((night) => (
          <span key={night} className={roomTone[night]} style={{ width: `${(count(night) / rooms.total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-hidden>
        {nightOrder.map((night) => (
          <li key={night} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${roomTone[night]}`} />
            {occupancy.night[night]}
            <b className="font-semibold tabular-nums text-foreground">{count(night)}</b>
          </li>
        ))}
      </ul>
      <ArrivalsByHour arriving={rooms.arriving} />
      <p className="mt-5 border-t border-hairline pt-4 text-g-meta text-muted sm:mt-auto">{occupancy.money}</p>
      <dl className="mt-2 grid grid-cols-3 gap-3">
        {[
          { label: occupancy.revenue, value: euros(revenue) },
          { label: occupancy.adrLabel, value: euros(occupancy.adr) },
          { label: occupancy.revpar, value: euros(revenue / rooms.total) },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-g-meta text-muted">{stat.label}</dt>
            <dd className="mt-1 text-lg font-semibold whitespace-nowrap tabular-nums sm:text-xl">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Apercu() {
  const { activity, places } = useDemo();
  const rooms = useRooms();
  const { orders: live, tips } = useLive();

  const liveTotal = (team?: string) => live.filter((a) => !team || a.team === team).reduce((sum, a) => sum + (a.ticket?.total ?? 0), 0);
  const spaces = outlets
    .map((team) => ({
      team,
      revenue: today.bySpace[team].revenue + liveTotal(team),
      orders: today.bySpace[team].orders + live.filter((a) => a.team === team).length,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  const revenue = spaces.reduce((sum, s) => sum + s.revenue, 0);
  const orders = spaces.reduce((sum, s) => sum + s.orders, 0);
  const hourly = today.revenue.hours.map((hour, i) => ({
    label: hour,
    value: today.revenue.values[i] + (i === today.revenue.values.length - 1 ? liveTotal() : 0),
  }));

  const open = activity.filter((a) => a.kind !== "reservation" && !isDone(a));
  const calls = open.filter((a) => a.kind === "appel").length;
  const notReady = rooms.arriving.filter((r) => r.night === "a-faire").length;
  const alerts = [
    ...(outOfRange.length > 0 ? [{ key: "readings", text: today.alerts.readings(outOfRange.length), href: `${gestionBase}/espaces` }] : []),
    ...slow.map((s) => ({ key: s.team, text: today.alerts.slow(staff.teams[s.team], s.wait), href: `${gestionBase}/service` })),
    ...(calls > 0 ? [{ key: "calls", text: today.alerts.calls(calls), href: `${gestionBase}/service` }] : []),
    ...(notReady > 0 ? [{ key: "rooms", text: today.alerts.notReady(notReady), href: `${gestionBase}/chambres` }] : []),
  ];

  return (
    <div className="grid gap-5">
      <PageTitle title={today.title} sub={date} />

      <section aria-label={today.alerts.label} className="flex flex-wrap items-center gap-2">
        <h2 className={`${label} mr-1`}>{today.alerts.label}</h2>
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <GlassButton key={alert.key} href={alert.href}>
              <span className="size-2 shrink-0 rounded-full bg-ember-3" aria-hidden />
              {alert.text}
            </GlassButton>
          ))
        ) : (
          <span className="g-chip">{today.alerts.calm}</span>
        )}
      </section>

      <div className="grid gap-g-gap md:grid-cols-2">
        <StatTile
          hero
          entity="money"
          icon={<Icon name="chart" />}
          label={today.revenue.label}
          value={euros(revenue)}
          delta={{ text: today.revenue.delta, tone: "better" }}
          baseline={today.revenue.baseline}
          title={today.revenue.title}
          href={`${gestionBase}/analyses`}
          chart={
            <div className="mt-4">
              <MoneyBars
                data={hourly}
                lines={3}
                dense
                partial
                label={`${today.revenue.chart} : ${hourly.map((h) => `${h.label} ${euros(h.value)}`).join(", ")}`}
              />
              <p className="mt-2 flex items-center gap-1.5 text-g-meta text-muted">
                <span className="size-2 rounded-sm bg-ember-1/45" aria-hidden />
                {today.revenue.partial(hourly[hourly.length - 1].label)}
              </p>
            </div>
          }
        />
        <StatTile
          hero
          entity="orders"
          icon={<Icon name="bed" />}
          label={today.occupancy.label}
          value={percent.format(rooms.tonight / rooms.total)}
          baseline={today.occupancy.baseline(rooms.tonight, rooms.total)}
          href={`${gestionBase}/chambres`}
          chart={<Tonight rooms={rooms} />}
        />
      </div>

      <div className="grid grid-cols-2 gap-g-gap lg:grid-cols-[2fr_1fr_1fr]">
        <Card title={today.now.title} className="col-span-2 lg:col-span-1" aside={<GlassButton href={`${gestionBase}/service`}>{today.now.cta}</GlassButton>}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: today.now.open, value: open.filter((a) => a.step === 0).length },
              { label: today.now.doing, value: open.filter((a) => a.step > 0).length },
              { label: today.now.calls, value: calls },
            ].map((stat) => (
              <div key={stat.label} className="hd-row px-3 py-3">
                <dt className="text-xs text-muted">{stat.label}</dt>
                <dd className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
                  {stat.value}
                  {stat.value > 0 && <LiveDot />}
                </dd>
              </div>
            ))}
            <div className="hd-row px-3 py-3">
              <dt className="text-xs text-muted">{today.now.wait}</dt>
              <dd className="mt-1 text-2xl font-semibold whitespace-nowrap tabular-nums">{today.now.minutes(wait)}</dd>
            </div>
          </dl>
        </Card>
        <StatTile entity="money" icon={<Icon name="receipt" />} label={today.basket.label} value={formatPrice(revenue / orders)} baseline={today.basket.baseline} />
        <StatTile entity="money" icon={<Icon name="users" />} label={today.tips.label} value={euros(tips)} baseline={today.tips.baseline} href={`${gestionBase}/equipe`} />
      </div>

      <div className="grid items-start gap-g-gap lg:grid-cols-2">
        <div className="grid gap-g-gap">
          <Card title={today.spaces.title} sub={today.spaces.sub}>
            <p className="-mt-1 mb-1 text-right text-g-meta text-muted">{today.spaces.ordersHead}</p>
            <RankedList
              size="bar"
              entity="money"
              label={today.spaces.title}
              items={spaces.map((s) => ({
                label: staff.teams[s.team],
                value: s.revenue > 0 ? euros(s.revenue) : today.spaces.closed,
                amount: s.revenue,
                meta: s.orders > 0 ? String(s.orders) : "—",
              }))}
            />
          </Card>

          <Card title={today.readings.title} sub={today.readings.sub} action={<GlassButton href={`${gestionBase}/espaces`}>{today.readings.cta}</GlassButton>}>
            <ul className="flex flex-col gap-1">
              {readings.map((r) => {
                const status = readingStatus(r);
                return (
                  <li
                    key={`${r.place}-${r.label}`}
                    className={status.problem ? "hd-row g-problem p-3 ring-1 ring-ember-3" : "border-t border-hairline px-3 py-2.5 first:border-t-0"}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-start gap-2">
                        <Icon name="thermo" className={`mt-0.5 size-4 shrink-0 ${status.problem ? "text-ember-3" : "text-muted"}`} />
                        <span className="min-w-0">
                          <span className="block text-sm">{r.label}</span>
                          <span className="block text-xs text-muted">{r.place}</span>
                        </span>
                      </span>
                      <b className="shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums">{readingValue(r)}</b>
                    </div>
                    {status.problem && r.target && (
                      <div className="mt-3 pl-6">
                        <RangeBar reading={r} />
                        <p className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                          {gestion.spaces.target(decimal.format(r.target[0]), decimal.format(r.target[1]), r.unit)}
                          <span className="g-chip g-chip-problem">{status.text}</span>
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
        <div className="grid gap-g-gap">
          <Card title={today.arrivals.title} action={<GlassButton href={`${gestionBase}/chambres`}>{today.arrivals.cta}</GlassButton>}>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: today.arrivals.arrivals, value: today.arrivals.pending(rooms.arriving.length, rooms.arrivals) },
                { label: today.arrivals.departures, value: today.arrivals.done(rooms.departed, rooms.departures) },
              ].map((stat) => (
                <div key={stat.label} className="hd-row px-3 py-3">
                  <dt className="text-xs text-muted">{stat.label}</dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
            <p className={`${label} mt-5 mb-1`}>{today.arrivals.list}</p>
            {rooms.arriving.length > 0 ? (
              <ul className="flex flex-col">
                {rooms.arriving.slice(0, today.arrivalsShown).map((r) => (
                  <li key={r.n} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 border-t border-hairline py-2.5 first:border-t-0">
                    <span className="min-w-14 text-sm font-semibold whitespace-nowrap tabular-nums">{r.time}</span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 text-sm">
                        {r.guest}
                        {r.vip && <span className="g-chip g-orders">{today.arrivals.vip}</span>}
                      </span>
                      <span className="block text-xs tabular-nums text-muted">{today.arrivals.room(r.n)}</span>
                    </span>
                    <span className={`g-chip ${r.night === "a-faire" ? "g-chip-problem" : ""}`}>{gestion.rooms.statuses[r.night]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{today.arrivals.none}</p>
            )}
          </Card>

          <Card title={today.places.title} action={<GlassButton href={`${gestionBase}/espaces`}>{today.places.cta}</GlassButton>}>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-5 sm:grid-cols-4">
              {places.slice(0, today.places.shown).map((place) => (
                <li key={place.id} className="flex flex-col items-center text-center">
                  <span className="relative">
                    <Ring share={place.share} className="size-16 sm:size-20" />
                    <span className={`absolute inset-0 flex items-center justify-center font-bold tabular-nums ${place.unit ? "text-base sm:text-lg" : "text-g-axis"}`}>{place.value}</span>
                  </span>
                  <span className="mt-2 text-sm font-semibold">{place.label}</span>
                  <span className="text-g-meta text-foreground/85">{place.hint}</span>
                  <span className="text-g-meta text-muted">{place.glance}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <section aria-label={today.tomorrow.title} className="g-plate flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <h2 className="kit-display text-[1.65rem]">{today.tomorrow.title}</h2>
        <p className="ember-text text-xl font-semibold tabular-nums">{tomorrow.weather}</p>
        <p className="text-sm text-muted">{tomorrow.occupancy}</p>
        <p className="min-w-0 flex-1 basis-60 text-sm text-foreground/85">{tomorrow.note}</p>
        <GlassButton href={`${gestionBase}/analyses`}>{today.tomorrow.cta}</GlassButton>
      </section>
    </div>
  );
}
