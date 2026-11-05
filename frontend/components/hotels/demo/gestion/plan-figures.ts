import * as THREE from "three";
import { simulation as sim, type FigurePose, type FigureProp } from "@/lib/hotels-demo-data";

/*
 * Les figurines du plan : les pièces articulées modelées dans Blender
 * (figures.glb), assemblées en un pantin par personne — tenue, coiffure ou
 * chapeau, accessoire — et ses poses : marcher, s'asseoir, s'allonger, nager,
 * courir, servir, cuisiner, pousser un chariot, faire signe. Chaque pose se
 * fond dans la suivante ; la marche avance au rythme du chemin parcouru, les
 * pieds posés au sol.
 */

export interface Look {
  top: string;
  bottom: string;
  skin: string;
  shoe: string;
  hair: string;
  trim: string;
  accent: string;
  hairStyle: "short" | "long" | "bun" | null;
  hat: "cap" | "sun" | "toque" | null;
  apron: boolean;
  skirt: boolean;
  props: FigureProp[];
}

type Role = "top" | "bottom" | "skin" | "shoe" | "hair" | "eye" | "shine" | "trim" | "accent";
export type Motion = FigurePose | "walk";

export interface Cue {
  /** Le chemin parcouru depuis l'image précédente, en mètres de maquette. */
  travel: number;
  /** La vitesse, rapportée à la vitesse de marche de la figurine. */
  pace: number;
  wave: boolean;
  /** Au comptoir, au bureau : les mains au travail. */
  work: boolean;
  /** Le geste de service, de 0 à 1 ; négatif hors service. */
  serve: number;
  /** La hauteur de l'assise au-dessus du sol, en unités du pantin. */
  seat: number;
}

/** Les mesures du pantin, en unités des pièces (avant l'échelle de la figurine). */
const HIP = 0.45;
const THIGH = 0.22;
const WAIST = 0.13;
const SHOULDER = 0.37;
const SHOULDER_X = 0.3;
const NECK = 0.41;
const UPPER = 0.17;
const FORE = 0.2;
const HAND = 0.068;
const DEPTH = 0.135;
const CART = { z: 0.66, grip: 0.65, handle: 0.46 };
const CART_HOME = new THREE.Vector3(0, 0, CART.z);
const STRAIGHT = new THREE.Quaternion();

/** Les deux angles d'un bras (épaule, coude) pour poser la main à tant sous l'épaule et tant devant. */
function reach(down: number, forward: number): [number, number] {
  const d = Math.min(Math.hypot(down, forward), UPPER + FORE - 1e-3);
  const aim = Math.atan2(forward, down);
  const open = Math.acos((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d));
  const elbow = Math.acos((UPPER * UPPER + FORE * FORE - d * d) / (2 * UPPER * FORE));
  return [-(aim - open), -(Math.PI - elbow)];
}

const TRAY = reach(UPPER, FORE);
const OFFER = reach(0.3, 0.28);
const CARTING = reach(HIP + WAIST + SHOULDER - CART.grip, CART.z - CART.handle);
const COOK = reach(0.22, 0.3);
const DESK = reach(0.24, 0.26);
/** La poêle tenue au-dessus du plan de travail : l'avant-bras à l'horizontale, que l'on secoue. */
const PAN = [-0.5, -Math.PI / 2 + 0.5] as const;
/** Au bureau, les avant-bras rentrés vers le clavier, le poignet cassé vers l'intérieur. */
const DESK_IN = 0.16;
/** Le numéro de chaque posture, pour reconnaître un changement sans bâtir de chaîne à chaque image. */
const MOTIONS: Record<Motion, number> = { stand: 0, walk: 1, sit: 2, lie: 3, swim: 4, run: 5, swing: 6, cook: 7, hidden: 8 };

