import type { CSSProperties, ReactNode } from "react";
import { Img, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";

export type Pose = {
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
};

const REST: Pose = { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1 };

export const pose = (values: Partial<Pose> = {}): Pose => ({ ...REST, ...values });

/** Blend two poses; drive `t` with a spring for a physical move. */
export const mixPose = (from: Pose, to: Pose, t: number): Pose => {
  const out = { ...from };
  for (const key of Object.keys(REST) as (keyof Pose)[]) {
    out[key] = from[key] + (to[key] - from[key]) * t;
  }
  return out;
};

type Model = {
  /** CSS px of the screen content: the size the captures are taken at. */
  viewport: { width: number; height: number };
  /** Fractions of the body's short side. */
  rim: number;
  bezel: number;
  depth: number;
  radius: number;
  camera: "pill" | "dot" | null;
  /** Side buttons, as [side, start, length] along the long edge (fractions). */
  buttons: [side: "left" | "right", start: number, length: number][];
};

/** Generic current devices: no brand's silhouette, only their proportions. */
export const DEVICES = {
  phone: {
    viewport: { width: 393, height: 852 },
    rim: 0.0134,
    bezel: 0.032,
    depth: 0.109,
    radius: 0.15,
    camera: "pill",
    buttons: [
      ["left", 0.2, 0.07],
      ["left", 0.3, 0.07],
      ["right", 0.25, 0.1],
    ],
  },
  tablet: {
    viewport: { width: 1180, height: 820 },
    rim: 0.006,
    bezel: 0.042,
    depth: 0.034,
    radius: 0.085,
    camera: "dot",
    buttons: [],
  },
  display: {
    viewport: { width: 1920, height: 1080 },
    rim: 0.004,
    bezel: 0.014,
    depth: 0.028,
    radius: 0.018,
    camera: null,
    buttons: [],
  },
} satisfies Record<string, Model>;

/** Body and screen sizes, in px, of a model drawn `size` px along its long side. */
const geometry = (model: Model, size: number) => {
  const { viewport } = model;
  const portrait = viewport.height > viewport.width;
  const ratio = Math.min(viewport.width, viewport.height) / Math.max(viewport.width, viewport.height);
  const k = model.rim + model.bezel;
  const short = (size * ratio) / (1 - 2 * k + 2 * k * ratio);
  const width = portrait ? short : size;
  const height = portrait ? size : short;
  const inset = k * short;
  return { short, width, height, inset, screen: { width: width - inset * 2, height: height - inset * 2 } };
};

/** The body's outline, in px, of a model drawn `size` px along its long side. */
export const outline = (model: Model, size: number) => {
  const { width, height, short } = geometry(model, size);
  return { width, height, radius: model.radius * short };
};

/** Screen px per viewport px: how big the content is drawn. */
export const screenScale = (model: Model, size: number) => geometry(model, size).screen.width / model.viewport.width;

type Point = { x: number; y: number };

/**
 * The pose (offsets and scale) that brings viewport point `point` to
 * `target`, in px from the frame's center, the device drawn `push` times
 * `size`. Rotations added to it move the point a little.
 */
export const aim = (model: Model, size: number, point: Point, target: Point = { x: 0, y: 0 }, push = 1) => {
  const s = screenScale(model, size) * push;
  return {
    x: target.x - (point.x - model.viewport.width / 2) * s,
    y: target.y - (point.y - model.viewport.height / 2) * s,
    scale: push,
  };
};

const LAYER_GAP = 1.6;
const FLOAT_PERIOD = 4.2;

type DeviceProps = {
  model: Model;
  /** Body length along its long side, in px. */
  size: number;
  pose?: Pose;
  /** Idle float amplitude in px, with a matching slow sway. */
  float?: number;
  image?: string;
  video?: { src: string; trimBefore?: number; playbackRate?: number };
  /** Screen content in the model's viewport px, drawn above the image or video. */
  children?: ReactNode;
};

const fill: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top",
};

/**
 * A phone, tablet or display in 3D: a metal rim with a real side (stacked
 * slices), glass bezel, camera, a glare that slides as it turns and a soft
 * contact shadow. Posed with springs through `pose` / `mixPose`.
 *
 * The pose's scale sizes the device itself rather than transforming it:
 * Chrome rasterizes a 3D layer at its own size, so a scaled-up one turns
 * soft. The device never shrinks to fit its container, however large.
 */
