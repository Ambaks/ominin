import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND_BY_ID, type Brand } from "../../frontend/lib/social/brands.ts";
import { OUTRO_FRAMES, WIDTH, reelDuration } from "./format.ts";
import type { ReelProps, RenderScene } from "./types.ts";

/*
 * Le Reel : une suite de scènes, chacune calée sur sa phrase de voix off,
 * puis un écran final avec l'appel à l'action. Même identité que les
 * carrousels (lib/social/brands, gabarit de /api/social/slides) : Geist très
 * gras et serré, fond sombre à halo, mots encadrés de [[ ]] sur le dégradé.
 *
 * Zones sûres d'un Reel : l'interface d'Instagram couvre environ 250 px en
 * haut et 400 px en bas, et la colonne d'icônes à droite ; texte et
 * sous-titres restent dans la bande du milieu.
 */

/* Téléphone des scènes démo et capture. */
const PHONE = { width: 760, top: 560, bezel: 18, radius: 96 };
/* Sous-titres : mots par carton, et hauteur de la bande. */
const WORDS_PER_SUBTITLE = 4;
const SUBTITLE_TOP = 1380;
/* Volume de la musique sous la voix. */
const MUSIC_VOLUME = 0.12;

const HIGHLIGHT = /\[\[(.+?)\]\]/g;

const fontsLoaded = delayRender("Polices du Reel");
Promise.all(
  (
    [
      ["Geist", "400", "fonts/geist-latin-400-normal.woff"],
      ["Geist", "800", "fonts/geist-latin-800-normal.woff"],
      ["Fraunces", "500", "fonts/fraunces-latin-500-normal.woff"],
    ] as const
  ).map(async ([family, weight, file]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
    document.fonts.add(await face.load());
  }),
).then(() => continueRender(fontsLoaded));

export function Reel({ brand: brandId, scenes, cta, music }: ReelProps) {
  const brand = BRAND_BY_ID.get(brandId)!;
  const total = reelDuration(scenes);
  let from = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.theme.background, fontFamily: "Geist" }}>
      {scenes.map((scene, index) => {
        const start = from;
        from += scene.frames;
        return (
          <Sequence key={index} from={start} durationInFrames={scene.frames}>
            <Scene brand={brand} scene={scene} first={index === 0} />
            <Audio src={staticFile(scene.voice)} />
          </Sequence>
        );
      })}
      <Sequence from={from} durationInFrames={OUTRO_FRAMES}>
        <Outro brand={brand} cta={cta} />
      </Sequence>
      {music ? <Audio src={staticFile(music)} volume={MUSIC_VOLUME} loop /> : null}
      <Progress brand={brand} total={total} />
    </AbsoluteFill>
  );
}

function Scene({
  brand,
  scene,
  first,
}: {
  brand: Brand;
  scene: RenderScene;
  first: boolean;
}) {
  if (scene.visual === "stock") {
    return (
      <AbsoluteFill>
        <StockVideo src={scene.src!} />
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.8) 100%)",
          }}
        />
        <Caption brand={brand} text={scene.caption} top={first ? 620 : 300} size={first ? 112 : 92} />
        <Subtitles text={scene.voiceover} frames={scene.frames} />
      </AbsoluteFill>
    );
  }
  if (scene.visual === "title") {
    return (
      <AbsoluteFill>
        <Halo brand={brand} />
        <Caption brand={brand} text={scene.caption} top={640} size={124} />
        <Subtitles text={scene.voiceover} frames={scene.frames} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Halo brand={brand} />
      <Phone brand={brand} scene={scene} />
      <Caption brand={brand} text={scene.caption} top={290} size={84} />
      <Subtitles text={scene.voiceover} frames={scene.frames} />
    </AbsoluteFill>
  );
}

