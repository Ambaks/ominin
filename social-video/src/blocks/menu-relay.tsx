import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { demoShowcaseOrder } from "@/lib/collect/demo/data";
import { heroRelay } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu/format";
import { progress, wave } from "../motion.ts";

/*
 * Le relais du hero de menu.ominin.com, monté image par image : la table 12
 * remplit son panier sous son total, « Payée » se tamponne, puis les plats
 * quittent la carte et tombent dans la fente de l'imprimante de la cuisine,
 * une lèvre au pied de la zone sûre ; le ticket en remonte, la pastille
 * compte les secondes, et l'imprimante détache le ticket, qui s'en libère.
 * Mêmes données et mêmes jetons que le site, aux tailles d'un téléphone.
 * Tout est placé en rem depuis le haut du relais, la fente en est le bas.
 */

const order = demoShowcaseOrder();
const [readyNow, readyNext] = heroRelay.ready.split(/(?<=\.)\s/);
const readySeconds = Number(readyNow.match(/\d+/)![0]);

/* Chorégraphie écrite pour une scène de BASE images, rejouée à l'échelle
   de la durée réelle : tout se pose et respire, de 90 à 180 images. */
const BASE = 150;
const AT = { card: 2, lines: 6, lineGap: 4, stamp: 30, bar: 32, send: 38, sendGap: 4, fold: 46, feed: 50, ready: 74, tear: 104, sheen: 118 };
const DROP = 8;
const LIFT = 4;
const FALL = 12;
const FOLD = 14;
const FEED = 26;
const COUNT = 40;
const SHEEN = 28;
const PULSE = 30;

/* Hauteur du relais, du haut de la carte à la fente. */
const RELAY_REM = 26.3;
/* Carte : marge, étiquette et nom, ligne du total, puis les plats. */
const PAD_REM = 0.7;
const HEAD_REM = PAD_REM + 1.5 + 0.2 + 2.2;
const TOTAL_REM = 0.6 + 3.1;
const LINES_TOP_REM = 0.5;
const LINE_REM = 3.3;
const LINE_GAP_REM = 0.35;
const LINES_REM = LINES_TOP_REM + order.lines.length * LINE_REM + (order.lines.length - 1) * LINE_GAP_REM;
/* Pleine, la carte se centre dans le relais ; repliée, elle remonte en haut. */
const CENTER_REM = (RELAY_REM - (HEAD_REM + TOTAL_REM + LINES_REM + PAD_REM)) / 2;
/* Ticket : papier sous la dernière ligne, dont TAIL_REM reste dans la fente
   jusqu'à la découpe, puis hauteur dont il s'en libère, dérive et
   inclinaison jusqu'à la fin. */
const MARGIN_REM = 1.1;
const TAIL_REM = 0.45;
const FREE_REM = 0.5;
const DRIFT_REM = 0.3;
const TILT = { torn: -2, end: -2.6 };
/* Lèvre de l'imprimante, centrée sur la fente. */
const LIP_REM = 0.7;

/* Le papier et l'encre du ticket du site. */
const ink = "#1c1712";
const paper = "#f3ebdd";
const teeth = (edge: "0" | "100%") => `radial-gradient(circle at 50% ${edge}, transparent 0.17rem, #000 0.18rem) 50% ${edge} / 0.6rem 51% repeat-x`;

