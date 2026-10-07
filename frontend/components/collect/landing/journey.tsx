import { Fragment } from "react";
import { ScrollStory } from "@/components/landing-kit/scroll-story";
import type { demoShowcaseOrder } from "@/lib/collect/demo/data";
import { heroRelay, journey } from "@/lib/collect-landing-data";
import { formatPrice } from "@/lib/menu-data";

type ShowcaseOrder = ReturnType<typeof demoShowcaseOrder>;

/* Le parcours Collect au défilement (landing-kit/scroll-story) : un écran par étape. */

const chip = "rounded-full border px-3 py-1.5 text-xs font-semibold";

function Screen({ step, order }: { step: number; order: ShowcaseOrder }) {
  const total = formatPrice(order.total);
  switch (step) {
    case 0:
      return (
        <div className="flex flex-col gap-2">
          <p className="kit-display text-xl">{order.restaurant}</p>
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
            <p className="kit-display text-2xl">{heroRelay.ticket.customer}</p>
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
          <p className="kit-display text-3xl">C&apos;est prêt !</p>
          <p className="text-sm text-muted">{heroRelay.ticket.pickup} · {order.restaurant}</p>
          <span className={`${chip} border-hairline text-foreground`}>Itinéraire →</span>
        </div>
      );
  }
}

/** Le panier en cours, au-dessus des écrans qui suivent la commande. */
function Summary({ order }: { order: ShowcaseOrder }) {
  return (
    <p className="mb-4 flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs">
      <span className="text-muted">{order.lines.length} articles</span>
      <span className="font-semibold tabular-nums">{formatPrice(order.total)}</span>
    </p>
  );
}

export function CollectJourney({ order }: { order: ShowcaseOrder }) {
  return (
    <ScrollStory
      id={journey.id}
      eyebrow={journey.eyebrow}
      title={journey.title}
      steps={journey.steps}
      header={
        <p className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span className="truncate">{order.restaurant}</span>
          <span className="ember-gradient size-1.5 shrink-0 rounded-full" />
        </p>
      }
      screens={journey.steps.map((_, step) => (
        <Fragment key={step}>
          {step > 0 && <Summary order={order} />}
          <Screen step={step} order={order} />
        </Fragment>
      ))}
    />
  );
}
