import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { OmininMark } from "../brand/OmininMark";
import { useLayout } from "../kit/layout";
import { springs } from "../kit/motion";
import { Appear, clamp, ramp, useIn } from "../scenes/common";
import { BARS } from "./copy";
import { Caption, Friends, Hero, headline, kicker, People, Silver, waiting } from "./parts";
import { Star } from "./screens";
import { Bar, Beams, Counter, Crowd, dance, Figure, Haze, Room, Scrim, useFloorRows } from "./stage";
import { clockTick, SCENE } from "./timeline";
import { club } from "./tokens";

/** Saturday, 1:12: the floor is full, and she wants a drink. */
export const Floor = () => {
  const frame = useCurrentFrame();
  const { width, pick } = useLayout();
  const rows = useFloorRows(0.6);
  const front = rows[rows.length - 1];
  const heroX = width * 0.5;
  // She stops dancing, looks toward the bar and heads off.
  const leave = ramp(frame, 96, SCENE.queue - SCENE.floor);
  return (
    <Room>
      <Haze strength={0.8} />
      <Beams energy={0.45} />
      <AbsoluteFill style={{ scale: String(1 + frame / 2500) }}>
        <Crowd rows={rows.slice(0, 2)} />
        <People>
          <Friends frame={frame} x={heroX} y={front.y - 10} scale={front.scale} gap={pick(240, 250)} energy={0.6} />
          <Hero
            x={heroX + leave * width * 0.35}
            y={front.y}
            scale={front.scale * 1.05}
            moves={frame < 90 ? dance(frame, 2, 0.6) : waiting(frame, 1)}
            facing={frame < 90 ? 1 : -1}
          />
        </People>
      </AbsoluteFill>
      <Caption
        at={8}
        until={SCENE.queue - SCENE.floor - 6}
        kick="Samedi, 1 h 12"
        title="Elle a envie d’un verre."
        size={pick(96, 92)}
        style={{ left: pick(120, 70), right: pick(undefined, 70), top: pick(110, 210) }}
      />
    </Room>
  );
};

const CLOCK_FROM = 12;
export const CLOCK_MINUTES = 19;
/** The minute k (from 0) turns over on this scene frame. */
const tickAt = (k: number) => clockTick(k) - SCENE.queue;