function StockVideo({ src }: { src: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Lent travelling avant : une vidéo libre de droits ne doit pas sembler figée.
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.14]);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})` }}>
      <OffthreadVideo
        src={src}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
}

function Halo({ brand }: { brand: Brand }) {
  return (
    <div
      style={{
        position: "absolute",
        top: -300,
        right: -300,
        width: 1200,
        height: 1200,
        borderRadius: 1200,
        backgroundImage: `radial-gradient(circle, ${brand.theme.accentTo}40, transparent 65%)`,
      }}
    />
  );
}

/** Le téléphone monte du bas de l'écran, puis la démo y joue en entier. */
function Phone({ brand, scene }: { brand: Brand; scene: RenderScene }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const screenWidth = PHONE.width - 2 * PHONE.bezel;
  const screenHeight = (screenWidth * 1688) / 780;
  // Une démo filmée plus longue que la scène est accélérée pour tenir.
  const playbackRate = Math.max(1, scene.clipSeconds / (durationInFrames / fps));
  // Capture fixe : lent défilement vers ce qui compte (le haut, ou le bas).
  const drift = interpolate(frame, [0, durationInFrames], [0, -60]);

  const media: CSSProperties = {
    width: screenWidth,
    height: screenHeight,
    objectFit: "cover",
    borderRadius: PHONE.radius - PHONE.bezel,
  };
  return (
    <div
      style={{
        position: "absolute",
        top: PHONE.top + (1 - rise) * 700,
        left: (WIDTH - PHONE.width) / 2,
        width: PHONE.width,
        padding: PHONE.bezel,
        borderRadius: PHONE.radius,
        backgroundColor: "#1b1714",
        border: `3px solid ${brand.theme.muted}55`,
        boxShadow: `0 -40px 160px ${brand.theme.accentTo}55`,
        overflow: "hidden",
      }}
    >
      {scene.visual === "demo" ? (
        <OffthreadVideo
          src={staticFile(scene.src!)}
          muted
          playbackRate={playbackRate}
          trimBefore={Math.round(scene.clipStart * fps)}
          style={media}
        />
      ) : (
        <Img
          src={staticFile(scene.src!)}
          style={{
            ...media,
            objectPosition: scene.focusBottom ? "bottom" : "top",
            transform: `translateY(${scene.focusBottom ? -drift : drift}px)`,
          }}
        />
      )}
    </div>
  );
}

/** Texte à l'écran : surgit mot à mot, les passages [[ ]] sur le dégradé. */
function Caption({
  brand,
  text,
  top,
  size,
}: {
  brand: Brand;
  text: string;
  top: number;
  size: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { theme } = brand;
  const parts = text.split(HIGHLIGHT);
  let word = 0;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 80,
        right: 140,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: size * 0.2,
        rowGap: size * 0.1,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: -size * 0.045,
        color: theme.foreground,
        textShadow: "0 4px 40px rgba(0,0,0,0.45)",
      }}
    >
      {parts.flatMap((segment, index) => {
        const highlight = index % 2 === 1;
        const words = highlight ? [segment] : segment.split(/\s+/).filter(Boolean);
        return words.map((text) => {
          const delay = word++ * 3;
          const pop = spring({ frame: frame - delay, fps, config: { damping: 14 } });
          return (
            <span
              key={`${index}-${delay}`}
              style={{
                display: "inline-block",
                opacity: pop,
                transform: `translateY(${(1 - pop) * 40}px) scale(${0.9 + pop * 0.1})`,
                ...(highlight && {
                  padding: `${size * 0.02}px ${size * 0.14}px ${size * 0.08}px`,
                  borderRadius: size * 0.14,
                  backgroundImage: `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})`,
                  color: theme.onAccent,
                  textShadow: "none",
                }),
              }}
            >
              {text}
            </span>
          );
        });
      })}
    </div>
  );
}

/** Sous-titres de la voix off, par cartons de quelques mots. La synthèse ne
 * donne pas le temps de chaque mot : chaque carton dure au prorata de sa
 * longueur, ce qui suit la diction d'assez près. */
function Subtitles({ text, frames }: { text: string; frames: number }) {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_SUBTITLE) {
    chunks.push(words.slice(i, i + WORDS_PER_SUBTITLE).join(" "));
  }
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let elapsed = 0;
  const current = chunks.find((chunk) => {
    elapsed += (chunk.length / totalChars) * frames;
    return frame < elapsed;
  });
  if (!current) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: SUBTITLE_TOP,
        left: 80,
        right: 140,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          padding: "14px 28px",
          borderRadius: 24,
          backgroundColor: "rgba(12,10,8,0.78)",
          color: "#ffffff",
          fontSize: 54,
          fontWeight: 800,
          letterSpacing: -1,
          textAlign: "center",
        }}
      >
        {current}
      </div>
    </div>
  );
}

function Outro({ brand, cta }: { brand: Brand; cta: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { theme } = brand;
  const pop = spring({ frame, fps, config: { damping: 15 } });
  const [first, ...rest] = brand.name.split(" ");

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 70,
        padding: "0 90px",
        opacity: pop,
        transform: `scale(${0.92 + pop * 0.08})`,
      }}
    >
      <Halo brand={brand} />
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Img src={staticFile("logo.png")} style={{ width: 84, height: 84 }} />
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 76 }}>
          <span style={{ color: theme.accentFrom }}>{first}</span>
          {rest.length ? (
            <span style={{ marginLeft: 18, color: theme.foreground }}>{rest.join(" ")}</span>
          ) : null}
        </div>
      </div>
      <div
        style={{
          color: theme.foreground,
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: -4,
          textAlign: "center",
        }}
      >
        {cta}
      </div>
      <div
        style={{
          padding: "30px 64px",
          borderRadius: 999,
          backgroundImage: `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})`,
          color: theme.onAccent,
          fontSize: 56,
          fontWeight: 800,
          letterSpacing: -1.5,
        }}
      >
        {brand.url}
      </div>
    </AbsoluteFill>
  );
}

/** Fine barre de progression en haut : on voit que ça ne dure pas. */
function Progress({ brand, total }: { brand: Brand; total: number }) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 10,
        width: `${(frame / total) * 100}%`,
        backgroundImage: `linear-gradient(90deg, ${brand.theme.accentFrom}, ${brand.theme.accentTo})`,
      }}
    />
  );
}
