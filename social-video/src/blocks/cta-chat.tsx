import type { ReactNode } from "react";
import { Easing, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import type { SocialBrand } from "../../../frontend/lib/social/brands.ts";
import { SCREENS } from "../../../frontend/lib/social/screens.ts";
import { progress, wave } from "../motion.ts";

/*
 * La conversation de l'appel à l'action, dans le cadre iPhone du site : le
 * mot-clé se tape au clavier, s'envoie et monte du champ en bulle braise ;
 * le clavier se range, l'équipe écrit puis répond par la ligne de la scène,
 * qu'un trait de braise souligne, le client y met un cœur, et l'équipe
 * envoie l'écran du produit, qui monte depuis le bas du téléphone.
 */

/* Temps pensés pour une scène de 90 images, resserrés si elle est plus courte. */
const BASE_FRAMES = 90;
const AT = {
  before: 0,
  mark: 3,
  after: 9,
  phone: 3,
  phoneRise: 18,
  url: 12,
  type: 14,
  typeWindow: 12,
  sendGap: 3,
  dropAt: 11,
  drop: 12,
  receipt: 4,
  dots: 6,
  reply: 13,
  read: 16,
  glint: 16,
  underline: 20,
  underlineFrames: 16,
  react: 26,
  card: 17,
};
const MAX_FRAMES_PER_LETTER = 3;
/* Le cadre du site (24 rem) ramené à ~820 px de large. */
const PHONE_ZOOM = 0.95;
/* Le téléphone grossit doucement jusqu'à la fin de la scène. */
const PHONE_GROW = 0.02;
const PHONE_FROM_PX = 1150;
const FLOAT_PX = 8;
const DOTS_PERIOD = 18;
const CARET_PERIOD = 16;
const REACT_BEAT = 24;
/* Trajet de la bulle envoyée, du champ de saisie à sa place dans le fil. */
const FLIGHT = "11rem";
/* Course du champ et du clavier quand ils se rangent sous l'écran. */
const DROP = "16rem";
/* L'écran envoyé par l'équipe monte de cette hauteur, puis recule lentement. */
const CARD_FROM = "8rem";
const CARD_ZOOM = 0.08;
const KEY_ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

/* La braise des petits textes, tirée vers l'encre du fond : lisible sur les habillages clairs. */
export const EMBER_INK = "color-mix(in oklab, var(--ember-1) 72%, var(--foreground))";

export type CtaTimeline = ReturnType<typeof ctaTimeline>;

export function ctaTimeline(letters: number, duration: number) {
  const at = (frames: number) => Math.round(frames * Math.min(1, duration / BASE_FRAMES));
  const type = at(AT.type);
  const perLetter = Math.max(1, Math.min(MAX_FRAMES_PER_LETTER, Math.floor(at(AT.typeWindow) / Math.max(1, letters))));
  const send = type + letters * perLetter + at(AT.sendGap);
  return {
    before: at(AT.before),
    mark: at(AT.mark),
    after: at(AT.after),
    phone: at(AT.phone),
    phoneRise: at(AT.phoneRise),
    url: at(AT.url),
    type,
    perLetter,
    send,
    dropAt: send + at(AT.dropAt),
    drop: at(AT.drop),
    receipt: send + at(AT.receipt),
    dots: send + at(AT.dots),
    reply: send + at(AT.reply),
    read: send + at(AT.read),
    glint: send + at(AT.glint),
    underline: send + at(AT.underline),
    underlineFrames: at(AT.underlineFrames),
    react: send + at(AT.react),
    card: send + at(AT.card),
  };
}

/* Une ligne du fil qui s'ouvre de 0 à sa hauteur : piste de grille en fr. */
function Grow({ by, children }: { by: number; children: ReactNode }) {
  return (
    <div className="grid shrink-0" style={{ gridTemplateRows: `${by}fr` }}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function Avatar() {
  return <span className="ember-gradient size-[1.6rem] shrink-0 rounded-full" />;
}

/* Une touche du clavier ; tapée, elle s'allume et sa lettre jaillit au-dessus. */
function Key({ label, wide = false, lit = false }: { label: string; wide?: boolean; lit?: boolean }) {
  return (
    <span
      className={`relative flex h-[2.2rem] items-center justify-center rounded-[0.35rem] text-[1.05rem] font-medium ${wide ? "flex-[1.5] bg-hairline" : "flex-1"} ${lit ? "ember-gradient text-background" : wide ? "" : "bg-surface-raised"}`}
    >
      {label}
      {lit && (
        <span className="ember-gradient absolute bottom-[calc(100%-0.3rem)] left-1/2 flex h-[2.8rem] w-[150%] -translate-x-1/2 items-center justify-center rounded-[0.5rem] text-[1.6rem] font-semibold text-background shadow-lg">
          {label}
        </span>
      )}
    </span>
  );
}

export function CtaChat({
  brand,
  name,
  url,
  keyword,
  line,
  timeline: t,
}: {
  brand: SocialBrand;
  name: string;
  url: string;
  keyword: string;
  line: string;
  timeline: CtaTimeline;
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const screen = SCREENS.find((s) => s.brand === brand && !s.focus);
  const rise = progress(frame, t.phone, t.phoneRise, Easing.out(Easing.cubic));
  const grow = 1 + PHONE_GROW * progress(frame, t.phone, durationInFrames - t.phone, Easing.inOut(Easing.sin));
  const count = frame < t.type ? 0 : Math.min(keyword.length, Math.floor((frame - t.type) / t.perLetter) + 1);
  const draft = frame < t.send ? keyword.slice(0, count) : "";
  const caret = draft || Math.floor(frame / (CARET_PERIOD / 2)) % 2 === 0;
  const typing = frame >= t.type && frame < t.type + keyword.length * t.perLetter;
  const lit = typing ? keyword[count - 1].toUpperCase() : "";
  const press = Math.sin(progress(frame, t.send - 2, 6) * Math.PI);
  const drop = progress(frame, t.dropAt, t.drop, Easing.inOut(Easing.cubic));
  const slide = spring({ frame: frame - t.send, fps, config: { damping: 17, stiffness: 150 } });
  const receipt = progress(frame, t.receipt, 5);
  const read = progress(frame, t.read, 5);
  const readPop = Math.sin(progress(frame, t.read, 10) * Math.PI);
  const dots = progress(frame, t.dots, 6) * (1 - progress(frame, t.reply, 6));
  const opened = progress(frame, t.reply, 8);
  const reply = spring({ frame: frame - t.reply, fps, config: { damping: 13, stiffness: 200 } });
  const underline = progress(frame, t.underline, t.underlineFrames, Easing.inOut(Easing.quad));
  const react = spring({ frame: frame - t.react, fps, config: { damping: 9, stiffness: 220 } });
  const reactBeat = frame < t.react ? 0 : Math.max(0, wave(frame - t.react, REACT_BEAT)) * progress(frame, t.react + 8, 6);
  const card = spring({ frame: frame - t.card, fps, config: { damping: 15, stiffness: 140 } });
  const settle = progress(frame, t.card, durationInFrames - t.card, Easing.out(Easing.quad));
  const flare = (at: number) => Math.sin(progress(frame, at, 20) * Math.PI);
  const glow = 0.5 + flare(t.send) * 0.25 + flare(t.reply) * 0.35 + wave(frame, durationInFrames / 2) * 0.12;

  return (
    <div
      className="relative"
      style={{
        transformOrigin: "50% 0",
        transform: `translateY(${(1 - rise) * PHONE_FROM_PX + wave(frame, durationInFrames) * FLOAT_PX}px) scale(${grow})`,
      }}
    >
      {/* Halo derrière le téléphone : il s'allume à l'envoi et à la réponse. */}
      <div
        className="absolute -inset-x-[7rem] -top-[4rem] h-[38rem]"
        style={{
          opacity: glow,
          background: "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 50%, transparent), transparent)",
        }}
      />
      <div className="relative" style={{ zoom: PHONE_ZOOM, filter: "drop-shadow(0 1.2rem 2.4rem color-mix(in oklab, var(--ember-2) 45%, transparent))" }}>
        {/* Liseré braise autour du châssis : l'objet porte la couleur du pavé. */}
        <div className="ember-gradient absolute -inset-[0.2rem] rounded-[4.1rem] opacity-80" />
        <IphoneFrame>
          <div className="relative flex h-[32rem] flex-col overflow-hidden pt-[2.6rem]">
            <div className="flex items-center gap-[0.5rem] border-b border-hairline px-[0.8rem] pb-[0.45rem]">
              <svg viewBox="0 0 12 20" className="h-[1.05rem]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2 2 10l8 8" />
              </svg>
              <span className="ember-gradient kit-display flex size-[2.2rem] items-center justify-center rounded-full text-[1.2rem] text-background">
                {name[0]}
              </span>
              <span className="text-[1.3rem] font-bold">{name}</span>
            </div>

            <div className="relative flex flex-1 flex-col px-[0.7rem]">
              {/* Début de conversation : la fiche de la marque, effacée par l'envoi. */}
              <div
                className="absolute inset-x-0 top-0 flex h-[11.5rem] flex-col items-center justify-center gap-[0.2rem]"
                style={{ opacity: 1 - progress(frame, t.send - 2, 3) }}
              >
                <span className="ember-gradient kit-display flex size-[3.2rem] items-center justify-center rounded-full text-[1.7rem] text-background">
                  {name[0]}
                </span>
                <span className="text-[1.4rem] font-bold">{name}</span>
                <span className="text-[1.2rem] text-muted">{url}</span>
              </div>

              <div
                className="flex items-end justify-end gap-[0.45rem] pt-[0.6rem]"
                style={{
                  opacity: frame >= t.send ? 1 : 0,
                  transformOrigin: "bottom right",
                  transform: `translateY(calc(${1 - slide} * ${FLIGHT})) scale(${0.8 + slide * 0.2})`,
                }}
              >
                <span className="grid justify-items-end pb-[0.15rem] text-[1.2rem] font-semibold">
                  <span className="[grid-area:1/1] text-muted" style={{ opacity: receipt * (1 - read) }}>
                    Envoyé ✓
                  </span>
                  <span className="[grid-area:1/1] origin-bottom-right" style={{ opacity: read, color: EMBER_INK, transform: `scale(${1 + readPop * 0.25})` }}>
                    Lu
                  </span>
                </span>
                <p className="ember-gradient kit-display rounded-[1.2rem] rounded-br-[0.3rem] px-[0.75rem] py-[0.35rem] text-[1.9rem] text-background shadow-[0_0.4rem_1.2rem_-0.4rem] shadow-ember-2/50">
                  {keyword}
                </p>
              </div>

              <Grow by={dots}>
                <div className="flex items-start gap-[0.4rem] pt-[0.6rem]" style={{ opacity: Math.min(1, dots * 2) }}>
                  <Avatar />
                  <span className="flex gap-[0.35rem] rounded-[1.2rem] rounded-tl-[0.3rem] border border-hairline bg-surface-raised px-[0.9rem] py-[0.75rem]">
                    {[0, 1, 2].map((i) => {
                      const lift = Math.max(0, wave(frame - t.dots, DOTS_PERIOD, -i / 6));
                      return (
                        <span
                          key={i}
                          className="size-[0.65rem] rounded-full bg-foreground"
                          style={{ opacity: 0.35 + lift * 0.65, transform: `translateY(${-lift * 0.22}rem)` }}
                        />
                      );
                    })}
                  </span>
                </div>
              </Grow>

              <Grow by={opened}>
                <div className="flex items-start gap-[0.4rem] pb-[0.9rem] pt-[0.6rem]">
                  <Avatar />
                  <p
                    className="relative w-[87%] origin-top-left rounded-[1.2rem] rounded-tl-[0.3rem] border border-ember-1/35 bg-surface-raised px-[0.8rem] py-[0.55rem] text-[1.75rem] font-semibold leading-[1.18] tracking-[-0.01em]"
                    style={{
                      opacity: Math.min(1, reply * 2),
                      transform: `scale(${0.85 + reply * 0.15})`,
                      boxShadow: "0 0.5rem 1.4rem -0.6rem color-mix(in oklab, var(--foreground) 25%, transparent)",
                    }}
                  >
                    {/* Un seul fond pour toutes les lignes : le trait court de l'une à l'autre. */}
                    <span
                      className="bg-no-repeat"
                      style={{
                        backgroundImage: "linear-gradient(90deg, var(--ember-1), var(--ember-2) 55%, var(--ember-3))",
                        backgroundSize: `${underline * 100}% 0.1em`,
                        backgroundPosition: "0 94%",
                      }}
                    >
                      {line}
                    </span>
                    {/* La réaction du client à la réponse : elle éclot, puis bat. */}
                    <span
                      className="absolute -bottom-[0.9rem] -right-[0.6rem] flex size-[2.3rem] items-center justify-center rounded-full border border-hairline bg-surface-raised shadow-md"
                      style={{ opacity: Math.min(1, react * 3), transform: `scale(${react * (1 + reactBeat * 0.12)})` }}
                    >
                      <svg viewBox="0 0 24 24" className="size-[1.35rem] text-ember-2">
                        <path
                          fill="currentColor"
                          d="M12 21s-7.5-4.6-9.6-9.2C1 8.7 2.9 5 6.6 5c2.2 0 3.7 1.2 4.6 2.6h1.6C13.7 6.2 15.2 5 17.4 5c3.7 0 5.6 3.7 4.2 6.8C19.5 16.4 12 21 12 21z"
                        />
                      </svg>
                    </span>
                  </p>
                </div>
              </Grow>

              {/* L'équipe envoie l'écran du produit : il monte du bas du téléphone. */}
              {screen && (
                <div
                  className="ml-[2rem] mt-[0.4rem] h-[18rem] w-[62%] shrink-0 overflow-hidden rounded-[1.2rem] rounded-tl-[0.3rem] border border-hairline"
                  style={{ opacity: Math.min(1, card * 2), transform: `translateY(calc(${1 - card} * ${CARD_FROM}))` }}
                >
                  <Img
                    src={staticFile(`screens/${screen.id}.jpg`)}
                    className="block w-full origin-top"
                    style={{ transform: `scale(${1 + CARD_ZOOM * (1 - settle)})` }}
                  />
                </div>
              )}
            </div>

            {/* Le champ et le clavier, rangés sous l'écran une fois le message parti. */}
            <div className="absolute inset-x-0 bottom-0" style={{ transform: `translateY(calc(${drop} * ${DROP}))` }}>
              <div className="mx-[0.6rem] mb-[0.5rem] flex items-center gap-[0.4rem]">
                <p className="flex h-[2.8rem] flex-1 items-center rounded-full border border-hairline bg-surface px-[0.85rem]">
                  <span className="text-[1.5rem] font-bold tracking-wide">{draft}</span>
                  <span className="mx-[0.05rem] h-[1.5rem] w-[0.1rem] rounded-full" style={{ opacity: caret ? 1 : 0, background: EMBER_INK }} />
                  {!draft && <span className="text-[1.3rem] text-muted">Message…</span>}
                </p>
                <span
                  className={`flex size-[2.8rem] items-center justify-center rounded-full ${draft ? "ember-gradient text-background" : "bg-surface-raised text-faint"}`}
                  style={{ transform: `scale(${1 - press * 0.15})` }}
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="size-[1.3rem]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 17V3M4 9l6-6 6 6" />
                  </svg>
                </span>
              </div>
              <div className="flex flex-col gap-[0.3rem] bg-surface px-[0.25rem] pb-[1.4rem] pt-[0.5rem]">
                {KEY_ROWS.map((row, r) => (
                  <div key={row} className="flex gap-[0.22rem]">
                    {r === 2 && <Key label="⇧" wide />}
                    {[...row].map((key) => (
                      <Key key={key} label={key} lit={key === lit} />
                    ))}
                    {r === 2 && <Key label="⌫" wide />}
                  </div>
                ))}
                <div className="flex gap-[0.22rem]">
                  <Key label="123" wide />
                  <span className="h-[2.2rem] flex-[5] rounded-[0.35rem] bg-surface-raised" />
                  <Key label="↵" wide />
                </div>
              </div>
            </div>

            {/* Reflet du verre, qui glisse lentement sur l'écran. */}
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background: "linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.07) 42%, transparent 54%)",
                backgroundSize: "250% 100%",
                backgroundPosition: `${100 - progress(frame, 0, durationInFrames) * 60}% 0`,
              }}
            />
          </div>
        </IphoneFrame>
      </div>
    </div>
  );
}
