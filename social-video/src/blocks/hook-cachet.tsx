import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { QrCode } from "@/components/pitch/qr-code";
import { qrShowcase } from "@/lib/landing-data";
import { menuPrintUrl } from "@/lib/site";
import { progress, wave } from "../motion.ts";

/*
 * Le Cachet du site, la carte QR de la table, posée en largeur : neutre au
 * sujet du titre, il signe le produit. Le texte à gauche, hors de la colonne
 * d'icônes ; le code à droite. La carte jaillit du bas et se pose d'aplomb
 * avec un rebond amorti, le viseur se cale, le faisceau balaie le code ; puis
 * la carte flotte et pivote doucement sous la lumière, et le bouton appelle
 * au scan jusqu'à la fin.
 */

/* Code réel et scannable : le menu démo, table 12. Calculé une fois. */
const QR = <QrCode value={`${menuPrintUrl}${qrShowcase.qrPath}`} label={qrShowcase.qrAlt} className="block size-full text-black" />;
/* « Table 12 » en deux temps : le mot, puis le numéro en grand. */
const [TABLE_WORD, TABLE_NUMBER] = [qrShowcase.sticker.table.replace(/\s*\S+$/, ""), qrShowcase.sticker.table.match(/\S+$/)![0]];

/* Temps après l'entrée de la carte, en images. */
const AT = { corners: 7, beam: 11, call: 30 };
/* Entrée : montée en px, inclinaison de départ en degrés ; repos d'aplomb. */
const RISE = { from: 760, tilt: 6 };
/* Vie posée : lacet de début et de fin en degrés, flottement en px. */
const TURN = { from: 3, to: -3, float: 6 };
/* Aller-retour du faisceau en images, et sa course dans le code (part de la hauteur). */
const BEAM = { period: 40, margin: 0.08 };
/* Appel du bouton : période en images, durée de l'onde, rebond, portée
 * de l'onde en px et son intensité de départ en %. */
const CALL = { every: 42, ring: 20, bump: 0.07, spread: 26, glow: 45 };
/* Viseur : écart au code en rem, du cadrage large au calage. */
const CORNER_GAP = { from: 1.1, to: 0.3, breathe: 0.06 };
const CORNERS = [
  "left-0 top-0 rounded-tl-[0.4rem] border-l-[0.14rem] border-t-[0.14rem]",
  "right-0 top-0 rounded-tr-[0.4rem] border-r-[0.14rem] border-t-[0.14rem]",
  "bottom-0 left-0 rounded-bl-[0.4rem] border-b-[0.14rem] border-l-[0.14rem]",
  "bottom-0 right-0 rounded-br-[0.4rem] border-b-[0.14rem] border-r-[0.14rem]",
];

/** start : image d'entrée de la carte ; width : sa largeur en px. */
export function HookCachet({ start, width }: { start: number; width: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const card = spring({ frame: frame - start, fps, config: { damping: 19, stiffness: 170 } });
  const lock = spring({ frame: frame - start - AT.corners, fps, config: { damping: 11, stiffness: 180 } });
  const gap = interpolate(lock, [0, 1], [CORNER_GAP.from, CORNER_GAP.to]) + wave(frame, durationInFrames / 2) * CORNER_GAP.breathe;
  const sweep = 0.5 - 0.5 * Math.cos(((frame - start - AT.beam) / BEAM.period) * 2 * Math.PI);
  const beam = BEAM.margin + sweep * (1 - 2 * BEAM.margin);

  const since = frame - start - AT.call;
  const call = since < 0 ? 1 : (since % CALL.every) / CALL.ring;
  const ring = Math.min(1, call);
  const bump = call < 1 ? Math.sin(call * Math.PI) * CALL.bump : 0;

  const yaw = interpolate(progress(frame, 0, durationInFrames, Easing.inOut(Easing.sin)), [0, 1], [TURN.from, TURN.to]);

  return (
    <div
      className="ember-gradient rounded-[1.6rem] p-[0.1rem] shadow-[0_70px_90px_-30px_color-mix(in_oklab,var(--ember-2)_45%,transparent),0_40px_70px_-25px_rgba(0,0,0,0.6)]"
      style={{
        width,
        opacity: Math.min(1, card * 4),
        transform: [
          `translateY(${(1 - card) * RISE.from + wave(frame, durationInFrames / 2) * TURN.float}px)`,
          "perspective(2400px)",
          `rotateY(${yaw}deg)`,
          `rotate(${(1 - card) * RISE.tilt}deg)`,
        ].join(" "),
      }}
    >
      <div className="relative flex gap-[1rem] overflow-hidden rounded-[1.5rem] bg-surface-raised p-[1.2rem]">
        {/* Reflet de la lumière, qui glisse avec le pivot. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.08) 48%, transparent 62%)",
            backgroundSize: "260% 100%",
            backgroundPosition: `${interpolate(yaw, [TURN.to, TURN.from], [100, 0])}% 0`,
          }}
        />
        <div className="relative flex min-w-0 flex-1 flex-col items-start justify-center">
          <p className="ember-text text-[1.15rem] leading-[1.3] font-bold uppercase tracking-[0.18em]">{qrShowcase.sticker.brand}</p>
          <p className="kit-display mt-[0.25rem] text-[1.25rem] text-foreground/80">{qrShowcase.sticker.restaurant}</p>
          <p className="kit-display mt-[0.6rem] text-[2.1rem] leading-none">{TABLE_WORD}</p>
          <p className="kit-display ember-text text-[5.4rem] leading-[0.9]">{TABLE_NUMBER}</p>
          <span
            className="ember-gradient mt-[0.7rem] rounded-full px-[0.8rem] py-[0.55rem] text-[1.2rem] leading-none font-bold text-background"
            style={{
              transform: `scale(${1 + bump})`,
              transformOrigin: "left center",
              boxShadow: [
                "0 14px 34px -12px var(--ember-2)",
                `0 0 0 ${ring * CALL.spread}px color-mix(in oklab, var(--ember-2) ${(1 - ring) * CALL.glow}%, transparent)`,
              ].join(", "),
            }}
          >
            {qrShowcase.badge}
          </span>
        </div>

        <div className="relative shrink-0">
          <div className="absolute" style={{ inset: `-${gap}rem`, opacity: Math.min(1, lock * 2) }}>
            {CORNERS.map((corner) => (
              <span key={corner} className={`absolute size-[1.1rem] border-ember-1 ${corner}`} />
            ))}
          </div>
          <div className="rounded-[0.7rem] bg-white p-[0.4rem]">
            <div className="relative size-[13rem] overflow-hidden">
              {QR}
              <div
                className="ember-gradient absolute inset-x-[0.2rem] h-[0.09rem] -translate-y-1/2 shadow-[0_0_8px_1px_var(--ember-2)]"
                style={{ top: `${beam * 100}%`, opacity: progress(frame, start + AT.beam, 5) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
