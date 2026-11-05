"use client";

import { Ring } from "@/components/hotels/ui";
import { gestion, staff } from "@/lib/hotels-demo-data";
import { useDemo } from "../store";
import { Icon, label } from "../ui";
import { PageTitle, RangeBar, decimal, readingStatus, readingValue } from "./kit";

/*
 * Les espaces : les relevés de l'équipe (températures, qualité de l'eau)
 * face à leur consigne, puis l'affluence comptée à l'entrée et la journée de
 * chaque espace. Le compteur se voit aussitôt sur le téléphone des clients.
 */

const { spaces: copy } = gestion;

export function Espaces() {
  const { places, count } = useDemo();
  return (
    <div className="grid gap-5">
      <PageTitle title={copy.title} sub={copy.sub} />

      <section aria-label={copy.readingsTitle}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="kit-display text-[1.65rem]">{copy.readingsTitle}</h2>
          <p className="text-xs text-muted">{copy.readingsSub}</p>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {copy.readings.map((r) => {
            const status = readingStatus(r);
            return (
              <li key={`${r.place}-${r.label}`} className={`g-plate flex flex-col p-4 ${status.problem ? "g-problem ring-1 ring-ember-3" : ""}`}>
                <p className="g-eyebrow flex items-start gap-1.5 leading-snug">
                  <Icon name="thermo" className="size-3.5 shrink-0" />
                  {r.place}
                </p>
                <p className="mt-2 text-sm text-muted">{r.label}</p>
                <p className="mt-1 text-g-kpi font-semibold whitespace-nowrap tabular-nums">{readingValue(r)}</p>
                {r.target ? (
                  <>
                    <p className="mt-1 text-g-axis text-muted">{copy.target(decimal.format(r.target[0]), decimal.format(r.target[1]), r.unit)}</p>
                    <span className="mt-3 block">
                      <RangeBar reading={r} />
                    </span>
                  </>
                ) : (
                  <p className="mt-1 text-g-axis text-muted">{copy.markerHint}</p>
                )}
                <div className="mt-auto flex flex-col items-start gap-1.5 pt-4">
                  <span className={`g-chip ${status.problem ? "g-chip-problem" : ""}`}>{status.text}</span>
                  <span className="text-g-axis text-muted">{copy.at(r.at)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label={copy.placesTitle}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="kit-display text-[1.65rem]">{copy.placesTitle}</h2>
          <p className="text-xs text-muted">{staff.direct.hint}</p>
        </div>
        <div className="mt-4 grid gap-g-gap md:grid-cols-2 xl:grid-cols-3">
          {places.map((place) => {
            const now = Number(place.value);
            const { curve } = place;
            return (
              <article key={place.id} className="g-plate flex flex-col p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="kit-display text-2xl">{place.label}</h3>
                  <span className="text-xs tabular-nums text-muted">{place.hours}</span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <span className="relative shrink-0">
                    <Ring share={place.share} className="size-20" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-bold tabular-nums ${place.unit ? "text-xl" : "text-xs"}`}>{place.value}</span>
                      {place.unit && <span className="ml-0.5 text-xs text-muted">{place.unit}</span>}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{place.hint}</p>
                    <p className="mt-0.5 text-xs text-ember-1">{place.glance}</p>
                    {place.capacity && (
                      <span className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={staff.direct.leave(place.label)}
                          disabled={now === 0}
                          onClick={() => count(place.id, now - 1)}
                          className="g-press flex size-11 items-center justify-center rounded-full ring-1 ring-hairline disabled:opacity-35"
                        >
                          <Icon name="minus" className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={staff.direct.enter(place.label)}
                          disabled={now === place.capacity}
                          onClick={() => count(place.id, now + 1)}
                          className="ember-gradient g-press flex size-11 items-center justify-center rounded-full text-background disabled:opacity-35"
                        >
                          <Icon name="plus" className="size-4" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
                <p className={`${label} mt-5`}>{copy.calm(curve.hours[curve.calm])}</p>
                <div className="mt-2 flex h-16 items-end gap-1" aria-hidden>
                  {curve.shares.map((share, i) => (
                    <span
                      key={curve.hours[i]}
                      className={`flex-1 rounded-t-sm ${i === curve.calm ? "ember-gradient" : i === curve.now ? "bg-foreground/45" : "bg-foreground/15"}`}
                      style={{ height: `${Math.max(share, 0.03) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-g-axis tabular-nums text-muted">
                  <span>{curve.hours[0]}</span>
                  <span>{curve.hours.at(-1)}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
