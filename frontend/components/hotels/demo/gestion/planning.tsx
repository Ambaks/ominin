"use client";

import { useState } from "react";
import { Segmented } from "@/components/gestion/ui";
import { LiveDot } from "@/components/hotels/ui";
import { bookables, room, staff } from "@/lib/hotels-demo-data";
import { useDemo, useDemoTime } from "../store";
import { PageTitle } from "./kit";

/* Les créneaux des soins, du sauna, du tennis et des vélos ; ceux du client de la démo arrivent en direct. */

/** Les créneaux déjà pris par d'autres clients, chacun son occupant, dans l'ordre des créneaux. */
const occupants = (() => {
  const taken = new Map<string, string>();
  bookables.forEach((b) =>
    b.slots.forEach((slots, day) =>
      slots.forEach(([time, free]) => {
        if (!free) taken.set(`${b.id}|${day}|${time}`, staff.planning.occupants[taken.size] ?? room.bookings.taken);
      })
    )
  );
  return taken;
})();

/** « 16 h 30 » en minutes depuis minuit. */
const minutes = (time: string) => {
  const [hours = 0, mins = 0] = (time.match(/\d+/g) ?? []).map(Number);
  return hours * 60 + mins;
};

export function Planning() {
  const { activity } = useDemo();
  const { minutes: now } = useDemoTime();
  const [day, setDay] = useState("0");
  const today = day === "0";
  return (
    <div className="grid gap-5">
      <PageTitle
        title={staff.planning.title}
        sub={staff.planning.hint}
        right={
          <Segmented
            label={room.bookings.eyebrow}
            glass={false}
            options={room.bookings.days.map((d, i) => ({ value: String(i), label: d }))}
            value={day}
            onChange={setDay}
          />
        }
      />
      <div className="grid gap-g-gap md:grid-cols-2 xl:grid-cols-4">
        {bookables.map((b) => {
          const slots = b.slots[Number(day)].map(([time, free]) => {
            const mine = activity.find((a) => a.booking?.id === b.id && a.booking.day === Number(day) && a.booking.time === time);
            return {
              time,
              mine,
              who: mine ? `${mine.where} · ${mine.guest}` : occupants.get(`${b.id}|${day}|${time}`),
              open: free && !mine,
              past: today && minutes(time) < now,
            };
          });
          const left = slots.filter((s) => s.open && !s.past).length;
          const over = slots.every((s) => s.past);
          return (
            <section key={b.id} className="g-plate p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="g-eyebrow">{b.place}</p>
                <span className={`g-chip shrink-0 whitespace-nowrap ${left === 0 && !over ? "text-ember-3" : ""}`}>
                  {over ? staff.slots.over : left === 0 ? staff.slots.full : staff.slots.left(left)}
                </span>
              </div>
              <h3 className="kit-display mt-1 text-2xl">{b.label}</h3>
              <ul className="mt-3 flex flex-col">
                {slots.map(({ time, mine, who, past }) => (
                  <li
                    key={time}
                    className={`grid grid-cols-[4rem_1fr_auto] items-center gap-3 border-t border-hairline py-2.5 text-sm first:border-t-0 ${past ? "opacity-55" : ""}`}
                  >
                    <span className={`whitespace-nowrap font-semibold tabular-nums ${past ? "line-through decoration-foreground/40" : ""}`}>{time}</span>
                    <span className={`flex min-w-0 items-center gap-2 ${mine ? "font-semibold text-ember-1" : who ? "" : past ? "italic text-faint" : "text-faint"}`}>
                      {mine && <LiveDot />}
                      <span className="min-w-0 leading-snug">{who ?? (past ? staff.slots.unsold : staff.planning.free)}</span>
                    </span>
                    {past && who && <span className="text-xs text-faint">{staff.slots.past}</span>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
