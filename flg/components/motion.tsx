"use client";

import Image, { type StaticImageData } from "next/image";
import { MotionConfig, motion, useScroll, useTransform } from "motion/react";
import { Fragment, useRef } from "react";
import { duration, ease, stagger } from "@/lib/motion";

const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

/** prefers-reduced-motion : Motion coupe alors les transformations et ne garde que les fondus. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: duration.reveal, ease: ease.out, delay }}
    >
      {children}
    </Tag>
  );
}

/*
 * Titre qui monte mot à mot depuis sa ligne de base. Les mots entre *astérisques*
 * sont posés en <em> (accent). Le texte complet reste lisible d'un bloc par
 * les lecteurs d'écran.
 */
export function RiseText({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  onView = true,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  onView?: boolean;
}) {
  const words = text.split(/(\*[^*]+\*)/).flatMap((part) =>
    part.startsWith("*")
      ? part.slice(1, -1).split(" ").map((w) => ({ w, em: true }))
      : part.split(" ").filter(Boolean).map((w) => ({ w, em: false })),
  );
  const target = { y: "0%" };

  return (
    <Tag className={className} aria-label={text.replaceAll("*", "")}>
      {words.map(({ w, em }, i) => {
        const word = (
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: "112%" }}
            {...(onView ? { whileInView: target, viewport } : { animate: target })}
            transition={{ duration: duration.curtain, ease: ease.out, delay: delay + i * stagger }}
          >
            {w}
          </motion.span>
        );
        return (
          <Fragment key={i}>
            <span aria-hidden className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
              {em ? <em>{word}</em> : word}
            </span>{" "}
          </Fragment>
        );
      })}
    </Tag>
  );
}

/*
 * Image qui se découvre de bas en haut, l'image elle-même se posant en léger
 * recul. Moins d'animations : le CSS annule le rideau (le zoom, transformation,
 * est déjà coupé par MotionConfig) — même rendu serveur et client.
 */
export function CurtainImage({
  src,
  alt,
  sizes,
  className,
  imageClassName,
}: {
  src: StaticImageData;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden motion-reduce:[clip-path:none]! ${className ?? ""}`}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={viewport}
      transition={{ duration: duration.curtain, ease: ease.curtain }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.22 }}
        whileInView={{ scale: 1 }}
        viewport={viewport}
        transition={{ duration: duration.curtain * 1.6, ease: ease.out }}
      >
        <Image src={src} alt={alt} sizes={sizes} placeholder="blur" fill className={`object-cover ${imageClassName ?? ""}`} />
      </motion.div>
    </motion.div>
  );
}

/** Image en profondeur : elle glisse plus lentement que la page dans son cadre. */
export function ParallaxImage({
  src,
  alt,
  sizes,
  className,
}: {
  src: StaticImageData;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-9%", "9%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div className="absolute -inset-y-[10%] inset-x-0 motion-reduce:transform-none!" style={{ y }}>
        <Image src={src} alt={alt} sizes={sizes} placeholder="blur" fill className="object-cover" />
      </motion.div>
    </div>
  );
}
