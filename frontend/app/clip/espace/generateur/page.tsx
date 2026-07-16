"use client";

import Link from "next/link";
import { PublierTabs } from "@/components/clip/espace/publier-tabs";
import { useClipData } from "@/lib/clip/context";

/*
 * Page « Depuis une VOD » (bientôt disponible) : annonce le générateur de
 * clips — l'IA visionne une vidéo longue, détecte les moments forts et en
 * tire des clips verticaux prêts à publier. Purement statique en attendant
 * la fonctionnalité ; le visuel rejoue le futur parcours en boucle (curseur
 * .sweep + moments .ignite-N, calés entre eux dans globals.css).
 */

/** Moments forts de la timeline : position/largeur (%) alignées sur ignite-N. */
const MOMENTS = [
  { left: "12%", width: "12%", center: "18%", ignite: "ignite-1" },
  { left: "42%", width: "12%", center: "48%", ignite: "ignite-2" },
  { left: "72%", width: "12%", center: "78%", ignite: "ignite-3" },
];

const STEPS = [
  {
    title: "Déposez votre VOD",
    body: "Un live entier, un podcast, une interview : plusieurs heures de vidéo, sans aucun montage préalable.",
    illustration: VodIllustration,
  },
  {
    title: "L'IA repère les moments forts",
    body: "Pics d'intensité, réactions, punchlines : chaque passage marquant est détecté et découpé au bon moment.",
    illustration: DetectIllustration,
  },
  {
    title: "Des clips prêts à publier",
    body: "Recadrés en 9:16, sous-titrés, titrés par l'IA — ils rejoignent votre flux de publication habituel.",
    illustration: ClipsIllustration,
  },
];

export default function GenerateurPage() {
  const { basePath } = useClipData();

  return (
    <div className="flex flex-col gap-8">
      <PublierTabs active="vod" />

      <header className="rise" style={{ animationDelay: "40ms" }}>
        <p className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
          <span className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            Bientôt disponible
          </span>
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          Le générateur de clips arrive
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Déposez un live entier : l&apos;IA repère les moments forts, les
          découpe en clips verticaux et les prépare à publier. Vous ne faites
          que valider.
        </p>
      </header>

      <section
        className="rise rounded-2xl border border-hairline bg-surface p-5 sm:p-6"
        style={{ animationDelay: "100ms" }}
        aria-hidden
      >
        <div className="flex items-baseline justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.2em]">
          <span className="text-faint">VOD · 2 h 14</span>
          <span className="ember-text">3 moments forts</span>
        </div>

        <div className="clip-timeline-motif relative mt-3 h-12 overflow-hidden rounded-lg border border-hairline bg-background">
          {MOMENTS.map((moment) => (
            <div
              key={moment.center}
              className={`${moment.ignite} ember-gradient absolute inset-y-2 rounded-md`}
              style={{ left: moment.left, width: moment.width }}
            />
          ))}
          <div className="sweep absolute inset-y-0 w-full">
            <span
              className="absolute inset-y-0 right-0 w-0.5 bg-ember-1"
              style={{ boxShadow: "0 0 12px var(--ember-1)" }}
            />
          </div>
        </div>

        <div className="relative mt-4 h-28">
          {MOMENTS.map((moment) => (
            <div
              key={moment.center}
              className={`${moment.ignite} absolute top-0 flex h-full w-16 -translate-x-1/2 flex-col justify-between rounded-lg border border-ember-2/40 bg-background p-2`}
              style={{ left: moment.center }}
            >
              <span className="ember-gradient size-2 rounded-full" />
              <span className="flex flex-col gap-1">
                <span className="ember-gradient h-1 rounded-full opacity-70" />
                <span className="ember-gradient h-1 w-2/3 rounded-full opacity-40" />
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-faint">
          L&apos;IA visionne, détecte, découpe — pendant que vous streamez.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <article
            key={step.title}
            className="rise flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
            style={{ animationDelay: `${160 + index * 60}ms` }}
          >
            <div className="flex h-24 items-center justify-center rounded-xl border border-hairline bg-background">
              <step.illustration />
            </div>
            <div className="flex items-center gap-2">
              <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-background">
                {index + 1}
              </span>
              <h2 className="font-display text-base font-medium">
                {step.title}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted">{step.body}</p>
          </article>
        ))}
      </div>

      <section
        className="rise flex flex-col items-start gap-4 rounded-2xl border border-hairline bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ animationDelay: "340ms" }}
      >
        <div>
          <h2 className="font-display text-lg font-medium">En attendant</h2>
          <p className="mt-1 text-sm text-muted">
            Vos clips déjà montés se publient partout en une fois, dès
            aujourd&apos;hui.
          </p>
        </div>
        <Link
          href={basePath}
          className="ember-gradient shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-[0.98]"
        >
          Publier un clip
        </Link>
      </section>
    </div>
  );
}

/*
 * Illustrations filaires des étapes — même langage que espace/icons.tsx
 * (traits arrondis, currentColor), accents ember sur l'élément clé.
 */

function IllustrationSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 96 56"
      className="h-16"
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function VodIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <rect x="17" y="5" width="62" height="36" rx="4" />
        <path d="M17 47h62" />
        <path d="M25 45v4M35 45v4M45 45v4M55 45v4M65 45v4M75 45v4" />
      </g>
      <path
        d="M44 17.5 54.5 23 44 28.5Z"
        stroke="currentColor"
        className="text-ember-2"
      />
    </IllustrationSvg>
  );
}

function DetectIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <path d="M6 24v8M12 21v14M18 25v6M24 19v18M30 24v8M36 22v12M48 24v8M54 21v14M66 25v6M72 22v12M84 24v8M90 21v14" />
      </g>
      <g stroke="currentColor" className="text-ember-2">
        <path d="M42 13v30M60 9v38M78 15v26" />
        <path d="M38 50h8M56 50h8M74 50h8" />
      </g>
    </IllustrationSvg>
  );
}

function ClipsIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <rect x="10" y="12" width="20" height="34" rx="3" />
        <path d="M15 38h10M15 42h6" />
        <rect x="66" y="12" width="20" height="34" rx="3" />
        <path d="M71 38h10M71 42h6" />
      </g>
      <g stroke="currentColor" className="text-ember-2">
        <rect x="38" y="6" width="20" height="40" rx="3" />
        <path d="M43 36h10M43 40h7" />
        <circle cx="58" cy="8" r="5" />
        <path d="m55.8 8 1.7 1.7 3-3.2" />
      </g>
    </IllustrationSvg>
  );
}
