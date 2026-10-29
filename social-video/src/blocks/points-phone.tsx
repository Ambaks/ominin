import { Easing, Img, spring, staticFile, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import type { SocialBrand } from "../../../frontend/lib/social/brands.ts";
import { SCREENS } from "../../../frontend/lib/social/screens.ts";
import { progress, wave } from "../motion.ts";
import { PointsTicket } from "./points-ticket.tsx";

/*
 * Le téléphone du client, qui monte du bas de la toile et la déborde : sur
 * l'accueil de l'offre, assombri, un volet flottant porte les points. Ils
 * se cochent l'un après l'autre et le rail de l'en-tête se remplit d'un
 * segment à chaque coche ; au dernier, le bouton s'allume, prend sa coche,
 * et le ticket de cuisine s'imprime sous le volet. Ensuite, jusqu'à la fin,
 * une onde descend les coches puis un reflet passe sur le bouton, pendant
 * que le ticket se balance, que le téléphone dérive vers le haut et que
 * l'écran avance. Rien d'autre que les points n'est écrit : la preuve reste
 * neutre.
 */

/** L'écran continue sous le volet, au-delà du bas de la toile. */
const TAIL = 480;
/** Hauteur d'un point (deux lignes y tiennent), plus grande à deux points : le volet garde son poids. */
const ROW = { two: 168, three: 136 };
const ROW_GAP = 14;
/** Montée lente du téléphone sur toute la scène, en px. */
const DRIFT = 28;
/** Départ du téléphone, sous la toile, en px. */
const RISE = 1250;
/** Avancée de l'écran sur toute la scène, en part de sa taille. */
const SCREEN_PUSH = 0.06;
/* La flaque de braise, centrée sur le haut du téléphone. */
const GLOW = { width: 1200, height: 900 };
/** Retard du volet sur le téléphone, à l'entrée, en px. */
const SHEET_LAG = 140;
const AT = { phone: 0, sheetLag: 3, rows: 8, rowGap: 3, check: 18, checkGap: 7, tick: 7, light: 6, ticket: 6, settle: 10, cycle: 48, ping: 8, pingLife: 14, sheen: 20 };

const check = (
  <path d="M15 27l8 8 15-17" fill="none" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} />
);

