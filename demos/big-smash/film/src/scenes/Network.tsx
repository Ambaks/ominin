import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MAP_HEIGHT, MAP_PATHS, MAP_WIDTH, project } from "../../../../../frontend/lib/demo/reseau/carte";
import { bigSmash } from "../../../../../frontend/lib/demo/reseau/data";
import { capture, network, phone } from "../captures";
import { fonts } from "../brand/fonts";
import { bs } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { aim, Device, DEVICES, pose, screenScale, type Pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { springs, useTrack } from "../kit/motion";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { SLAMS } from "./Slams";
import { ClockChip } from "./styles";

/*
 * Scene 12: pull out from Toulouse Matabiau to the whole network — the real
 * restaurants of the demo's network view (frontend/lib/demo/reseau), lit in
 * the order they opened, counted in the title — then that view itself,
 * floating in 3D, the camera on two of its panels in turn, the others
 * dimmed: the wait at the till, with and without QR, then the live feed
 * beside the day's ranking, where N° 39 comes in, its figures tick onto
 * Matabiau's row, and the row climbs one place. In the tall frame the
 * camera takes the feed, then the ranking, one at a time. Nothing else
 * changes.
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
  // tall : la poussée en vertical, où le texte des panneaux doit lire au téléphone (≈ 32 px).
  { key: "ready", at: beat(61), move: springs.heavy, underTitle: true, with: null, closer: 1.7, tall: 1.45, portraitOnly: false },
  { key: "ranking", at: beat(64), move: springs.push, underTitle: false, with: "feed", closer: 1, tall: 1.45, portraitOnly: false },
  // En vertical seulement : du fil, où le N° 39 vient d'arriver, au classement, à temps pour la montée de Matabiau.
  { key: "ranking", at: beat(68.5), move: springs.push, underTitle: false, with: null, closer: 1, tall: 1.45, portraitOnly: true },
] as const;
/** The share of the frame's width a pair of panels is drawn across: their markers stay well inside it, down to the ranking's eleventh row. */
const PAIR_WIDTH = 0.76;
/** How much closer the last stop drifts over its hold: little, so its lowest marker stays in frame. */
const LAST_DRIFT = 1.03;
/**
 * N° 39 lands on top of the feed, pushing its rows down; on the next beat
 * its order and total tick onto Matabiau's row, which climbs one place
 * on the beat after, lifted over the row it passes.
 */
export const ARRIVAL = beat(67);
export const TICK = beat(68);
export const CLIMB = beat(69);
/** The rewound clock beside N° 39's row, in the view's px: its size, its gap to the row. */
const REWIND = { size: 22, gap: 14 };
const SLIDE_FRAMES = 12;
const CLIMB_FRAMES = 12;
/** The title leaves on this hit, the till's panel then alone with its « sans QR », marked. */
const TITLE_OUT = beat(63);
// Le délai de remise reste marqué une seconde et demie : à 1,2 s, il passait sans se lire.
const COMPARE = beat(61.5);
/** Room around the marked « sans QR » figure, in the view's px. */
const COMPARE_PAD = 6;
/** How dark the veil over the panels out of focus is. */
const DIM = 0.6;
/** The title fades out just before the camera leaves the sales; the simulation line then moves up. */
const TITLE_EXIT = 5;
/** The title's size, the room « Une seule vue. » takes beside it (em), and the gap to the simulation line under it. */
const TITLE_SIZE = 72;
const TITLE_ROOM = 8;
const SIMULATION_GAP = 20;
/** The name by the film's own restaurant on the map, in screen px. */
const LABEL_SIZE = 30;
/** Under its dot, centred: to the east, Montpellier's dot touched it. The label's offset, in its own size. */
const LABEL_AT = { x: 0, y: 1 };
/** Once every dot is lit, the label turns from « Toulouse Matabiau » to « Toulouse · 6 » over these frames: six dots read as one at this scale. */
const TOWN_LABEL_FRAMES = 10;
/** The rewound clock in the tall frame, above the view (the camera is too close on the feed for it to sit by the row): its top and size, in screen px. */
const REWIND_TALL = { top: 190, size: 44 };
/** How close the map starts on Toulouse Matabiau before pulling out. */
const MAP_START_ZOOM = 3.5;

type Box = { x: number; y: number; width: number; height: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const restaurants = [...bigSmash.restaurants]
  .sort((a, b) => a.openedOn.localeCompare(b.openedOn))
  .map((restaurant) => {
    const [x, y] = project(restaurant.lng, restaurant.lat);
    return { ...restaurant, x, y };
  });
const home = restaurants.find((restaurant) => restaurant.id === "toulouse-matabiau")!;
// Les restaurants que la carte fond en un seul point autour de Matabiau, au seuil de la vue réseau.
const { clusterUnder, inset } = bigSmash.display.map;
const town = restaurants.filter((restaurant) => Math.hypot(restaurant.x - home.x, restaurant.y - home.y) < clusterUnder);

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
  // Counted from Matabiau, the first (2021): one dot, then ten. From two, it
  // read « 2 restaurants » over a single dot, Croix de Pierre under Matabiau.
  const lit = Math.max(1, dotFrames.filter((f) => frame >= at(FIRST_DOT) + f + 2).length);
  const townLabel = interpolate(frame - at(FIRST_DOT) - DOTS_FRAMES, [0, TOWN_LABEL_FRAMES], [0, 1], clamp);

  // The display, whole, then on each panel in turn, its top edge under the
  // title, the display always wider than the frame.
  const size = pick(1500, 1000);
  // Whole in frame under the title, with room around it.
  const whole = pose({ y: pick(70, 280), scale: pick(0.86, 1), rotateX: 10, rotateY: -12, rotateZ: 1.5 });
  const push = pick(1.9, 2.8);
  // In the tall frame a pair would be too small to read: the camera takes one
  // panel at a time, closer — the feed, where N° 39 arrives, then the ranking.
  const stops = TILES.filter((tile) => portrait || !tile.portraitOnly);
  const last = stops[stops.length - 1];
  const pairOf = (tile: (typeof TILES)[number]) => (portrait ? null : tile.with);
  const focus = (tile: (typeof TILES)[number]): Box => {
    const pair = pairOf(tile);
    if (pair) return union(network.tiles[pair], network.tiles[tile.key]);
    return network.tiles[portrait ? (tile.with ?? tile.key) : tile.key];
  };
  const onTile = (tile: (typeof TILES)[number], closer = 1): Pose => {
    const box = focus(tile);
    const fit = pairOf(tile) ? (width * PAIR_WIDTH) / (box.width * screenScale(DEVICES.display, size)) : push * pick(tile.closer, tile.tall);
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
    ...stops.map((tile) => ({ at: at(tile.at) - 8, value: onTile(tile), config: tile.move })),
    { at: at(last.at) + 10, value: onTile(last, LAST_DRIFT), duration: SLAMS[0] - last.at - 10 },
  ]);

  // The veil lifts while the camera moves on, and falls again around the next panel.
  const spot = focus(stops.reduce((current, tile) => (frame >= at(tile.at) - 6 ? tile : current)));
  const lifted = stops.slice(1).reduce((open, tile) => Math.max(open, interpolate(frame - at(tile.at), [-10, -6, 6, 12], [0, 1, 1, 0], clamp)), 0);
  const veil = since(TILES[0].at - 8, springs.smooth, 12) * (1 - lifted);
  const arrived = frame >= at(ARRIVAL);
  const ticked = frame >= at(TICK);
  const fed = slide(ARRIVAL);
  const climbed = since(CLIMB, springs.snappy, CLIMB_FRAMES);
  // En vertical, la caméra quitte le fil pour le classement : la marque du N° 39 s'éteint, sans lisière rouge au bord du cadre.
  const leftFeed = portrait ? since(last.at - 8, springs.smooth, 6) : 0;
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
            <path d={MAP_PATHS.france} fill="#1D1E21" stroke={bs.white} strokeOpacity={0.35} strokeWidth={1.6 / camera.zoom} />
            {restaurants.map((restaurant, i) => {
              const start = restaurant === home ? -at(FIRST_DOT) : dotFrames[i];
              const pop = spring({ frame: frame - at(FIRST_DOT) - start, fps, config: springs.snappy });
              const ripple = interpolate(frame - at(FIRST_DOT) - start, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const r = 6.5 / Math.sqrt(camera.zoom);
              return (
                <g key={restaurant.id} transform={`translate(${restaurant.x} ${restaurant.y})`}>
                  <circle r={r * (1 + ripple * 3)} fill="none" stroke={bs.red} strokeWidth={1.5 / camera.zoom} opacity={(1 - ripple) * 0.8 * Number(ripple > 0)} />
                  <circle r={r * 2.4} fill={bs.red} opacity={0.18 * pop} />
                  <circle r={r * pop} fill={bs.red} />
                </g>
              );
            })}
            {/* Under the dot, clear of the other restaurants: the film's restaurant, then its town's count. */}
            {[
              // One after the other: crossed, the two labels blurred into each other.
              { text: home.name, opacity: Math.max(0, 1 - 2 * townLabel) },
              { text: `${inset?.name ?? home.name} · ${town.length}`, opacity: Math.max(0, 2 * townLabel - 1) },
            ].map((label) => (
              <text
                key={label.text}
                x={home.x + (LABEL_SIZE * LABEL_AT.x) / k}
                y={home.y + (LABEL_SIZE * LABEL_AT.y) / k}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontFamily={fonts.archivo}
                fontWeight={700}
                fontSize={LABEL_SIZE / k}
                fill={bs.white}
                opacity={label.opacity}
              >
                {label.text}
              </text>
            ))}
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
            {/* Matabiau's row, its figures ticking up, climbs past the one above it; the rank numbers stay. */}
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
            <Marker box={fresh} on={since(ARRIVAL + SLIDE_FRAMES - 4, springs.snappy) * (1 - leftFeed)} pulse={since(ARRIVAL + SLIDE_FRAMES - 4, springs.snappy)} />
            <Marker
              box={{ x: network.compare.x - COMPARE_PAD, y: network.compare.y - COMPARE_PAD, width: network.compare.width + 2 * COMPARE_PAD, height: network.compare.height + 2 * COMPARE_PAD }}
              on={since(COMPARE, springs.snappy) * (1 - since(TILES[1].at, springs.smooth, 6))}
              pulse={since(COMPARE, springs.snappy)}
            />
            {/* The feed replays N° 39 as it came in: the film's clock, rewound to its time, left of its row;
                in the tall frame, the camera close on the feed, above the view instead (below). */}
            {!portrait && (
              <div
                style={{
                  position: "absolute",
                  left: fresh.x - REWIND.gap,
                  top: fresh.y + fresh.height / 2,
                  translate: "-100% -50%",
                  opacity: Math.min(1, since(ARRIVAL, springs.snappy)),
                  scale: String(0.8 + 0.2 * Math.min(1, since(ARRIVAL, springs.snappy))),
                }}
              >
                <ClockChip size={REWIND.size} glow={1} rewind>
                  {phone.order.at}
                </ClockChip>
              </div>
            )}
            {/* Matabiau's row, marked as the camera reaches the ranking; it pulses as its figures tick, or on arrival if later. */}
            <Marker
              box={{ ...row.before, y: row.before.y + (row.after.y - row.before.y) * climbed }}
              on={since(last.at - 2, springs.snappy)}
              pulse={since(Math.max(TICK, last.at - 2), springs.snappy)}
            />
          </Device>
        )}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: `linear-gradient(${bs.black} 0, ${bs.black} ${pick(200, 540) - lineUp * titleHeight}px, transparent ${pick(330, 680) - lineUp * titleHeight}px)`,
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
            fontFamily: fonts.archivo,
            fontWeight: 800,
            fontSize: TITLE_SIZE,
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: bs.white,
            // Over the map, the coastline ran through the letters: a dark halo keeps them clear.
            textShadow: `0 0 18px ${bs.black}, 0 0 6px ${bs.black}`,
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
                  fontFamily: fonts.numeral,
                  fontWeight: 400,
                  color: bs.red,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {lit}
              </span>{" "}
              {lit > 1 ? "restaurants." : "restaurant."}
            </span>
          </Reveal>
          {/* Makes room as it comes: « 10 restaurants. » stays centered until then. */}
          <div style={{ whiteSpace: "nowrap", maxWidth: portrait ? undefined : `${since(VIEW + 12, springs.smooth, 10) * TITLE_ROOM}em` }}>
            <Reveal fade delay={at(VIEW) + 14}>
              Une seule vue.
            </Reveal>
          </div>
        </div>
        {portrait && (
          <div
            style={{
              position: "absolute",
              top: REWIND_TALL.top,
              opacity: Math.min(1, since(ARRIVAL, springs.snappy)) * (1 - leftFeed),
              scale: String(0.8 + 0.2 * Math.min(1, since(ARRIVAL, springs.snappy))),
            }}
          >
            <ClockChip size={REWIND_TALL.size} glow={1} rewind>
              {phone.order.at}
            </ClockChip>
          </div>
        )}
        {/* The view is a simulation: said plainly under its title, and kept in sight once the title has gone. */}
        <Reveal
          fade
          delay={at(VIEW) + 20}
          style={{
            marginTop: SIMULATION_GAP,
            translate: `0 ${-lineUp * titleHeight}px`,
            fontFamily: fonts.archivo,
            fontWeight: 600,
            fontSize: pick(26, 34),
            letterSpacing: "0.02em",
            color: bs.muted,
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

/** A red marker around a row of the view, pulsing once. */
const Marker = ({ box, on, pulse }: { box: Box; on: number; pulse: number }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      borderRadius: 8,
      boxShadow: `inset 0 0 0 2px ${bs.red}, 0 0 ${24 * Math.sin(Math.min(1, pulse) * Math.PI)}px rgb(215 34 21 / 0.6)`,
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
