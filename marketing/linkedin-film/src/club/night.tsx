import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { OmininMark } from "../brand/OmininMark";
import { DEVICES, Device, pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { springs } from "../kit/motion";
import { Counter as Odometer } from "../kit/type";
import { Qr } from "../scenes/art";
import { Appear, clamp, ramp, useIn } from "../scenes/common";
import { DEMO_URL, DRINKS, FIELD_SECONDS, ORDER_NUMBER, PICKED, PRICE } from "./copy";
import { Caption, Friends, headline, Hero, kicker, People, Silver, waiting } from "./parts";
import { LockScreen, LoyaltyScreen, Star } from "./screens";
import { Bar, Beams, Counter, Crowd, dance, Figure, Glass, Haze, HeldPhone, Lasers, pulse, Room, Scrim, useFloorRows } from "./stage";
import { SCENE, SLAM_BEATS } from "./timeline";
import { club, silverGradient } from "./tokens";

/** Back on the floor with her friends; meanwhile the ticket prints at the bar. */
export const PRINT_AT = 108;

export const Dance = () => {
  const frame = useCurrentFrame();
  const { width, pick } = useLayout();
  const rows = useFloorRows(0.9);
  const front = rows[rows.length - 1];
  const x = width * 0.5;
  if (frame >= PRINT_AT) return <Printer />;
  return (
    <Room>
      <Haze />
      <Beams energy={0.85} />
      <AbsoluteFill style={{ scale: String(1.04 - frame / 3000) }}>
        <Crowd rows={rows.slice(0, 2)} />
        <People>
          <Friends frame={frame} x={x} y={front.y - 10} scale={front.scale} gap={pick(250, 260)} energy={0.9} />
          <Hero x={x} y={front.y} scale={front.scale * 1.05} moves={dance(frame, 0, 0.9)} />
        </People>
      </AbsoluteFill>
      <Caption
        at={6}
        until={PRINT_AT - 6}
        title="Ses verres se préparent."
        sub="Elle, téléphone en poche, danse."
        size={pick(96, 88)}
        style={{ left: pick(120, 70), right: pick(undefined, 70), top: pick(110, 200) }}
      />
    </Room>
  );
};

const TICKET_LINES = [PICKED.name.toUpperCase(), `N° ${ORDER_NUMBER}`, `1 × ${DRINKS[0].name}`, `1 × ${DRINKS[1].name}`, "Payée en ligne"];
/** The printer feeds a line every this many frames. */
const LINE_FRAMES = 7;

/** The ticket printing behind the bar, line by line, and the measured figure counting up. */
const Printer = () => {
  const frame = useCurrentFrame() - PRINT_AT;
  const { height, pick } = useLayout();
  const lines = Math.min(TICKET_LINES.length, Math.floor(frame / LINE_FRAMES) + 1);
  // The paper comes out of the slot as each line is printed.
  const feed = interpolate(frame, [0, TICKET_LINES.length * LINE_FRAMES], [0, 1], clamp);
  const paper = 380;
  return (
    <Room glow={club.amber}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 60% at ${pick(28, 50)}% 50%, rgb(255 180 94 / 0.2), transparent 70%)` }} />
      <div style={{ position: "absolute", left: pick(220, 290), top: pick(height * 0.24, height * 0.5), width: 500, scale: pick("1", "1.25"), transformOrigin: "50% 0" }}>
        <div style={{ height: 120, borderRadius: 26, background: "linear-gradient(#2a2b31, #141519)", boxShadow: "0 30px 60px rgb(0 0 0 / 0.6), inset 0 1px 0 rgb(255 255 255 / 0.15)" }} />
        <div style={{ position: "relative", margin: "-34px auto 0", width: 380, height: paper + 20, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: -paper + feed * paper,
              height: paper,
              background: "#f4f1ea",
              padding: "34px 34px",
              fontFamily: fonts.mono,
              color: "#121212",
              boxShadow: "0 20px 40px rgb(0 0 0 / 0.5)",
            }}
          >
            {TICKET_LINES.slice(0, lines).map((line, i) => (
              <p key={line} style={{ margin: i === 1 ? "8px 0 18px" : "6px 0", fontSize: i === 1 ? 96 : i === 0 ? 34 : 28, fontWeight: i < 2 ? 700 : 500, letterSpacing: i === 0 ? "0.12em" : "-0.02em", lineHeight: 1 }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: pick(840, 70), right: pick(110, 70), top: pick(height * 0.24, height * 0.13) }}>
        <Appear at={6}>
          <p style={kicker(28, club.amber)}>Au bar, le ticket sort tout seul</p>
        </Appear>
        <Appear at={12}>
          <p style={{ ...headline(pick(260, 240)), lineHeight: 0.9, marginTop: 24 }}>
            <span style={{ color: club.silver }}>
              <Odometer to={FIELD_SECONDS} delay={12} duration={18} />
              &nbsp;s
            </span>
          </p>
        </Appear>
        <Appear at={20}>
          <p style={{ ...headline(pick(56, 54)), marginTop: 18 }}>de la commande au ticket.</p>
        </Appear>
        <Appear at={26}>
          <p style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: pick(28, 30), color: club.muted, margin: "20px 0 0", lineHeight: 1.4 }}>
            Médiane mesurée chez un client Ominin,
            <br />
            sur ses commandes payées en ligne.
          </p>
        </Appear>
      </div>
    </Room>
  );
};

/** 1:19, still on the floor: her phone buzzes in her pocket, a notification says it's ready. */
export const READY_AT = 22;

export const Ready = () => {
  const frame = useCurrentFrame();
  const { width, height, pick } = useLayout();
  const buzz = frame >= READY_AT && frame < READY_AT + 34 ? Math.sin(frame * 2.6) * (1 - (frame - READY_AT) / 34) : 0;
  const push = useIn(0, springs.heavy);
  const rows = useFloorRows(0.9);
  return (
    <Room>
      <Haze />
      <Beams energy={0.9} />
      <AbsoluteFill style={{ opacity: 0.5, filter: "blur(4px)" }}>
        <Crowd rows={rows} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(${pick("90deg", "180deg")}, rgb(4 4 8 / 0.9) 30%, rgb(4 4 8 / 0.3))` }} />
      <AbsoluteFill style={{ alignItems: pick("flex-end", "center"), justifyContent: pick("center", "flex-end"), padding: pick(`0 ${width * 0.12}px 0 0`, `0 0 ${height * 0.1}px`) }}>
        <Device
          model={DEVICES.phone}
          size={pick(height * 0.86, height * 0.56)}
          float={3}
          pose={pose({ x: buzz * 9, rotateZ: buzz * 2 + pick(-3, -2), rotateY: pick(-10, -4), rotateX: 4, scale: 0.94 + 0.06 * push })}
        >
          <LockScreen at={READY_AT} />
        </Device>
      </AbsoluteFill>
      <Caption
        at={READY_AT + 2}
        kick="1 h 19 · Bzz"
        title={
          <>
            Une notification&nbsp;:
            <br />
            <Silver>c’est prêt.</Silver>
          </>
        }
        sub="Commandée à 1 h 13, prête à 1 h 19 : six minutes, sans quitter la piste."
        size={pick(96, 88)}
        style={{ left: pick(130, 70), right: pick(width * 0.5, 70), top: pick(height * 0.3, height * 0.06) }}
      />
    </Room>
  );
};

