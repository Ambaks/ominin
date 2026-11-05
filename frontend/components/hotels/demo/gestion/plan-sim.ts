import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  gestion,
  plan,
  requestKinds,
  room as roomCopy,
  simulation as sim,
  spaces,
  waiter,
  type Activity,
  type FigurePose,
  type FigureProp,
  type RoomStatus,
  type TeamId,
} from "@/lib/hotels-demo-data";
import { clock, demoMinutes } from "../store";
import { shiftRanges } from "./kit";
import { FigureKit, type Look, type Motion, type Rig } from "./plan-figures";

/*
 * La vie du Grand Large en maquette : la scène exportée de Blender, des
 * clients déjà installés à l'ouverture, d'autres qui arrivent avec leur
 * valise, seuls ou à deux, passent à la réception, montent, redescendent à la
 * piscine, au restaurant, au spa, repartent valise en main ; l'équipe qui fait
 * sa ronde, part chercher la commande au bar ou au passe, la sert, revient.
 * Chacun a sa place là où il va, réservée dès qu'il s'y dirige ; en chemin, on
 * s'écarte pour ne pas se rentrer dedans. Les demandes simulées vivent ici
 * seules ; celles de la démo (le state partagé) arrivent par setActivity, et
 * leur membre d'équipe reste sur place tant qu'elles ne sont pas terminées
 * dans le Service.
 */

export type PlanLevel = (typeof plan.levels)[number]["value"];
export type PoiId = keyof typeof plan.pois;

export interface PlanEvent {
  at: string;
  text: string;
  tone: "pending" | "doing" | "done";
  real: boolean;
}

interface Callbacks {
  onEvent: (event: PlanEvent) => void;
  onRoom: (room: string) => void;
  onReady: (pois: PoiId[]) => void;
  onError: () => void;
  onStats: (stats: { open: number; busy: number; staff: number }) => void;
  /** Le visiteur a pris la caméra en main : elle n'est plus sur l'endroit choisi. */
  onInteract: () => void;
}

interface NavNode {
  p: THREE.Vector3;
  links: string[];
  level: string;
  spot?: string;
  patrol?: string[];
}

interface Label {
  el: HTMLElement;
  w: number;
  h: number;
  dirty: boolean;
  on: boolean;
  dot: boolean;
}

type Outfit = keyof typeof sim.outfits;
type Stage = "arrive" | "checkin" | "toRoom" | "inRoom" | "out" | "pack" | "leave";

interface Agent {
  kind: "guest" | "staff";
  rig: Rig;
  /** Sur le réseau de nav : le sol sous la figurine. */
  pos: THREE.Vector3;
  yaw: number;
  path: string[];
  at: string;
  speed: number;
  vel: number;
  wait: number;
  /** Debout sur place avant de repartir : se lever, laisser l'autre passer devant. */
  hold: number;
  /** Arrivé sans avoir eu à marcher : traité à l'image suivante. */
  arrive: boolean;
  /** À sa place, posé (assis, allongé, au poste) ; `still` : depuis combien de temps. */
  settled: boolean;
  still: number;
  /** La place réservée là où l'on va (`slotAt`), son rang et le décalage qui en découle. */
  slotAt?: string;
  slot: number;
  offset: THREE.Vector3;
  /** L'écart pris en chemin pour ne pas rentrer dans un autre. */
  push: THREE.Vector3;
  removed: boolean;
  face?: number;
  spot?: string;
  stage?: Stage;
  outfit?: Outfit;
  room?: string;
  call?: Req;
  partner?: Agent;
  name?: string;
  team?: TeamId;
  home?: string;
  holds?: boolean;
  patrol?: string[];
  patrolAt?: number;
  task?: Req;
  serveT: number;
  /** Une femme ou un valet de chambre entré dans une chambre : le couloir où revenir. */
  doorFrom?: string;
  /** Fin de service : on finit ce qu'on a en main et on s'en va. */
  leaving?: boolean;
  tag?: Label;
}

interface Req {
  id: string;
  real?: string;
  mine: boolean;
  spot: string;
  room?: string;
  where: string;
  what: string;
  team: TeamId;
  desk: boolean;
  /** Une commande : on passe la prendre au bar ou au passe avant de servir. */
  fetch: boolean;
  state: "pending" | "fetching" | "assigned" | "serving";
  pickupAt: number;
  giveUpAt: number;
  serveLeft: number;
  /** Terminée dans le Service pendant que l'équipe marche : on la garde jusqu'à son arrivée. */
  closing: boolean;
  waitingSaid: boolean;
  staff?: Agent;
  guest?: Agent;
  label: Label;
}

type Member = (typeof gestion.team.members)[number];

/** Un membre de l'équipe du jour : là où il prend son poste, ses heures, sa figurine quand il est là. */
interface Shift {
  member: Member;
  home: string;
  patrol?: string[];
  holds: boolean;
  index: number;
  ranges: [number, number][];
  agent?: Agent;
}

interface Candidate {
  label: Label;
  x: number;
  y: number;
  rank: number;
  depth: number;
  dot: boolean;
}

/** Le bureau de la réception : les demandes de la réception s'y traitent. */
const DESK = "hub-reception";
const ALL: PlanLevel = plan.levels[0].value;
const GROUND: PlanLevel = plan.levels[plan.levels.length - 1].value;
const UP = new THREE.Vector3(0, 1, 0);
const RANK = sim.labels.rank;
/** La grille de voisinage de l'écartement : une case par rayon, indexée par un entier. */
const CELLS = 1024;

const between = ([a, b]: readonly number[]) => a + Math.random() * (b - a);
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const isLevel = (value: unknown): value is PlanLevel => plan.levels.some((l) => l.value === value);
const isPoi = (id: string): id is PoiId => id in plan.pois;
const isOutfit = (id: string): id is Outfit => id in sim.outfits;

function weighted<K extends string>(weights: Partial<Record<K, number>>): K | undefined {
  const entries = (Object.entries(weights) as [K, number][]).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries.at(-1)?.[0];
}

/** Les distances de tout le réseau à un point, et le pas suivant pour y aller (Dijkstra sur un tas binaire). */
function toward(nav: Map<string, NavNode>, to: string) {
  const dist = new Map<string, number>([[to, 0]]);
  const next = new Map<string, string>();
  const heap: [number, string][] = [[0, to]];
  const swap = (i: number, j: number) => ([heap[i], heap[j]] = [heap[j], heap[i]]);
  while (heap.length) {
    const [d, cur] = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (l + 1 < heap.length && heap[l + 1][0] < heap[m][0]) m = l + 1;
        if (m === i) break;
        swap(i, m);
        i = m;
      }
    }
    if (d > (dist.get(cur) ?? Infinity)) continue;
    const node = nav.get(cur);
    if (!node) continue;
    for (const n of node.links) {
      const nn = nav.get(n);
      if (!nn) continue;
      const nd = d + node.p.distanceTo(nn.p);
      if (nd >= (dist.get(n) ?? Infinity)) continue;
      dist.set(n, nd);
      next.set(n, cur);
      heap.push([nd, n]);
      for (let i = heap.length - 1; i > 0; ) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        swap(i, p);
        i = p;
      }
    }
  }
  return { dist, next };
}

