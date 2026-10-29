import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import { progress, wave } from "../motion.ts";

/*
 * La conversation de l'appel à l'action, dans le cadre iPhone du site : le
 * mot-clé se tape au clavier, glisse en bulle braise, « Envoyé ✓ », l'équipe
 * écrit, répond par la ligne de la scène, et le message passe « Lu ».
 */

/* Temps pensés pour une scène de 90 images, resserrés si elle est plus courte. */
const BASE_FRAMES = 90;
const AT = {
  eyebrow: 0,
  before: 0,
  mark: 4,
  after: 8,
  phone: 4,
  url: 12,
  type: 20,
  typeWindow: 12,
  sendGap: 3,
  receipt: 4,
  dots: 8,
  reply: 16,
  read: 22,
  glint: 26,
};
const MAX_FRAMES_PER_LETTER = 3;
/* Le cadre du site (24 rem) ramené à ~820 px de large. */
const PHONE_ZOOM = 0.95;
/* Départ de la bulle envoyée : sous le fil, au ras du champ de saisie. */
const BUBBLE_FROM = "3.5rem";
/* Hauteur de la fiche de la marque en tête de conversation. */
const INTRO = "7rem";
const DOTS_PERIOD = 18;
const FLOAT_PX = 6;
const KEY_ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

export type CtaTimeline = ReturnType<typeof ctaTimeline>;

export function ctaTimeline(letters: number, duration: number) {
  const at = (frames: number) => Math.round(frames * Math.min(1, duration / BASE_FRAMES));
  const type = at(AT.type);
  const perLetter = Math.max(1, Math.min(MAX_FRAMES_PER_LETTER, Math.floor(at(AT.typeWindow) / Math.max(1, letters))));
  const send = type + letters * perLetter + at(AT.sendGap);
  return {
    eyebrow: at(AT.eyebrow),
    before: at(AT.before),
    mark: at(AT.mark),
    after: at(AT.after),
    phone: at(AT.phone),
    url: at(AT.url),
    type,
    perLetter,
    send,
    receipt: send + at(AT.receipt),
    dots: send + at(AT.dots),
    reply: send + at(AT.reply),
    read: send + at(AT.read),
    glint: send + at(AT.glint),
  };
}

