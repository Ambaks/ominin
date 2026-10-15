import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { deck, footnote, type SourceId, type Venue } from "@/lib/pitch/groupe-ckl";
import { sourcesLabel } from "@/lib/pitch/kit";

/*
 * Les pièces communes des diapositives du Groupe CKL, dessinées à 1 920 ×
 * 1 080 px (les tailles sont en pixels de diapositive). Les éléments qui
 * entrent portent data-anim (rise, fade, wipe, pop, converge) et leur rang
 * --i : deck.css les anime quand la diapositive arrive à l'écran.
 */

type Anim = "rise" | "fade" | "wipe" | "pop" | "converge";

/** Les attributs d'un élément qui entre, au rang i. */
export const anim = (kind: Anim, i = 0, style?: CSSProperties) => ({
  "data-anim": kind,
  style: { "--i": i, ...style } as CSSProperties,
});

export function Slide({
  index,
  total,
  label,
  note,
  glow,
  children,
}: {
  index: number;
  total: number;
  /** Le titre de la diapositive, pour les lecteurs d'écran. */
  label: string;
  /** Le pied de page gauche : les sources, ou une mention. */
  note?: ReactNode;
  /** Le centre du halo braise, en % de la diapositive. */
  glow?: { x: number; y: number };
  children: ReactNode;
}) {
  const page = (n: number) => String(n).padStart(2, "0");
  return (
    <section className="deck-frame" aria-label={deck.slideLabel(index, total, label)} suppressHydrationWarning>
      <div className="deck-slide ckl-slide" style={glow && ({ "--glow-x": `${glow.x}%`, "--glow-y": `${glow.y}%` } as CSSProperties)}>
        <div className="relative flex h-full flex-col px-[128px] pb-[52px] pt-[88px]">
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
          <footer className="mt-[24px] flex items-end justify-between gap-[64px] text-[16px] leading-[1.45] text-(--ckl-faint)">
            <p className="max-w-[1400px]">{note}</p>
            <p className="shrink-0 tabular-nums">
              {deck.footer}
              <span className="px-[14px] opacity-50">/</span>
              {page(index)}
              <span className="opacity-50"> · {page(total)}</span>
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}

/** « Sources : a · b » au pied d'une diapositive. */
export function Sources({ ids, extra }: { ids: readonly SourceId[]; extra?: string }) {
  return (
    <>
      {sourcesLabel(new Set(ids).size)}
      {footnote(ids)}
      {extra && ` · ${extra}`}
    </>
  );
}

export function Eyebrow({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return (
    <p className="ckl-eyebrow" {...anim("fade", i)}>
      {children}
    </p>
  );
}

/** Un titre dont la fin passe en ambre ; split : la fin à la ligne. */
export function Title({
  title,
  size = 84,
  split = false,
  i = 1,
  className = "",
}: {
  title: { text: string; accent: string };
  size?: number;
  split?: boolean;
  i?: number;
  className?: string;
}) {
  return (
    <h2 className={`ckl-display leading-[1.04] ${className}`} style={{ fontSize: size, "--i": i } as CSSProperties} data-anim="rise">
      {title.text}
      {split ? <br /> : " "}
      <span className="ckl-accent">{title.accent}</span>
    </h2>
  );
}

/**
 * L'emblème rond d'un établissement, cerclé de sa couleur ; ses initiales en
 * pointillé tant qu'il n'a pas de carte. alt : son nom, quand rien ne l'écrit
 * à côté.
 */
export function VenueMark({ venue, size, alt = "" }: { venue: Venue; size: number; alt?: string }) {
  const style = { width: size, height: size, "--venue": venue.color } as CSSProperties;
  if (!venue.mark) {
    const initials = venue.name
      .split(" ")
      .map((word) => word[0])
      .join("");
    return (
      <span className="ckl-mark ckl-mark-pending" style={{ ...style, fontSize: size * 0.34 }} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={!alt || undefined}>
        {initials}
      </span>
    );
  }
  return (
    <span className="ckl-mark" style={style}>
      <Image src={venue.mark} alt={alt} width={size * 2} height={size * 2} unoptimized />
    </span>
  );
}
