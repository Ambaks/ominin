import Image from "next/image";
import type { CSSProperties } from "react";
import { Reveal } from "@/components/landing-kit/reveal";
import type { Feature } from "@/lib/landing-data";
import { photoAlt, type HotelPhoto } from "@/lib/hotels-landing-data";
import { photos } from "./photos";

/* Pièces communes de la landing hôtels : photo, pastille en direct, jauge, colonnes de texte. */

export function Photo({
  name,
  sizes,
  priority,
  className = "object-cover",
}: {
  name: HotelPhoto;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={photos[name]}
      alt={photoAlt[name]}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      className={className}
    />
  );
}

/** Titre de la copy : le passage entre astérisques passe en italique de laiton. */
export function Accent({ text }: { text: string }) {
  return text.split(/\*(.+?)\*/).map((part, i) =>
    i % 2 ? (
      <em key={i} className="hotels-italic">
        {part}
      </em>
    ) : (
      part
    )
  );
}

export function LiveDot() {
  return (
    <span className="relative flex size-1.5 shrink-0" aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember-1 opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex size-1.5 rounded-full bg-ember-1" />
    </span>
  );
}

export function Check({ className = "size-5" }: { className?: string }) {
  return (
    <span aria-hidden className={`ember-gradient flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-background ${className}`}>
      ✓
    </span>
  );
}

/** Anneau de fréquentation ; se remplit quand son <Reveal> entre à l'écran. */
export function Ring({ share, className = "size-16" }: { share: number; className?: string }) {
  return <span aria-hidden className={`hotels-ring block rounded-full ${className}`} style={{ "--share": share } as CSSProperties} />;
}

/** Les fonctionnalités d'une section, en colonnes de texte sous sa maquette. */
export function FeatureColumns({ items }: { items: readonly Feature[] }) {
  return (
    <ul className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <Reveal key={item.title} as="li" delay={(i % 4) * 90} className="border-t border-hairline pt-6">
          <p className="kit-display ember-text text-3xl">{item.stat}</p>
          <h3 className="mt-4 text-base font-bold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
        </Reveal>
      ))}
    </ul>
  );
}

/** Points numérotés en chiffres de maison, séparés d'un filet. */
export function Points({ points }: { points: readonly { title: string; text: string }[] }) {
  return (
    <ol className="mt-10 flex flex-col">
      {points.map((point, i) => (
        <Reveal key={point.title} as="li" delay={i * 90} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-hairline py-6">
          <span className="kit-display hotels-italic text-3xl">0{i + 1}</span>
          <div>
            <h3 className="text-lg font-bold leading-snug">{point.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{point.text}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