/** The barman's hand-off, in scene frames: the glass slides along the counter, then she takes it. */
const SLIDE = [118, 142];
const TAKEN = 146;

/** The pickup point: an empty stretch of bar. She shows her number, takes her drinks, goes back. */
export const Pickup = () => {
  const frame = useCurrentFrame();
  const { width, height, pick } = useLayout();
  const length = SCENE.night - SCENE.pickup;
  const barTop = pick(height * 0.06, height * 0.2);
  const barHeight = pick(height * 0.42, height * 0.28);
  const counterTop = barTop + barHeight;
  const spot = width * pick(0.74, 0.5);
  const bartenderX = spot + pick(60, 50);
  const ground = counterTop + pick(470, 760);
  const arrive = ramp(frame, 0, 90);
  const handover = useIn(SLIDE[0], springs.smooth);
  // The bartender sets the glass on the counter and slides it to her.
  const slide = ramp(frame, SLIDE[0], SLIDE[1]);
  const leave = ramp(frame, 196, length);
  const heroX = interpolate(arrive, [0, 1], [width * pick(0.2, 0.15), spot]) + leave * width * 0.45;
  const holding = frame >= TAKEN;
  const showing = frame > 96 && !holding;
  return (
    <Room glow={club.amber}>
      <Bar name={PICKED.name} top={barTop} height={barHeight} />
      <People>
        <Figure
          y={counterTop + 60}
          scale={pick(1.45, 1.7)}
          x={bartenderX}
          moves={{ left: 20, right: 60 + 50 * handover * (1 - ramp(frame, TAKEN, TAKEN + 15)), leftBend: 40, rightBend: 40 - 30 * handover, bob: 0, lean: -handover * 5 }}
          facing={-1}
          fill="#120e0a"
          rim="rgb(255 180 94 / 0.5)"
          holding={frame > 96 && frame < SLIDE[0] ? <g transform="scale(1.4)"><Glass /></g> : undefined}
        />
      </People>
      {/* The pickup point: a lit silver sign high over the bartender, the number glowing when it's hers. */}
      <div
        style={{
          position: "absolute",
          left: spot - pick(190, 170),
          width: pick(380, 340),
          top: barTop + barHeight * pick(0.12, 0.18),
          padding: "18px 0",
          borderRadius: 18,
          border: `2px solid ${showing || holding ? club.cyan : club.silver}`,
          background: "rgb(4 4 8 / 0.88)",
          textAlign: "center",
          boxShadow: `0 0 50px ${showing || holding ? "rgb(67 217 255 / 0.5)" : "rgb(230 233 238 / 0.3)"}`,
        }}
      >
        <p style={kicker(26, club.silver)}>Retrait</p>
        <p style={{ ...headline(pick(56, 54)), marginTop: 6 }}>N°&nbsp;{ORDER_NUMBER}</p>
      </div>
      <Counter top={counterTop} height={pick(80, 100)} />
      {frame >= SLIDE[0] && !holding && (
        <People>
          <g transform={`translate(${interpolate(slide, [0, 1], [bartenderX - 40, spot])} ${counterTop + 2}) scale(1.8)`}>
            <Glass />
          </g>
        </People>
      )}
      <People>
        {/* A pool of light on the floor at the pickup point: where she stands. */}
        <ellipse cx={spot} cy={ground} rx={pick(260, 300)} ry={pick(50, 60)} fill="url(#pickup-pool)" />
        <defs>
          <radialGradient id="pickup-pool">
            <stop offset="0" stopColor={club.silver} stopOpacity={0.3} />
            <stop offset="1" stopColor={club.silver} stopOpacity={0} />
          </radialGradient>
        </defs>
        <Hero
          x={heroX}
          y={ground}
          scale={pick(2.3, 3.2)}
          facing={frame < 196 ? 1 : -1}
          moves={
            holding
              ? { left: 70, right: 70, leftBend: 100, rightBend: 100, bob: Math.abs(Math.sin(frame / 5)) * 6 * leave, lean: 0 }
              : showing
                ? { ...waiting(frame, 2), right: 150, rightBend: 20 }
                : { ...waiting(frame, 2), bob: Math.abs(Math.sin(frame / 5)) * 6 * (1 - arrive) }
          }
          holding={holding ? <g transform="scale(1.4)"><Glass /></g> : showing ? <g transform="scale(2.2)"><HeldPhone label={String(ORDER_NUMBER)} /></g> : undefined}
        />
      </People>
      <Scrim reach={pick(0.36, 0.3)} />
      <Caption
        at={20}
        until={140}
        kick="Au point de retrait"
        title="Pas de file."
        size={pick(110, 100)}
        style={{ left: pick(110, 70), right: pick(width * 0.45, 70), ...pick({ bottom: 90 }, { top: 70 }) }}
      />
      <Caption
        at={150}
        title={
          <>
            Elle montre son numéro,
            <br />
            elle repart.
          </>
        }
        size={pick(84, 80)}
        style={{ left: pick(110, 70), right: pick(width * 0.4, 70), ...pick({ bottom: 90 }, { top: 70 }) }}
      />
    </Room>
  );
};

