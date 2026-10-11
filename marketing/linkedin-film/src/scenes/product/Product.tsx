import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../../brand/fonts";
import { om } from "../../brand/tokens";
import { Device, DEVICES, pose } from "../../kit/Device";
import { useLayout } from "../../kit/layout";
import { springs, track, type Key } from "../../kit/motion";
import { beat } from "../../timeline";
import { Accent, Appear, Backdrop, clamp, Kicker, useIn } from "../common";
import { Callouts, calloutShown } from "./callouts";
import { Estimator, KitchenTicket, PANEL, Precision, Proof, Regulars, Retention } from "./panels";
import { PhoneScreen } from "./screens";
import * as T from "./times";

type Chapter = {
  from: number;
  until: number;
  n: string;
  label: string;
  tag?: string;
  title: ReactNode[];
  body: { at: number; text: ReactNode }[];
};

const CHAPTERS: Chapter[] = [
  {
    from: T.START + 4,
    until: T.AI - 6,
    n: "01",
    label: "Commande en ligne",
    title: ["Chaque téléphone", <>devient une <Accent>borne.</Accent></>],
    body: [
      { at: beat(12), text: "Le client scanne, commande et paie, à table ou dans la file." },
      { at: T.PRINT, text: "La commande part aussitôt en cuisine." },
    ],
  },
  {
    from: T.AI,
    until: T.LOYALTY - 6,
    n: "02",
    label: "Estimateur IA",
    title: ["L’heure exacte", <>où c’est <Accent>prêt.</Accent></>],
    body: [
      { at: T.INPUTS[0], text: "L’IA apprend votre cuisine et annonce l’heure, à la minute près." },
      { at: T.LAPSE[0], text: "Le client attend où il veut. Le comptoir respire." },
      { at: T.READY, text: "Fini les « c’est prêt quand ? »." },
    ],
  },
  {
    from: T.LOYALTY,
    until: T.END - 6,
    n: "03",
    label: "Fidélisation",
    title: ["Et vos clients", <Accent>reviennent.</Accent>],
    body: [
      { at: T.POINTS, text: "Chaque commande en ligne crédite des points de fidélité." },
      { at: T.REGULARS, text: "Vous savez enfin qui sont vos habitués." },
      { at: T.RETURN, text: "Une récompense : une raison de revenir." },
    ],
  },
];

/*
 * The phone: at rest beside the text (16:9) or under it (9:16), away when a
 * panel takes the stage, and in 9:16 beside the kitchen ticket. It is never
 * cropped (a crop read as an error in the feed): its key moments are
 * magnified as callouts instead.
 */
type Shot = { x: number; y: number; scale: number };
const FRAMING = {
  landscape: { size: 960, rest: { x: 40, y: 0, scale: 1 }, away: 1200 },
  portrait: { size: 1080, rest: { x: 0, y: 350, scale: 1 }, away: 1800 },
};
type Framing = (typeof FRAMING)["landscape"];

const shots = (f: Framing, portrait: boolean): Key<Shot>[] => {
  const away = { ...f.rest, y: f.away };
  const quick = { config: springs.push };
  return portrait
    ? [
        { at: 0, value: f.rest },
        { at: T.PRINT - 8, value: { x: 0, y: 480, scale: 0.8 } },
        { at: T.PROOF - 8, value: away, ...quick },
        { at: T.HERO_ETA - 4, value: f.rest, ...quick },
        { at: T.MATCH - 8, value: away, ...quick },
        { at: T.LOYALTY - 2, value: f.rest, ...quick },
        { at: T.REGULARS - 8, value: away, ...quick },
        { at: T.RETURN - 4, value: f.rest, ...quick },
        { at: T.BACK - 8, value: away, ...quick },
      ]
    : [
        { at: 0, value: f.rest },
        { at: T.PROOF - 10, value: away, ...quick },
        { at: T.AI - 4, value: f.rest, ...quick },
        { at: T.MATCH - 8, value: away, ...quick },
        { at: T.LOYALTY - 4, value: f.rest, ...quick },
        { at: T.RETENTION - 8, value: away, ...quick },
      ];
};

