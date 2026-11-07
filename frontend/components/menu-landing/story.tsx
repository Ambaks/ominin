"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Segmented } from "@/components/gestion/ui";
import { KitHeading } from "@/components/landing-kit/heading";
import { useActiveIndex } from "@/components/landing-kit/use-active-index";
import { PillarIcon } from "@/components/menu-landing/icons";
import { screenSizes } from "@/lib/pitch/kit";
import { storyModes, storySection, type Shot, type StoryMode } from "@/lib/menu-landing-data";

/*
 * Le produit, raconté par les quatre piliers de la plaquette, comme la
 * rangée des produits du portail : la rangée des piliers (collée sous la
 * barre sur ordinateur) sert de sommaire et suit la lecture ; dessous, un
 * seul parcours — chaque pilier s'ouvre sur son titre, puis ses étapes
 * défilent à droite pendant que l'écran de l'étape lue reste collé à
 * gauche, téléphone pour la carte, tablette pour la gestion. Sous lg,
 * l'écran reste collé en haut et les étapes passent dessus en cartes de
 * verre.
 *
 * En tête de la rangée, le segmenté Restaurant / Fast-food change tout le
 * parcours (plaquette restaurant ou plaquette fast-food) ; changé depuis le
 * fond du parcours, il ramène la rangée en haut. #fast-food ouvre le
 * mode fast-food.
 */

const modes = Object.keys(storyModes) as StoryMode[];
const modeOptions = modes.map((value) => ({ value, label: storyModes[value].label }));

function Visual({ shot, screenKey, phoneClass }: { shot: Shot; screenKey: string; phoneClass: string }) {
  const { width, height } = screenSizes[shot.screen];
  const phone = shot.screen === "phone";
  return (
    <div className={`g-glass mx-auto w-full p-g-pad ${phone ? `kit-phone ${phoneClass}` : "g-glass-hero"}`}>
      <div className="g-plate relative overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
        <div key={screenKey} className="absolute inset-0 animate-[kit-rise_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none">
          <Image
            src={shot.src}
            alt={shot.alt}
            fill
            sizes={phone ? "(max-width: 1024px) 60vw, 18rem" : "(max-width: 1024px) 92vw, 34rem"}
            className="object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}

export function MenuStory() {
  const [mode, setMode] = useState<StoryMode>("restaurant");
  const { pillars, subtitle } = storyModes[mode];
  const steps = pillars.flatMap((pillar) => pillar.steps.map((step) => ({ ...step, pillar: pillar.id })));
  const offsets = pillars.map((_, p) => pillars.slice(0, p).reduce((sum, pillar) => sum + pillar.steps.length, 0));
  const { active, itemRef, cover } = useActiveIndex<HTMLLIElement>();
  const step = steps[Math.min(active, steps.length - 1)];
  /* Repère en flux devant la rangée : collée, elle ne dit plus où elle est. */
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.hash.slice(1) !== storySection.fastFoodHash) return;
    const frame = requestAnimationFrame(() => {
      setMode("fastFood");
      anchor.current?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const select = (next: StoryMode) => {
    setMode(next);
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", next === "fastFood" ? `#${storySection.fastFoodHash}` : `${pathname}${search}`);
    const node = anchor.current;
    if (!node) return;
    const top = parseFloat(getComputedStyle(node).scrollMarginTop);
    if (node.getBoundingClientRect().top <= top + 1) node.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <section id={storySection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24 lg:px-10 lg:pt-28">
        <KitHeading eyebrow={storySection.eyebrow} title={storySection.title} subtitle={subtitle} />

        <div ref={anchor} className="portal-row-anchor mt-10" aria-hidden />
        <div className="portal-row g-glass p-g-pad">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex shrink-0 p-1 lg:pr-2">
              <Segmented label={storySection.toggleLabel} options={modeOptions} value={mode} onChange={select} glass={false} />
            </div>
            <nav aria-label={storySection.rowLabel} className="min-w-0 flex-1">
              <ul className="portal-tabs flex snap-x gap-1 overflow-x-auto lg:grid lg:grid-cols-4">
                {pillars.map((pillar) => {
                  const current = pillar.id === step.pillar;
                  return (
                    <li key={pillar.id} className="shrink-0 snap-start lg:min-w-0">
                      <a
                        href={`#pilier-${pillar.id}`}
                        aria-current={current ? "step" : undefined}
                        className={`g-press flex min-w-[11.5rem] items-center gap-3 px-4 py-3 lg:min-w-0 lg:px-3 ${
                          current ? "g-plate" : "rounded-g-card text-muted transition-colors hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                            current ? "ember-gradient text-background" : "border border-hairline"
                          }`}
                        >
                          <PillarIcon id={pillar.id} />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-bold ${current ? "text-foreground" : ""}`}>{pillar.label}</span>
                          <span className="block text-[11px] leading-snug text-muted">{pillar.tile}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="hidden lg:block">
            <div className="menu-story-stage">
              <Visual shot={step.shot} screenKey={`${mode}-${active}`} phoneClass="menu-story-phone" />
              <div className="mt-6 flex justify-center gap-2" aria-hidden>
                {steps.map((s, i) => (
                  <span
                    key={s.title}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "ember-gradient w-8" : "w-1.5 bg-hairline"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid">
            <div ref={cover} className="sticky top-24 col-start-1 row-start-1 self-start lg:hidden" aria-hidden>
              <Visual shot={step.shot} screenKey={`${mode}-${active}`} phoneClass="max-w-[13rem]" />
            </div>
            <div key={mode} className="relative col-start-1 row-start-1 pt-[22rem] lg:pt-0">
              {pillars.map((pillar, p) => (
                <section key={pillar.id} id={`pilier-${pillar.id}`} aria-labelledby={`titre-${pillar.id}`} className="menu-pillar lg:pt-[10vh]">
                  <div className="kit-story-step g-glass p-6 lg:p-0">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
                      <span className="ember-gradient flex size-6 items-center justify-center rounded-lg text-background">
                        <PillarIcon id={pillar.id} />
                      </span>
                      {String(p + 1).padStart(2, "0")} · {pillar.label}
                    </p>
                    <h3 id={`titre-${pillar.id}`} className="kit-display mt-4 text-balance text-4xl lg:text-6xl">
                      {pillar.title}
                    </h3>
                    <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted lg:text-lg">{pillar.body}</p>
                  </div>

                  <ol className="flex flex-col gap-[34svh] py-[24svh] lg:gap-[20vh] lg:pb-[8vh] lg:pt-[14vh]">
                    {pillar.steps.map((s, i) => {
                      const index = offsets[p] + i;
                      return (
                        <li
                          key={s.title}
                          ref={itemRef(index)}
                          className={`transition-opacity duration-500 lg:opacity-40 ${index === active ? "lg:opacity-100" : ""}`}
                        >
                          <div className="kit-story-step g-glass p-6 lg:p-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{s.kicker}</p>
                            <h4 className="kit-display mt-3 text-balance text-3xl lg:text-5xl">{s.title}</h4>
                            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted">{s.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          </div>
        </div>
        <p className="pb-4 text-center text-xs text-faint lg:-mt-[6vh]">{storySection.note}</p>
      </div>
    </section>
  );
}