export function MenuRelay({ loop }: { loop: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame * BASE) / loop;
  const pop = (at: number, damping: number, stiffness: number, mass = 1) =>
    spring({ frame: Math.max(0, t - at), fps, config: { damping, stiffness, mass } });
  const float = (phase: number) => wave(frame, loop / 2, phase);
  const flash = (at: number, length: number) => interpolate(t, [at, at + 2, at + length], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const enter = pop(AT.card, 16, 140);
  const landAt = (i: number) => AT.lines + i * AT.lineGap;
  /* Le total suit les plats posés, d'un saut à chaque plat. */
  const posed = order.lines.filter((_, i) => t >= landAt(i) + DROP / 2);
  const total = posed.reduce((sum, line) => sum + line.price, 0);
  const bump = posed.length ? flash(landAt(posed.length - 1) + DROP / 2, 8) : 0;
  const stamp = pop(AT.stamp, 8, 280, 0.6);
  const hit = flash(AT.stamp, 12);
  const glow = 1 - progress(t, AT.stamp, 20);
  const ring = progress(t, AT.stamp + 1, 16);
  const fold = progress(t, AT.fold, FOLD);
  const lowered = (1 - fold) * CENTER_REM;
  const feed = progress(t, AT.feed, FEED, (x) => x * x * (3 - 2 * x));
  const printing = t >= AT.send && t < AT.feed + FEED;
  const ready = pop(AT.ready, 11, 210);
  const tick = progress(t, AT.ready + 3, 10);
  /* Le compteur ralentit en fin de course : les dernières secondes se lisent. */
  const count = Math.max(1, Math.round(progress(t, AT.ready, COUNT, (x) => 1 - (1 - x) ** 3) * readySeconds));
  const pulse = (t - AT.ready - 16) / PULSE - Math.floor((t - AT.ready - 16) / PULSE);
  const tear = pop(AT.tear, 12, 180);
  const cut = flash(AT.tear, 14);
  const drift = progress(t, AT.tear + 10, BASE - AT.tear - 10, (x) => x);
  const sheen = progress(t, AT.sheen, SHEEN, (x) => x);
  /* La fente s'allume quand les plats y tombent, éclate à la découpe, puis respire. */
  const slot = Math.max(cut, printing ? 0.75 + 0.25 * Math.abs(wave(frame, 6)) : 0.35 + 0.4 * Math.abs(wave(frame, loop / 3)));

  return (
    <div className="relative" style={{ height: `${RELAY_REM}rem` }}>
      <div
        className="absolute inset-x-0 top-0 rounded-[1.8rem] border border-hairline bg-surface shadow-2xl shadow-black/40"
        style={{
          padding: `${PAD_REM}rem`,
          opacity: Math.min(1, enter * 2),
          transformOrigin: "50% 0",
          transform: [
            `translateY(calc(${lowered}rem + ${(1 - enter) * 100 + hit * 10 + float(0) * 6}px))`,
            `scale(${0.96 + enter * 0.04})`,
            `rotate(${hit * 0.4}deg)`,
          ].join(" "),
        }}
      >
        <p className="flex h-[1.5rem] items-center gap-[0.4rem] text-[1.15rem] font-semibold uppercase tracking-[0.1em] text-foreground/70">
          <span className="size-[0.4rem] rounded-full bg-ember-1" style={{ opacity: 0.4 + 0.6 * Math.abs(wave(frame, 30)) }} />
          {heroRelay.phoneLabel}
        </p>
        <p className="kit-display mt-[0.2rem] flex h-[2.2rem] items-center text-[1.95rem]">{order.restaurant}</p>

        <div className="relative mt-[0.6rem] flex h-[3.1rem] items-center justify-between rounded-[1.1rem] bg-background/60 px-[0.9rem]">
          <span className="text-[1.15rem] font-semibold text-foreground/70">Total</span>
          <span className="kit-display origin-right text-[2.5rem] tabular-nums" style={{ transform: `scale(${1 + bump * 0.08})` }}>
            {formatPrice(total)}
          </span>
          {/* Le tampon tombe entre « Total » et le montant : impact, rebond, onde, braise. */}
          <span
            className="absolute left-[22%] top-1/2 rounded-[0.55rem] border-[0.15rem] border-ember-2 bg-ember-2/15 px-[0.6rem] py-[0.08rem] text-[1.3rem] font-extrabold uppercase tracking-[0.14em] text-ember-2"
            style={{
              opacity: progress(t, AT.stamp, 3),
              transform: `translateY(-50%) rotate(${interpolate(stamp, [0, 1], [-20, -8])}deg) scale(${interpolate(stamp, [0, 1], [1.7, 1])})`,
              boxShadow: `0 0 ${0.5 + glow * 1.6}rem color-mix(in oklab, var(--ember-2) ${25 + glow * 50}%, transparent)`,
            }}
          >
            <span
              className="absolute -inset-[0.15rem] rounded-[0.55rem] border-[0.15rem] border-ember-2"
              style={{ opacity: t > AT.stamp ? (1 - ring) * 0.7 : 0, transform: `scale(${1 + ring * 0.8})` }}
            />
            {heroRelay.stamp}
          </span>
        </div>

        {/* La place des plats : elle se referme derrière eux quand ils partent. */}
        <div style={{ height: `${LINES_REM * (1 - fold)}rem` }} />
        <div className="absolute inset-x-[1.6rem] bottom-0 h-[0.14rem] overflow-hidden rounded-full bg-hairline">
          <div className="ember-gradient h-full origin-left rounded-full" style={{ transform: `scaleX(${progress(t, AT.bar, 14)})` }} />
        </div>

        {/* Les plats, sous le total : ils s'y posent, puis, payés, se
            soulèvent et tombent dans la fente, le dernier d'abord. */}
        {order.lines.map((line, i) => {
          const top = HEAD_REM + TOTAL_REM + LINES_TOP_REM + i * (LINE_REM + LINE_GAP_REM);
          const drop = progress(t, landAt(i), DROP);
          const sendAt = AT.send + (order.lines.length - 1 - i) * AT.sendGap;
          const lift = progress(t, sendAt, LIFT);
          const fall = progress(t, sendAt + LIFT, FALL, (x) => x * x);
          return (
            <div
              key={line.id}
              className="absolute flex items-center gap-[0.6rem] rounded-[1.1rem] border border-hairline bg-surface-raised pl-[0.35rem] pr-[0.8rem]"
              style={{
                top: `${top}rem`,
                left: `${PAD_REM}rem`,
                right: `${PAD_REM}rem`,
                height: `${LINE_REM}rem`,
                opacity: fall < 1 ? Math.min(1, drop * 3) : 0,
                boxShadow: `0 ${0.2 + lift * 0.8}rem ${0.4 + lift * 1.4}rem -0.4rem rgba(0,0,0,${lift * 0.45})`,
                transform: [
                  `translateY(calc(${(1 - drop) * 18 - lift * 10}px + ${fall * (RELAY_REM - top - lowered + 0.3)}rem))`,
                  `scale(${(0.97 + drop * 0.03) * (1 + lift * 0.03 - fall * 0.07)})`,
                  `rotate(${fall * (i % 2 ? 1.5 : -1.5)}deg)`,
                ].join(" "),
              }}
            >
              {line.image && <Img src={line.image} className="size-[2.6rem] shrink-0 rounded-[0.8rem] object-cover" />}
              <span className="min-w-0 flex-1 leading-[1.12]">
                <span className="block truncate text-[1.3rem] font-semibold">{line.name}</span>
                <span className="block text-[1.2rem] font-semibold tabular-nums text-foreground/65">{formatPrice(line.price)}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Le ticket monte de la fente, déjà imprimé, sa marge de pied restée
          dedans ; à la découpe il s'en libère et s'incline. La pastille
          voyage avec lui, droite. Rien ne dépasse sous la fente. */}
      <div className="absolute inset-x-0 bottom-0" style={{ clipPath: "inset(-100rem -3rem 0 -3rem)" }}>
        <div
          style={{
            transform: `translateY(calc(${(1 - feed) * 100}% + ${TAIL_REM * (1 - tear) - FREE_REM * tear - DRIFT_REM * drift}rem + ${float(0.35) * 4}px))`,
          }}
        >
          <div
            style={{
              transformOrigin: "50% 100%",
              transform: `rotate(${interpolate(tear, [0, 1], [0, TILT.torn]) + (TILT.end - TILT.torn) * drift}deg)`,
              filter: `drop-shadow(0 0 1px ${ink}59) drop-shadow(0 ${0.6 + tear * 0.6}rem ${0.8 + tear * 0.8}rem rgba(0,0,0,0.32))`,
            }}
          >
            <div
              className="relative overflow-hidden px-[1.1rem] pt-[2.3rem] font-mono"
              style={{
                background: `linear-gradient(to top, color-mix(in oklab, var(--ember-2) ${printing ? 22 : 8}%, ${paper}), ${paper} 18%)`,
                color: ink,
                paddingBottom: `${MARGIN_REM}rem`,
                mask: `${teeth("0")}, ${teeth("100%")}`,
              }}
            >
              <p className="text-[1.15rem] font-semibold uppercase leading-[1.25] tracking-[0.16em] opacity-70">{heroRelay.ticket.printer}</p>
              <div className="mt-[0.15rem] flex items-baseline justify-between">
                <p className="kit-display text-[2.6rem] leading-none">{heroRelay.ticket.label}</p>
                <p className="text-[1.15rem] font-bold uppercase">{heroRelay.ticket.detail}</p>
              </div>
              <div className="mt-[0.45rem] border-t-2 border-dashed pt-[0.45rem] text-[1.2rem] font-medium leading-[1.35]" style={{ borderColor: `${ink}4d` }}>
                {order.lines.map((line) => (
                  <p key={line.id} className="whitespace-nowrap">1 × {line.name}</p>
                ))}
              </div>
              {/* Un reflet passe sur le papier détaché. */}
              <div
                className="absolute inset-0"
                style={{
                  opacity: Math.sin(sheen * Math.PI),
                  background: "linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)",
                  backgroundSize: "250% 100%",
                  backgroundPosition: `${100 - sheen * 100}% 0`,
                }}
              />
            </div>
          </div>

          <div
            className="absolute left-0 top-0 flex items-center gap-[0.6rem] rounded-[1.6rem] bg-foreground py-[0.5rem] pl-[0.5rem] pr-[1.2rem] text-background shadow-[0_20px_40px_-12px_rgba(0,0,0,0.55)]"
            style={{
              opacity: t >= AT.ready ? 1 : 0,
              transformOrigin: "0 50%",
              transform: `translateY(-50%) translateY(${(1 - ready) * 24 + float(0.7) * 3}px) scale(${0.7 + ready * 0.3})`,
            }}
          >
            <span className="relative flex size-[2.2rem] shrink-0 items-center justify-center rounded-full bg-background">
              <span
                className="absolute inset-0 rounded-full border-[0.1rem] border-ember-1"
                style={{ opacity: t > AT.ready + 16 ? (1 - pulse) * 0.7 : 0, transform: `scale(${1 + pulse})` }}
              />
              <svg viewBox="0 0 24 24" className="size-[1.25rem]" fill="none" stroke="var(--ember-2)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tick} />
              </svg>
            </span>
            <span>
              <span className="block text-[1.4rem] font-extrabold leading-[1.15] tabular-nums">{readyNow.replace(/\d+/, String(count))}</span>
              <span className="block text-[1.15rem] font-medium leading-[1.3] opacity-80">{readyNext}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Imprimante cuisine : une lèvre aux jetons de la toile, sa fente
          éclairée de braise ; elle vibre en imprimant, sursaute à la découpe. */}
      <div
        className="absolute -inset-x-[1rem] rounded-full border border-hairline bg-surface-raised shadow-[0_0.6rem_1.4rem_-0.4rem_rgba(0,0,0,0.45)]"
        style={{
          top: `calc(100% - ${LIP_REM / 2}rem)`,
          height: `${LIP_REM}rem`,
          transform: `translateY(${(printing ? wave(frame, 4) * 1.5 : 0) + cut * 3}px)`,
        }}
      >
        <div
          className="absolute inset-x-[1.2rem] top-1/2 h-[0.2rem] -translate-y-1/2 rounded-full bg-black"
          style={{ boxShadow: `0 -0.2rem 1rem color-mix(in oklab, var(--ember-1) ${slot * 80}%, transparent)` }}
        />
        <span
          className="absolute right-[0.45rem] top-1/2 size-[0.32rem] -translate-y-1/2 rounded-full bg-ember-1"
          style={{ boxShadow: "0 0 0.6rem var(--ember-1)", opacity: slot }}
        />
      </div>
    </div>
  );
}
