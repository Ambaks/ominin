import { Fragment } from "react";
import { ScrollStory } from "@/components/landing-kit/scroll-story";
import { demoShowcaseOrder } from "@/lib/collect/demo/data";
import { heroRelay, howItWorks } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";

/* Le parcours à table au défilement (landing-kit/scroll-story) : la table 12 de la démo. */

const order = demoShowcaseOrder();
const chip = "rounded-full border px-3 py-1.5 text-xs font-semibold";

function Screen({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <div className="relative grid size-32 grid-cols-5 grid-rows-5 gap-1 rounded-2xl bg-white p-3" aria-hidden>
            {Array.from({ length: 25 }, (_, i) => (
              <span key={i} className={`rounded-[2px] ${[0, 1, 5, 6, 3, 4, 8, 9, 15, 16, 20, 21, 12, 18, 13, 7, 22, 24].includes(i) ? "bg-[#1c1712]" : ""}`} />
            ))}
            <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-ember-2 motion-reduce:animate-none" />
          </div>
          <p className="kit-display text-2xl">Table {heroRelay.table}</p>
          <p className="text-xs text-muted">Scannez pour consulter le menu</p>
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col gap-2">
          <p className="kit-display text-xl">{order.restaurant}</p>
          <div className="flex gap-1.5 overflow-hidden text-[11px] font-semibold">
            {["Pizzas", "Pâtes", "Desserts"].map((category, i) => (
              <span
                key={category}
                className={`rounded-full px-2.5 py-1 ${i === 0 ? "ember-gradient text-background" : "border border-hairline text-muted"}`}
              >
                {category}
              </span>
            ))}
          </div>
          {order.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-background/60 px-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold leading-snug">{line.name}</span>
                <span className="block text-xs tabular-nums text-muted">{formatPrice(line.price)}</span>
              </span>
              <span className="ember-gradient flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-background">+</span>
            </div>
          ))}
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5 rounded-xl bg-surface px-3 py-2.5 text-xs">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2">
                <span className="min-w-0 leading-snug">1 × {line.name}</span>
                <span className="shrink-0 tabular-nums text-muted">{formatPrice(line.price)}</span>
              </li>
            ))}
            <li className="mt-1 flex justify-between border-t border-hairline pt-1.5 font-semibold">
              <span>Table {heroRelay.table}</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </li>
          </ul>
          <div className="flex flex-col gap-2 lg:flex-row">
            <span className={`${chip} ember-gradient flex-1 whitespace-nowrap border-transparent px-2 text-center text-background`}>En ligne</span>
            <span className={`${chip} flex-1 whitespace-nowrap border-hairline px-2 text-center text-muted`}>Au comptoir</span>
          </div>
          <div className="ember-gradient rounded-full py-3 text-center text-sm font-bold text-background">
            Payée {formatPrice(order.total)} ✓
          </div>
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-white p-3 font-mono text-[#1c1712]">
            <p className="text-[11px] uppercase opacity-60">{heroRelay.ticket.printer}</p>
            <p className="kit-display text-2xl">{heroRelay.ticket.label}</p>
            <p className="text-xs font-bold uppercase">{heroRelay.ticket.detail}</p>
          </div>
          <ol className="flex flex-col gap-1.5 text-sm">
            {[
              ["Ticket imprimé", "18 s"],
              ["En préparation", "En cours"],
              [`Servie à la table ${heroRelay.table}`, "Ensuite"],
            ].map(([label, when], i) => (
              <li
                key={label}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${i === 0 ? "border-ember-2/40 bg-ember-2/10" : "border-hairline"}`}
              >
                <span className="text-xs font-semibold leading-snug lg:text-sm">{label}</span>
                <span className={`whitespace-nowrap text-[11px] ${i === 0 ? "text-ember-1" : "text-muted"}`}>{when}</span>
              </li>
            ))}
          </ol>
        </div>
      );
  }
}

export function HowItWorks() {
  return (
    <ScrollStory
      id={howItWorks.id}
      eyebrow={howItWorks.eyebrow}
      title={howItWorks.title}
      steps={howItWorks.steps}
      header={
        <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span className="truncate">{order.restaurant}</span>
          <span className="ember-gradient size-1.5 shrink-0 rounded-full" />
        </p>
      }
      screens={howItWorks.steps.map((_, step) => (
        <Fragment key={step}>
          <Screen step={step} />
        </Fragment>
      ))}
    />
  );
}
