"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { KitHeading } from "./heading";

/*
 * Parcours raconté au défilement : les étapes défilent à droite, un
 * téléphone reste collé à gauche et montre l'écran de l'étape au milieu de
 * la vue. Sous lg, chaque étape porte son propre écran. Les écrans arrivent
 * tout rendus (composants serveur) : ce composant ne fait que les choisir.
 */

export interface StoryStep {
  kicker: string;
  title: string;
  description: string;
}

function Phone({
  header,
  screen,
  screenKey,
  compact,
}: {
  header: ReactNode;
  screen: ReactNode;
  screenKey: number;
  /** Sous lg, un téléphone par étape : plus petit et sans hauteur fixe. */
  compact?: boolean;
}) {
  return (
    <div className={`relative mx-auto w-full rounded-[2.6rem] ${compact ? "max-w-[13rem]" : "max-w-[17.5rem]"} border border-ember-2/25 bg-surface p-2.5 shadow-[0_30px_80px_-30px_var(--ember-2)] ring-1 ring-foreground/10`}>
      <div className={`relative flex flex-col overflow-hidden rounded-[2.1rem] bg-background px-4 pb-5 pt-3 ${compact ? "" : "aspect-[9/18]"}`}>
        <div className="mx-auto mb-4 h-5 w-20 shrink-0 rounded-full bg-surface" aria-hidden />
        <div className="mb-4 shrink-0">{header}</div>
        <div key={screenKey} className="flex flex-1 flex-col">
          <div className="animate-[kit-rise_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none">
            {screen}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScrollStory({
  id,
  eyebrow,
  title,
  steps,
  screens,
  header,
}: {
  id: string;
  eyebrow: string;
  title: string;
  steps: readonly StoryStep[];
  /** Un écran par étape, dans le même ordre. */
  screens: ReactNode[];
  /** En-tête du téléphone, commun à tous les écrans. */
  header: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  // L'étape active est celle dont le centre est le plus près du milieu de
  // l'écran, recalculée à chaque défilement (un saut d'ancre compris).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Infinity;
      items.current.forEach((node, i) => {
        if (!node) return;
        const box = node.getBoundingClientRect();
        const distance = Math.abs(box.top + box.height / 2 - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id={id} className="scroll-mt-20 border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-10 lg:pb-12 lg:pt-32">
        <KitHeading eyebrow={eyebrow} title={title} />
        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-12rem)]">
              <Phone header={header} screen={screens[active]} screenKey={active} />
              <div className="mt-6 flex justify-center gap-2" aria-hidden>
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "ember-gradient w-8" : "w-1.5 bg-hairline"}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <ol className="flex flex-col gap-14 lg:gap-[28vh] lg:pb-[4vh] lg:pt-[12vh]">
            {steps.map((step, i) => (
              <li
                key={step.title}
                ref={(node) => {
                  items.current[i] = node;
                }}
                className={`transition-opacity duration-500 lg:opacity-45 ${i === active ? "lg:opacity-100" : ""}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{step.kicker}</p>
                <h3 className="kit-display mt-3 text-balance text-3xl lg:text-5xl">{step.title}</h3>
                <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted">{step.description}</p>
                <div className="mt-8 lg:hidden" aria-hidden>
                  <Phone header={header} screen={screens[i]} screenKey={i} compact />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