/** The side panel's box: right of the phone in 16:9, the lower zone in 9:16, the 520 px layout scaled up into it. */
const PANEL_BOX = { landscape: { left: 1240, top: 24, scale: 1.15 }, portrait: { left: (1080 - PANEL.width * 1.6) / 2, top: 500, scale: 1.6 } };

export const Product = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, pick } = useLayout();
  const f = pick(FRAMING.landscape, FRAMING.portrait);
  const enter = useIn(T.START, springs.heavy);
  const buzz = interpolate(frame, [T.READY, T.READY + 16], [1, 0], clamp) * (frame >= T.READY ? 1 : 0);
  const paidBump = interpolate(frame, [T.PAID, T.PAID + 5, T.PAID + 16], [0, 1, 0], clamp);
  const shot = track(frame, fps, shots(f, portrait));
  const callout = calloutShown(frame);
  const gone = interpolate(shot.y, [f.away - 400, f.away], [0, 1], clamp);
  // 9:16: the panels show while the phone is away, and the kitchen ticket beside it.
  const printing = frame >= T.PRINT - 8 && frame < T.PROOF;
  const panel = portrait ? (printing ? 1 : gone) : 1 - callout;
  const box = pick(PANEL_BOX.landscape, PANEL_BOX.portrait);

  return (
    <AbsoluteFill>
      <Backdrop x={pick(56, 50)} y={pick(50, 66)} glow={1.1} />
      <AbsoluteFill style={{ scale: String(1 + (frame - T.START) / 9000) }}>
        {CHAPTERS.map((chapter) => (
          <TextColumn key={chapter.n} chapter={chapter} />
        ))}
        <div
          style={{
            position: "absolute",
            top: box.top,
            left: box.left,
            width: PANEL.width,
            height: 1080,
            opacity: panel,
            scale: String(box.scale),
            transformOrigin: "0 0",
          }}
        >
          <KitchenTicket />
          <Estimator />
          <Regulars />
        </div>
        <Proof />
        <Precision />
        <Retention />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Device
            model={DEVICES.phone}
            size={f.size}
            float={3}
            pose={pose({
              x: shot.x + Math.sin(frame * 2.4) * 5 * buzz,
              y: shot.y + (1 - enter) * 1100,
              rotateY: pick(-16 + 10 * enter, -8 + 6 * enter),
              rotateX: 3,
              rotateZ: 5 * (1 - enter) + Math.sin(frame * 2.1) * 1.2 * buzz,
              scale: shot.scale * (1 + 0.015 * paidBump),
            })}
          >
            <PhoneScreen />
          </Device>
        </AbsoluteFill>
        <Callouts />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TextColumn = ({ chapter }: { chapter: Chapter }) => {
  const { pick } = useLayout();
  return (
    <div style={{ position: "absolute", left: pick(100, 70), top: pick(190, 120), width: pick(620, 940) }}>
      <Appear at={chapter.from} until={chapter.until}>
        <Kicker n={chapter.n} label={chapter.label} tag={chapter.tag} size={34} />
      </Appear>
      <div style={{ marginTop: 30, fontFamily: fonts.display, fontWeight: 600, fontSize: pick(66, 84), lineHeight: 1.06, letterSpacing: "-0.04em", color: om.cream }}>
        {chapter.title.map((line, i) => (
          <Appear key={i} at={chapter.from + 3 + i * 4} until={chapter.until}>
            {line}
          </Appear>
        ))}
      </div>
      {/* One line at a time under the headline, each replacing the last. */}
      <div style={{ position: "relative", marginTop: pick(40, 30), height: pick(170, 110) }}>
        {chapter.body.map((line, i) => {
          const next = chapter.body[i + 1]?.at;
          return (
            <Appear
              key={i}
              at={line.at}
              until={next !== undefined ? next - 7 : chapter.until}
              style={{
                fontFamily: fonts.sans,
                fontWeight: 500,
                fontSize: 40,
                lineHeight: 1.3,
                textWrap: "balance",
                color: om.cream,
                maxWidth: pick(600, 940),
                position: "absolute",
                inset: 0,
              }}
            >
              {line.text}
            </Appear>
          );
        })}
      </div>
    </div>
  );
};
