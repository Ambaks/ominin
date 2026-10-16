"use client";

import type { ReactNode } from "react";
import { KitHeading } from "./heading";
import { useActiveIndex } from "./use-active-index";

/*
 * Parcours raconté au défilement : les étapes défilent à droite, un
 * téléphone reste collé à gauche et montre l'écran de l'étape au milieu de
 * la vue. Sous lg, le téléphone reste collé en haut et les étapes passent
 * par-dessus en cartes givrées. Les écrans arrivent
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
  width,
}: {
  header: ReactNode;
  screen: ReactNode;
  screenKey: number;
  width: string;
}) {
  return (
    <div className={`relative mx-auto w-full rounded-[2.6rem] ${width} border border-ember-2/25 bg-surface p-2.5 shadow-[0_30px_80px_-30px_var(--ember-2)] ring-1 ring-foreground/10`}>
      <div className="relative flex aspect-[9/18] flex-col overflow-hidden rounded-[2.1rem] bg-background px-4 pb-5 pt-3">
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
  const { active, itemRef, cover } = useActiveIndex<HTMLLIElement>();

  return (
    <section id={id} className="scroll-mt-20 border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:pb-10 lg:pt-24">
        <KitHeading eyebrow={eyebrow} title={title} />
        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-12rem)]">
              <Phone header={header} screen={screens[active]} screenKey={active} width="max-w-[17.5rem]" />
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
          <div className="grid">
            <div ref={cover} className="sticky top-20 col-start-1 row-start-1 self-start lg:hidden" aria-hidden>
              <Phone header={header} screen={screens[active]} screenKey={active} width="max-w-[15rem]" />
            </div>
            <ol className="relative col-start-1 row-start-1 flex flex-col gap-[45svh] pb-6 pt-[19rem] lg:gap-[28vh] lg:pb-[4vh] lg:pt-[12vh]">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  ref={itemRef(i)}
                  className={`rounded-3xl border border-hairline bg-background/80 p-6 shadow-[0_20px_60px_-30px_var(--ember-2)] backdrop-blur-xl transition-opacity duration-500 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-45 lg:shadow-none lg:backdrop-blur-none ${i === active ? "lg:opacity-100" : ""}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{step.kicker}</p>
                  <h3 className="kit-display mt-3 text-balance text-3xl lg:text-5xl">{step.title}</h3>
                  <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
