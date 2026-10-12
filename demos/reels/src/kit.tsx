import { loadFont } from "@remotion/google-fonts/Geist";
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, cancelRender, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, clamp, Device, DEVICES, fonts, Grain, om, OmininMark, PhoneScreen, pose, Qr, springs, type Pose } from "./film";

/* The landings' display face: Geist 800, set tight (components/landing-kit/kit.css). */
const black = loadFont("normal", { subsets: ["latin"], weights: ["800"] });
black.waitUntilDone().catch(cancelRender);
const DISPLAY = black.fontFamily;
const TIGHT = "-0.045em";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const s = (seconds: number) => Math.round(seconds * FPS);

/** Instagram's own UI covers the top 250 px and the bottom 350 px of a Reel; side margins keep text off the edge. */
export const SAFE = { top: 250, bottom: HEIGHT - 350, x: 80 };

/*
 * The three accounts, with the accent pairs of the social carousels
 * (frontend/lib/social/brands.ts): one family, a dominant per offer.
 */
export const BRANDS = {
  ominin: { product: null, url: "ominin.com", accent: ["#F0B35B", "#C94F5E"] },
  menu: { product: "Menu", url: "menu.ominin.com", accent: ["#F0B35B", "#E2764B"] },
  collect: { product: "Collect", url: "collect.ominin.com", accent: ["#F5C26B", "#D9653F"] },
} as const;
export type BrandId = keyof typeof BRANDS;

const BrandContext = createContext<BrandId>("ominin");
const useBrand = () => BRANDS[useContext(BrandContext)];
const useAccent = (angle = 100) => {
  const [from, to] = useBrand().accent;
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
};

const OUT = Easing.bezier(0.2, 0.7, 0.2, 1);

/** 0 â†’ 1 spring from frame `at` of the current Reel. */
const useIn = (at: number, config = springs.smooth) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config });
};