/** Three deep at the bar. The clock runs, she's still there; the second drink won't happen. */
export const Queue = () => {
  const frame = useCurrentFrame();
  const { width, height, pick } = useLayout();
  const minutes = Array.from({ length: CLOCK_MINUTES }, (_, k) => tickAt(k)).filter((at) => frame >= at).length;
  const tick = useIn(tickAt(Math.max(0, minutes - 1)), springs.snappy);
  const late = minutes === CLOCK_MINUTES;
  const captionBox = pick<CSSProperties>({ left: 110, bottom: 90 }, { left: 70, right: 330, top: 250 });
  // The camera leans in on her as the wait drags on.
  const push = 1 + ramp(frame, 0, SCENE.drop - SCENE.queue) * 0.06;
  const barTop = pick(height * 0.06, height * 0.27);
  const barHeight = pick(height * 0.46, height * 0.27);
  const counterTop = barTop + barHeight;
  const rows = pick(
    [
      { y: counterTop + 210, scale: 1.55, count: 10 },
      { y: counterTop + 360, scale: 1.85, count: 9 },
      { y: counterTop + 560, scale: 2.3, count: 7 },
    ],
    [
      { y: counterTop + 260, scale: 1.8, count: 5 },
      { y: counterTop + 470, scale: 2.2, count: 4 },
      { y: counterTop + 760, scale: 2.8, count: 3 },
    ],
  );
  const heroIndex = Math.floor(rows[2].count / 2);
  const heroX = ((heroIndex + 0.5) / rows[2].count) * width;
  const dusk = interpolate(frame, [SCENE.drop - SCENE.queue - 40, SCENE.drop - SCENE.queue], [0, 0.6], clamp);
  return (
    <Room glow={club.amber}>
      <AbsoluteFill style={{ scale: String(push), transformOrigin: "50% 75%" }}>
        <Bar name={BARS[0].name} top={barTop} height={barHeight} />
        <People>
          {/* Two bartenders working flat out behind the counter. */}
          {[0.3, 0.68].map((at, i) => (
            <Figure
              key={at}
              x={width * at + Math.sin((frame + i * 40) / 14) * width * 0.08}
              y={counterTop + 60}
              scale={pick(1.35, 1.6)}
              moves={{ left: 70 + Math.sin(frame / 5 + i) * 30, right: 95, leftBend: 60, rightBend: 50, bob: 0, lean: Math.sin(frame / 9) * 5 }}
              fill="#120e0a"
              rim="rgb(255 180 94 / 0.5)"
            />
          ))}
        </People>
        <Counter top={counterTop} height={pick(80, 100)} />
        <People>
          {rows.map((row, r) =>
            Array.from({ length: row.count }, (_, i) => {
              if (r === 2 && i === heroIndex) return null;
              // Rows offset by a third of a place, so no head sits right behind another.
              const x = ((i + 0.5 + r / 3 - 0.33 + Math.sin(i * 3.7 + r) * 0.12) / row.count) * width;
              const size = 1 + Math.sin(i * 7.1 + r * 2.3) * 0.06;
              return (
                <Figure
                  key={`${r}-${i}`}
                  x={x}
                  y={row.y + Math.sin(i * 5.3 + r) * 14}
                  scale={row.scale * size}
                  moves={waiting(frame, i * 3 + r, r === 0 && i % 3 !== 1)}
                  hair={(["short", "long", "bun", "ponytail"] as const)[(i + r) % 4]}
                  facing={-1}
                  rim={`rgb(255 180 94 / ${0.24 + r * 0.08})`}
                  opacity={[0.7, 0.85, 1][r]}
                />
              );
            }),
          )}
          {/* A cool pool of light on her, so the eye finds her in the crowd. */}
          <ellipse cx={heroX} cy={rows[2].y} rx={pick(220, 260)} ry={pick(46, 56)} fill="url(#hero-pool)" />
          <defs>
            <radialGradient id="hero-pool">
              <stop offset="0" stopColor={club.violet} stopOpacity={0.55} />
              <stop offset="1" stopColor={club.violet} stopOpacity={0} />
            </radialGradient>
          </defs>
          <Hero
            x={heroX}
            y={rows[2].y}
            scale={rows[2].scale * 1.06}
            moves={{ ...waiting(frame, 5), lean: -3 - ramp(frame, 120, 200) * 4 }}
          />
        </People>
      </AbsoluteFill>
      <Scrim reach={pick(0.42, 0.34)} />
      {/* The clock, a minute every half beat, in a dark glass pill in the corner. */}
      <div
        style={{
          position: "absolute",
          right: pick(70, 60),
          top: pick(46, 250),
          padding: pick("10px 34px", "10px 30px"),
          borderRadius: 999,
          background: "rgb(4 4 8 / 0.82)",
          border: "1.5px solid rgb(255 255 255 / 0.14)",
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: pick(96, 88),
          lineHeight: 1.1,
          letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
          color: minutes >= 15 ? club.alert : club.silver,
          boxShadow: late ? `0 0 ${30 + 20 * Math.sin(frame / 3)}px color-mix(in srgb, ${club.alert} 45%, transparent)` : undefined,
          opacity: ramp(frame, CLOCK_FROM, CLOCK_FROM + 10),
          transform: `scale(${1 + 0.05 * (1 - tick) * (minutes > 0 ? 1 : 0)})`,
        }}
      >
        1:{String(12 + minutes).padStart(2, "0")}
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: dusk }} />
      <Caption
        at={20}
        until={tickAt(CLOCK_MINUTES - 1) - 4}
        title="Trois rangs devant le bar."
        size={pick(84, 68)}
        style={captionBox}
      />
      <Caption
        at={tickAt(CLOCK_MINUTES - 1) + 2}
        until={196}
        title={
          <>
            {CLOCK_MINUTES} minutes plus tard,
            <br />
            elle attend encore.
          </>
        }
        size={pick(84, 68)}
        style={captionBox}
      />
      <Caption
        at={202}
        title={
          <>
            Le deuxième verre&nbsp;?
            <br />
            <span style={{ color: club.alert }}>Elle ne le prendra pas.</span>
          </>
        }
        size={pick(84, 68)}
        style={captionBox}
      />
    </Room>
  );
};

/** The beat comes in: the promise, and who makes it. */
export const Drop = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const flash = interpolate(frame, [0, 8], [0.22, 0], clamp);
  const glint = useIn(0, springs.snappy);
  return (
    <Room glow={club.violet}>
      <Haze strength={1.2} />
      <Beams energy={1} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: pick(0, 70) }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * glint}) rotate(${(1 - glint) * 90}deg)`, opacity: glint, marginBottom: pick(40, 60) }}>
          <Star size={pick(90, 110)} id="drop-star" />
        </div>
        <Appear at={0}>
          <p style={{ ...kicker(pick(28, 30)), marginBottom: pick(26, 34) }}>Même soirée. Avec Ominin.</p>
        </Appear>
        <Appear at={2}>
          <p style={headline(pick(120, 112))}>
            Commander
            <br />
            <Silver>sans quitter la piste.</Silver>
          </p>
        </Appear>
        <Appear at={12} style={{ marginTop: pick(46, 70) }}>
          <OmininMark size={pick(54, 64)} />
        </Appear>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash, mixBlendMode: "screen" }} />
    </Room>
  );
};
