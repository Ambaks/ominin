"use client";

import Link from "next/link";
import { ComptesTabs } from "@/components/clip/espace/comptes-tabs";
import { useClipData } from "@/lib/clip/context";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import { CLIP_PLATFORMS } from "@/lib/clip/provider/types";

/*
 * Page « Créer des comptes » (bientôt disponible). Annonce la création de
 * comptes sociaux pilotés par l'IA : Ominin ouvre le compte, puis Opus lui
 * donne une vie — connexion quotidienne depuis le même proxy, lecture du fil,
 * quelques réactions, et une publication certains jours. Comme un humain, donc
 * conforme et jamais démasqué. Purement statique en attendant la fonctionnalité ;
 * le visuel héros rejoue une semaine du compte en boucle (curseur .sweep +
 * colonnes .day-live, calés entre eux dans globals.css).
 */

/* Une semaine du compte : hauteur de barre = intensité d'activité du jour. */
const WEEK = [
  { day: "L", label: "Lecture", height: 46 },
  { day: "M", label: "Réactions", height: 58 },
  { day: "M", label: "Publication", height: 94, post: true },
  { day: "J", label: "Lecture", height: 38 },
  { day: "V", label: "Réactions", height: 62 },
  { day: "S", label: "Publication", height: 90, post: true },
  { day: "D", label: "Lecture", height: 44 },
];

const STEPS = [
  {
    title: "On ouvre le compte",
    body: "Un compte neuf à votre marque, propre et prêt à publier. Aucune configuration, aucune vérification à gérer de votre côté.",
    illustration: CreateIllustration,
  },
  {
    title: "L'IA lui donne une vie",
    body: "Chaque jour, depuis la même adresse, elle se connecte, parcourt le fil et réagit. La plateforme voit un habitué, pas un automate.",
    illustration: LifeIllustration,
  },
  {
    title: "Elle publie au bon moment",
    body: "Certains jours seulement, elle poste vos clips. Le compte grandit à un rythme naturel, sans jamais éveiller les soupçons.",
    illustration: PostIllustration,
  },
];

const PILLARS = [
  {
    title: "Une seule empreinte",
    body: "Même proxy, même appareil, chaque jour. Une présence stable dans le temps — jamais un robot de passage.",
    icon: FingerprintIcon,
  },
  {
    title: "Un comportement humain",
    body: "Elle s'attarde, lit, aime quelques clips. L'activité précède toujours la publication, comme chez une vraie personne.",
    icon: GestureIcon,
  },
  {
    title: "Un rythme naturel",
    body: "Pas de rafale, pas d'horaire mécanique. Elle publie quand quelqu'un publierait — et se repose les autres jours.",
    icon: PulseIcon,
  },
];

/* Flotte d'exemple pour la bande « à l'échelle » (illustratif, aria-hidden). */
const FLEET = [
  "@studio.mars",
  "@nova.eats",
  "@lumen.clips",
  "@atlas.food",
  "@echo.reels",
];