/** 0 â†’ 1 as the element leaves at `until` (8 frames). */
const useOut = (until?: number) => {
  const frame = useCurrentFrame();
  return until === undefined ? 0 : interpolate(frame, [until, until + 8], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
};

export const Stage = ({ brand, glow = { x: 50, y: 62 }, children }: { brand: BrandId; glow?: { x: number; y: number }; children: ReactNode }) => (
  <BrandContext.Provider value={brand}>
    <AbsoluteFill style={{ background: om.ink, fontFamily: fonts.sans, color: om.cream }}>
      <Backdrop x={glow.x} y={glow.y} glow={1.3} />
      {children}
      <Grain />
    </AbsoluteFill>
  </BrandContext.Provider>
);

/** Rises in at `at` like the landings' hero lines (up, unblurred), leaves at `until`. */
export const Rise = ({ at, until, children, style }: { at: number; until?: number; children: ReactNode; style?: CSSProperties }) => {
  const frame = useCurrentFrame();
  const t = useIn(at);
  const out = useOut(until);
  if (frame < at || out >= 1) return null;
  return (
    <div
      style={{
        ...style,
        opacity: Math.min(1, t * 1.6) * (1 - out),
        transform: `translateY(${(1 - t) * 0.45 + out * 0.2}em)`,
        filter: t < 0.98 ? `blur(${(1 - t) * 6}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/** Lands with a small overshoot, for figures and cards. */
export const Pop = ({ at, until, children, style }: { at: number; until?: number; children: ReactNode; style?: CSSProperties }) => {
  const frame = useCurrentFrame();
  const t = useIn(at, springs.snappy);
  const out = useOut(until);
  if (frame < at || out >= 1) return null;
  return <div style={{ ...style, opacity: Math.min(1, t * 2) * (1 - out), transform: `scale(${0.7 + 0.3 * t - 0.06 * out})` }}>{children}</div>;
};

/** The landings' marked word: an accent block sweeps under it and turns it dark. */
export const Mark = ({ at = 0, children }: { at?: number; children: ReactNode }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const x = 100 * interpolate(frame, [at, at + 9], [0, 1], { ...clamp, easing: OUT });
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 0.12em", margin: "0 -0.04em" }}>
      {children}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: "0.06em 0 -0.02em",
          padding: "0 0.12em",
          lineHeight: "inherit",
          borderRadius: "0.12em",
          background: accent,
          color: om.ink,
          clipPath: `inset(0 ${100 - x}% 0 0 round 0.12em)`,
          display: "flex",
          alignItems: "center",
        }}
      >
        {children}
      </span>
    </span>
  );
};

/** Accent-colored words, for figures in running text. */
export const Hot = ({ children }: { children: ReactNode }) => {
  const accent = useAccent();
  return (
    <span style={{ backgroundImage: accent, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", paddingBottom: "0.08em" }}>
      {children}
    </span>
  );
};

/** Display lines, Geist 800 set tight, each rising a beat after the last. */
export const Headline = ({
  lines,
  at = 0,
  until,
  size,
  top,
  align = "left",
  stagger = 3,
}: {
  lines: ReactNode[];
  at?: number;
  until?: number;
  size: number;
  top: number;
  align?: "left" | "center";
  stagger?: number;
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left: SAFE.x,
      right: SAFE.x,
      textAlign: align,
      fontFamily: DISPLAY,
      fontWeight: 800,
      fontSize: size,
      lineHeight: 0.98,
      letterSpacing: TIGHT,
    }}
  >
    {lines.map((line, i) => (
      <Rise key={i} at={at + i * stagger} until={until}>
        {line}
      </Rise>
    ))}
  </div>
);

/** The pill label of the landings: accent dot, tracked capitals. */
export const Eyebrow = ({ label, at = 0, until }: { label: string; at?: number; until?: number }) => {
  const accent = useAccent();
  const [from] = useBrand().accent;
  return (
    <Rise at={at} until={until} style={{ position: "absolute", top: SAFE.top + 20, left: SAFE.x, display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ width: 16, height: 16, borderRadius: "50%", background: accent }} />
      <span style={{ fontWeight: 700, fontSize: 30, letterSpacing: "0.26em", textTransform: "uppercase", color: from }}>{label}</span>
    </Rise>
  );
};

export type Line = { at: number; until: number; text: ReactNode };

/** Burnt-in subtitles: one line at a time, each replacing the last, in one fixed box. */
export const Captions = ({ lines, top, size = 72 }: { lines: Line[]; top: number; size?: number }) => (
  <div style={{ position: "absolute", top, left: SAFE.x, right: SAFE.x }}>
    {lines.map((line, i) => (
      <Rise
        key={i}
        at={line.at}
        until={line.until}
        style={{
          position: "absolute",
          inset: 0,
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: "-0.035em",
          textWrap: "balance",
        }}
      >
        {line.text}
      </Rise>
    ))}
  </div>
);

/**
 * Plays film content at the film frame `map` gives for each frame of the
 * Reel. A sequence offset rather than <Freeze>, which clamps to the Reel's
 * length while the film's frames run past it.
 */
export const AtFilm = ({ map, children }: { map: (frame: number) => number; children: ReactNode }) => {
  const frame = useCurrentFrame();
  return (
    <Sequence from={frame - Math.round(map(frame))} layout="none">
      {children}
    </Sequence>
  );
};

/** Piecewise-linear map from Reel frames to film frames: hold, speed up or jump between [reel, film] keys. */
export const filmTime =
  (keys: [reel: number, film: number][]) =>
  (frame: number): number =>
    interpolate(
      frame,
      keys.map(([reel]) => reel),
      keys.map(([, film]) => film),
      clamp,
    );

/**
 * Where the phone rests: its bottom edge stops above the Reels UI (y 1570),
 * its top below the captions. During a hook it sits lower, under the text.
 */
export const PHONE = { size: 980, rest: 90, peek: 560 };

/** The phone's y: under the hook, then up to its rest from frame `at`. */
export const usePhoneY = (at: number) => PHONE.peek + (PHONE.rest - PHONE.peek) * useIn(at, springs.push);

/** The film's 3D phone with the customer's screens, played on film time. */
export const Phone = ({ map, at, size = PHONE.size, place }: { map: (frame: number) => number; at: number; size?: number; place: Partial<Pose> }) => {
  const frame = useCurrentFrame();
  const enter = useIn(at, springs.heavy);
  if (frame < at) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Device
        model={DEVICES.phone}
        size={size}
        float={3}
        pose={pose({
          ...place,
          y: (place.y ?? 0) + (1 - enter) * 1200,
          rotateY: (place.rotateY ?? -6) + 6 * (1 - enter),
          rotateX: place.rotateX ?? 3,
          rotateZ: (place.rotateZ ?? 0) + 5 * (1 - enter),
        })}
      >
        <AtFilm map={map}>
          <PhoneScreen />
        </AtFilm>
      </Device>
    </AbsoluteFill>
  );
};

/** The URL in the accent pill, as the carousels end. */
export const UrlPill = ({ size = 60 }: { size?: number }) => {
  const accent = useAccent();
  const { url } = useBrand();
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${size * 0.36}px ${size * 0.8}px`,
        borderRadius: 999,
        background: accent,
        color: om.ink,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.03em",
        boxShadow: "0 20px 60px rgb(226 118 75 / 0.35)",
      }}
    >
      {url}
    </div>
  );
};

/** Ominin's mark, followed by the offer's name. */
export const Lockup = ({ size }: { size: number }) => {
  const { product } = useBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <OmininMark size={size} />
      {product && <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size * 1.02, letterSpacing: TIGHT, color: om.cream }}>{product}</span>}
    </div>
  );
};

