import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { demoShowcaseOrder } from "@/lib/collect/demo/data";
import { heroRelay } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu/format";
import { ease, progress, wave } from "../motion.ts";

/*
 * Le relais du hero de menu.ominin.com, monté image par image : la table 12
 * remplit son panier, le total monte, « Payée » se tamponne, la carte se
 * resserre, et le ticket monte de l'imprimante de la cuisine, posée au pied
 * de la toile (sous la zone de texte du Reel, elle n'y porte que du décor).
 * La pastille se pose à cheval sur le haut du ticket. Mêmes données et
 * mêmes jetons que le site, aux tailles d'un téléphone.
 */

const order = demoShowcaseOrder();
const [readyNow, readyNext] = heroRelay.ready.split(/(?<=\.)\s/);
const readySeconds = Number(readyNow.match(/\d+/)![0]);

/* Chorégraphie écrite pour une scène de BASE images, rejouée à l'échelle
   de la durée réelle : tout se pose et respire, de 90 à 180 images. */
const BASE = 150;
const AT = { printer: 0, card: 2, lines: 5, lineGap: 4, stamp: 30, bar: 32, fold: 48, feed: 54, ready: 82 };
const DROP = 8;
const FOLD = 16;
const FEED = 24;
/* Après l'impression, le papier monte encore de CREEP px jusqu'à la fin. */
const CREEP = 24;

/* Plats de la carte, en rem : leur hauteur se replie quand la commande part. */
const LINE_REM = 2.6;
const LINE_GAP_REM = 0.35;
const LINES_TOP_REM = 0.6;
const LINES_REM = LINES_TOP_REM + order.lines.length * LINE_REM + (order.lines.length - 1) * LINE_GAP_REM;
/* Haut de l'imprimante au-dessus du bas de la zone sûre, et hauteur de son corps, en rem. */
const PRINTER_REM = 2;
const PRINTER_BODY_REM = 14;

const ink = "#1c1712";
const paper = "#f3ebdd";

