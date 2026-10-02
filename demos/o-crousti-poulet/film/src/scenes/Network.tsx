import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MAP_HEIGHT, MAP_PATHS, MAP_WIDTH, project } from "../../../../../frontend/lib/demo/reseau/carte";
import { oCroustiPoulet } from "../../../../../frontend/lib/demo/reseau/data";
import { capture, network, phone } from "../captures";
import { fonts } from "../brand/fonts";
import { ocp } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { aim, Device, DEVICES, pose, screenScale, type Pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { springs, useTrack } from "../kit/motion";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { SLAMS } from "./Slams";
import { ClockChip } from "./styles";

/*
 * Scene 12: pull out from Montpellier to the whole network — the real
 * restaurants of the demo's network view (frontend/lib/demo/reseau), lit in
 * the order they opened, counted in the title — then that view itself,
 * floating in 3D, the camera on two of its panels in turn, the others
 * dimmed: the wait at the till, with and without QR, then the live feed
 * beside the day's ranking, where N° 39 comes in, its figures tick onto
 * Montpellier's row, and the row climbs one place; then the restaurant in
 * rush is pointed at. Nothing else changes.
 */
export const NETWORK = beat(56);
export const FIRST_DOT = NETWORK + 9;
const DOTS_FRAMES = 30;
export const VIEW = beat(59);
const VIEW_IN = 15;
/**
 * The panels the camera visits, each from its top edge down, on the
 * music's hits: a push onto the till's wait as soon as the view lands,
 * under the title, closer than the usual push so its « sans QR » reads
 * (marked once in sight), then across to the live feed and the ranking.
 */
const TILES = [
  { key: "till", at: beat(61), move: springs.heavy, underTitle: true, with: null, closer: 1.7 },
  { key: "ranking", at: beat(64), move: springs.push, underTitle: false, with: "feed", closer: 1 },
] as const;
/** The share of the frame's width a pair of panels is drawn across: their markers stay well inside it, down to the ranking's eleventh row. */
const PAIR_WIDTH = 0.76;
/** How much closer the last stop drifts over its hold: little, so its lowest marker stays in frame. */
const LAST_DRIFT = 1.03;
/**
 * N° 39 lands on top of the feed, pushing its rows down; on the next beat
 * its order and total tick onto Montpellier's row, which climbs one place
 * on the beat after, lifted over the row it passes.
 */
export const ARRIVAL = beat(67);
export const TICK = beat(68);
export const CLIMB = beat(69);
/** The rewound clock beside N° 39's row, in the view's px: its size, its gap to the row. */
const REWIND = { size: 22, gap: 14 };
/** Then the view's other use: the restaurant in rush, pointed at on the next hit. */
const RUSH = beat(70);
/** When the rush is pointed at, N° 39's marks step back this much: two highlights at a time. */
const RECEDE = 0.7;
const SLIDE_FRAMES = 12;
const CLIMB_FRAMES = 12;
/** The title leaves on this hit, the till's panel then alone with its « sans QR », marked. */
const TITLE_OUT = beat(63);
const COMPARE = beat(62);
/** Room around the marked « sans QR » figure, in the view's px. */
const COMPARE_PAD = 6;
/** How dark the veil over the panels out of focus is. */
const DIM = 0.6;
/** The title fades out just before the camera leaves the sales; the simulation line then moves up. */
const TITLE_EXIT = 5;
const LAST = TILES[TILES.length - 1];
/** The title's size, the room « Une seule vue. » takes beside it (em), and the gap to the simulation line under it. */
const TITLE_SIZE = 72;
const TITLE_ROOM = 8;
const SIMULATION_GAP = 20;
/** The name by the film's own restaurant on the map, in screen px. */
const LABEL_SIZE = 30;
/** Beside its dot, south-east over the sea, clear of Perpignan's: the label's offset, in its own size. */
const LABEL_AT = { x: 0.45, y: 0.6 };
/** How close the map starts on Montpellier before pulling out. */
const MAP_START_ZOOM = 3.5;

type Box = { x: number; y: number; width: number; height: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const restaurants = [...oCroustiPoulet.restaurants]
  .sort((a, b) => a.openedOn.localeCompare(b.openedOn))
  .map((restaurant) => {
    const [x, y] = project(restaurant.lng, restaurant.lat);
    return { ...restaurant, x, y };
  });
const home = restaurants.find((restaurant) => restaurant.id === "montpellier")!;

/** Frame (from FIRST_DOT) each restaurant lights up: slow, then faster; home from the start. */
export const dotFrames = restaurants.map((restaurant, i) =>
  restaurant === home ? 0 : Math.round(DOTS_FRAMES * Math.pow(i / (restaurants.length - 1), 0.65)),
);

export const Network = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const since = (abs: number, config = springs.smooth, duration?: number) =>
    spring({ frame: frame - at(abs), fps, config, durationInFrames: duration });
  const slide = (abs: number) =>
    interpolate(frame - at(abs), [0, SLIDE_FRAMES], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const mapScale = pick(0.95, 1.02);
  const mapCenter = pick({ x: width / 2, y: 590 }, { x: width / 2, y: 1010 });
  const camera = useTrack([
    { at: 0, value: { x: home.x, y: home.y, zoom: MAP_START_ZOOM } },
    { at: at(NETWORK), value: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, zoom: 1 }, config: springs.heavy, duration: 36 },
  ]);
  const view = since(VIEW, springs.heavy);
  // The title leaves on its hit; the line under it then moves up into its place.
  const titleOut = interpolate(frame - at(TITLE_OUT) + TITLE_EXIT, [0, TITLE_EXIT], [0, 1], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineUp = since(TITLE_OUT, springs.smooth, 10);
  const titleHeight = (portrait ? 2 : 1) * TITLE_SIZE * 1.1 + SIMULATION_GAP;
  // Counted from two: the title never reads « 1 restaurants. ».
  const lit = Math.max(2, dotFrames.filter((f) => frame >= at(FIRST_DOT) + f + 2).length);

  // The display, whole, then on each panel in turn, its top edge under the
  // title, the display always wider than the frame.
  const size = pick(1500, 1000);
  // Whole in frame under the title, with room around it.
  const whole = pose({ y: pick(70, 280), scale: pick(0.86, 1), rotateX: 10, rotateY: -12, rotateZ: 1.5 });
  const push = pick(1.9, 2.8);
  // In the tall frame a pair would be too small to read: the camera keeps to the tile alone, at the usual push.
  const pairOf = (tile: (typeof TILES)[number]) => (portrait ? null : tile.with);
  const focus = (tile: (typeof TILES)[number]): Box => {
    const pair = pairOf(tile);
    return pair ? union(network.tiles[pair], network.tiles[tile.key]) : network.tiles[tile.key];
  };
  const onTile = (tile: (typeof TILES)[number], closer = 1): Pose => {
    const box = focus(tile);
    const fit = pairOf(tile) ? (width * PAIR_WIDTH) / (box.width * screenScale(DEVICES.display, size)) : push * pick(tile.closer, 1);
    const panelTop = tile.underTitle ? pick(240, 660) : pick(130, 420);
    const aimed = aim(DEVICES.display, size, { x: box.x + box.width / 2, y: box.y }, { x: 0, y: panelTop - height / 2 }, fit * closer);
    const reachAt = Math.max(0, (size * fit * closer - width) / 2);
    return pose({ ...aimed, x: Math.min(reachAt, Math.max(-reachAt, aimed.x)), rotateX: 5, rotateY: -6, rotateZ: 0.5 });
  };
  const k = mapScale * camera.zoom;

  const displayPose = useTrack([
    { at: 0, value: { ...whole, y: whole.y + 900, rotateX: 40, rotateY: -32 } },
    // In and settled within half a second, then held whole for a beat.
    { at: at(VIEW), value: whole, config: springs.smooth, duration: VIEW_IN },
    ...TILES.map((tile) => ({ at: at(tile.at) - 8, value: onTile(tile), config: tile.move })),
    { at: at(LAST.at) + 10, value: onTile(LAST, LAST_DRIFT), duration: SLAMS[0] - LAST.at - 10 },
  ]);

  // The veil lifts while the camera moves on, and falls again around the next panel.
  const spot = focus(TILES.reduce((current, tile) => (frame >= at(tile.at) - 6 ? tile : current)));
  const lifted = TILES.slice(1).reduce((open, tile) => Math.max(open, interpolate(frame - at(tile.at), [-10, -6, 6, 12], [0, 1, 1, 0], clamp)), 0);
  const veil = since(TILES[0].at - 8, springs.smooth, 12) * (1 - lifted);
  const arrived = frame >= at(ARRIVAL);
  const ticked = frame >= at(TICK);
  const fed = slide(ARRIVAL);
  const climbed = since(CLIMB, springs.snappy, CLIMB_FRAMES);
  const rising = Math.min(1, climbed);
  const { states, fresh, home: row, surface } = network;

  return (
    <Stage>
      <AbsoluteFill
        style={{
          opacity: 1 - view,
          scale: String(1 - view * 0.12),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: mapCenter.x,
            top: mapCenter.y,
            transformOrigin: "0 0",
            transform: `scale(${k}) translate(${-camera.x}px, ${-camera.y}px)`,
          }}
        >
          <svg width={MAP_WIDTH} height={MAP_HEIGHT} style={{ overflow: "visible" }}>
            <path d={MAP_PATHS.france} fill="#1D1E21" stroke={ocp.white} strokeOpacity={0.35} strokeWidth={1.6 / camera.zoom} />
            <path d={MAP_PATHS.suisse} fill="#1D1E21" stroke={ocp.white} strokeOpacity={0.35} strokeWidth={1.6 / camera.zoom} />
            {restaurants.map((restaurant, i) => {
              const start = restaurant === home ? -at(FIRST_DOT) : dotFrames[i];
              const pop = spring({ frame: frame - at(FIRST_DOT) - start, fps, config: springs.snappy });
              const ripple = interpolate(frame - at(FIRST_DOT) - start, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const r = 6.5 / Math.sqrt(camera.zoom);
              return (
                <g key={restaurant.id} transform={`translate(${restaurant.x} ${restaurant.y})`}>
                  <circle r={r * (1 + ripple * 3)} fill="none" stroke={ocp.yellow} strokeWidth={1.5 / camera.zoom} opacity={(1 - ripple) * 0.8 * Number(ripple > 0)} />
                  <circle r={r * 2.4} fill={ocp.yellow} opacity={0.18 * pop} />
                  <circle r={r * pop} fill={ocp.yellow} />
                </g>
              );
            })}
            {/* Beside the dot, over the sea, clear of the other restaurants. */}
            <text
              x={home.x + (LABEL_SIZE * LABEL_AT.x) / k}
              y={home.y + (LABEL_SIZE * LABEL_AT.y) / k}
              textAnchor="start"
              dominantBaseline="hanging"
              fontFamily={fonts.poppins}
              fontWeight={700}
              fontSize={LABEL_SIZE / k}
              fill={ocp.white}
            >
              {home.name}
            </text>
          </svg>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {view > 0.001 && (
          <Device model={DEVICES.display} size={size} pose={displayPose} float={4}>
            <Shot src={states[arrived ? 1 : 0]} />
            {/* The feed's rows pushed down by the new one, which slides in on top. */}
            {arrived && fed < 1 && (
              <Window box={{ x: fresh.x, y: fresh.y, width: fresh.width, height: network.tiles.feed.y + network.tiles.feed.height - fresh.y }} background={surface}>
                <Shot src={states[0]} dy={fed * fresh.height} />
                <Window box={{ x: fresh.x, y: fresh.y, width: fresh.width, height: fed * fresh.height }} background={surface}>
                  <Shot src={states[1]} dy={-(1 - fed) * fresh.height} />
                </Window>
              </Window>
            )}
            {/* Montpellier's row, its figures ticking up, climbs past the one above it; the rank numbers stay. */}
            {arrived && frame < at(CLIMB) + SLIDE_FRAMES && (
              <Window
                box={{ x: row.rank, y: row.after.y, width: row.after.x + row.after.width - row.rank, height: row.before.y + row.before.height - row.after.y }}
                background={surface}
              >
                <Strip src={states[0]} from={row.after} dy={(row.before.y - row.after.y) * climbed} />
                <Strip src={ticked ? states[1] : states[0]} from={ticked ? row.after : row.before} dy={(ticked ? row.before.y - row.after.y : 0) * (1 - climbed)} lift={Math.sin(rising * Math.PI)} />
              </Window>
            )}
            <div
              style={{
                position: "absolute",
                left: spot.x - 8,
                top: spot.y - 8,
                width: spot.width + 16,
                height: spot.height + 16,
                borderRadius: 24,
                boxShadow: `0 0 0 4000px rgb(0 0 0 / ${DIM})`,
                opacity: veil,
              }}
            />
            <Marker box={fresh} on={since(ARRIVAL + SLIDE_FRAMES - 4, springs.snappy) * (1 - RECEDE * since(RUSH, springs.smooth, 6))} pulse={since(ARRIVAL + SLIDE_FRAMES - 4, springs.snappy)} />
            <Marker
              box={{ x: network.compare.x - COMPARE_PAD, y: network.compare.y - COMPARE_PAD, width: network.compare.width + 2 * COMPARE_PAD, height: network.compare.height + 2 * COMPARE_PAD }}
              on={since(COMPARE, springs.snappy) * (1 - since(TILES[1].at - 8, springs.smooth, 6))}
              pulse={since(COMPARE, springs.snappy)}
            />
            <Marker box={network.rush} on={since(RUSH, springs.snappy)} pulse={since(RUSH, springs.snappy)} />
            {/* The feed replays N° 39 as it came in: the film's clock, rewound to its time. */}
            <div
              style={{
                position: "absolute",
                left: fresh.x - REWIND.gap,
                top: fresh.y + fresh.height / 2,
                translate: "-100% -50%",
                opacity: Math.min(1, since(ARRIVAL, springs.snappy)) * (1 - RECEDE * since(RUSH, springs.smooth, 6)),
                scale: String(0.8 + 0.2 * Math.min(1, since(ARRIVAL, springs.snappy))),
              }}
            >
              <ClockChip size={REWIND.size} glow={1} rewind>
                {phone.order.at}
              </ClockChip>
            </div>
            <Marker
              box={{ ...row.before, y: row.before.y + (row.after.y - row.before.y) * climbed }}
              on={since(LAST.at - 2, springs.snappy)}
              pulse={since(TICK, springs.snappy)}
            />
          </Device>
        )}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: `linear-gradient(${ocp.black} 0, ${ocp.black} ${pick(200, 540) - lineUp * titleHeight}px, transparent ${pick(330, 680) - lineUp * titleHeight}px)`,
          opacity: view,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: pick(56, 330) }}>
        <div
          style={{
            display: "flex",
            flexDirection: portrait ? "column" : "row",
            alignItems: "center",
            columnGap: "0.28em",
            fontFamily: fonts.poppins,
            fontWeight: 800,
            fontSize: TITLE_SIZE,
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: ocp.white,
            opacity: 1 - titleOut,
            translate: `0 ${-12 * titleOut}px`,
          }}
        >
          <Reveal fade delay={at(FIRST_DOT)}>
            <span>
              <span
                style={{
                  display: "inline-block",
                  minWidth: "1.1em",
                  marginRight: "0.12em",
                  textAlign: "right",
                  fontFamily: fonts.anton,
                  fontWeight: 400,
                  color: ocp.yellow,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {lit}
              </span>{" "}
              restaurants.
            </span>
          </Reveal>
          {/* Makes room as it comes: « 40 restaurants. » stays centered until then. */}
          <div style={{ whiteSpace: "nowrap", maxWidth: portrait ? undefined : `${since(VIEW + 12, springs.smooth, 10) * TITLE_ROOM}em` }}>
            <Reveal fade delay={at(VIEW) + 14}>
              Une seule vue.
            </Reveal>
          </div>
        </div>
        {/* The view is a simulation: said plainly under its title, and kept in sight once the title has gone. */}
        <Reveal
          fade
          delay={at(VIEW) + 20}
          style={{
            marginTop: SIMULATION_GAP,
            translate: `0 ${-lineUp * titleHeight}px`,
            fontFamily: fonts.poppins,
            fontWeight: 600,
            fontSize: pick(26, 30),
            letterSpacing: "0.02em",
            color: ocp.muted,
          }}
        >
          {`Simulation · hypothèse ${network.share} de commandes QR`}
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};

/** A capture of the view, whole, shifted down by `dy` px. */
const Shot = ({ src, dy = 0 }: { src: string; dy?: number }) => (
  <Img src={capture(src)} style={{ position: "absolute", left: 0, top: dy, width: network.viewport.width, height: network.viewport.height }} />
);

/** A part of the view, cut out over its panel's background; children are placed in the view's own px. */
const Window = ({ box, background, children }: { box: Box; background: string; children: ReactNode }) => (
  <div style={{ position: "absolute", left: box.x, top: box.y, width: box.width, height: box.height, overflow: "hidden", background }}>
    <div style={{ position: "absolute", left: -box.x, top: -box.y }}>{children}</div>
  </div>
);

/** One row of a capture, from where it is, moved `dy` px; lifted, it casts a shadow on the row it passes. */
const Strip = ({ src, from, dy, lift = 0 }: { src: string; from: Box; dy: number; lift?: number }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: from.y + dy,
      width: network.viewport.width,
      height: from.height,
      overflow: "hidden",
      boxShadow: `0 ${10 * lift}px ${24 * lift}px rgb(0 0 0 / ${0.6 * lift})`,
    }}
  >
    <Shot src={src} dy={-from.y} />
  </div>
);

/** A yellow marker around a row of the view, pulsing once. */
const Marker = ({ box, on, pulse }: { box: Box; on: number; pulse: number }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      borderRadius: 8,
      boxShadow: `inset 0 0 0 2px ${ocp.yellow}, 0 0 ${24 * Math.sin(Math.min(1, pulse) * Math.PI)}px rgb(247 238 33 / 0.6)`,
      scale: String(1 + 0.04 * Math.sin(Math.min(1, pulse) * Math.PI)),
      opacity: on,
    }}
  />
);

/** The box around two panels. */
const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};
