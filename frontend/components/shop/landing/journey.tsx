import Image from "next/image";
import { ScrollStory } from "@/components/landing-kit/scroll-story";
import { heroRelay, journey } from "@/lib/shop-landing-data";

/* Le parcours d'une commande MyBox au défilement (landing-kit/scroll-story) : un écran par étape. */

const { screens } = journey;
const chip = "rounded-full border px-2.5 py-1 text-[11px] font-semibold";

function Screen({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <div className="relative h-72 overflow-hidden rounded-2xl bg-[#1c1712]">
          <Image src={screens.product.image} alt="" fill sizes="240px" className="object-cover opacity-90" />
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-3">
            <div className="flex gap-1">
              <span className="h-0.5 flex-1 rounded-full bg-white" />
              <span className="h-0.5 flex-1 rounded-full bg-white/40" />
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-white">
              <span className="ember-gradient size-6 rounded-full" />
              {screens.handle}
            </p>
          </div>
          <div className="absolute inset-x-3 bottom-3 flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">{screens.storyCaption}</p>
            <span className="flex max-w-full items-center gap-1.5 truncate rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#1c1712] shadow-lg">
              <span aria-hidden>🔗</span>
              {screens.link}
            </span>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col gap-2.5">
          <div className="relative h-28 overflow-hidden rounded-2xl">
            <Image src={screens.product.image} alt="" fill sizes="240px" className="object-cover" />
          </div>
          <p className="flex items-baseline justify-between gap-2">
            <span className="kit-display text-xl">{screens.product.name}</span>
            <span className="text-sm font-semibold tabular-nums">{screens.product.price}</span>
          </p>
          {screens.options.map((option) => (
            <p key={option.label} className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-background/60 px-3 py-2 text-xs">
              <span className="min-w-0 truncate text-muted">{option.label}</span>
              <span className="shrink-0 font-semibold text-ember-1">{option.value}</span>
            </p>
          ))}
          <span className="ember-gradient rounded-full py-2.5 text-center text-sm font-bold text-background">{screens.addLabel}</span>
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col gap-3">
          {screens.deliveries.map((delivery) => (
            <p
              key={delivery.label}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                "selected" in delivery ? "border-ember-2/60 bg-ember-2/10" : "border-hairline"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={`size-3 shrink-0 rounded-full border-2 ${"selected" in delivery ? "border-ember-1 bg-ember-1" : "border-hairline"}`} />
                <span className="truncate font-semibold">{delivery.label}</span>
              </span>
              <span className="shrink-0 text-ember-1">{delivery.price}</span>
            </p>
          ))}
          <div className="flex flex-wrap gap-1.5">
            {screens.payMethods.map((method) => (
              <span key={method} className={`${chip} border-hairline text-muted`}>{method}</span>
            ))}
          </div>
          <span className="ember-gradient rounded-full py-3 text-center text-sm font-bold text-background">{screens.paid}</span>
        </div>
      );
    case 3:
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-ember-2/40 bg-surface p-3">
            <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-ember-1">
              {screens.order.label}
              <span className="ember-gradient size-2 rounded-full" />
            </p>
            <p className="kit-display mt-2 text-2xl">{screens.order.customer}</p>
            <p className="mt-1 flex justify-between text-xs text-muted">
              <span>{screens.order.shipping}</span>
              <span className="font-semibold tabular-nums text-foreground">{screens.order.total}</span>
            </p>
          </div>
          <div className="rounded-xl bg-white p-3 font-mono text-[11px] leading-relaxed text-[#1c1712]">
            {heroRelay.slip.lines.slice(0, 1).map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-1 italic opacity-75">{screens.order.gift}</p>
          </div>
          <span className="rounded-full border border-hairline py-2.5 text-center text-xs font-bold">{screens.order.print}</span>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="ember-gradient flex size-14 items-center justify-center rounded-full text-2xl font-bold text-background">✓</span>
          <p className="kit-display text-3xl">{screens.shipped.title}</p>
          <p className="text-sm text-muted">{screens.shipped.tracking}</p>
          <p className="rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-sm">{screens.shipped.mail}</p>
        </div>
      );
  }
}

export function ShopJourney() {
  return (
    <ScrollStory
      id={journey.id}
      eyebrow={journey.eyebrow}
      title={journey.title}
      steps={journey.steps}
      header={
        <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span className="truncate">{heroRelay.shop}</span>
          <span className="ember-gradient size-1.5 shrink-0 rounded-full" />
        </p>
      }
      screens={journey.steps.map((_, step) => <Screen key={step} step={step} />)}
    />
  );
}
