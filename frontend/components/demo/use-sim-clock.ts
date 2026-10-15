"use client";

import { useEffect, useState } from "react";
import { addDays, DAY, parisClock, type Clock } from "@/lib/demo/sim";

/**
 * L'horloge d'une démo simulée (vue réseau, vue groupe) : fixée par le
 * serveur, elle avance dans le navigateur — l'heure de Paris quand elle la
 * suit, sinon son point de départ et sa vitesse (?heure=, ?vitesse=) ; passé
 * `dayStartHour`, elle bascule au jour de service suivant.
 */
function rollOver(day: string, seconds: number, dayStartHour: number) {
  const days = Math.floor((seconds - dayStartHour * 3600) / DAY);
  return days > 0 ? { day: addDays(day, days), seconds: seconds - days * DAY } : { day, seconds };
}

export function useSimClock(
  clock: Clock,
  { dayStartHour, tickMs, fastTickMs }: { dayStartHour: number; tickMs: number; fastTickMs: number }
) {
  const [now, setNow] = useState({ day: clock.day, seconds: clock.seconds });
  const { day, seconds, speed, follow } = clock;

  useEffect(() => {
    if (!follow && speed === 0) return;
    const origin = performance.now();
    // Accéléré, l'horloge avance par petits pas plutôt que par bonds.
    const period = !follow && speed > 1 ? fastTickMs : tickMs;
    const id = setInterval(() => {
      setNow(
        follow
          ? parisClock(new Date(), dayStartHour)
          : rollOver(day, Math.floor(seconds + ((performance.now() - origin) / 1000) * speed), dayStartHour)
      );
    }, period);
    return () => clearInterval(id);
  }, [day, seconds, speed, follow, dayStartHour, tickMs, fastTickMs]);

  return now;
}
