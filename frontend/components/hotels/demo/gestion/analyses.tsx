"use client";

import { RankedList, StatTile } from "@/components/gestion/ui";
import { gestion, staff, type TeamId } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { Icon } from "../ui";
import { Card, MoneyBars, PageTitle, euros, percent } from "./kit";

/*
 * La semaine de l'hôtel pour la direction : les chambres et ce qu'elles
 * rapportent, la restauration par jour et par espace, l'attente, les
 * demandes, les jours à venir.
 */

const { analyses: copy } = gestion;
const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const dayMs = 24 * 60 * 60 * 1000;
const demoDay = Date.parse(`${gestion.today.date}T00:00:00Z`);
const nights = copy.revenue.length;
const roomCount = gestion.rooms.floors.length * gestion.rooms.perFloor;
const roomsRevenue = copy.rooms.adr * copy.rooms.sold;
const total = copy.revenue.reduce((sum, v) => sum + v, 0);
const spaces = (Object.entries(copy.bySpace) as [TeamId, number][]).sort((a, b) => b[1] - a[1]);
/** Les sept jours complets avant le jour de la démo, nommés d'après lui. */
const days = copy.revenue.map((value, i) => ({ label: weekday.format(demoDay - (nights - i) * dayMs), value }));

export function Analyses() {
  return (
    <div className="grid gap-5">
      <PageTitle title={copy.title} sub={copy.sub} />

      <div className="grid gap-g-gap sm:grid-cols-2 xl:grid-cols-4">
        <StatTile entity="money" icon={<Icon name="chart" />} label={copy.kpis.revenue} value={euros(total)} delta={{ text: copy.delta, tone: "better" }} baseline={copy.baselines.revenue} />
        <StatTile entity="money" icon={<Icon name="bed" />} label={copy.kpis.rooms} value={euros(roomsRevenue)} baseline={copy.baselines.rooms(copy.rooms.sold.toLocaleString("fr-FR"))} />
        <StatTile entity="orders" icon={<Icon name="bed" />} label={copy.kpis.occupancy} value={percent.format(copy.rooms.sold / (roomCount * nights))} baseline={copy.baselines.occupancy(roomCount)} />
        <StatTile entity="money" icon={<Icon name="chart" />} label={copy.kpis.revpar} value={euros(roomsRevenue / (roomCount * nights))} baseline={copy.baselines.revpar} />
      </div>
      <div className="grid grid-cols-2 gap-g-gap xl:grid-cols-4">
        <StatTile plain entity="orders" label={copy.kpis.orders} value={copy.orders.toLocaleString("fr-FR")} baseline={copy.baselines.orders(Math.round(copy.orders / nights))} />
        <StatTile plain entity="money" label={copy.kpis.basket} value={formatPrice(total / copy.orders)} baseline={copy.baselines.basket} />
        <StatTile plain entity="money" label={copy.kpis.adr} value={euros(copy.rooms.adr)} baseline={copy.baselines.adr} />
        <StatTile plain entity="orders" label={copy.kpis.wait} value={copy.waits.unit(copy.wait)} baseline={copy.baselines.wait} />
      </div>

      <Card title={copy.days.title} sub={copy.days.sub}>
        <MoneyBars data={days} lines={4} average={copy.days.average} label={`${copy.days.title} : ${days.map((d) => `${d.label} ${euros(d.value)}`).join(", ")}`} />
      </Card>

      <div className="grid gap-g-gap lg:grid-cols-2">
        <Card title={copy.spaces.title} sub={copy.spaces.sub}>
          <RankedList
            size="bar"
            entity="money"
            label={copy.spaces.title}
            items={spaces.map(([team, value]) => ({ label: staff.teams[team], value: euros(value), amount: value, meta: percent.format(value / total) }))}
          />
        </Card>
        <Card title={copy.waits.title} sub={copy.waits.sub}>
          <RankedList
            entity="orders"
            label={copy.waits.title}
            items={copy.waits.items.map((w) => ({ label: staff.teams[w.team], value: copy.waits.unit(w.minutes), amount: w.minutes }))}
          />
        </Card>
        <Card title={copy.requests.title} sub={copy.requests.sub}>
          <RankedList entity="orders" label={copy.requests.title} items={copy.requests.items.map((r) => ({ label: r.label, value: String(r.count), amount: r.count }))} />
        </Card>
        <Card title={copy.forecast.title} sub={copy.forecast.sub}>
          <ul className="flex flex-col">
            {copy.forecast.days.map((d) => (
              <li key={d.day} className="border-t border-hairline py-3 first:border-t-0 first:pt-0">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{d.day}</span>
                  <span className="text-xs tabular-nums text-muted">
                    {d.weather} · {d.occupancy}
                  </span>
                </p>
                <p className="mt-1 text-sm text-foreground/85">{d.note}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