/** The peak: lasers, a strobe on the beat, glasses up. */
export const Night = () => {
  const frame = useCurrentFrame();
  const { width, pick } = useLayout();
  const rows = useFloorRows(1.3);
  const front = rows[rows.length - 1];
  const strobe = pulse(frame) * 0.12;
  const raised = <g transform="scale(1.6)"><Glass color={club.violet} /></g>;
  return (
    <Room glow={club.violet}>
      <Haze color={club.violet} strength={1.4} />
      <Lasers opacity={0.85} />
      <Beams energy={1.2} />
      <AbsoluteFill style={{ scale: String(1.08 - frame / 1600) }}>
        <Crowd rows={rows.slice(0, 2)} />
        <People>
          <Friends frame={frame} x={width / 2} y={front.y - 10} scale={front.scale} gap={pick(250, 260)} energy={1.3} holding={raised} />
          <Hero x={width / 2} y={front.y} scale={front.scale * 1.05} moves={dance(frame, 1, 1.3)} holding={<g transform="scale(1.6)"><Glass /></g>} />
        </People>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: club.violet, opacity: strobe, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: pick(120, 260) }}>
        <Appear at={4}>
          <p style={{ ...headline(pick(150, 130)), textAlign: "center" }}>
            <Silver>La soirée continue.</Silver>
          </p>
        </Appear>
      </AbsoluteFill>
    </Room>
  );
};