/** Last card: lockup, one line, the offer in a smaller line, the URL; all inside the safe zone. */
export const EndCard = ({ at, line, sub }: { at: number; line: ReactNode; sub?: ReactNode }) => {
  const pill = useIn(at + 10, springs.snappy);
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: (HEIGHT - SAFE.bottom - SAFE.top) }}>
      <Rise at={at}>
        <Lockup size={96} />
      </Rise>
      <Rise
        at={at + 4}
        style={{
          marginTop: 70,
          maxWidth: WIDTH - 2 * SAFE.x,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1,
          letterSpacing: TIGHT,
          textWrap: "balance",
        }}
      >
        {line}
      </Rise>
      {sub && (
        <Rise at={at + 7} style={{ marginTop: 36, maxWidth: WIDTH - 2 * SAFE.x, textAlign: "center", fontSize: 46, fontWeight: 600, lineHeight: 1.25, color: om.muted, textWrap: "balance" }}>
          {sub}
        </Rise>
      )}
      <div style={{ marginTop: 70, opacity: Math.min(1, pill * 1.5), transform: `scale(${0.8 + 0.2 * pill})` }}>
        <UrlPill />
      </div>
    </AbsoluteFill>
  );
};

/** The Cachet as it is delivered: the restaurant's logo over the table's QR. */
export const Cachet = ({ scale = 1 }: { scale?: number }) => (
  <div style={{ width: 260 * scale, padding: `${22 * scale}px ${22 * scale}px ${18 * scale}px`, borderRadius: 30 * scale, background: "#fff", color: "#1A1512", textAlign: "center", fontWeight: 700 }}>
    <div
      style={{
        margin: `0 auto ${16 * scale}px`,
        width: 92 * scale,
        height: 92 * scale,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "#1A1512",
        color: "#fff",
        fontSize: 17 * scale,
        lineHeight: 1.1,
        letterSpacing: "0.04em",
      }}
    >
      VOTRE
      <br />
      LOGO
    </div>
    <Qr size={216 * scale} />
    <div style={{ marginTop: 10 * scale, fontSize: 26 * scale }}>Table 12</div>
  </div>
);

/** A dark card in the landings' surface. */
export const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ borderRadius: 40, padding: "40px 44px", background: om.surface, border: `2px solid ${om.line}`, ...style }}>{children}</div>
);

/** A big figure in display type. */
export const Figure = ({ children, size, style }: { children: ReactNode; size: number; style?: CSSProperties }) => (
  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.9, letterSpacing: TIGHT, ...style }}>{children}</div>
);

export { DISPLAY, useAccent, useIn };
