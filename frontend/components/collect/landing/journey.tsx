"use client";

import { useEffect, useRef, useState } from "react";
import type { demoShowcaseOrder } from "@/lib/collect/demo/data";
import { heroRelay, journey } from "@/lib/collect-landing-data";
import { formatPrice } from "@/lib/menu-data";

type ShowcaseOrder = ReturnType<typeof demoShowcaseOrder>;
import { CollectHeading } from "./heading";

/*
 * Le parcours au défilement : les étapes défilent à droite, le téléphone
 * reste collé à gauche et change d'écran avec l'étape au centre de la vue.
 * Sous lg, chaque étape porte son propre écran.
 */

const chip = "rounded-full border px-3 py-1.5 text-xs font-semibold";

function Screen({ step, order }: { step: number; order: ShowcaseOrder }) {
  const total = formatPrice(order.total);
  switch (step) {
    case 0:
      return (
        <div className="flex flex-col gap-2">
          <p className="collect-display text-xl">{order.restaurant}</p>
          {order.lines.map((line) => (
            <div key={line.name} className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-background/60 px-3 py-2.5 text-sm">
              <span className="font-semibold">{line.name}</span>
              <span className="ember-gradient flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-background">+</span>
            </div>
          ))}
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Retrait</p>
          <div className="flex flex-wrap gap-2">
            <span className={`${chip} border-hairline text-muted`}>Dès que possible</span>
            <span className={`${chip} border-hairline text-muted`}>12:15</span>
            <span className={`${chip} ember-gradient border-transparent text-background`}>12:30 ✓</span>
            <span className={`${chip} border-hairline text-faint line-through`}>12:45</span>
          </div>
          <p className="text-xs text-faint">Aujourd&apos;hui · créneaux de 15 min</p>
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-foreground/90 to-foreground/60 p-4 font-mono text-xs text-background">
            <p className="opacity-70">Carte bancaire</p>
            <p className="mt-3 whitespace-nowrap tracking-[0.12em]">•••• 4242</p>
          </div>
          <div className="ember-gradient rounded-full py-3 text-center text-sm font-bold text-background">
            Payé {total} ✓
          </div>
          <p className="text-center text-xs text-faint">Versé sur le compte du restaurant</p>
        </div>
      );
    case 3:
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-[#fbf6ee] p-3 font-mono text-[#1c1712]">
            <p className="text-[10px] uppercase opacity-60">{heroRelay.ticket.printer}</p>
            <p className="collect-display text-2xl">{heroRelay.ticket.customer}</p>
            <p className="text-xs font-bold">{heroRelay.ticket.pickup}</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-hairline px-3 py-2.5 text-sm">
            <span className="font-semibold">En cuisine</span>
            <span className="whitespace-nowrap text-ember-1">15 min</span>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="ember-gradient flex size-14 items-center justify-center rounded-full text-2xl font-bold text-background">✓</span>
          <p className="collect-display text-3xl">C&apos;est prêt !</p>
          <p className="text-sm text-muted">{heroRelay.ticket.pickup} · {order.restaurant}</p>
          <span className={`${chip} border-hairline text-foreground`}>Itinéraire →</span>
        </div>
      );
  }
}

function Phone({ step, order }: { step: number; order: ShowcaseOrder }) {
  return (
    <div className="relative mx-auto w-full max-w-[15rem] rounded-[2.6rem] border border-ember-2/25 bg-surface p-2.5 shadow-[0_30px_80px_-30px_var(--ember-2)] ring-1 ring-foreground/10 lg:max-w-[17.5rem]">
      <div className="relative flex aspect-[9/14] flex-col lg:aspect-[9/18] overflow-hidden rounded-[2.1rem] bg-background px-4 pb-5 pt-3">
        <div className="mx-auto mb-4 h-5 w-20 shrink-0 rounded-full bg-surface" aria-hidden />
        <p className="mb-4 flex shrink-0 items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span className="truncate">{order.restaurant}</span>
          <span className="ember-gradient size-1.5 shrink-0 rounded-full" />
        </p>
        {step > 0 && (
          <p className="mb-4 flex shrink-0 items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs">
            <span className="text-muted">{order.lines.length} articles</span>
            <span className="font-semibold tabular-nums">{formatPrice(order.total)}</span>
          </p>
        )}
        <div key={step} className="flex flex-1 flex-col">
          <div className="animate-[collect-rise_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none">
          <Screen step={step} order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollectJourney({ order }: { order: ShowcaseOrder }) {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  // L'étape active est celle dont le centre est le plus près du milieu de
  // l'écran, recalculée à chaque défilement (un saut d'ancre compris).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Infinity;
      steps.current.forEach((node, i) => {
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
    <section id={journey.id} className="scroll-mt-20 border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-10 lg:pb-12 lg:pt-32">
        <CollectHeading eyebrow={journey.eyebrow} title={journey.title} />
        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-12rem)]">
              <Phone step={active} order={order} />
              <div className="mt-6 flex justify-center gap-2" aria-hidden>
                {journey.steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "ember-gradient w-8" : "w-1.5 bg-hairline"}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <ol className="flex flex-col gap-14 lg:gap-[28vh] lg:pb-[4vh] lg:pt-[12vh]">
            {journey.steps.map((step, i) => (
              <li
                key={step.title}
                ref={(node) => {
                  steps.current[i] = node;
                }}
                className={`transition-opacity duration-500 lg:opacity-30 ${i === active ? "lg:opacity-100" : ""}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{step.kicker}</p>
                <h3 className="collect-display mt-3 text-balance text-3xl lg:text-5xl">{step.title}</h3>
                <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted">{step.description}</p>
                <div className="mt-8 lg:hidden" aria-hidden>
                  <Phone step={i} order={order} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
