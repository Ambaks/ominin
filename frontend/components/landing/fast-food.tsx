import Image from "next/image";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { fastFoodSection } from "@/lib/landing-data";

/*
 * Mode fast food : le ticket du client, en boucle — en cuisine avec l'heure
 * annoncée par l'IA, puis « C'est prêt ! ». À côté, ce que fait le mode.
 */

const { ticket } = fastFoodSection;

function Ticket() {
  return (
    <div className="kit-ticket relay-float relative mx-auto w-full max-w-[19rem]" aria-hidden>
      <div className="rounded-[2.4rem] border border-ember-2/25 bg-surface p-2.5 shadow-[0_30px_80px_-30px_var(--ember-2)] ring-1 ring-foreground/10">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-background px-5 pb-6 pt-3">
          <div className="mx-auto mb-5 h-5 w-20 rounded-full bg-surface" />
          <p className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Image src="/logo.png" alt="" width={22} height={22} />
            {ticket.restaurant}
          </p>
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">Votre numéro</p>
          <p className="kit-display ember-text text-center text-8xl leading-none">N°&nbsp;{ticket.number}</p>

          <ol className="mt-6 flex justify-between gap-1 text-[11px] font-semibold">
            {ticket.steps.map((step, i) => (
              <li
                key={step}
                className={`flex flex-1 flex-col items-center gap-1.5 ${i === 2 ? "ticket-step-ready" : ""}`}
              >
                <span className={`relative h-1.5 w-full overflow-hidden rounded-full ${i < 2 ? "ember-gradient" : "bg-hairline"}`}>
                  {i === 2 && <span className="ticket-fill ember-gradient absolute inset-0" />}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="relative mt-6 h-28">
            <div className="ticket-cooking absolute inset-0 rounded-2xl border border-hairline bg-surface p-4">
              <p className="flex items-center justify-between text-sm font-semibold">
                {ticket.cooking}
                <span className="rounded-full bg-ember-2/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ember-1">
                  {ticket.etaSource}
                </span>
              </p>
              <p className="kit-display mt-2 text-2xl">{ticket.eta}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hairline">
                <div className="ticket-eta-bar ember-gradient h-full rounded-full" />
              </div>
            </div>
            <div className="ticket-ready ember-gradient absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-4 text-center text-background">
              <p className="kit-display text-3xl">{ticket.ready}</p>
              <p className="mt-1 text-xs font-semibold">{ticket.readyBody}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FastFood() {
  return (
    <section id={fastFoodSection.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-8 pt-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-10 lg:py-20">
        <div>
          <KitHeading
            eyebrow={fastFoodSection.eyebrow}
            title={fastFoodSection.title}
            subtitle={fastFoodSection.lead}
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {fastFoodSection.points.map((point, i) => (
              <Reveal
                key={point.title}
                as="li"
                delay={i * 90}
                className="kit-card rounded-2xl border border-hairline bg-surface p-5"
              >
                <p className="text-sm font-bold">{point.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.description}</p>
              </Reveal>
            ))}
          </ul>
        </div>
        <Ticket />
      </div>
    </section>
  );
}
