import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { QrCode } from "@/components/pitch/qr-code";
import { qrShowcase } from "@/lib/landing-data";
import { menuPrintUrl } from "@/lib/site";
import { progress, wave } from "../motion.ts";

/*
 * Le Cachet du site, la carte QR de la table, posée en largeur : neutre au
 * sujet du titre, il signe le produit. Le texte à gauche, hors de la colonne
 * d'icônes ; le code à droite. La carte monte du bas avec un léger
 * dépassement, le viseur se cale, puis le faisceau balaie le code et la
 * carte flotte jusqu'à la fin.
 */

/* Code réel et scannable : le menu démo, table 12. Calculé une fois. */
const QR = <QrCode value={`${menuPrintUrl}${qrShowcase.qrPath}`} label={qrShowcase.qrAlt} className="block size-full text-black" />;

/* Images où chaque temps commence. */
const AT = { card: 8, corners: 18, badge: 24, beam: 28 };
/* Aller-retour du faisceau, en images. */
const BEAM_PERIOD = 44;
/* Viseur : écart au code en rem, du cadrage large au calage. */
const CORNER_GAP = { from: 0.9, to: 0.28, breathe: 0.05 };
const CORNERS = [
  "left-0 top-0 rounded-tl-[0.35rem] border-l-[0.12rem] border-t-[0.12rem]",
  "right-0 top-0 rounded-tr-[0.35rem] border-r-[0.12rem] border-t-[0.12rem]",
  "bottom-0 left-0 rounded-bl-[0.35rem] border-b-[0.12rem] border-l-[0.12rem]",
  "bottom-0 right-0 rounded-br-[0.35rem] border-b-[0.12rem] border-r-[0.12rem]",
];

export function HookCachet() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const card = spring({ frame: frame - AT.card, fps, config: { damping: 20, stiffness: 150 } });
  const lock = spring({ frame: frame - AT.corners, fps, config: { damping: 12, stiffness: 160 } });
  const badge = spring({ frame: frame - AT.badge, fps, config: { damping: 10, stiffness: 260 } });
  const gap = interpolate(lock, [0, 1], [CORNER_GAP.from, CORNER_GAP.to]) + wave(frame, durationInFrames / 2) * CORNER_GAP.breathe;
  const beam = 0.5 - 0.5 * Math.cos(((frame - AT.beam) / BEAM_PERIOD) * 2 * Math.PI);

  return (
    <div
      className="ember-gradient relative w-[25.5rem] rounded-[1.4rem] p-[0.08rem] shadow-[0_50px_60px_-20px_color-mix(in_oklab,var(--ember-2)_25%,transparent),0_30px_60px_-20px_rgba(0,0,0,0.8)]"
      style={{
        opacity: Math.min(1, card * 3),
        transform: [
          `translateY(${(1 - card) * 640 + wave(frame, durationInFrames) * 6}px)`,
          `rotate(${interpolate(card, [0, 1], [6, -2]) + wave(frame, durationInFrames, 0.25) * 0.5}deg)`,
        ].join(" "),
      }}
    >
      <div className="flex items-center gap-[1rem] rounded-[1.32rem] bg-surface-raised p-[1rem]">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-[0.25rem]">
          <p className="ember-text text-[0.95rem] font-bold uppercase tracking-[0.2em]">{qrShowcase.sticker.brand}</p>
          <p className="kit-display text-[1.15rem] text-foreground/80">{qrShowcase.sticker.restaurant}</p>
          <p className="kit-display text-[2.6rem]">{qrShowcase.sticker.table}</p>
          <span
            className="ember-gradient mt-[0.6rem] rounded-full px-[0.6rem] py-[0.25rem] text-[1rem] font-bold text-background shadow-[0_10px_30px_-10px_var(--ember-2)]"
            style={{ opacity: progress(frame, AT.badge, 3), transform: `scale(${0.8 + badge * 0.2})`, transformOrigin: "left center" }}
          >
            {qrShowcase.badge}
          </span>
        </div>

        <div className="relative shrink-0">
          <div className="absolute" style={{ inset: `-${gap}rem`, opacity: Math.min(1, lock * 2) }}>
            {CORNERS.map((corner) => (
              <span key={corner} className={`absolute size-[1rem] border-ember-1 ${corner}`} />
            ))}
          </div>
          <div className="rounded-[0.6rem] bg-white p-[0.4rem]">
            <div className="relative size-[11rem] overflow-hidden">
              {QR}
              <div className="absolute inset-x-0 h-[1.6rem] -translate-y-1/2" style={{ top: `${beam * 100}%`, opacity: progress(frame, AT.beam, 6) }}>
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-ember-2/25 to-transparent" />
                <div className="ember-gradient absolute inset-x-0 top-1/2 h-[0.12rem] -translate-y-1/2 shadow-[0_0_18px_4px_var(--ember-2)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