export function MenuRelay({ loop }: { loop: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame * BASE) / loop;
  const pop = (at: number, damping: number, stiffness: number, mass = 1) =>
    spring({ frame: Math.max(0, t - at), fps, config: { damping, stiffness, mass } });
  const float = (phase: number) => wave(frame, loop / 2, phase);

  const machine = pop(AT.printer, 18, 110);
  const enter = pop(AT.card, 16, 140);
  const landAt = (i: number) => AT.lines + i * AT.lineGap;
  /* Le total suit les plats posés, d'un saut à chaque plat. */
  const posed = order.lines.filter((_, i) => t >= landAt(i) + DROP / 2);
  const total = posed.reduce((sum, line) => sum + line.price, 0);
  const bump = posed.length ? interpolate(t - landAt(posed.length - 1) - DROP / 2, [0, 2, 8], [0, 1, 0], { extrapolateRight: "clamp" }) : 0;
  const stamp = pop(AT.stamp, 8, 280, 0.6);
  const hit = interpolate(t, [AT.stamp, AT.stamp + 2, AT.stamp + 12], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = 1 - progress(t, AT.stamp, 20);
  const ring = progress(t, AT.stamp + 1, 16);
  const fold = progress(t, AT.fold, FOLD);
  const feed = progress(t, AT.feed, FEED, (x) => x * x * (3 - 2 * x));
  const printing = t >= AT.feed && t < AT.feed + FEED;
  const creep = progress(t, AT.feed + FEED, BASE - AT.feed - FEED, (x) => x);
  const ready = pop(AT.ready, 13, 170);
  const tick = progress(t, AT.ready + 4, 10);
  const count = Math.round(progress(t, AT.ready, 16) * readySeconds);
  const pulse = (t - AT.ready - 16) / 30 - Math.floor((t - AT.ready - 16) / 30);

  return (
    <div className="relative min-h-[24rem] flex-1">
      <div
        className="relative rounded-[1.8rem] border border-hairline bg-surface p-[0.75rem] shadow-2xl shadow-black/50"
        style={{
          opacity: Math.min(1, enter * 2),
          transformOrigin: "50% 0",
          transform: [
            `translateY(${((1 - fold) * LINES_REM) / 2}rem)`,
            `translateY(${(1 - enter) * 100 + hit * 10 + float(0) * 5}px)`,
            `scale(${0.96 + enter * 0.04})`,
            `rotate(${-0.5 + hit * 0.4}deg)`,
          ].join(" "),
        }}
      >
        <p className="flex items-center gap-[0.35rem] text-[0.95rem] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="size-[0.32rem] rounded-full bg-ember-1" style={{ opacity: 0.4 + 0.6 * Math.abs(wave(frame, 30)) }} />
          {heroRelay.phoneLabel}
        </p>
        <p className="kit-display mt-[0.3rem] text-[1.7rem]">{order.restaurant}</p>

        <div className="overflow-hidden" style={{ height: `${LINES_REM * (1 - fold)}rem` }}>
          <ul className="flex flex-col" style={{ paddingTop: `${LINES_TOP_REM}rem`, gap: `${LINE_GAP_REM}rem` }}>
            {order.lines.map((line, i) => {
              const drop = progress(t, landAt(i), DROP);
              const out = progress(t, AT.fold + i * 2, 10);
              return (
                <li
                  key={line.id}
                  className="flex items-center gap-[0.55rem] rounded-[1rem] border border-hairline bg-background/60 pl-[0.3rem] pr-[0.75rem]"
                  style={{
                    height: `${LINE_REM}rem`,
                    opacity: Math.min(1, drop * 2.5) * (1 - out),
                    transformOrigin: "50% 0",
                    transform: `translateY(${(1 - drop) * 40 - out * 24}px) scale(${0.96 + drop * 0.04}, ${1 - out * 0.3})`,
                  }}
                >
                  {line.image && <Img src={line.image} className="size-[2.1rem] shrink-0 rounded-[0.7rem] object-cover" />}
                  <span className="min-w-0 flex-1 truncate text-[1.05rem] font-semibold">{line.name}</span>
                  <span className="text-[1.05rem] font-semibold tabular-nums">{formatPrice(line.price)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative mt-[0.5rem] flex items-center justify-between rounded-[1rem] bg-background/60 px-[0.75rem] py-[0.35rem]">
          <span className="text-[0.95rem] text-muted">Total</span>
          <span className="kit-display origin-right text-[2.1rem] tabular-nums" style={{ transform: `scale(${1 + bump * 0.08})` }}>
            {formatPrice(total)}
          </span>
          {/* Le tampon tombe entre « Total » et le montant : impact, rebond, onde, braise. */}
          <span
            className="absolute left-[24%] top-1/2 rounded-[0.5rem] border-[0.14rem] border-ember-2 bg-ember-2/15 px-[0.55rem] py-[0.08rem] text-[1.25rem] font-extrabold uppercase tracking-[0.14em] text-ember-2"
            style={{
              opacity: progress(t, AT.stamp, 3),
              transform: `translateY(-50%) rotate(${interpolate(stamp, [0, 1], [-20, -8])}deg) scale(${interpolate(stamp, [0, 1], [1.7, 1])})`,
              boxShadow: `0 0 ${0.5 + glow * 1.6}rem color-mix(in oklab, var(--ember-2) ${25 + glow * 50}%, transparent)`,
            }}
          >
            <span
              className="absolute -inset-[0.14rem] rounded-[0.5rem] border-[0.14rem] border-ember-2"
              style={{ opacity: t > AT.stamp ? (1 - ring) * 0.7 : 0, transform: `scale(${1 + ring * 0.8})` }}
            />
            {heroRelay.stamp}
          </span>
        </div>
        <div className="mt-[0.45rem] h-[0.14rem] overflow-hidden rounded-full bg-hairline">
          <div className="ember-gradient h-full origin-left rounded-full" style={{ transform: `scaleX(${progress(t, AT.bar, 14)})` }} />
        </div>
      </div>

      {/* Le ticket monte de la fente, déjà imprimé, bord d'attaque dentelé ;
          la pastille voyage avec lui. Rien ne dépasse sous la fente. */}
      <div className="absolute inset-x-0" style={{ bottom: `${PRINTER_REM}rem`, clipPath: "inset(-100rem -2rem 0 -2rem)" }}>
        <div style={{ transform: `translateY(calc(${(1 - feed) * 100}% + ${(1 - creep) * CREEP}px))` }}>
          <div
            className="px-[1.2rem] pb-[0.8rem] pt-[2.6rem] font-mono"
            style={{
              background: `linear-gradient(to top, color-mix(in oklab, var(--ember-2) ${printing ? 22 : 10}%, ${paper}), ${paper} 18%)`,
              color: ink,
              paddingBottom: `calc(0.8rem + ${CREEP}px)`,
              mask: "radial-gradient(circle at 50% 0, transparent 0.17rem, #000 0.18rem) 50% 0 / 0.6rem 100% repeat-x",
            }}
          >
            <p className="text-[0.95rem] uppercase tracking-[0.18em] opacity-60">{heroRelay.ticket.printer}</p>
            <p className="kit-display mt-[0.15rem] text-[2.4rem]">{heroRelay.ticket.label}</p>
            <p className="mt-[0.15rem] text-[0.95rem] font-bold uppercase">{heroRelay.ticket.detail}</p>
            <div className="mt-[0.5rem] border-t-2 border-dashed pt-[0.5rem] text-[0.95rem] leading-[1.35]" style={{ borderColor: `${ink}4d` }}>
              {order.lines.map((line) => (
                <p key={line.id} className="whitespace-nowrap">1 × {line.name}</p>
              ))}
            </div>
          </div>

          <div
            className="absolute left-0 top-0 flex items-center gap-[0.6rem] rounded-[1.4rem] bg-foreground py-[0.55rem] pl-[0.55rem] pr-[1.1rem] text-background shadow-[0_20px_40px_-12px_rgba(0,0,0,0.55)]"
            style={{
              opacity: Math.min(1, ready * 1.6),
              transformOrigin: "0 50%",
              transform: `translateY(-55%) translateY(${(1 - ready) * 30 + float(0.7) * 3}px) scale(${0.9 + ready * 0.1})`,
            }}
          >
            <span className="ember-gradient relative flex size-[1.9rem] shrink-0 items-center justify-center rounded-full">
              <span
                className="absolute inset-0 rounded-full border-[0.1rem] border-ember-1"
                style={{ opacity: t > AT.ready + 16 ? (1 - pulse) * 0.6 : 0, transform: `scale(${1 + pulse * 0.9})` }}
              />
              <svg viewBox="0 0 24 24" className="size-[1.1rem]" fill="none" stroke="var(--background)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tick} />
              </svg>
            </span>
            <span>
              <span className="block text-[1.2rem] font-extrabold leading-[1.15] tabular-nums">{readyNow.replace(/\d+/, String(count))}</span>
              <span className="block text-[0.95rem] leading-[1.3] opacity-75">{readyNext}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Imprimante cuisine : objet physique au pied de la toile, mêmes
          couleurs que sur le site ; elle vibre pendant l'impression. */}
      <div
        className="absolute -inset-x-[0.5rem] rounded-t-[1.6rem] border-t border-ember-2/50 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.7)]"
        style={{
          top: `calc(100% - ${PRINTER_REM}rem)`,
          height: `${PRINTER_BODY_REM}rem`,
          background: `linear-gradient(to bottom, #2a221b, ${ink} 30%, #0d0a08)`,
          transform: `translateY(${(1 - machine) * 400 + (printing ? wave(frame, 4) * 1.5 : 0)}px)`,
        }}
      >
        <div className="mx-[1rem] mt-[0.35rem] h-[0.2rem] rounded-full bg-black shadow-[0_1px_0_color-mix(in_oklab,var(--ember-2)_45%,transparent)]" />
        <div className="mx-[1rem] mt-[0.35rem] flex items-center justify-between text-[0.95rem] font-semibold uppercase tracking-[0.2em] text-[#fbf6ee]/75">
          {heroRelay.kitchenLabel}
          <span
            className="size-[0.4rem] rounded-full bg-ember-1 shadow-[0_0_0.6rem_var(--ember-1)]"
            style={{ opacity: printing ? 0.35 + 0.65 * Math.abs(wave(frame, 8)) : 0.5 + 0.5 * Math.abs(wave(frame, 40)) }}
          />
        </div>
        <div
          className="mx-[1rem] mt-[1.2rem] h-[5rem] rounded-[1rem] opacity-60"
          style={{ background: "repeating-linear-gradient(to bottom, #000 0 0.2rem, transparent 0.2rem 0.55rem)" }}
        />
      </div>
    </div>
  );
}