/** The next Saturday: she's back, her points waiting. */
export const Back = () => {
  const { width, height, pick } = useLayout();
  const enter = useIn(0, springs.heavy);
  return (
    <Room>
      <Haze strength={0.8} />
      <Beams energy={0.8} />
      <AbsoluteFill style={{ alignItems: pick("flex-end", "center"), justifyContent: pick("center", "flex-end"), padding: pick(`0 ${width * 0.12}px 0 0`, `0 0 ${height * 0.1}px`) }}>
        <Device model={DEVICES.phone} size={pick(height * 0.86, height * 0.56)} float={3} pose={pose({ rotateY: pick(-12, -5), rotateX: 4, rotateZ: 2, y: (1 - enter) * height })}>
          <LoyaltyScreen unlock={44} />
        </Device>
      </AbsoluteFill>
      <Caption
        at={4}
        kick="Samedi suivant"
        title={
          <>
            Elle <Silver>revient.</Silver>
          </>
        }
        sub="Ses points l’attendent : une consommation offerte."
        size={pick(110, 100)}
        style={{ left: pick(130, 70), right: pick(width * 0.5, 70), top: pick(height * 0.32, height * 0.07) }}
      />
    </Room>
  );
};

const SLAMS = ["Plus de verres.", "Moins de file.", "Une équipe qui sert."];

/** What the club gets: three statements, one every four beats, stacking up. */
export const Slams = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const shown = SLAM_BEATS.filter((at) => frame >= at - SCENE.slams).length;
  return (
    <Room glow={club.violet}>
      <Haze strength={0.9} />
      <Beams energy={0.9} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: pick("0 160px", "0 80px") }}>
        <p style={{ ...kicker(pick(30, 32), club.cyan), marginBottom: 30 }}>Pour votre club</p>
        {SLAMS.map((slam, i) => (
          <Slam key={slam} text={slam} at={SLAM_BEATS[i] - SCENE.slams} current={i === shown - 1} size={pick(150, 104)} />
        ))}
      </AbsoluteFill>
    </Room>
  );
};

const Slam = ({ text, at, current, size }: { text: string; at: number; current: boolean; size: number }) => {
  const frame = useCurrentFrame();
  const hit = useIn(at, springs.snappy);
  if (frame < at) return <p style={{ ...headline(size), visibility: "hidden" }}>{text}</p>;
  return (
    <p style={{ ...headline(size), opacity: current ? 1 : 0.42, transform: `scale(${1.1 - 0.1 * hit})` }}>
      <Silver>{text}</Silver>
    </p>
  );
};

/** The track drops out: the star alone, in the dark. */
export const Silence = () => {
  const frame = useCurrentFrame();
  const glow = ramp(frame, 0, SCENE.end - SCENE.silence);
  return (
    <AbsoluteFill style={{ background: club.deep, alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: glow, transform: `scale(${0.7 + 0.3 * glow}) rotate(${45 * glow}deg)`, filter: `drop-shadow(0 0 ${30 * glow}px rgb(230 233 238 / 0.6))` }}>
        <Star size={120} id="silence-star" />
      </div>
    </AbsoluteFill>
  );
};

/** The end card: Ominin, the promise, the demo to try, the price. */
export const End = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const flash = interpolate(frame, [0, 10], [0.25, 0], clamp);
  return (
    <Room glow={club.violet}>
      <Haze strength={1} />
      <Beams energy={0.6} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: pick(0, 70) }}>
        <Appear at={0} pop>
          <OmininMark size={pick(110, 130)} />
        </Appear>
        <Appear at={6} style={{ marginTop: pick(40, 60) }}>
          <p style={headline(pick(84, 80))}>
            La commande QR
            <br />
            <Silver>pour les clubs.</Silver>
          </p>
        </Appear>
        <Appear at={14} style={{ marginTop: pick(48, 80) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 36, flexDirection: pick("row", "column") }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 18, padding: pick("18px 34px", "22px 36px"), borderRadius: 999, backgroundImage: silverGradient(), color: club.night, flexDirection: pick("row", "column") }}>
              <span style={{ ...kicker(28, club.night), letterSpacing: "0.16em" }}>Essayez la démo</span>
              <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: pick(44, 50), letterSpacing: "-0.02em" }}>{DEMO_URL}</span>
            </div>
            <div style={{ padding: 10, borderRadius: 18, background: "#fff" }}>
              <Qr size={pick(150, 220)} value={`https://${DEMO_URL}`} color={club.night} />
            </div>
          </div>
        </Appear>
        <Appear at={22} style={{ marginTop: pick(36, 48) }}>
          <p style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: pick(38, 40), color: club.silver, margin: 0, lineHeight: 1.35 }}>
            {PRICE.monthly}&nbsp;€ d’abonnement{pick<ReactNode>(" · ", <br />)}
            {PRICE.commissionPercent}&nbsp;%&nbsp;des commandes payées en ligne
          </p>
        </Appear>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash, mixBlendMode: "screen" }} />
    </Room>
  );
};