const CHANNELS = ["y", "z", "tilt", "bow", "twist", "head", "thighL", "thighR", "shinL", "shinR", "upperL", "upperR", "foreL", "foreR", "spreadL", "spreadR"] as const;
type Pose = Record<(typeof CHANNELS)[number], number>;
const neutral = (): Pose => Object.fromEntries(CHANNELS.map((c) => [c, c === "y" ? HIP : 0])) as Pose;
const NEUTRAL = neutral();

const smooth = (x: number) => x * x * (3 - 2 * x);

export class FigureKit {
  private parts = new Map<string, THREE.Object3D>();
  private mats = new Map<string, THREE.MeshStandardMaterial>();
  /** Le kit articulé (cuisse et tibia, bras et avant-bras) ; l'ancien n'a qu'une pièce par membre. */
  readonly jointed: boolean;

  constructor(root: THREE.Object3D) {
    for (const o of root.children) this.parts.set(o.name, o);
    this.jointed = this.parts.has("fig-thigh") && this.parts.has("fig-forearm");
  }

  has(name: string) {
    return this.parts.has(name);
  }

  private material(color: string) {
    let m = this.mats.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      this.mats.set(color, m);
    }
    return m;
  }

  /** Une pièce posée à un endroit du pantin ; seuls le buste et la tête portent une ombre. */
  piece(name: string, look: Look, parent: THREE.Object3D, x = 0, y = 0, z = 0, shadow = false) {
    const src = this.parts.get(name);
    const o = src ? src.clone(true) : new THREE.Group();
    o.position.set(x, y, z);
    o.rotation.set(0, 0, 0);
    o.traverse((m) => {
      if (!(m instanceof THREE.Mesh)) return;
      const role = (m.material as THREE.Material).name as Role;
      m.material = this.material(role === "eye" ? sim.eye : role === "shine" ? sim.shine : look[role]);
      m.castShadow = shadow;
    });
    parent.add(o);
    return o;
  }

  build(look: Look) {
    return new Rig(this, look);
  }

  dispose() {
    this.mats.forEach((m) => m.dispose());
  }
}

export class Rig {
  root = new THREE.Group();
  private pelvis = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private thighL = new THREE.Group();
  private thighR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  private upperL = new THREE.Group();
  private upperR = new THREE.Group();
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private props: Partial<Record<FigureProp, THREE.Object3D>> = {};
  /** Un chapeau ôté pour s'allonger ou nager laisse voir la coiffure. */
  private hat: THREE.Object3D | null = null;
  private hair: THREE.Object3D | null = null;
  private cartParked = false;
  private now = neutral();
  private from = neutral();
  private to = neutral();
  private blend = 1;
  private key = -1;
  private gait = Math.random() * Math.PI * 2;
  private t = Math.random() * 10;