export class HotelSim {
  private renderer: THREE.WebGLRenderer;
  private sun: THREE.DirectionalLight;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(sim.camera.fov, 1, 1, 2000);
  private controls: OrbitControls;
  private bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  private dir = new THREE.Vector3().fromArray(sim.camera.direction).normalize();
  private home = { target: new THREE.Vector3(), pos: new THREE.Vector3() };
  private fly: { t: number; from: THREE.Vector3; to: THREE.Vector3; a: THREE.Spherical; b: THREE.Spherical } | null = null;
  private orbit = new THREE.Spherical();
  private ground = 0;
  private kit: FigureKit | null = null;
  private nav = new Map<string, NavNode>();
  private rest = new Map<string, { p: THREE.Vector3; yaw: number }>();
  private pois = new Map<PoiId, { p: THREE.Vector3; dist: number; level: PlanLevel }>();
  private levels: { name: string; base: number; o: THREE.Object3D }[] = [];
  private shown = new Set<string>();
  /** Le plancher du plus haut niveau affiché. */
  private top = Infinity;
  /** Pour chaque point du réseau, le plancher du premier niveau qui le couvre (Infinity : à ciel ouvert). */
  private cover = new Map<string, number>();
  private coverBudget = 0;
  private hits: THREE.Intersection[] = [];
  private tiles = new Map<string, THREE.Mesh>();
  private agents: Agent[] = [];
  private reqs = new Map<string, Req>();
  private taken = new Set<string>();
  private slots = new Map<string, (Agent | null)[]>();
  private grid = new Map<number, Agent[]>();
  private roster: Shift[] = [];
  private minute = -1;
  private occupied: string[] = [];
  private occupiedKey = "";
  private timers = { spawn: 0, request: between(sim.requestEvery) };
  private time = 0;
  private frame = 0;
  private last = 0;
  private width = 0;
  private height = 0;
  private visible = true;
  private interacted = false;
  private disposed = false;
  private loaded = false;
  private synced = false;
  private pending: Activity[] | null = null;
  private lastStats = "";
  private seq = 0;
  private observers: (ResizeObserver | IntersectionObserver)[] = [];
  private candidates: Candidate[] = [];
  private count = 0;
  private perMetre = 1;
  private placed: number[] = [];
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();
  private u = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private down: { x: number; y: number } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private overlay: HTMLElement,
    private cb: Callbacks
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    try {
      const { exposure, environment, hemisphere, sun } = sim.light;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, sim.pixelRatioMax));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = exposure;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.scene.environment = pmrem.fromScene(room, environment.blur).texture;
      this.scene.environmentIntensity = environment.intensity;
      room.dispose();
      pmrem.dispose();
      this.scene.add(new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity));
      this.sun = new THREE.DirectionalLight(sun.color, sun.intensity);
      this.sun.castShadow = true;
      const { size, large, largeFrom, largeMaxDpr } = sim.shadows;
      const wide = (canvas.parentElement ?? canvas).clientWidth >= largeFrom && window.devicePixelRatio <= largeMaxDpr;
      this.sun.shadow.mapSize.setScalar(wide ? large : size);
      this.sun.shadow.radius = sun.radius;
      this.sun.shadow.bias = sun.bias;
      this.sun.shadow.normalBias = sun.normalBias;
      this.scene.add(this.sun, this.sun.target);

      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.enablePan = true;
      this.controls.screenSpacePanning = false;
      this.controls.zoomToCursor = true;
      [this.controls.minPolarAngle, this.controls.maxPolarAngle] = sim.camera.tilt;
      this.controls.addEventListener("start", this.onStart);
      this.controls.addEventListener("change", this.onChange);

      canvas.addEventListener("pointerdown", this.onDown);
      canvas.addEventListener("pointerup", this.onUp);
      canvas.addEventListener("webglcontextlost", this.onLost);

      const resize = new ResizeObserver(() => this.resize());
      resize.observe(canvas.parentElement ?? canvas);
      const seen = new IntersectionObserver((entries) => (this.visible = entries[entries.length - 1].isIntersecting));
      seen.observe(canvas);
      this.observers.push(resize, seen);
      this.resize();
    } catch (error) {
      this.observers.forEach((o) => o.disconnect());
      this.renderer.dispose();
      throw error;
    }
  }

  /** Les deux maquettes, téléchargées dès l'ouverture de la page, en parallèle du code. */
  async load(assets: Promise<[ArrayBuffer, ArrayBuffer]>) {
    const draco = new DRACOLoader().setDecoderPath(sim.model.draco);
    try {
      const loader = new GLTFLoader().setDRACOLoader(draco);
      const [hotelData, figureData] = await assets;
      if (this.disposed) return;
      const [hotel, figures] = await Promise.all([loader.parseAsync(hotelData, ""), loader.parseAsync(figureData, "")]);
      if (this.disposed) return;
      this.kit = new FigureKit(figures.scene);
      this.build(hotel.scene);
      this.spawnStaff();
      this.populate();
      this.loaded = true;
      if (this.pending) this.setActivity(this.pending);
      this.cb.onReady((Object.keys(plan.pois) as PoiId[]).filter((id) => this.pois.has(id)));
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    } catch {
      if (this.disposed) return;
      this.dispose();
      this.cb.onError();
    } finally {
      draco.dispose();
    }
  }

  private build(root: THREE.Object3D) {
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.transparent) {
          m.depthWrite = false;
          o.renderOrder = 1;
        } else {
          o.castShadow = true;
        }
        o.receiveShadow = true;
        if (o.name.startsWith("room-")) {
          o.material = m.clone();
          this.tiles.set(o.name.slice(5), o);
        }
      }
      const base = (o.userData as { base?: number }).base;
      if (o.name.startsWith("level-") && typeof base === "number") this.levels.push({ name: o.name, base, o });
    });
    this.levels.sort((a, b) => a.base - b.base);
    this.levels.forEach((l) => this.shown.add(l.name));
    this.top = this.levels.at(-1)?.base ?? Infinity;
    this.scene.add(root);
    root.updateMatrixWorld(true);

    root.getObjectByName("nav")?.children.forEach((o) => {
      const data = o.userData as { links?: string; spot?: string; level?: string; patrol?: string };
      this.nav.set(o.name, {
        p: o.getWorldPosition(new THREE.Vector3()),
        links: data.links ? data.links.split(",") : [],
        level: data.level ?? GROUND,
        spot: data.spot,
        patrol: data.patrol?.split(","),
      });
    });
    root.getObjectByName("rest")?.children.forEach((o) => {
      this.rest.set(o.name.slice(5), { p: o.getWorldPosition(new THREE.Vector3()), yaw: (o.userData as { yaw?: number }).yaw ?? 0 });
    });
    root.getObjectByName("poi")?.children.forEach((o) => {
      const id = o.name.slice(4);
      const data = o.userData as { dist?: number; level?: string };
      if (isPoi(id) && typeof data.dist === "number") {
        this.pois.set(id, { p: o.getWorldPosition(new THREE.Vector3()), dist: data.dist, level: isLevel(data.level) ? data.level : ALL });
      }
    });
    this.ground = Math.min(...[...this.nav.values()].map((n) => n.p.y));

    const meshes = new THREE.Box3();
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.expandByObject(o);
    });
    this.bounds.copy(meshes);
    const center = this.bounds.getCenter(new THREE.Vector3());
    const radius = this.bounds.getBoundingSphere(new THREE.Sphere()).radius;
    const shadow = this.sun.shadow.camera;
    Object.assign(shadow, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: radius * 4 });
    shadow.updateProjectionMatrix();
    this.sun.position.copy(center).add(this.v.fromArray(sim.light.sun.offset).multiplyScalar(radius));
    this.sun.target.position.copy(center);
    [this.controls.minDistance, this.controls.maxDistance] = sim.camera.zoom.map((z) => z * radius * 2);
    this.camera.far = radius * 8;
    this.resize();
  }

  /** Un niveau choisi garde ceux du dessous ; « Tout » les montre tous. */
  setLevel(level: PlanLevel) {
    const chosen = this.levels.find((l) => l.name === level);
    this.shown.clear();
    this.top = -Infinity;
    for (const l of this.levels) {
      const on = level === ALL || (chosen !== undefined && l.base <= chosen.base && l.name !== ALL);
      l.o.visible = on;
      if (!on) continue;
      this.shown.add(l.name);
      this.top = Math.max(this.top, l.base);
    }
  }

  setRooms(status: Record<string, RoomStatus>) {
    const occupied = Object.entries(status)
      .filter(([, s]) => s === "occupee" || s === "depart")
      .map(([n]) => n);
    const key = occupied.join();
    if (key === this.occupiedKey) return;
    this.occupiedKey = key;
    this.occupied = occupied;
  }

  /** La caméra file vers un endroit ; rend le niveau à montrer. */
  goTo(id: PoiId): PlanLevel | undefined {
    const poi = this.pois.get(id);
    if (!poi) return undefined;
    this.interacted = true;
    const s = new THREE.Spherical().setFromVector3(this.v.subVectors(this.camera.position, this.controls.target));
    s.radius = THREE.MathUtils.clamp(poi.dist, this.controls.minDistance, this.controls.maxDistance);
    s.phi = THREE.MathUtils.clamp(sim.camera.poiTilt, sim.camera.tilt[0], sim.camera.tilt[1]);
    this.flyTo(poi.p, this.w.copy(poi.p).add(this.v.setFromSpherical(s)));
    return poi.level;
  }

  /** Retour au cadrage de départ, toute la maquette dans l'écran. */
  overview() {
    this.interacted = false;
    this.frame3();
    this.flyTo(this.home.target, this.home.pos);
  }

  /** Les demandes de la démo : allumées tant qu'elles sont ouvertes, prises en charge dès leur deuxième étape. */
  setActivity(list: Activity[]) {
    if (!this.loaded) {
      this.pending = list;
      return;
    }
    const quiet = !this.synced;
    this.synced = true;
    const open = new Map(list.filter((a) => a.kind !== "reservation" && a.step < a.steps.length - 1).map((a) => [a.id, a]));
    for (const req of this.reqs.values()) if (req.real && !open.has(req.real)) this.close(req);
    for (const a of open.values()) {
      const spot = a.origin.startsWith("chambre-") ? `door-${a.origin.slice(8)}` : a.origin;
      if (!this.nav.has(spot)) continue;
      let req = this.reqs.get(a.id);
      if (!req) {
        for (const other of this.reqs.values()) if (!other.real && other.spot === spot) this.release(other);
        req = this.request({ real: a.id, mine: !a.seed, spot, what: a.title, team: a.team, desk: a.team === "reception", fetch: a.kind === "commande" });
        if (req.mine && !quiet) this.say(plan.events.asked(req.where, req.what), "pending", true);
      }
      if (a.step > 0 && req.state === "pending") {
        if (quiet) this.settleNow(req);
        else req.pickupAt = this.time;
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observers.forEach((o) => o.disconnect());
    this.controls.removeEventListener("start", this.onStart);
    this.controls.removeEventListener("change", this.onChange);
    this.controls.dispose();
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
      m.dispose();
    });
    this.kit?.dispose();
    this.scene.environment?.dispose();
    this.sun.shadow.dispose();
    this.renderer.dispose();
    if (!this.renderer.getContext().isContextLost()) this.renderer.forceContextLoss();
    this.overlay.replaceChildren();
  }

  // ── La caméra ───────────────────────────────────────────────────────

  private onStart = () => {
    this.interacted = true;
    this.fly = null;
    this.cb.onInteract();
  };

  private onChange = () => {
    this.bounds.clampPoint(this.controls.target, this.controls.target);
    const floor = this.ground + sim.camera.minHeight;
    if (this.camera.position.y < floor) this.camera.position.y = floor;
  };

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
  };

  private onUp = (e: PointerEvent) => {
    if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < sim.camera.tapSlop) this.click(e);
    this.down = null;
  };

  /** Le contexte WebGL perdu : on arrête tout, la page montre l'image fixe. */
  private onLost = () => {
    if (this.disposed) return;
    this.dispose();
    this.cb.onError();
  };

  private resize() {
    const box = this.canvas.parentElement ?? this.canvas;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (!w || !h) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.interacted && !this.fly) {
      this.frame3();
      this.controls.target.copy(this.home.target);
      this.camera.position.copy(this.home.pos);
      this.controls.update();
    }
  }

  /**
   * Le cadrage de départ : la maquette entière dans l'écran, quel que soit son format. On projette les huit
   * coins de la boîte sur les axes de la caméra, on recule juste assez pour que chacun tienne, puis on
   * recentre ce que l'on voit (deux passes suffisent). Un écran étroit se cadre plus serré.
   */
  private frame3() {
    const forward = this.v.copy(this.dir).negate();
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward);
    const fill = this.camera.aspect < sim.camera.narrow ? sim.camera.fillNarrow : sim.camera.fill;
    const tanY = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * fill;
    const tanX = tanY * this.camera.aspect;
    const { min, max } = this.bounds;
    const target = this.bounds.getCenter(this.home.target);
    const corner = new THREE.Vector3();
    let d = 0;
    for (let pass = 0; pass < 3; pass++) {
      d = 0;
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(target);
        const z = corner.dot(this.dir);
        d = Math.max(d, Math.abs(corner.dot(right)) / tanX + z, Math.abs(corner.dot(up)) / tanY + z);
      }
      if (pass === 2) break;
      let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(target);
        const depth = d - corner.dot(this.dir);
        const x = corner.dot(right) / (depth * tanX);
        const y = corner.dot(up) / (depth * tanY);
        [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
      }
      target.addScaledVector(right, ((x0 + x1) / 2) * d * tanX).addScaledVector(up, ((y0 + y1) / 2) * d * tanY);
    }
    this.home.pos.copy(target).addScaledVector(this.dir, Math.min(d, this.controls.maxDistance));
  }

  private flyTo(target: THREE.Vector3, pos: THREE.Vector3) {
    const instant = sim.camera.flyFor <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (instant) {
      this.controls.target.copy(target);
      this.camera.position.copy(pos);
      this.controls.update();
      return;
    }
    this.fly = {
      t: 0,
      from: this.controls.target.clone(),
      to: target.clone(),
      a: new THREE.Spherical().setFromVector3(this.v.subVectors(this.camera.position, this.controls.target)),
      b: new THREE.Spherical().setFromVector3(this.v.subVectors(pos, target)),
    };
  }

  private flying(dt: number) {
    const f = this.fly;
    if (!f) return;
    f.t = Math.min(1, f.t + dt / sim.camera.flyFor);
    const e = easeInOut(f.t);
    this.controls.target.lerpVectors(f.from, f.to, e);
    this.orbit.set(f.a.radius + (f.b.radius - f.a.radius) * e, f.a.phi + (f.b.phi - f.a.phi) * e, f.a.theta + angleTo(f.a.theta, f.b.theta) * e);
    this.camera.position.copy(this.controls.target).add(this.v.setFromSpherical(this.orbit));
    if (f.t >= 1) this.fly = null;
  }

  private click(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const tiles = [...this.tiles.values()].filter((t) => t.parent?.visible !== false);
    const hit = this.ray.intersectObjects(tiles, false)[0];
    if (hit) this.cb.onRoom(hit.object.name.slice(5));
  }

  // ── Le réseau ───────────────────────────────────────────────────────

  /**
   * Le chemin vers `to` depuis là où l'on est vraiment : un nœud, ou le milieu d'une arête (on finit l'arête
   * ou on revient). La place à l'arrivée est réservée dès maintenant.
   */
  private go(a: Agent, to: string) {
    const { dist, next } = toward(this.nav, to);
    const options = a.path[0] && a.path[0] !== a.at ? [a.at, a.path[0]] : [a.at];
    let start = a.at;
    let best = Infinity;
    for (const o of options) {
      const node = this.nav.get(o);
      const cost = node ? a.pos.distanceTo(node.p) + (dist.get(o) ?? Infinity) : Infinity;
      if (cost < best) [best, start] = [cost, o];
    }
    a.path = [];
    if (best === Infinity) {
      this.reserve(a, a.at, a.yaw);
      a.arrive = true;
      return;
    }
    if (a.pos.distanceTo(this.nav.get(start)!.p) > 0.05) a.path.push(start);
    for (let n: string | undefined = start; n !== to; ) {
      n = next.get(n);
      if (!n) break;
      a.path.push(n);
    }
    const end = this.nav.get(a.path.at(-1) ?? a.at)!.p;
    const from = a.path.length > 1 ? this.nav.get(a.path[a.path.length - 2])!.p : a.pos;
    this.reserve(a, a.path.at(-1) ?? a.at, Math.atan2(end.x - from.x, end.z - from.z));
    if (!a.path.length) a.arrive = true;
    if (a.settled) a.hold = sim.motion.rise;
    a.settled = false;
    this.edge(a);
  }

  /**
   * Une place au point d'arrivée : la première libre, en rangs de `columns` (au centre, à droite, à gauche)
   * derrière le premier, face à l'endroit (son point de repos) ou dans le sens d'où l'on vient. Un client
   * à sa place (transat, chaise) ou dans sa chambre est seul : il n'en prend pas.
   */
  private reserve(a: Agent, to: string, approach: number) {
    this.free(a);
    a.offset.set(0, 0, 0);
    if (a.kind === "guest" && (to === a.spot || this.kindOf(to) === "door")) return;
    let list = this.slots.get(to);
    if (!list) this.slots.set(to, (list = []));
    let k = list.indexOf(null);
    if (k < 0) k = list.length;
    list[k] = a;
    a.slotAt = to;
    a.slot = k;
    const yaw = this.rest.get(to)?.yaw ?? approach;
    const { spacing, columns } = sim.slots;
    const row = Math.floor(k / columns);
    const col = k % columns;
    const side = ((col + 1) >> 1) * (col % 2 ? 1 : -1);
    a.offset.set(Math.cos(yaw) * side - Math.sin(yaw) * row, 0, -Math.sin(yaw) * side - Math.cos(yaw) * row).multiplyScalar(spacing);
  }

  private free(a: Agent) {
    if (a.slotAt === undefined) return;
    const list = this.slots.get(a.slotAt);
    if (list?.[a.slot] === a) list[a.slot] = null;
    a.slotAt = undefined;
  }

  /** Avant d'entrer dans une chambre, le chariot reste garé dans le couloir. */
  private edge(a: Agent) {
    if (this.kindOf(a.path[0]) === "door" && this.kindOf(a.at) !== "door") a.rig.park(this.scene);
  }

  private kindOf(spot: string | undefined) {
    return spot ? this.nav.get(spot)?.spot : undefined;
  }

  private placeLabel(spot: string) {
    const kind = this.kindOf(spot) ?? "";
    const n = spot.slice(spot.lastIndexOf("-") + 1);
    const label = plan.places[kind as keyof typeof plan.places];
    return label ? label(n) : spot;
  }

  /**
   * Le plancher du premier niveau au-dessus d'un point (le rooftop au-dessus du salon, l'étage au-dessus
   * d'un couloir) ; Infinity à ciel ouvert. Un lancer de rayon vers le haut par point, une fois, au plus un
   * par image : avant d'être connu, le point est tenu pour couvert.
   */
  private coveredBy(name: string) {
    const known = this.cover.get(name);
    if (known !== undefined || this.coverBudget <= 0) return known ?? -Infinity;
    this.coverBudget--;
    const node = this.nav.get(name);
    let base = Infinity;
    if (node) {
      const own = this.levels.find((l) => l.name === node.level)?.base ?? -Infinity;
      this.ray.set(this.u.copy(node.p).addScaledVector(UP, 0.3), UP);
      for (const l of this.levels) {
        if (l.base <= own) continue;
        this.hits.length = 0;
        this.ray.intersectObject(l.o, true, this.hits);
        if (this.hits.some((h) => !((h.object as THREE.Mesh).material as THREE.Material).transparent)) {
          base = l.base;
          break;
        }
      }
      this.hits.length = 0;
    }
    this.cover.set(name, base);
    return base;
  }

  // ── Les figurines ───────────────────────────────────────────────────

  private guestLook(outfit: Outfit): Look {
    const o = sim.outfits[outfit];
    const skin = pick(sim.skin);
    const resolve = (c: string) => (c === "skin" ? skin : c);
    return {
      top: resolve(pick(o.tops)),
      bottom: resolve(pick(o.bottoms)),
      skin,
      shoe: resolve(pick(o.shoes)),
      hair: pick(sim.hair),
      trim: pick(sim.outfits.casual.bottoms),
      accent: pick(sim.outfits.casual.tops),
      hairStyle: pick(sim.hairStyles) as Look["hairStyle"],
      hat: Math.random() < o.hat ? "sun" : null,
      apron: false,
      skirt: Math.random() < o.skirt,
      props: [...(o.props as readonly FigureProp[]), "bag"],
    };
  }

  private staffLook(team: TeamId): Look {
    const u = sim.uniforms[team];
    return {
      top: u.top,
      bottom: u.bottom,
      skin: pick(sim.skin),
      shoe: sim.shoe,
      hair: pick(sim.hair),
      trim: u.trim,
      accent: u.accent,
      hairStyle: u.hat ? null : (pick(sim.hairStyles) as Look["hairStyle"]),
      hat: u.hat,
      apron: u.apron,
      skirt: false,
      props: u.prop ? [u.prop] : [],
    };
  }

  private agent(kind: Agent["kind"], look: Look, at: string, extra: Partial<Agent>): Agent | null {
    const node = this.nav.get(at);
    if (!node || !this.kit) return null;
    const rig = this.kit.build(look);
    this.scene.add(rig.root);
    const a: Agent = {
      kind,
      rig,
      pos: node.p.clone(),
      yaw: Math.random() * Math.PI * 2,
      path: [],
      at,
      speed: 1,
      vel: 0,
      wait: 0,
      hold: 0,
      arrive: false,
      settled: false,
      still: 0,
      slot: 0,
      offset: new THREE.Vector3(),
      push: new THREE.Vector3(),
      removed: false,
      serveT: 0,
      ...extra,
    };
    this.agents.push(a);
    return a;
  }

  /** Là où la figurine se pose : sa place (transat, chaise…) ou le comptoir de la réception pour un client, son poste pour l'équipe. */
  private restFor(a: Agent) {
    const kind = this.kindOf(a.at);
    if (a.kind === "guest") return a.at === a.spot || kind === "accueil" ? this.rest.get(a.at) : undefined;
    return kind === "hub" || kind === "station" ? this.rest.get(a.at) : undefined;
  }

  // ── Les clients ─────────────────────────────────────────────────────

  private freeSpots(kind: string) {
    if (kind === "door") return [];
    return [...this.nav.entries()].filter(([name, n]) => n.spot === kind && !this.taken.has(name)).map(([name]) => name);
  }

  private activity(outfit: Outfit): string | undefined {
    const weights: Record<string, number> = {};
    for (const [k, w] of Object.entries(sim.destinations)) {
      const pref = (sim.outfits[outfit].prefers as Record<string, number>)[k] ?? 0;
      weights[k] = w * pref;
    }
    for (let tries = 0; tries < 8; tries++) {
      const kind = weighted(weights);
      if (!kind) return undefined;
      const free = this.freeSpots(kind);
      if (free.length) return pick(free);
      delete weights[kind];
    }
    return undefined;
  }

  private claim(agent: Agent, spot: string) {
    if (agent.spot) this.taken.delete(agent.spot);
    agent.spot = spot;
    this.taken.add(spot);
  }

  private outfit(): Outfit {
    return weighted(Object.fromEntries(Object.entries(sim.outfits).map(([k, o]) => [k, o.share])) as Record<Outfit, number>) ?? "casual";
  }

  private guestSpeed() {
    return sim.guestSpeed * between(sim.speedJitter);
  }

  /** À l'ouverture, l'hôtel vit déjà : d'abord les endroits à ne pas laisser vides (nageurs, dîneurs, spa, sport), puis au hasard. */
  private populate() {
    const total = Math.round(sim.guests * sim.start.settled);
    let n = 0;
    for (const [kind, { outfit, count }] of Object.entries(sim.start.places)) {
      if (!isOutfit(outfit)) continue;
      for (let i = 0; i < count && n < total; i++) {
        const free = this.freeSpots(kind);
        if (!free.length || !this.settleGuest(outfit, pick(free), between(sim.stayFor))) break;
        n++;
      }
    }
    for (; n < total; n++) {
      const outfit = this.outfit();
      const spot = this.activity(outfit);
      if (!spot || !this.settleGuest(outfit, spot, between(sim.stayFor) * Math.random())) break;
    }
  }

  /** Un client déjà à sa place : posé, sa valise montée, reparti dans `wait` s. */
  private settleGuest(outfit: Outfit, spot: string, wait: number) {
    const a = this.agent("guest", this.guestLook(outfit), spot, { outfit, speed: this.guestSpeed(), stage: "out" });
    if (!a) return false;
    a.rig.show("bag", false);
    this.claim(a, spot);
    a.wait = wait;
    const rest = this.rest.get(spot);
    if (rest) {
      a.pos.set(rest.p.x, a.pos.y, rest.p.z);
      a.yaw = rest.yaw;
      a.settled = true;
      a.still = sim.motion.lieAfter;
    }
    return true;
  }

  private spawnGuest() {
    const outfit = this.outfit();
    const room = this.occupied.length ? pick(this.occupied) : undefined;
    const speed = this.guestSpeed();
    const lead = this.agent("guest", this.guestLook(outfit), "n-gate", { outfit, room, speed, stage: "arrive" });
    if (!lead) return;
    this.go(lead, "accueil");
    if (Math.random() >= sim.pairShare) return;
    const mate = this.agent("guest", this.guestLook(outfit), "n-gate", { outfit, room, speed, stage: "arrive", partner: lead });
    if (!mate) return;
    lead.partner = mate;
    this.go(mate, "accueil");
    mate.hold = sim.pairDelay;
  }

  private leave(a: Agent) {
    if (a.spot) this.taken.delete(a.spot);
    a.spot = undefined;
    const door = a.room ? `door-${a.room}` : undefined;
    if (door && this.nav.has(door) && a.stage !== "inRoom") {
      a.stage = "pack";
      a.spot = door;
      this.go(a, door);
      return;
    }
    a.stage = "leave";
    a.rig.show("bag", true);
    this.go(a, "n-gate");
  }

  private nextFor(a: Agent) {
    if (!a.room && this.occupied.length) a.room = pick(this.occupied);
    const r = Math.random();
    if (r < sim.leaveShare) return this.leave(a);
    const door = a.room ? `door-${a.room}` : undefined;
    if (door && this.nav.has(door) && r < sim.leaveShare + sim.roomShare) {
      a.stage = "toRoom";
      if (a.spot) this.taken.delete(a.spot);
      a.spot = door;
      this.go(a, door);
      return;
    }
    const next = this.activity(a.outfit ?? "casual");
    if (!next) return void (a.wait = between(sim.stayFor));
    a.stage = "out";
    this.claim(a, next);
    this.go(a, next);
  }

  private guestArrived(a: Agent) {
    if (a.stage === "leave") return this.remove(a);
    if (a.stage === "arrive") {
      a.stage = "checkin";
      a.wait = a.partner?.stage === "checkin" ? a.partner.wait + sim.partnerLag : between(sim.checkIn);
      return;
    }
    if (a.stage === "toRoom") {
      a.stage = "inRoom";
      a.rig.show("bag", false);
    }
    a.wait = a.stage === "pack" ? between(sim.checkIn) : between(sim.stayFor);
  }

  private guestDone(a: Agent) {
    if (a.call) {
      a.wait = between(sim.serveFor);
      return;
    }
    if (a.stage === "pack") {
      a.stage = "leave";
      a.rig.show("bag", true);
      this.go(a, "n-gate");
      return;
    }
    if (a.stage === "checkin") {
      const door = a.room ? `door-${a.room}` : undefined;
      if (door && this.nav.has(door)) {
        a.stage = "toRoom";
        a.spot = door;
        this.go(a, door);
      } else {
        a.rig.show("bag", false);
        this.nextFor(a);
      }
      return;
    }
    this.nextFor(a);
  }

  private remove(a: Agent) {
    if (a.removed) return;
    a.removed = true;
    if (a.spot) this.taken.delete(a.spot);
    this.free(a);
    if (a.call) this.release(a.call);
    if (a.partner?.partner === a) a.partner.partner = undefined;
    a.tag?.el.remove();
    for (const shift of this.roster) if (shift.agent === a) shift.agent = undefined;
    this.scene.remove(a.rig.root);
    const i = this.agents.indexOf(a);
    if (i >= 0) this.agents.splice(i, 1);
  }

  // ── L'équipe et les demandes ────────────────────────────────────────

  /** L'équipe du jour, chacun à son poste ; seuls ceux en service à l'heure de la démo sont là. */
  private spawnStaff() {
    const count = new Map<TeamId, number>();
    for (const member of gestion.team.members) {
      if ("away" in member && member.away) continue;
      const i = count.get(member.team) ?? 0;
      count.set(member.team, i + 1);
      const hub = member.team === "etages" ? `hub-${1 + (i % 4)}` : `hub-${member.team}`;
      const base = this.nav.get(hub);
      const home = member.team === "cuisine" ? base?.patrol?.[i % base.patrol.length] : hub;
      if (!base || !home || !this.nav.has(home)) continue;
      const holds = i === 0 && (sim.holdPost as readonly TeamId[]).includes(member.team);
      this.roster.push({ member, home, holds, patrol: holds ? undefined : base.patrol, index: i, ranges: shiftRanges(member.shift) });
    }
    this.shifts(true);
  }

  /**
   * À chaque minute de la démo : qui prend son service arrive par l'entrée et rejoint son poste, qui le
   * finit termine sa demande en cours puis s'en va. À l'ouverture, ceux en service sont déjà à leur poste.
   */
  private shifts(now = false) {
    const minute = demoMinutes();
    if (minute === this.minute) return;
    this.minute = minute;
    for (const shift of this.roster) {
      const on = shift.ranges.some(([a, b]) => (minute >= a && minute < b) || (minute + 24 * 60 >= a && minute + 24 * 60 < b));
      const a = shift.agent;
      if (on && (!a || a.leaving)) {
        if (a) a.leaving = false;
        else this.clockIn(shift, now);
      } else if (!on && a && !a.leaving) {
        a.leaving = true;
        if (!a.task) this.go(a, "n-gate");
      }
    }
  }

  private clockIn(shift: Shift, now: boolean) {
    const { member, home } = shift;
    const tag = document.createElement("span");
    tag.className = "hd-staff-tag";
    tag.textContent = member.name;
    const a = this.agent("staff", this.staffLook(member.team), now ? home : "n-gate", {
      name: member.name,
      team: member.team,
      home,
      holds: shift.holds,
      patrol: shift.patrol,
      patrolAt: shift.index,
      speed: sim.staffSpeed,
      wait: between(sim.patrolPause),
      tag: this.label(tag),
    });
    if (!a) return;
    shift.agent = a;
    a.rig.show("tray", false);
    if (!now) return this.go(a, home);
    const node = this.nav.get(home)!;
    this.reserve(a, home, a.yaw);
    a.pos.copy(this.restFor(a)?.p ?? node.p).add(a.offset);
    a.pos.y = node.p.y;
  }

  /** Arrivé à un arrêt de ronde, au poste, à une porte : le temps qu'on y reste. */
  private idleWait(a: Agent) {
    const kind = this.kindOf(a.at);
    return between(kind === "station" ? sim.cookFor : kind === "door" ? sim.doorPause : sim.patrolPause);
  }

  private staffIdle(a: Agent) {
    if (a.leaving) return this.go(a, "n-gate");
    if (a.doorFrom) {
      const back = a.doorFrom;
      a.doorFrom = undefined;
      return this.go(a, back);
    }
    if (a.team === "etages" && a.patrol?.includes(a.at) && Math.random() < sim.doorVisit) {
      const doors = this.nav.get(a.at)?.links.filter((n) => this.kindOf(n) === "door") ?? [];
      if (doors.length) {
        a.doorFrom = a.at;
        return this.go(a, pick(doors));
      }
    }
    if (!a.patrol?.length) {
      a.wait = between(sim.patrolPause);
      return;
    }
    a.patrolAt = ((a.patrolAt ?? 0) + 1) % (a.patrol.length + 1);
    this.go(a, a.patrolAt === a.patrol.length ? (a.home ?? a.at) : a.patrol[a.patrolAt]);
  }

  /**
   * Le plus proche de l'équipe concernée, à la longueur du chemin ; si elle est toute prise, les équipes
   * suivantes. Une demande de la démo passe avant les simulées : faute de libre, elle prend le plus proche
   * occupé par une simulée, qui retourne en attente.
   */
  private staffFor(req: Req) {
    const target = req.desk ? DESK : req.spot;
    const { dist } = toward(this.nav, target);
    const teams = [req.team, ...sim.fallbacks[req.team]];
    for (const free of req.real ? [true, false] : [true]) {
      for (const team of teams) {
        let best: Agent | undefined;
        let bestRank = Infinity;
        let bestDist = Infinity;
        for (const a of this.agents) {
          if (a.kind !== "staff" || a.team !== team || a.leaving || (free ? a.task : !a.task || a.task.real)) continue;
          const rank = a.holds && a.home !== target ? 1 : 0;
          const d = dist.get(a.path[0] ?? a.at) ?? Infinity;
          if (rank < bestRank || (rank === bestRank && d < bestDist)) [best, bestRank, bestDist] = [a, rank, d];
        }
        if (best?.task) this.requeue(best.task);
        if (best) return best;
      }
    }
    return undefined;
  }

  /** Une demande simulée rendue : en attente de nouveau, son membre d'équipe libéré. */
  private requeue(req: Req) {
    const s = req.staff!;
    s.task = undefined;
    s.face = undefined;
    s.rig.show("tray", false);
    req.staff = undefined;
    req.state = "pending";
    req.pickupAt = this.time + sim.retryEvery;
    req.label.el.dataset.state = "pending";
    req.label.el.querySelector("span")!.textContent = req.what;
    req.label.dirty = true;
  }

  private label(el: HTMLElement): Label {
    el.style.display = "none";
    this.overlay.append(el);
    return { el, w: 0, h: 0, dirty: true, on: false, dot: false };
  }

  private request(r: { real?: string; mine?: boolean; spot: string; what: string; team: TeamId; desk: boolean; fetch: boolean; guest?: Agent }): Req {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "hd-beacon";
    el.tabIndex = -1;
    const room = r.spot.startsWith("door-") ? r.spot.slice(5) : undefined;
    const where = this.placeLabel(r.spot);
    el.dataset.state = "pending";
    el.title = `${where} · ${r.what}`;
    if (r.mine) el.dataset.real = "";
    const strong = document.createElement("b");
    strong.textContent = where;
    const what = document.createElement("span");
    what.textContent = r.what;
    el.append(strong, what);
    if (room) el.addEventListener("click", () => this.cb.onRoom(room));
    const req: Req = {
      ...r,
      mine: Boolean(r.mine),
      id: r.real ?? `sim-${++this.seq}`,
      room,
      where,
      state: "pending",
      pickupAt: r.real ? Infinity : this.time + between(sim.pickupAfter),
      giveUpAt: r.real ? Infinity : this.time + between(sim.giveUpAfter),
      serveLeft: 0,
      closing: false,
      waitingSaid: false,
      label: this.label(el),
    };
    if (req.guest) req.guest.call = req;
    this.reqs.set(req.id, req);
    return req;
  }

  private busy(spot: string) {
    for (const r of this.reqs.values()) if (r.spot === spot) return true;
    return false;
  }

  private simulateRequest() {
    const kind = weighted(sim.mix);
    if (kind === "seated") {
      const seated = this.agents.filter((a) => a.kind === "guest" && a.stage === "out" && a.settled && a.spot && !a.call && sim.spotTeams[this.kindOf(a.spot) as keyof typeof sim.spotTeams]);
      const guest = seated.length ? pick(seated) : undefined;
      const spot = guest?.spot;
      if (!guest || !spot || this.busy(spot)) return;
      const team = sim.spotTeams[this.kindOf(spot) as keyof typeof sim.spotTeams];
      const space = team in spaces ? spaces[team as keyof typeof spaces] : undefined;
      const item = space ? pick(space.categories.flatMap((c): readonly { name: string }[] => c.items)).name : undefined;
      const order = item !== undefined && Math.random() < sim.orderShare;
      const what = order ? plan.order(item) : waiter.title;
      this.request({ spot, what, team, desk: false, fetch: order, guest });
      this.say(plan.events.asked(this.placeLabel(spot), what), "pending", false);
      return;
    }
    const free = this.occupied.filter((n) => this.nav.has(`door-${n}`) && !this.busy(`door-${n}`));
    if (!free.length) return;
    const spot = `door-${pick(free)}`;
    if (kind === "roomService") {
      const item = pick(roomCopy.roomService.categories.flatMap((c): readonly { name: string }[] => c.items)).name;
      this.request({ spot, what: `${plan.roomService} · ${item}`, team: "room-service", desk: false, fetch: true });
      this.say(plan.events.asked(this.placeLabel(spot), item), "pending", false);
      return;
    }
    const ask = pick(requestKinds);
    const what = ask.ask ? `${ask.label} · ${pick(ask.ask.options)}` : ask.label;
    this.request({ spot, what, team: ask.team, desk: ask.team === "reception", fetch: false });
    this.say(plan.events.asked(this.placeLabel(spot), what), "pending", false);
  }

  /** Le bar ou le passe d'où part une commande, quand celui qui la sert porte un plateau. */
  private pickupFor(req: Req, who: Agent) {
    const hub = `hub-${req.team}`;
    return req.fetch && sim.uniforms[who.team!].prop === "tray" && this.nav.has(hub) ? hub : undefined;
  }

  private dispatch(req: Req, quiet = false) {
    const who = this.staffFor(req);
    if (!who) {
      if (!req.waitingSaid && !quiet) this.say(plan.events.waiting(req.where), "pending", req.mine);
      req.waitingSaid = true;
      return false;
    }
    who.task = req;
    who.doorFrom = undefined;
    req.staff = who;
    req.label.el.dataset.state = "doing";
    req.label.el.querySelector("span")!.textContent = req.mine ? `${req.what} · ${who.name}` : (who.name ?? "");
    req.label.dirty = true;
    const pickup = this.pickupFor(req, who);
    req.state = pickup ? "fetching" : "assigned";
    this.go(who, pickup ?? (req.desk ? DESK : req.spot));
    if (!quiet) {
      if (req.desk) this.say(plan.events.atDesk(who.name ?? "", req.what), "doing", req.mine);
      else this.say(plan.events.onTheWay(who.name ?? "", req.where), "doing", req.mine);
    }
    return true;
  }

  /** À l'ouverture de la page, ce qui est déjà pris en charge l'est déjà sur place : rien ne se rejoue. */
  private settleNow(req: Req) {
    if (!this.dispatch(req, true)) return;
    const s = req.staff!;
    const at = req.desk ? DESK : req.spot;
    const node = this.nav.get(at)!;
    s.at = at;
    s.path = [];
    s.arrive = false;
    this.reserve(s, at, s.yaw);
    s.pos.copy(node.p).add(s.offset);
    s.rig.unpark();
    s.rig.show("tray", false);
    this.serve(s, req);
    s.serveT = sim.motion.handOver;
  }

  private serve(s: Agent, req: Req) {
    req.state = "serving";
    req.serveLeft = req.real && !req.closing ? Infinity : between(sim.serveFor);
    s.serveT = 0;
    const rest = this.rest.get(req.spot);
    s.face = rest && !req.desk ? Math.atan2(rest.p.x - s.pos.x, rest.p.z - s.pos.z) : undefined;
  }

  /** Terminée dans le Service : l'équipe finit de marcher et sert avant que la demande s'éteigne. */
  private close(req: Req) {
    if (req.state === "pending" && !this.dispatch(req)) return this.finish(req);
    if (req.state === "serving") return this.finish(req);
    req.closing = true;
  }

  private finish(req: Req) {
    if (req.state === "serving" && req.staff?.name) this.say(plan.events.done(req.staff.name, req.where), "done", req.mine);
    this.release(req);
  }

  private release(req: Req) {
    this.reqs.delete(req.id);
    req.label.el.remove();
    const tile = req.room ? this.tiles.get(req.room) : undefined;
    if (tile) (tile.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    if (req.guest?.call === req) req.guest.call = undefined;
    const s = req.staff;
    if (s) {
      s.task = undefined;
      s.face = undefined;
      s.rig.show("tray", false);
      if (s.leaving) this.go(s, "n-gate");
      else if (s.home) this.go(s, s.home);
    }
  }

  /** Personne n'a pu venir : le client cesse de faire signe et passe à autre chose. */
  private giveUp(req: Req) {
    const guest = req.guest;
    this.release(req);
    if (guest) guest.wait = 0;
  }

  private say(text: string, tone: PlanEvent["tone"], real: boolean) {
    this.cb.onEvent({ at: clock(), text, tone, real });
  }

  // ── La boucle ───────────────────────────────────────────────────────

  private tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick);
    if (!this.visible || document.hidden) {
      this.last = now;
      return;
    }
    const dt = Math.min((now - this.last) / 1000, sim.maxStep);
    this.last = now;
    this.time += dt;

    this.shifts();
    this.timers.spawn -= dt;
    if (this.timers.spawn <= 0) {
      if (this.agents.reduce((n, a) => n + Number(a.kind === "guest"), 0) < sim.guests) this.spawnGuest();
      this.timers.spawn = between(sim.spawnEvery);
    }
    this.timers.request -= dt;
    if (this.timers.request <= 0) {
      this.simulateRequest();
      this.timers.request = between(sim.requestEvery);
    }

    for (const req of this.reqs.values()) {
      if (req.state === "pending") {
        if (this.time >= req.giveUpAt) this.giveUp(req);
        else if (this.time >= req.pickupAt && !this.dispatch(req)) req.pickupAt = this.time + sim.retryEvery;
      } else if (req.state === "serving" && (!req.real || req.closing)) {
        req.serveLeft -= dt;
        if (req.serveLeft <= 0) this.finish(req);
      }
    }

    let busy = 0;
    let crew = 0;
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      this.move(a, dt);
      if (a.kind === "staff") {
        crew++;
        if (a.task) busy++;
      }
    }
    this.separate(dt);

    this.flying(dt);
    this.controls.update();
    this.draw();
    this.renderer.render(this.scene, this.camera);

    const stats = `${this.reqs.size}|${busy}|${crew}`;
    if (stats !== this.lastStats) {
      this.lastStats = stats;
      this.cb.onStats({ open: this.reqs.size, busy, staff: crew });
    }
  };

  /** La pose à l'arrêt : celle de l'endroit pour un client à sa place ; l'équipe à son poste travaille. */
  private restPose(a: Agent): { motion: Motion; work: boolean } {
    const kind = this.kindOf(a.at);
    if (a.kind === "staff") {
      const task = a.task;
      if (task?.state === "serving") return { motion: "stand", work: task.desk };
      if (kind === "station" && !task) return { motion: "cook", work: false };
      return { motion: "stand", work: !task && (kind === "door" || Boolean(a.holds && a.at === a.home)) };
    }
    if (a.at !== a.spot) return { motion: kind === "door" ? "hidden" : "stand", work: false };
    const pose = (sim.poses as Record<string, FigurePose>)[kind ?? ""] ?? "stand";
    return { motion: pose === "lie" && a.still < sim.motion.lieAfter ? "sit" : pose, work: false };
  }

  private move(a: Agent, dt: number) {
    if (a.arrive) {
      a.arrive = false;
      this.arrived(a);
      if (a.removed) return;
    }
    const s = sim.figureScale;
    const { accel, brakeFloor, turn, yawTolerance } = sim.motion;
    const node = this.nav.get(a.path[0] ?? a.at);
    if (!node) {
      a.path = [];
      return;
    }
    let motion: Motion = "stand";
    let work = false;
    let travel = 0;
    let seat = 0;

    if (a.path.length && a.hold > 0) {
      a.hold -= dt;
    } else if (a.path.length) {
      const flat = this.v.set(node.p.x - a.pos.x, 0, node.p.z - a.pos.z);
      const d = a.pos.distanceTo(node.p);
      const vt = a.path.length === 1 ? Math.min(a.speed, a.speed * brakeFloor + d * accel) : a.speed;
      a.vel += (vt - a.vel) * Math.min(1, dt * accel);
      const step = a.vel * dt;
      const ride = Math.abs(node.p.y - a.pos.y) > 0.05 && flat.lengthSq() < 0.5;
      if (flat.lengthSq() > 1e-4) a.yaw += angleTo(a.yaw, Math.atan2(flat.x, flat.z)) * Math.min(1, dt * turn);
      if (d <= step) {
        travel = flat.length();
        a.pos.copy(node.p);
        this.reach(a);
        if (a.removed) return;
      } else {
        travel = step * (flat.length() / d);
        a.pos.addScaledVector(this.w.subVectors(node.p, a.pos).normalize(), step);
      }
      motion = ride ? "stand" : this.kindOf(a.path[0]) === "nage" || this.kindOf(a.at) === "nage" ? "swim" : "walk";
    } else {
      a.vel = 0;
      const rest = this.restFor(a);
      const goal = this.w.copy(rest?.p ?? node.p).add(a.offset);
      if (rest && a.kind === "staff" && this.kindOf(a.at) === "station") {
        goal.x += Math.sin(rest.yaw) * sim.cookReach;
        goal.z += Math.cos(rest.yaw) * sim.cookReach;
      }
      const yaw = rest?.yaw ?? a.face ?? a.yaw;
      if (!a.settled) {
        const flat = this.v.set(goal.x - a.pos.x, 0, goal.z - a.pos.z);
        const d = flat.length();
        if (d > 0.05) {
          const step = Math.min(d, a.speed * brakeFloor * dt);
          a.yaw += angleTo(a.yaw, Math.atan2(flat.x, flat.z)) * Math.min(1, dt * turn);
          a.pos.addScaledVector(flat.normalize(), step);
          travel = step;
          motion = "walk";
        } else {
          a.pos.set(goal.x, node.p.y, goal.z);
          a.yaw += angleTo(a.yaw, yaw) * Math.min(1, dt * turn);
          if (Math.abs(angleTo(a.yaw, yaw)) < yawTolerance) {
            a.settled = true;
            a.still = 0;
          }
        }
      }
      if (a.settled) {
        a.still += dt;
        a.yaw += angleTo(a.yaw, yaw) * Math.min(1, dt * turn);
        ({ motion, work } = this.restPose(a));
        if (rest) seat = (rest.p.y - node.p.y) / s;
        a.wait -= dt;
        if (a.wait <= 0) {
          if (a.kind === "guest") this.guestDone(a);
          else if (a.task?.state === "fetching") {
            a.task.state = "assigned";
            this.go(a, a.task.desk ? DESK : a.task.spot);
          } else if (!a.task) this.staffIdle(a);
          if (a.removed) return;
        }
      }
    }

    const task = a.task;
    let serve = -1;
    if (task?.state === "serving" && !a.path.length && a.settled) {
      a.serveT += dt;
      if (!task.desk && a.serveT < sim.motion.handOver) serve = a.serveT / sim.motion.handOver;
      else if (a.rig.has("tray")) a.rig.show("tray", false);
    }
    if (a.outfit === "swim") a.rig.show("towel", motion === "walk" || motion === "stand");
    if (a.outfit === "sport") a.rig.show("racket", motion === "swing");

    a.rig.update(motion, dt, {
      travel,
      pace: a.vel / a.speed,
      wave: Boolean(a.call && a.call.state !== "serving"),
      work,
      serve,
      seat,
    });
    a.rig.root.position.copy(a.pos).add(a.push);
    a.rig.root.rotation.y = a.yaw;
  }

  /**
   * En chemin, on ne se rentre pas dedans : chaque figurine qui marche s'écarte de celles qu'elle frôle
   * (de moitié si l'autre marche aussi), d'au plus `separation.max` ; l'écart se résorbe une fois loin.
   * Les voisines se trouvent dans une grille d'un rayon de côté, sans parcourir toutes les paires.
   */
  private separate(dt: number) {
    const { radius, max, rate } = sim.separation;
    const k = Math.min(1, dt * rate);
    for (const cell of this.grid.values()) cell.length = 0;
    const key = (x: number, z: number) => (Math.floor(x / radius) + CELLS / 2) * CELLS + Math.floor(z / radius) + CELLS / 2;
    for (const a of this.agents) {
      if (!a.rig.root.visible) continue;
      const p = a.rig.root.position;
      const id = key(p.x, p.z);
      let cell = this.grid.get(id);
      if (!cell) this.grid.set(id, (cell = []));
      cell.push(a);
    }
    for (const a of this.agents) {
      const moving = a.path.length > 0 || !a.settled;
      if (!moving || !a.rig.root.visible) {
        a.push.multiplyScalar(1 - k);
        continue;
      }
      const p = a.rig.root.position;
      const away = this.u.set(0, 0, 0);
      const cx = Math.floor(p.x / radius) + CELLS / 2;
      const cz = Math.floor(p.z / radius) + CELLS / 2;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const cell = this.grid.get((cx + i) * CELLS + cz + j);
          if (!cell) continue;
          for (const b of cell) {
            if (b === a) continue;
            const q = b.rig.root.position;
            if (Math.abs(q.y - p.y) > 1) continue;
            let dx = p.x - q.x;
            let dz = p.z - q.z;
            const d = Math.hypot(dx, dz);
            if (d >= radius) continue;
            if (d < 1e-3) [dx, dz] = [Math.cos(a.yaw), -Math.sin(a.yaw)];
            const share = (radius - d) * (b.path.length > 0 || !b.settled ? 0.5 : 1);
            const n = Math.max(d, 1e-3);
            away.x += (dx / n) * share;
            away.z += (dz / n) * share;
          }
        }
      }
      if (away.lengthSq() > 0) a.push.addScaledVector(away, k);
      else a.push.multiplyScalar(1 - k);
      if (a.push.length() > max) a.push.setLength(max);
    }
  }

  /** Un nœud atteint : le suivant, ou l'arrivée. */
  private reach(a: Agent) {
    a.at = a.path.shift()!;
    if (a.rig.parked && this.kindOf(a.at) !== "door") a.rig.unpark();
    if (a.path.length) return this.edge(a);
    a.settled = false;
    this.arrived(a);
  }

  private arrived(a: Agent) {
    if (a.kind === "guest") return this.guestArrived(a);
    if (a.leaving && !a.task) return a.at === "n-gate" ? this.remove(a) : this.go(a, "n-gate");
    const req = a.task;
    if (!req) {
      a.wait = this.idleWait(a);
      return;
    }
    if (req.state === "fetching") {
      a.rig.show("tray", true);
      a.wait = between(sim.pickupPause);
      return;
    }
    if (req.state === "assigned" && a.at === (req.desk ? DESK : req.spot)) this.serve(a, req);
  }

  /**
   * Les étiquettes suivent la maquette, sans se chevaucher : d'abord les demandes du visiteur, puis celles
   * en attente, celles prises en charge, enfin les noms de l'équipe. Jamais celle d'une figurine cachée,
   * d'un niveau masqué, hors du cadre, ni, de près, celle d'un endroit sous un étage affiché.
   */
  private draw() {
    const s = sim.figureScale;
    const { lift } = sim.labels;
    this.perMetre = this.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.count = 0;
    this.coverBudget = 1;
    const add = this.candidate;

    for (const a of this.agents) {
      const on = this.shown.has(this.nav.get(a.path[0] ?? a.at)?.level ?? GROUND) && this.shown.has(this.nav.get(a.at)?.level ?? GROUND);
      if (!on) a.rig.root.visible = false;
      a.rig.showParked(on);
      const tagged =
        a.tag &&
        on &&
        a.rig.root.visible &&
        a.task &&
        a.task.state !== "serving" &&
        this.coveredBy(a.at) > this.top &&
        add(a.tag, a.rig.root.position, lift.staff * s, RANK.staff, sim.labels.staff, false);
      if (a.tag && !tagged) this.hide(a.tag);
    }
    const { low, speed } = sim.pulse;
    const pulse = low + (1 - low) * (0.5 + 0.5 * Math.sin(this.time * speed));
    for (const req of this.reqs.values()) {
      const node = this.nav.get(req.spot);
      if (!node) continue;
      const rank = req.mine ? RANK.mine : req.state === "pending" ? RANK.pending : RANK.doing;
      const under = this.coveredBy(req.spot) <= this.top;
      if (!(this.shown.has(node.level) && add(req.label, node.p, lift.request * s, rank, sim.labels.full, under))) this.hide(req.label);
      const tile = req.room ? this.tiles.get(req.room) : undefined;
      if (tile) {
        const m = tile.material as THREE.MeshStandardMaterial;
        m.emissive.set(req.mine ? sim.glowReal : sim.glow);
        m.emissiveIntensity = (req.mine ? sim.glowStrength.real : sim.glowStrength.sim) * (req.state === "pending" ? pulse : 1);
      }
    }

    const list = this.candidates;
    const n = this.count;
    for (let i = 1; i < n; i++) {
      const c = list[i];
      let j = i - 1;
      while (j >= 0 && (list[j].rank > c.rank || (list[j].rank === c.rank && list[j].depth > c.depth))) {
        list[j + 1] = list[j];
        j--;
      }
      list[j + 1] = c;
    }
    this.placed.length = 0;
    let tags = 0;
    for (let i = 0; i < n; i++) {
      const c = list[i];
      const l = c.label;
      const staff = c.rank === RANK.staff;
      if (staff && tags >= sim.labels.staffMax) {
        this.hide(l);
        continue;
      }
      let dot = c.dot;
      if (!dot) {
        this.show(l, false);
        if (l.dirty) {
          l.w = l.el.offsetWidth;
          l.h = l.el.offsetHeight;
          l.dirty = false;
        }
        const x0 = c.x - l.w / 2;
        const x1 = c.x + l.w / 2;
        const y0 = c.y - l.h;
        const y1 = c.y;
        if (x0 < 0 || x1 > this.width || y0 < 0 || y1 > this.height) {
          this.hide(l);
          continue;
        }
        let clash = false;
        for (let k = 0; k < this.placed.length && !clash; k += 4) {
          clash = x0 < this.placed[k + 2] && x1 > this.placed[k] && y0 < this.placed[k + 3] && y1 > this.placed[k + 1];
        }
        if (clash && staff) {
          this.hide(l);
          continue;
        }
        if (clash) dot = true;
        else this.placed.push(x0, y0, x1, y1);
      }
      if (staff) tags++;
      this.show(l, dot);
      l.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) translate(-50%, -100%)`;
    }
  }

  /**
   * Une étiquette candidate, projetée à l'écran ; `minPpm` : sous ce zoom, un point (ou rien, pour l'équipe) ;
   * `under` : sous un étage affiché, elle disparaît de près.
   */
  private candidate = (label: Label, p: THREE.Vector3, lift: number, rank: number, minPpm: number, under: boolean) => {
    this.v.copy(p);
    this.v.y += lift;
    const depth = this.v.distanceTo(this.camera.position);
    this.v.project(this.camera);
    if (this.v.z >= 1 || Math.abs(this.v.x) > 1 || Math.abs(this.v.y) > 1) return false;
    const ppm = this.perMetre / depth;
    if (rank === RANK.staff && ppm < minPpm) return false;
    if (under && ppm > sim.labels.covered) return false;
    const c = (this.candidates[this.count++] ??= { label, x: 0, y: 0, rank: 0, depth: 0, dot: false });
    c.label = label;
    c.x = ((this.v.x + 1) / 2) * this.width;
    c.y = ((1 - this.v.y) / 2) * this.height;
    c.rank = rank;
    c.depth = depth;
    c.dot = rank > RANK.mine && ppm < minPpm;
    return true;
  };

  private show(l: Label, dot: boolean) {
    if (!l.on) {
      l.el.style.display = "";
      l.on = true;
    }
    if (l.dot !== dot) {
      l.dot = dot;
      if (dot) l.el.dataset.dot = "";
      else delete l.el.dataset.dot;
    }
  }

  private hide(l: Label) {
    if (!l.on) return;
    l.el.style.display = "none";
    l.on = false;
  }
}