export function PointsPhone({ brand, points, frame, end }: { brand: SocialBrand; points: string[]; frame: number; end: number }) {
  const { fps } = useVideoConfig();
  const screen = SCREENS.find((s) => s.brand === brand && !s.focus) ?? SCREENS[0];
  const pop = (at: number, damping: number) => spring({ frame: frame - at, fps, config: { damping, stiffness: 140 } });
  const enter = pop(AT.phone, 18);
  const sheet = pop(AT.phone + AT.sheetLag, 20);
  const checkAt = (index: number) => AT.check + index * AT.checkGap;
  const complete = checkAt(points.length - 1) + AT.tick;
  const lit = progress(frame, complete, AT.light);
  const sealBump = Math.sin(progress(frame, complete, 12) * Math.PI);
  const sealTick = progress(frame, complete + 2, AT.tick + 1);
  /* Après la coche du bouton, un cycle : l'onde descend les coches, puis le reflet passe. */
  const after = frame - complete - AT.settle;
  const wake = (offset: number, life: number) => (after < offset ? 1 : progress((after - offset) % AT.cycle, 0, life));
  const sheen = wake(points.length * AT.ping + 6, AT.sheen);
  const sheetShift = (1 - sheet) * SHEET_LAG;
  const drift = progress(frame, AT.phone, end - AT.phone, Easing.inOut(Easing.sin)) * DRIFT;

  return (
    <div className="relative flex justify-center">
      <div
        className="absolute left-1/2 -z-10 -translate-x-1/2 rounded-full"
        style={{
          top: -GLOW.height / 2,
          width: GLOW.width,
          height: GLOW.height,
          background: "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 42%, transparent), transparent)",
          opacity: enter * (0.8 + wave(frame, end) * 0.2),
        }}
      />
      <div
        style={{
          transformOrigin: "50% 0",
          filter: "drop-shadow(0 -24px 60px rgb(0 0 0 / 0.6))",
          transform: `perspective(2400px) translateY(${(1 - enter) * RISE - drift}px) rotateX(${(1 - enter) * 18}deg)`,
        }}
      >
        <IphoneFrame>
          <div className="relative" style={{ height: `calc(100cqh + ${TAIL}px)` }}>
            <Img
              src={staticFile(`screens/${screen.id}.jpg`)}
              className="absolute inset-x-0 top-0 block w-full origin-top"
              style={{ transform: `scale(${1 + progress(frame, 0, end, (t) => t) * SCREEN_PUSH})` }}
            />
            {/* L'accueil passe derrière le volet : sa photo reste nette en haut, le reste se floute et s'éteint sous le volet. */}
            <div className="absolute inset-0 bg-black/35" />
            <div
              className="absolute inset-0 backdrop-blur-[10px]"
              style={{ maskImage: "linear-gradient(to bottom, transparent 160px, black 480px)" }}
            />
            <div
              className="absolute inset-x-0 bottom-0"
              style={{ height: TAIL + 60, background: "linear-gradient(to bottom, transparent, rgb(0 0 0 / 0.92) 60px)" }}
            />
            <PointsTicket points={points} frame={frame} at={complete + AT.ticket} end={end} bottom={TAIL} lag={sheetShift} />
            <div
              className="absolute inset-x-[14px] rounded-[44px] border border-hairline bg-surface px-[22px] pb-[22px] pt-[16px] shadow-[0_-20px_60px_-10px_rgb(0_0_0/0.6)]"
              style={{ bottom: TAIL, transform: `translateY(${sheetShift}px)` }}
            >
              <div className="mx-auto h-[8px] w-[96px] rounded-full bg-hairline" />
              {/* L'en-tête : la vignette du restaurant, puis le rail des points. */}
              <div className="mt-[14px] flex h-[64px] items-center gap-[24px] px-[6px]">
                <span className="size-[64px] shrink-0 overflow-hidden rounded-[18px]">
                  {/* Le haut de la capture seulement : la photo, sans le nom en miniature. */}
                  <Img src={staticFile(`screens/${screen.id}.jpg`)} className="size-full origin-top scale-[2.2] object-cover object-top" />
                </span>
                <span className="flex flex-1 gap-[10px]">
                  {points.map((point, index) => (
                    <span key={point} className="h-[10px] flex-1 overflow-hidden rounded-full bg-hairline">
                      <span
                        className="ember-gradient block size-full origin-left rounded-full"
                        style={{ transform: `scaleX(${progress(frame, checkAt(index), AT.light)})` }}
                      />
                    </span>
                  ))}
                </span>
              </div>
              <ul className="mt-[20px] flex flex-col" style={{ gap: ROW_GAP }}>
                {points.map((point, index) => {
                  const rise = pop(AT.rows + index * AT.rowGap, 12);
                  const fill = progress(frame, checkAt(index), AT.light);
                  const bump = Math.sin(progress(frame, checkAt(index), AT.tick) * Math.PI);
                  const tick = progress(frame, checkAt(index) + 1, AT.tick);
                  const ping = wake(index * AT.ping, AT.pingLife);
                  const flash = Math.sin(ping * Math.PI);
                  return (
                    <li
                      key={point}
                      className="flex items-center gap-[20px] rounded-[30px] border px-[22px]"
                      style={{
                        height: points.length < 3 ? ROW.two : ROW.three,
                        opacity: Math.min(1, rise * 4),
                        transform: `translateY(${(1 - rise) * 56}px)`,
                        borderColor: `color-mix(in oklab, var(--ember-2) ${fill * 30 + flash * 55}%, var(--hairline))`,
                        background: `color-mix(in oklab, var(--ember-2) ${flash * 14}%, color-mix(in oklab, var(--background) 70%, transparent))`,
                        boxShadow: "inset 0 1.5px 0 rgb(255 255 255 / 0.08), 0 18px 36px -18px rgb(0 0 0 / 0.55)",
                      }}
                    >
                      <span
                        className="relative flex size-[58px] shrink-0 items-center justify-center rounded-full border-[3px] border-ember-2/60"
                        style={{ transform: `scale(${1 + bump * 0.22})` }}
                      >
                        <span
                          className="absolute -inset-[3px] rounded-full border-[3px] border-ember-2"
                          style={{ opacity: (1 - ping) * 0.9, transform: `scale(${1 + ping * 1.1})` }}
                        />
                        <span className="ember-gradient absolute -inset-[3px] rounded-full shadow-[0_0_18px_-4px_var(--ember-2)]" style={{ opacity: fill }} />
                        <svg viewBox="0 0 52 52" className="relative size-full stroke-background" style={{ strokeDashoffset: 1 - tick, opacity: tick > 0 ? 1 : 0 }} aria-hidden>
                          {check}
                        </svg>
                      </span>
                      <span
                        className="text-balance text-[46px] font-bold leading-[1.08] tracking-[-0.015em]"
                        style={{ color: `color-mix(in oklab, var(--foreground) ${75 + fill * 25}%, transparent)` }}
                      >
                        {point}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {/* Le bouton du volet, éteint tant qu'un point reste à cocher. */}
              <div
                className="relative mt-[24px] h-[116px] overflow-hidden rounded-full border border-hairline bg-background/60"
                style={{
                  transform: `scale(${1 + sealBump * 0.035})`,
                  boxShadow: `0 34px 80px -24px color-mix(in oklab, var(--ember-2) ${lit * (55 + Math.sin(sheen * Math.PI) * 25)}%, transparent)`,
                }}
              >
                <div className="ember-gradient absolute inset-0" style={{ opacity: lit }} />
                <div
                  className="absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/40 to-transparent"
                  style={{ transform: `translateX(${-110 + sheen * 420}%) skewX(-18deg)` }}
                />
                <svg
                  viewBox="0 0 52 52"
                  className="absolute left-1/2 top-1/2 size-[96px] -translate-1/2 stroke-faint"
                  style={{ opacity: (1 - lit) * 0.6 }}
                  aria-hidden
                >
                  {check}
                </svg>
                <svg
                  viewBox="0 0 52 52"
                  className="absolute left-1/2 top-1/2 size-[96px] stroke-background"
                  style={{ transform: `translate(-50%, -50%) scale(${0.7 + sealTick * 0.3})`, strokeDashoffset: 1 - sealTick, opacity: sealTick > 0 ? 1 : 0 }}
                  aria-hidden
                >
                  {check}
                </svg>
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/6 to-transparent"
              style={{ transform: `translateX(${-120 + progress(frame, AT.phone, end - AT.phone, (t) => t) * 340}%) skewX(-20deg)` }}
            />
          </div>
        </IphoneFrame>
      </div>
    </div>
  );
}