export const Device = ({ model, size: baseSize, pose: p = REST, float = 0, image, video, children }: DeviceProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const size = baseSize * p.scale;
  const { viewport } = model;
  const { short, width, height, inset, screen } = geometry(model, size);
  const rim = model.rim * short;
  const radius = model.radius * short;
  const depth = model.depth * short;
  const layers = Math.max(2, Math.ceil(depth / LAYER_GAP));

  const phase = ((frame / fps) * Math.PI * 2) / FLOAT_PERIOD;
  const sway = float * 0.06;
  const lift = Math.sin(phase) * float;
  const rx = p.rotateX + Math.sin(phase * 0.8 + 1) * sway;
  const ry = p.rotateY + Math.sin(phase * 0.6 + 2) * sway * 1.4;
  const rz = p.rotateZ + Math.sin(phase * 0.5) * sway * 0.4;
  const glare = 50 - ry * 2.2 + rx * 0.8;

  return (
    <div style={{ position: "relative", flexShrink: 0, width, height, translate: `${p.x}px ${p.y + lift}px` }}>
      <div
        style={{
          position: "absolute",
          left: "10%",
          right: "10%",
          top: height * 0.985,
          height: height * 0.06,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgb(0 0 0 / 0.55), transparent)",
          filter: `blur(${height * 0.02}px)`,
          opacity: 1 - Math.min(0.6, Math.max(0, -lift) / height),
          transform: `scale(${1 + lift / height})`,
        }}
      />
      <div style={{ position: "absolute", inset: 0, perspective: Math.max(width, height) * 3 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `translateZ(${p.z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
          }}
        >
          {Array.from({ length: layers }, (_, i) => (
            <EdgeLayer
              key={i}
              t={i / (layers - 1)}
              z={-depth / 2 + (i * depth) / (layers - 1)}
              radius={radius}
              long={size}
              buttons={model.buttons}
            />
          ))}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: radius,
              padding: rim,
              transform: `translateZ(${depth / 2 + 0.5}px)`,
              background: "linear-gradient(135deg, #9aa0a6, #464a50 32%, #2a2d31 62%, #7f848a)",
              boxShadow: "0 0 0 1px rgb(255 255 255 / 0.08)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: radius - rim,
                padding: inset - rim,
                background: "#030303",
                boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.07)",
              }}
            >
              {model.camera === "dot" && <CameraDot inset={inset - rim} />}
              <div
                style={{
                  position: "relative",
                  ...screen,
                  borderRadius: Math.max(2, radius - inset),
                  overflow: "hidden",
                  background: "#000",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    ...viewport,
                    transform: `scale(${screen.width / viewport.width})`,
                    transformOrigin: "0 0",
                    overflow: "hidden",
                  }}
                >
                  {image && <Img src={image} style={fill} />}
                  {video && (
                    <OffthreadVideo
                      src={video.src}
                      trimBefore={video.trimBefore}
                      playbackRate={video.playbackRate}
                      muted
                      style={fill}
                    />
                  )}
                  {children}
                </div>
                {model.camera === "pill" && <CameraPill screenWidth={screen.width} />}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(118deg, transparent 38%, rgb(255 255 255 / 0.075) 46%, rgb(255 255 255 / 0.02) 53%, transparent 60%)",
                    backgroundSize: "260% 100%",
                    backgroundPosition: `${glare}% 0`,
                    boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.06)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * One slice of the extruded frame. Stacked along Z they form the rounded
 * metal side; brighter mid-slices fake its curvature, the diagonal gradient
 * lights the top-left edges, and the middle slices carry the buttons.
 */
const EdgeLayer = ({
  t,
  z,
  radius,
  long,
  buttons,
}: {
  t: number;
  z: number;
  radius: number;
  long: number;
  buttons: Model["buttons"];
}) => {
  const light = Math.sin(t * Math.PI);
  const hi = Math.round(36 + light * 70);
  const lo = Math.round(18 + light * 22);
  const shade = (v: number) => `rgb(${v} ${v + 2} ${v + 5})`;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        transform: `translateZ(${z}px)`,
        background: `linear-gradient(125deg, ${shade(hi)}, ${shade(lo)} 55%, ${shade(Math.round(lo * 1.6))})`,
      }}
    >
      {t > 0.3 &&
        t < 0.7 &&
        buttons.map(([side, start, length], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              [side]: -long * 0.004,
              top: long * start,
              width: long * 0.012,
              height: long * length,
              borderRadius: long * 0.004,
              background: shade(hi),
            }}
          />
        ))}
    </div>
  );
};

const CameraPill = ({ screenWidth }: { screenWidth: number }) => {
  const h = screenWidth * 0.066;
  return (
    <div
      style={{
        position: "absolute",
        top: screenWidth * 0.03,
        left: "50%",
        width: screenWidth * 0.24,
        height: h,
        marginLeft: -screenWidth * 0.12,
        borderRadius: h,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingRight: h * 0.28,
      }}
    >
      <Lens size={h * 0.46} />
    </div>
  );
};

/** Centered in the bezel of the top edge. */
const CameraDot = ({ inset }: { inset: number }) => (
  <div style={{ position: "absolute", top: inset / 2, left: "50%", transform: "translate(-50%, -50%)" }}>
    <Lens size={inset * 0.3} />
  </div>
);

const Lens = ({ size }: { size: number }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle at 35% 35%, #2b3548, #0b0e14 55%, #050608)",
      boxShadow: "0 0 0 1px rgb(255 255 255 / 0.05)",
    }}
  />
);