export default function CreationComptesPage() {
  const { basePath } = useClipData();

  return (
    <div className="flex flex-col gap-10">
      <ComptesTabs active="creation" />

      <header className="rise max-w-2xl" style={{ animationDelay: "40ms" }}>
        <p className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
          <span className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            Bientôt disponible
          </span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Des comptes qui vivent tout seuls
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          Ominin crée vos comptes sociaux et leur donne une vie. Chaque jour, une
          IA s&rsquo;y connecte, parcourt le fil, réagit — et publie vos clips au
          bon moment. Vous ne touchez à rien&nbsp;; ils grandissent.
        </p>
      </header>

      <WeekVisual />

      <section className="flex flex-col gap-5">
        <h2
          className="rise font-display text-xl font-medium tracking-tight"
          style={{ animationDelay: "60ms" }}
        >
          Trois gestes, et le compte prend vie
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <article
              key={step.title}
              className="rise flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <div className="flex h-24 items-center justify-center rounded-xl border border-hairline bg-background">
                <step.illustration />
              </div>
              <div className="flex items-center gap-2">
                <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-background">
                  {index + 1}
                </span>
                <h3 className="font-display text-base font-medium">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="rise relative overflow-hidden rounded-2xl border border-hairline bg-surface p-6 sm:p-8"
        style={{ animationDelay: "80ms" }}
      >
        <div className="ember-glow absolute inset-0" aria-hidden />
        <div className="relative">
          <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            La différence Ominin
          </p>
          <h2 className="mt-2 max-w-xl font-display text-2xl font-medium tracking-tight">
            Indétectable, par conception
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Un compte se fait repérer quand il agit comme une machine. Le nôtre
            fait exactement l&rsquo;inverse — dans le moindre détail.
          </p>

          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3">
            {PILLARS.map((pillar, index) => (
              <div
                key={pillar.title}
                className="rise flex flex-col gap-3 bg-surface p-5"
                style={{ animationDelay: `${140 + index * 70}ms` }}
              >
                <span className="ember-text">
                  <pillar.icon className="size-6" />
                </span>
                <h3 className="font-display text-base font-medium">
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="rise flex flex-col gap-5 rounded-2xl border border-hairline bg-surface p-6 sm:p-8"
        style={{ animationDelay: "100ms" }}
      >
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            Autant de comptes que vous voulez, tous vivants
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Dix, cinquante, cent&nbsp;: chaque compte mène sa vie en parallèle,
            avec le même soin — sans une minute de travail en plus de votre part.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5" aria-hidden>
          {FLEET.map((handle, index) => (
            <span
              key={handle}
              className="flex items-center gap-2 rounded-full border border-hairline bg-background px-3.5 py-1.5 text-xs font-medium"
            >
              <span
                className="size-1.5 animate-pulse rounded-full bg-ember-2"
                style={{ animationDelay: `${index * 320}ms` }}
              />
              {handle}
              <span className="text-faint">
                {PLATFORM_LABELS[CLIP_PLATFORMS[index % CLIP_PLATFORMS.length]]}
              </span>
            </span>
          ))}
          <span className="flex items-center rounded-full border border-dashed border-hairline px-3.5 py-1.5 text-xs font-medium text-faint">
            + les vôtres
          </span>
        </div>
      </section>

      <section
        className="rise flex flex-col items-start gap-4 rounded-2xl border border-hairline bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ animationDelay: "120ms" }}
      >
        <div>
          <h2 className="font-display text-lg font-medium">En attendant</h2>
          <p className="mt-1 text-sm text-muted">
            Vos comptes existants se relient en un clic, dès aujourd&rsquo;hui.
          </p>
        </div>
        <Link
          href={`${basePath}/comptes`}
          className="ember-gradient shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-[0.98]"
        >
          Connecter mes comptes
        </Link>
      </section>
    </div>
  );
}

/*
 * Héros : « une semaine dans la vie d'un compte ». Le curseur .sweep balaie la
 * bande sur 7 s ; chaque colonne .day-live s'anime à son passage (delay calé
 * sur sa position), les jours de publication s'embrasant en ember. Rejoue en
 * boucle. Décoratif — masqué aux lecteurs d'écran.
 */
function WeekVisual() {
  return (
    <section
      className="rise rounded-2xl border border-hairline bg-surface p-5 sm:p-6"
      style={{ animationDelay: "60ms" }}
      aria-hidden
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="ember-gradient flex size-8 items-center justify-center rounded-full font-display text-sm font-semibold text-background">
            @
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">@votremarque</p>
            <p className="text-[11px] text-faint">Piloté par Ominin</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-hairline bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
          Actif 7 j/7
        </span>
      </div>

      <div className="clip-timeline-motif relative mt-5 overflow-hidden rounded-xl border border-hairline bg-background p-4">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEK.map((entry, index) => (
            <div
              key={index}
              className="day-live flex flex-col items-center gap-2"
              style={{ animationDelay: `${(index + 0.5) * 1000}ms` }}
            >
              <div className="relative flex h-24 w-full items-end justify-center sm:h-28">
                <div
                  className={`relative w-full max-w-9 rounded-md ${
                    entry.post
                      ? "ember-gradient"
                      : "border border-hairline bg-ember-2/15"
                  }`}
                  style={{ height: `${entry.height}%` }}
                >
                  {entry.post && (
                    <span className="ember-gradient absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full ring-2 ring-background" />
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold ${
                  entry.post ? "ember-text" : "text-faint"
                }`}
              >
                {entry.day}
              </span>
            </div>
          ))}
        </div>

        <div className="sweep pointer-events-none absolute inset-y-0 w-full">
          <span
            className="absolute inset-y-0 right-0 w-0.5 bg-ember-1"
            style={{ boxShadow: "0 0 12px var(--ember-1)" }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-faint">
        <LegendDot className="bg-ember-2/40" label="Connexion, lecture, réactions" />
        <LegendDot className="ember-gradient" label="Publication d'un clip" />
      </div>
    </section>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

/*
 * Illustrations filaires des étapes — même langage que espace/icons.tsx et la
 * page générateur (traits arrondis, currentColor), accent ember sur l'élément
 * clé.
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

function CreateIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <rect x="16" y="9" width="64" height="38" rx="5" />
        <circle cx="34" cy="24" r="6.5" />
        <path d="M24 40c0-6 4.5-9 10-9s10 3 10 9" />
        <path d="M54 20h18M54 27h14M54 34h9" />
      </g>
      <g stroke="currentColor" className="text-ember-2">
        <circle cx="70" cy="14" r="6" />
        <path d="m67.4 14 1.9 1.9 3.3-3.5" />
      </g>
    </IllustrationSvg>
  );
}

function LifeIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <path d="M6 30h20M40 30h12M78 30h12" />
      </g>
      <g stroke="currentColor" className="text-ember-2">
        <path d="M26 30l4-13 6 24 5-17 4 6" />
        <path d="M64 24c-2-3-6.5-1.5-6.5 1.8 0 3 6.5 6.7 6.5 6.7s6.5-3.7 6.5-6.7c0-3.3-4.5-4.8-6.5-1.8Z" />
      </g>
    </IllustrationSvg>
  );
}

function PostIllustration() {
  return (
    <IllustrationSvg>
      <g stroke="currentColor" className="text-faint">
        <rect x="18" y="7" width="30" height="42" rx="4" />
        <path d="M28 12h10" />
        <rect x="23" y="18" width="20" height="17" rx="2" />
      </g>
      <g stroke="currentColor" className="text-ember-2">
        <path d="M30 28l3.5-3.5 3 3 3.5-4.5" />
        <path d="M56 41l7-9 5 4 9-15" />
        <path d="M76 17.5h5.5V23" />
      </g>
    </IllustrationSvg>
  );
}

/* Icônes des piliers — 24×24, style filaire de espace/icons.tsx. */

function PillarSvg({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function FingerprintIcon({ className }: { className?: string }) {
  return (
    <PillarSvg className={className}>
      <path d="M12 11.5a1.5 1.5 0 0 1 1.5 1.5c0 3-.6 5-1.2 6.4" />
      <path d="M9 9.7A5 5 0 0 1 17 13c0 2.3-.3 4.2-.9 6" />
      <path d="M6.4 8.4A8 8 0 0 1 20 13c0 1.4-.1 2.8-.4 4.2" />
      <path d="M12 13v2" />
    </PillarSvg>
  );
}

function GestureIcon({ className }: { className?: string }) {
  return (
    <PillarSvg className={className}>
      <path d="M6 5.5l6.5 15 2.6-6 6-2.4L6 5.5Z" />
      <path d="M18.5 4.5v3M20 6h-3" />
    </PillarSvg>
  );
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <PillarSvg className={className}>
      <path d="M3.5 14c2 0 2.2-5.5 4-5.5S9.4 17 11.2 17s2-9.5 3.8-9.5S17 13 18.8 13h1.7" />
    </PillarSvg>
  );
}
