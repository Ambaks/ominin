"use client";

import Image, { type StaticImageData } from "next/image";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import { duration, ease } from "@/lib/motion";

type Props = {
  before: StaticImageData;
  after: StaticImageData;
  alt: string;
  sizes: string;
  className?: string;
};

/*
 * Comparateur avant / après. À l'entrée dans l'écran, le trait balaie l'image
 * de droite à gauche comme une passe de décapage, puis s'arrête au milieu.
 * Glisser n'importe où dans l'image déplace le trait ; le curseur range
 * (lecteurs d'écran, clavier) porte la même valeur.
 */
export function BeforeAfter({ before, after, alt, sizes, className }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const pos = useMotionValue(100);
  const inView = useInView(frame, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const clip = useTransform(pos, (p) => `inset(0 ${100 - p}% 0 0)`);
  const left = useTransform(pos, (p) => `${p}%`);

  useEffect(() => {
    if (!inView) return;
    if (reduced) return pos.set(50);
    const controls = animate(pos, 50, { duration: duration.curtain * 1.4, ease: ease.curtain });
    return () => controls.stop();
  }, [inView, pos, reduced]);

  useMotionValueEvent(pos, "change", (p) => {
    if (range.current) range.current.value = String(Math.round(p));
  });

  const setFromPointer = (e: React.PointerEvent) => {
    const r = frame.current!.getBoundingClientRect();
    pos.stop();
    pos.set(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={frame}
      className={`group relative cursor-ew-resize touch-pan-y select-none overflow-hidden ${className ?? ""}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromPointer(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e);
      }}
    >
      <Image src={after} alt={`${alt} — après`} sizes={sizes} placeholder="blur" fill className="object-cover" />
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <Image src={before} alt={`${alt} — avant`} sizes={sizes} placeholder="blur" fill className="object-cover" />
      </motion.div>

      <span className="label pointer-events-none absolute left-4 top-4 bg-basalte/70 px-2.5 py-1.5 text-chaux backdrop-blur-sm">
        Avant
      </span>
      <span className="label pointer-events-none absolute right-4 top-4 bg-chaux/85 px-2.5 py-1.5 text-basalte backdrop-blur-sm">
        Après
      </span>

      <motion.div className="pointer-events-none absolute inset-y-0 -ml-px w-0.5 bg-chaux" style={{ left }}>
        <span className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-chaux/70 bg-basalte/45 text-chaux backdrop-blur-md transition-transform duration-300 group-active:scale-90 group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-4 group-has-[:focus-visible]:outline-chaux">
          <svg width="22" height="12" viewBox="0 0 22 12" fill="none" aria-hidden>
            <path d="M6 1 1 6l5 5M16 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </span>
      </motion.div>

      <input
        ref={range}
        type="range"
        min={0}
        max={100}
        defaultValue={100}
        aria-label={`${alt} : part de l'image avant`}
        onChange={(e) => {
          pos.stop();
          pos.set(Number(e.target.value));
        }}
        className="sr-only"
      />
    </div>
  );
}