  constructor(kit: FigureKit, look: Look) {
    this.root.rotation.order = "YXZ";
    this.root.scale.setScalar(sim.figureScale);
    this.root.add(this.pelvis);
    this.pelvis.position.y = HIP;
    this.thighL.position.set(-0.11, 0, 0);
    this.thighR.position.set(0.11, 0, 0);
    this.shinL.position.y = this.shinR.position.y = -THIGH;
    this.thighL.add(this.shinL);
    this.thighR.add(this.shinR);
    this.torso.position.y = WAIST;
    this.upperL.position.set(-SHOULDER_X, SHOULDER, 0);
    this.upperR.position.set(SHOULDER_X, SHOULDER, 0);
    this.foreL.position.y = this.foreR.position.y = -UPPER;
    this.upperL.add(this.foreL);
    this.upperR.add(this.foreR);
    this.head.position.y = NECK;
    this.torso.add(this.head, this.upperL, this.upperR);
    this.pelvis.add(this.thighL, this.thighR, this.torso);

    const [leg, arm] = kit.jointed ? ["fig-thigh", "fig-upper-arm"] : ["fig-leg", "fig-arm"];
    for (const [thigh, shin] of [[this.thighL, this.shinL], [this.thighR, this.shinR]]) {
      kit.piece(leg, look, thigh);
      if (kit.jointed) kit.piece("fig-shin", look, shin);
    }
    for (const [upper, fore] of [[this.upperL, this.foreL], [this.upperR, this.foreR]]) {
      kit.piece(arm, look, upper);
      if (kit.jointed) kit.piece("fig-forearm", look, fore);
    }
    kit.piece("fig-hips", look, this.pelvis, 0, 0, 0, true);
    kit.piece("fig-torso", look, this.torso, 0, 0, 0, true);
    kit.piece("fig-head", look, this.head, 0, 0, 0, true);
    if (look.hat) this.hat = kit.piece(`fig-hat-${look.hat}`, look, this.head);
    if (look.hairStyle) {
      this.hair = kit.piece(`fig-hair-${look.hairStyle}`, look, this.head);
      this.hair.visible = !this.hat;
    }
    if (look.apron) kit.piece("fig-apron", look, this.torso, 0, 0.3, 0);
    if (look.skirt) kit.piece("fig-skirt", look, this.pelvis, 0, 0.05, 0);
    for (const prop of look.props) {
      if (prop === "tray") this.props.tray = kit.piece("fig-tray", look, this.torso);
      if (prop === "cart") this.props.cart = kit.piece("fig-cart", look, this.root, 0, 0, CART.z);
      if (prop === "bag") this.props.bag = kit.piece("fig-bag", look, this.root, 0.42, 0, -0.18);
      if (prop === "racket") this.props.racket = kit.piece("fig-racket", look, kit.jointed ? this.foreR : this.upperR, 0, kit.jointed ? -FORE : -UPPER - FORE, 0);
      if (prop === "pan" && kit.has("fig-pan")) this.props.pan = kit.piece("fig-pan", look, this.foreR, 0, -FORE, 0);
      if (prop === "towel") this.props.towel = kit.piece("fig-towel", look, this.torso, -0.2, 0.42, 0);
    }
  }

  has(prop: FigureProp) {
    return Boolean(this.props[prop]?.visible);
  }

  show(prop: FigureProp, on: boolean) {
    const o = this.props[prop];
    if (o) o.visible = on;
  }

  /** Le chariot reste garé où il est (devant une porte) ; repris, il revient en douceur devant la figurine. */
  park(scene: THREE.Object3D) {
    const cart = this.props.cart;
    if (!cart || this.cartParked || !cart.visible) return false;
    scene.attach(cart);
    this.cartParked = true;
    return true;
  }

  unpark() {
    const cart = this.props.cart;
    if (!cart || !this.cartParked) return;
    cart.visible = true;
    this.root.attach(cart);
    this.cartParked = false;
  }

  get parked() {
    return this.cartParked;
  }

  /** Le chariot garé suit le niveau affiché, comme sa figurine. */
  showParked(on: boolean) {
    if (this.cartParked) this.props.cart!.visible = on;
  }

  /** La pose de l'instant, fondue depuis la précédente dès que la posture change. */
  update(motion: Motion, dt: number, cue: Cue) {
    this.t += dt;
    const carting = this.has("cart") && !this.cartParked;
    const tray = this.has("tray");
    const flags = [carting, tray, this.has("bag"), cue.wave, cue.work, cue.serve >= 0].reduce((n, on, i) => n | (Number(on) << i), 0);
    const key = MOTIONS[motion] * 64 + flags;
    if (key !== this.key) {
      this.blend = this.key < 0 ? 1 : 0;
      this.key = key;
      Object.assign(this.from, this.now);
    }
    if (this.props.pan) this.props.pan.visible = motion === "cook";
    if (this.hat) {
      this.hat.visible = motion !== "lie" && motion !== "swim";
      if (this.hair) this.hair.visible = !this.hat.visible;
    }
    this.target(motion, dt, cue, carting, tray);
    this.blend += (1 - this.blend) * (1 - Math.exp(-sim.motion.blend * dt));
    const w = smooth(Math.min(1, this.blend / 0.98));
    for (const c of CHANNELS) this.now[c] = this.from[c] + (this.to[c] - this.from[c]) * w;
    this.pose(this.now);
    this.root.visible = motion !== "hidden";

    const cart = this.props.cart;
    if (cart && !this.cartParked && (!cart.position.equals(CART_HOME) || !cart.quaternion.equals(STRAIGHT))) {
      const k = 1 - Math.exp(-sim.motion.blend * dt);
      cart.position.lerp(CART_HOME, k);
      cart.quaternion.slerp(STRAIGHT, k);
      if (cart.position.distanceToSquared(CART_HOME) < 1e-6) {
        cart.position.copy(CART_HOME);
        cart.quaternion.identity();
      }
    }
    if (tray) this.holdTray();
  }

