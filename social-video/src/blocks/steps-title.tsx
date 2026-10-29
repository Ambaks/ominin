import { type CSSProperties, Fragment } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../motion.ts";
import { parts } from "./headline.tsx";

/*
 * Le titre des étapes : les mots montent un à un, nets ; le passage [[ ]]
 * arrive d'un bloc, pavé et mots ensemble, trois images après le dernier mot
 * du dessus, et un reflet le traverse ensuite à intervalle régulier.
 */

const WORD = { stagger: 3, fade: 5, rise: 12, lift: 0.3 };
const MARK = { lag: 3, wipe: 7, rise: 10 };
const SHEEN = { delay: 12, sweep: 20, every: 54 };

/** size : corps en rem. */
export function StepsTitle({ title, size }: { title: string; size: number }) {
  const frame = useCurrentFrame();
  let clock = 0;
  return (
    <h1 className="kit-display" style={{ fontSize: `${size}rem` }}>
      {parts(title).map((part, key) => {
        if (!part.marked) {
          return (
            <Fragment key={key}>
              {part.words.map((text, i) => {
                const at = clock;
                clock += WORD.stagger;
                return (
                  <Fragment key={i}>
                    <span
                      className="inline-block"
                      style={{ opacity: progress(frame, at, WORD.fade), transform: `translateY(${(1 - progress(frame, at, WORD.rise)) * WORD.lift}em)` }}
                    >
                      {text}
                    </span>{" "}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        }
        const at = clock + MARK.lag - WORD.stagger;
        clock = at + WORD.stagger;
        const rise = progress(frame, at, MARK.rise);
        const since = frame - (at + MARK.wipe + SHEEN.delay);
        const sheen = since < 0 ? 0 : progress(since % SHEEN.every, 0, SHEEN.sweep);
        return (
          <Fragment key={key}>
            <span
              className="kit-mark whitespace-nowrap"
              style={
                {
                  "--mark": progress(frame, at, MARK.wipe),
                  opacity: progress(frame, at, WORD.fade),
                  transform: `translateY(${(1 - rise) * WORD.lift}em)`,
                } as CSSProperties
              }
            >
              <span className="absolute inset-[0.08em_-0.02em_0.02em] z-[-1] overflow-hidden rounded-[0.12em]">
                <span
                  className="absolute inset-y-0 w-[30%] -skew-x-[18deg] bg-linear-to-r from-transparent via-white/35 to-transparent"
                  style={{ left: `${-40 + sheen * 150}%` }}
                />
              </span>
              {part.words.join(" ")}
            </span>{" "}
          </Fragment>
        );
      })}
    </h1>
  );
}