export function CtaChat({ name, url, keyword, line, timeline: t }: { name: string; url: string; keyword: string; line: string; timeline: CtaTimeline }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - t.phone, fps, config: { damping: 14, stiffness: 120 } });
  const count = frame < t.type ? 0 : Math.min(keyword.length, Math.floor((frame - t.type) / t.perLetter) + 1);
  const typing = frame >= t.type && frame < t.type + keyword.length * t.perLetter;
  const draft = frame < t.send ? keyword.slice(0, count) : "";
  const caret = draft || Math.floor(frame / 8) % 2 === 0;
  const press = Math.sin(progress(frame, t.send - 2, 6) * Math.PI);
  const scroll = progress(frame, t.send, 8);
  const slide = spring({ frame: frame - t.send, fps, config: { damping: 18, stiffness: 260 } });
  const receipt = progress(frame, t.receipt, 6);
  const read = progress(frame, t.read, 6);
  const dots = spring({ frame: frame - t.dots, fps, config: { damping: 13, stiffness: 220 } });
  const reply = spring({ frame: frame - t.reply, fps, config: { damping: 10, stiffness: 190 } });
  const replied = frame >= t.reply;
  const flare = (at: number) => Math.sin(progress(frame, at, 20) * Math.PI);
  const glow = 0.5 + flare(t.send) * 0.25 + flare(t.reply) * 0.4 + wave(frame, durationInFrames / 2) * 0.1;

  return (
    <div className="relative" style={{ transform: `translateY(${(1 - enter) * 1100 + wave(frame, durationInFrames) * FLOAT_PX}px)` }}>
      {/* Second halo, derrière le téléphone. */}
      <div
        className="absolute -inset-x-[6rem] -top-[5rem] h-[34rem]"
        style={{ opacity: glow, background: "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 50%, transparent), transparent)" }}
      />
      <div className="relative" style={{ zoom: PHONE_ZOOM }}>
        {/* Liseré braise autour du châssis : l'objet porte la couleur du pavé. */}
        <div className="ember-gradient absolute -inset-[0.2rem] rounded-[4.1rem] opacity-80" />
        <IphoneFrame>
          <div className="flex h-[34rem] flex-col pt-[2.8rem]">
            <div className="flex items-center gap-[0.5rem] border-b border-hairline px-[0.8rem] pb-[0.5rem]">
              <svg
                viewBox="0 0 12 20"
                className="h-[0.9rem] text-ember-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 2 2 10l8 8" />
              </svg>
              <span className="ember-gradient kit-display flex size-[2rem] items-center justify-center rounded-full text-[1rem] text-background">
                {name[0]}
              </span>
              <span className="text-[1.1rem] font-bold">{name}</span>
            </div>

            <div className="h-[10.6rem] overflow-hidden">
              <div className="flex flex-col px-[0.8rem]" style={{ transform: `translateY(calc(${-scroll} * ${INTRO}))` }}>
                {/* Début de conversation : la fiche de la marque, que l'envoi fait défiler. */}
                <div className="flex flex-col items-center justify-center gap-[0.25rem]" style={{ height: INTRO }}>
                  <span className="ember-gradient kit-display flex size-[2.6rem] shrink-0 items-center justify-center rounded-full text-[1.3rem] text-background">
                    {name[0]}
                  </span>
                  <span className="text-[1.1rem] font-bold">{name}</span>
                  <span className="text-[1rem] text-muted">{url}</span>
                </div>
                <div
                  className="mt-[0.7rem] flex flex-col items-end"
                  style={{
                    opacity: frame >= t.send ? 1 : 0,
                    transformOrigin: "bottom right",
                    transform: `translateY(calc(${1 - slide} * ${BUBBLE_FROM})) scale(${1 - (1 - slide) * 0.1}, ${1 + (1 - slide) * 0.2})`,
                  }}
                >
                  <p className="ember-gradient kit-display rounded-[1.2rem] rounded-br-[0.3rem] px-[0.75rem] py-[0.35rem] text-[1.9rem] text-background shadow-[0_0.5rem_1.4rem_-0.2rem] shadow-ember-2/60">
                    {keyword}
                  </p>
                  <p className="mt-[0.25rem] grid justify-items-end text-[1rem] font-semibold text-foreground/90">
                    <span className="[grid-area:1/1]" style={{ opacity: receipt * (1 - read) }}>
                      Envoyé ✓
                    </span>
                    <span className="[grid-area:1/1] text-ember-1" style={{ opacity: read }}>
                      Lu
                    </span>
                  </p>
                </div>
                <div className="mt-[0.6rem] flex items-start gap-[0.45rem]">
                  <span className="ember-gradient size-[1.6rem] shrink-0 rounded-full" style={{ opacity: Math.min(1, dots * 3) }} />
                  <div className="relative w-[75%]">
                    {!replied && (
                      <span
                        className="absolute left-0 top-0 flex gap-[0.3rem] rounded-[1.2rem] rounded-tl-[0.3rem] border border-hairline bg-surface-raised px-[0.8rem] py-[0.65rem]"
                        style={{ opacity: Math.min(1, dots * 3), transformOrigin: "top left", transform: `scale(${0.6 + dots * 0.4})` }}
                      >
                        {[0, 1, 2].map((i) => {
                          const lift = Math.max(0, wave(frame - t.dots, DOTS_PERIOD, -i / 6));
                          return (
                            <span
                              key={i}
                              className="size-[0.55rem] rounded-full bg-foreground"
                              style={{ opacity: 0.35 + lift * 0.65, transform: `translateY(${-lift * 0.2}rem)` }}
                            />
                          );
                        })}
                      </span>
                    )}
                    <p
                      className="rounded-[1.2rem] rounded-tl-[0.3rem] border border-ember-1/40 bg-surface-raised px-[0.8rem] py-[0.55rem] text-[1.05rem] font-semibold leading-[1.3] shadow-xl shadow-black/40"
                      style={{ opacity: replied ? 1 : 0, transformOrigin: "top left", transform: `scale(${0.8 + reply * 0.2})` }}
                    >
                      {line}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-[0.6rem] mt-[0.3rem] flex items-center gap-[0.4rem]">
              <p className="flex h-[2.3rem] flex-1 items-center rounded-full border border-hairline bg-surface px-[0.8rem] text-[1.05rem]">
                <span className="font-bold tracking-wide">{draft}</span>
                <span className="mx-[0.05rem] h-[1.2rem] w-[0.1rem] rounded-full bg-ember-1" style={{ opacity: caret ? 1 : 0 }} />
                {!draft && <span className="text-muted">Message…</span>}
              </p>
              <span
                className={`flex size-[2.3rem] items-center justify-center rounded-full ${draft ? "ember-gradient text-background" : "bg-surface-raised text-faint"}`}
                style={{ transform: `scale(${1 - press * 0.15})` }}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="size-[1.1rem]"
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

            {/* Le clavier, sous l'interface d'Instagram : la touche tapée s'allume. */}
            <div className="mt-[0.7rem] flex flex-1 flex-col gap-[0.25rem] bg-surface px-[0.25rem] pt-[0.4rem]">
              {KEY_ROWS.map((row) => (
                <div key={row} className="flex justify-center gap-[0.2rem]">
                  {[...row].map((key) => {
                    const lit = typing && keyword[count - 1].toUpperCase() === key;
                    return (
                      <span
                        key={key}
                        className={`flex h-[1.6rem] w-[2rem] items-center justify-center rounded-[0.3rem] text-[1rem] font-semibold ${lit ? "ember-gradient text-background" : "bg-surface-raised text-foreground/70"}`}
                        style={{ transform: `scale(${lit ? 1.12 : 1})` }}
                      >
                        {key}
                      </span>
                    );
                  })}
                </div>
              ))}
              <span className="mx-auto h-[1.6rem] w-[60%] rounded-[0.3rem] bg-surface-raised" />
            </div>
          </div>
        </IphoneFrame>
      </div>
    </div>
  );
}