  private target(motion: Motion, dt: number, cue: Cue, carting: boolean, tray: boolean) {
    const p = this.to;
    Object.assign(p, NEUTRAL);
    const { stride, armSwing, knee, run } = sim.motion;
    const t = this.t;

    if (motion === "walk" || motion === "run") {
      const amp = motion === "run" ? stride * run.stride : stride * Math.max(0.35, Math.min(1, cue.pace));
      if (motion === "run") this.gait += dt * run.cadence;
      else this.gait += (cue.travel / sim.figureScale / (4 * HIP * Math.sin(amp))) * Math.PI * 2;
      const sw = Math.sin(this.gait);
      const cw = Math.cos(this.gait);
      const flex = motion === "run" ? knee * run.knee : knee;
      p.thighL = amp * sw;
      p.thighR = -amp * sw;
      p.shinL = flex * Math.max(0, -cw);
      p.shinR = flex * Math.max(0, cw);
      p.y = HIP * Math.cos(amp * sw);
      p.upperL = -sw * armSwing * (amp / stride);
      p.upperR = sw * armSwing * (amp / stride);
      p.foreL = p.foreR = motion === "run" ? -1.3 : -0.25;
      p.bow = motion === "run" ? 0.18 : 0.04;
    } else if (motion === "sit") {
      p.y = cue.seat;
      p.thighL = p.thighR = -1.5;
      p.shinL = p.shinR = 1.5;
      p.upperL = p.upperR = -0.25;
      p.foreL = p.foreR = -0.9;
      p.head = 0.05 * Math.sin(t * 0.7);
    } else if (motion === "lie") {
      p.y = cue.seat + DEPTH;
      p.z = -HIP;
      p.tilt = -Math.PI / 2;
      p.spreadL = -0.15;
      p.spreadR = 0.15;
      const bend = 0.5 + 0.5 * Math.sin(t * 0.35);
      p.thighR = -0.45 * bend;
      p.shinR = 0.9 * bend;
      p.head = -0.25;
    } else if (motion === "swim") {
      p.y = cue.seat + 0.02 * Math.sin(t * 2);
      p.tilt = Math.PI / 2;
      p.thighL = Math.sin(t * 9) * 0.3;
      p.thighR = -Math.sin(t * 9) * 0.3;
      p.shinL = p.shinR = 0.2;
      p.upperL = -((t * 3.2) % (Math.PI * 2));
      p.upperR = -((t * 3.2 + Math.PI) % (Math.PI * 2));
      p.head = -0.6;
    } else if (motion === "swing") {
      const s = Math.sin(t * 2.6);
      p.upperR = -1.0 + s * 1.0;
      p.foreR = -0.5;
      p.upperL = -0.6;
      p.foreL = -0.8;
      p.twist = s * 0.4;
      p.thighL = -0.25;
      p.shinL = 0.35;
      p.thighR = 0.15;
      p.shinR = 0.2;
      p.y = HIP * Math.cos(0.25) - 0.02 + Math.abs(s) * 0.03;
      p.bow = 0.12;
    } else if (motion === "cook") {
      p.upperL = COOK[0];
      p.foreL = COOK[1];
      if (this.props.pan) {
        p.upperR = PAN[0] + Math.sin(t * 2.4) * 0.08;
        p.foreR = PAN[1] + Math.max(0, Math.sin(t * 4.1)) * 0.25;
        p.spreadR = 0.05;
      } else {
        p.upperR = COOK[0] + Math.sin(t * 2.4) * 0.12;
        p.foreR = COOK[1] + Math.sin(t * 4.1) * 0.18;
        p.spreadR = 0.1 + Math.sin(t * 2.4) * 0.08;
      }
      p.twist = Math.sin(t * 0.9) * 0.15;
      p.bow = 0.22 + Math.sin(t * 1.3) * 0.04;
      p.head = 0.3;
    } else {
      p.y = HIP + Math.sin(t * 1.6) * 0.004;
      p.spreadL = -0.05;
      p.spreadR = 0.05;
      p.foreL = p.foreR = -0.15;
      if (cue.work) {
        p.upperL = DESK[0];
        p.foreL = DESK[1] + Math.sin(t * 3) * 0.04;
        p.upperR = DESK[0];
        p.foreR = DESK[1] - Math.sin(t * 3) * 0.04;
        p.spreadL = DESK_IN;
        p.spreadR = -DESK_IN;
        p.bow = 0.08;
        p.head = 0.25;
      }
    }

    if (motion !== "sit" && motion !== "lie" && motion !== "swim") {
      p.y += cue.seat;
      if (carting) {
        [p.upperL, p.foreL] = CARTING;
        [p.upperR, p.foreR] = CARTING;
        p.spreadL = p.spreadR = 0;
        p.bow = 0.08;
      } else if (tray) {
        [p.upperR, p.foreR] = TRAY;
        p.spreadR = -0.12;
      } else if (this.has("bag")) {
        p.upperR = 0.3;
        p.foreR = -0.1;
        p.spreadR = 0.12;
      }
    }
    if (cue.serve >= 0) {
      const s = smooth(Math.min(1, cue.serve * 2));
      const bow = Math.sin(Math.PI * Math.min(1, cue.serve));
      p.bow = 0.32 * bow;
      p.head = 0.2 * bow;
      if (tray) {
        p.upperR = TRAY[0] + (OFFER[0] - TRAY[0]) * s;
        p.foreR = TRAY[1] + (OFFER[1] - TRAY[1]) * s;
        p.spreadR = -0.12 * (1 - s);
      }
    }
    if (cue.wave) {
      p.upperR = -2.8;
      p.foreR = -0.35 + Math.sin(t * 9) * 0.35;
      p.spreadR = 0.25;
    }
  }

  private pose(p: Pose) {
    this.pelvis.position.set(0, p.y, p.z);
    this.pelvis.rotation.x = p.tilt;
    this.torso.rotation.set(p.bow, p.twist, 0);
    this.head.rotation.x = p.head;
    this.thighL.rotation.x = p.thighL;
    this.thighR.rotation.x = p.thighR;
    this.shinL.rotation.x = p.shinL;
    this.shinR.rotation.x = p.shinR;
    this.upperL.rotation.set(p.upperL, 0, p.spreadL);
    this.upperR.rotation.set(p.upperR, 0, p.spreadR);
    this.foreL.rotation.x = p.foreL;
    this.foreR.rotation.x = p.foreR;
  }

  /** Le plateau suit la main droite, à plat. */
  private holdTray() {
    const { upperR: a, foreR: b, spreadR: s } = this.now;
    const down = -(UPPER + FORE * Math.cos(b));
    const ahead = -FORE * Math.sin(b);
    const y = SHOULDER + down * Math.cos(s) * Math.cos(a) - ahead * Math.sin(a);
    const z = down * Math.cos(s) * Math.sin(a) + ahead * Math.cos(a);
    this.props.tray!.position.set(SHOULDER_X - down * Math.sin(s), y + HAND, z);
  }
}
