"use client";

import Image, { type StaticImageData } from "next/image";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/*
 * Signature du site : une couche de vieille peinture posée sur une vraie photo
 * de chantier, que le visiteur décape au passage du curseur (ou du doigt).
 * Deux toiles superposées : la peinture, effacée en destination-out, et la
 * poussière d'abrasif, purement décorative. La couverture est suivie sur une
 * grille grossière plutôt que par getImageData, qui relirait des mégaoctets
 * à chaque passe.
 */

// Réglages de l'effet, relatifs au plus petit côté du panneau.
const BRUSH = 0.085;
const PASSES_TO_CLEAR = 2;
const AUTO_FINISH = 0.5;
const INTRO_MS = 2600;
const MAX_DUST = 360;
// Teinte de la peinture (chaux vieillie) et de la poussière d'abrasif.
const PAINT = "236, 231, 221";
const DUST = "241, 236, 227";

type Dust = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };

type Props = {
  src: StaticImageData;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
  hint?: { mouse: string; touch: string };
  children?: React.ReactNode;
};

export function Gommage({ src, alt, sizes, preload, className, hint, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const paintRef = useRef<HTMLCanvasElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<"loading" | "intro" | "ready" | "done">("loading");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const paint = paintRef.current;
    const dust = dustRef.current;
    const img = imgRef.current;
    const ctx = paint?.getContext("2d");
    const dctx = dust?.getContext("2d");
    if (!wrap || !paint || !dust || !img || !ctx || !dctx) return;

    let w = 0;
    let h = 0;
    let brush = 0;
    let cell = 0;
    let cols = 0;
    let hits = new Uint8Array(0);
    let cleared = 0;
    let last: { x: number; y: number } | null = null;
    let particles: Dust[] = [];
    let dustFrame = 0;
    let introFrame = 0;
    let finished = false;
    let disposed = false;

    const grain = document.createElement("canvas");
    grain.width = grain.height = 160;
    const gctx = grain.getContext("2d")!;
    const gdata = gctx.createImageData(160, 160);
    for (let i = 0; i < gdata.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      gdata.data[i] = v;
      gdata.data[i + 1] = v * 0.97;
      gdata.data[i + 2] = v * 0.92;
      gdata.data[i + 3] = 46;
    }
    gctx.putImageData(gdata, 0, 0);

    // Graine fixe : les écailles tombent au même endroit à chaque visite.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    function drawPaint() {
      ctx!.globalCompositeOperation = "source-over";
      const s = Math.max(w / img!.naturalWidth, h / img!.naturalHeight);
      const dw = img!.naturalWidth * s;
      const dh = img!.naturalHeight * s;
      ctx!.drawImage(img!, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx!.fillStyle = `rgba(${PAINT}, 0.88)`;
      ctx!.fillRect(0, 0, w, h);
      ctx!.fillStyle = ctx!.createPattern(grain, "repeat")!;
      ctx!.fillRect(0, 0, w, h);

      // Écailles : la peinture a déjà sauté par endroits, comme sur un vrai
      // plafond avant décapage. Chaque éclat est un polygone anguleux dont
      // l'ombre, décalée d'un pixel, dessine l'épaisseur de la couche.
      seed = 7;
      const unit = Math.min(w, h);
      for (let i = 0; i < 14; i++) {
        const cx = rand() * w;
        const cy = rand() * h;
        const size = (0.008 + rand() * rand() * 0.04) * unit;
        const stretch = 1 + rand() * 1.8;
        const turn = rand() * Math.PI;
        const sides = 6 + Math.floor(rand() * 5);
        const pts: [number, number][] = [];
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * Math.PI * 2;
          const r = size * (0.45 + rand() * 0.55);
          const px = Math.cos(a) * r * stretch;
          const py = Math.sin(a) * r;
          pts.push([cx + px * Math.cos(turn) - py * Math.sin(turn), cy + px * Math.sin(turn) + py * Math.cos(turn)]);
        }
        const flake = (dx: number, dy: number) => {
          ctx!.beginPath();
          pts.forEach(([x, y], k) => (k ? ctx!.lineTo(x + dx, y + dy) : ctx!.moveTo(x + dx, y + dy)));
          ctx!.closePath();
          ctx!.fill();
        };
        ctx!.globalCompositeOperation = "source-over";
        ctx!.fillStyle = "rgba(70, 58, 44, 0.35)";
        flake(1.2, 1.6);
        ctx!.globalCompositeOperation = "destination-out";
        ctx!.fillStyle = `rgba(0,0,0,${0.8 + rand() * 0.2})`;
        flake(0, 0);
      }
    }

    function layout() {
      const rect = wrap!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      for (const c of [paint!, dust!]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      brush = Math.min(w, h) * BRUSH + 18;
      cell = brush * 0.6;
      cols = Math.ceil(w / cell);
      hits = new Uint8Array(cols * Math.ceil(h / cell));
      cleared = 0;
      drawPaint();
    }

    function mark(x: number, y: number) {
      const r = Math.ceil(brush / cell) - 1;
      const ci = Math.floor(x / cell);
      const ri = Math.floor(y / cell);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const c = ci + dx;
          const row = ri + dy;
          if (c < 0 || c >= cols || row < 0) continue;
          const i = row * cols + c;
          if (i >= hits.length || hits[i] >= PASSES_TO_CLEAR) continue;
          if (++hits[i] === PASSES_TO_CLEAR) cleared++;
        }
      }
      if (!finished && cleared / hits.length > AUTO_FINISH) finish();
    }

    function spray(x: number, y: number) {
      ctx!.globalCompositeOperation = "destination-out";
      const g = ctx!.createRadialGradient(x, y, 0, x, y, brush);
      g.addColorStop(0, "rgba(0,0,0,0.7)");
      g.addColorStop(0.6, "rgba(0,0,0,0.35)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(x, y, brush, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = "rgba(0,0,0,0.45)";
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = brush * (0.6 + Math.random() * 0.6);
        ctx!.beginPath();
        ctx!.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + Math.random() * brush * 0.07, 0, Math.PI * 2);
        ctx!.fill();
      }
      mark(x, y);
      for (let i = 0; i < 4 && particles.length < MAX_DUST; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 0.6 + Math.random() * 2.6;
        const max = 34 + Math.random() * 40;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life: max, max, r: 0.5 + Math.random() * 1.5 });
      }
      if (!dustFrame) dustFrame = requestAnimationFrame(tickDust);
    }

    function stroke(x: number, y: number) {
      if (finished) return;
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        const dist = Math.hypot(dx, dy);
        const step = brush * 0.3;
        for (let t = step; t < dist; t += step) spray(last.x + (dx * t) / dist, last.y + (dy * t) / dist);
      }
      spray(x, y);
      last = { x, y };
    }

    function tickDust() {
      dctx!.clearRect(0, 0, w, h);
      particles = particles.filter((p) => p.life-- > 0);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.vx *= 0.985;
        dctx!.fillStyle = `rgba(${DUST}, ${(p.life / p.max) * 0.75})`;
        dctx!.beginPath();
        dctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        dctx!.fill();
      }
      dustFrame = particles.length ? requestAnimationFrame(tickDust) : 0;
    }

    // Passe d'ouverture : une buse invisible balaie le panneau en lacets,
    // assez pour montrer le geste, pas assez pour tout découvrir.
    function intro() {
      setPhase("intro");
      const start = performance.now();
      last = null;
      const run = (now: number) => {
        if (disposed || finished) return;
        const t = Math.min((now - start) / INTRO_MS, 1);
        const e = 1 - Math.pow(1 - t, 2.2);
        const x = w * (0.12 + 0.76 * (0.5 - 0.5 * Math.cos(e * Math.PI * 5)));
        const y = h * (0.3 + 0.32 * e);
        stroke(x, y);
        if (t < 1) introFrame = requestAnimationFrame(run);
        else {
          last = null;
          setPhase("ready");
        }
      };
      introFrame = requestAnimationFrame(run);
    }

    function finish() {
      finished = true;
      setPhase("done");
    }
    finishRef.current = finish;

    const point = (e: PointerEvent) => {
      const r = wrap!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.buttons === 0) return;
      const p = point(e);
      stroke(p.x, p.y);
    };
    const onDown = (e: PointerEvent) => {
      last = null;
      const p = point(e);
      stroke(p.x, p.y);
    };
    const onLeave = () => {
      last = null;
    };

    let resizeFrame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (!finished && w && Math.abs(wrap!.getBoundingClientRect().width - w) > 1) layout();
      });
    });

    const start = () => {
      if (disposed) return;
      layout();
      ro.observe(wrap!);
      wrap!.addEventListener("pointermove", onMove);
      wrap!.addEventListener("pointerdown", onDown);
      wrap!.addEventListener("pointerleave", onLeave);
      intro();
    };
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener("load", start, { once: true });

    return () => {
      disposed = true;
      img.removeEventListener("load", start);
      ro.disconnect();
      cancelAnimationFrame(dustFrame);
      cancelAnimationFrame(introFrame);
      cancelAnimationFrame(resizeFrame);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden touch-pan-y select-none ${className ?? ""}`}
    >
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        sizes={sizes}
        preload={preload}
        placeholder="blur"
        fill
        className="object-cover"
      />
      {/* Toujours rendues pour que le HTML serveur et client concordent ; la
          préférence « moins d'animations » les masque en CSS. */}
      <canvas
        ref={paintRef}
        aria-hidden
        className={`absolute inset-0 size-full transition-opacity duration-[1400ms] ease-out motion-reduce:hidden ${
          phase === "done" ? "opacity-0" : ""
        }`}
        style={phase === "loading" ? { background: `rgb(${PAINT})` } : undefined}
      />
      <canvas ref={dustRef} aria-hidden className="pointer-events-none absolute inset-0 size-full motion-reduce:hidden" />
      {hint && (
        <div
          inert={phase !== "ready"}
          className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 transition-opacity duration-700 motion-reduce:hidden ${
            phase === "ready" ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="label text-basalte/80">
            <span className="pointer-coarse:hidden">{hint.mouse}</span>
            <span className="hidden pointer-coarse:inline">{hint.touch}</span>
          </p>
          <button
            type="button"
            onClick={() => finishRef.current()}
            className="label shrink-0 border-b border-basalte/40 pb-0.5 text-basalte transition-colors hover:border-basalte"
          >
            Tout décaper
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
