import Image from "next/image";
import { Reveal } from "@/components/portal/reveal";
import {
  brand,
  installSection,
  type BillLine,
  type InstallPath,
} from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import { OmilinkScene, SquareMark, SquareScene } from "./install-scenes";
import { SectionHeading } from "./section-heading";

/*
 * Le panneau Square s'inverse (fond = couleur du texte de la page) : noir et
 * blanc comme la marque Square, il tranche avec le panneau Omilink, braise
 * comme le reste du site. `inverse` bascule les quelques teintes concernées.
 */
function Bill({ path, inverse }: { path: InstallPath; inverse: boolean }) {
  const lines: (BillLine & { own?: boolean })[] = [
    installSection.bill.subscription,
    { ...path.cost, own: true },
    installSection.bill.commission,
  ];
  return (
    <div
      className={`mt-auto rounded-2xl border border-dashed p-5 ${
        inverse ? "border-background/25" : "border-hairline bg-background/40"
      }`}
    >
      <p
        className={`font-display text-sm italic ${
          inverse ? "text-background/60" : "text-muted"
        }`}
      >
        {installSection.billLabel}
      </p>
      <dl className="mt-3 flex flex-col gap-2.5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline gap-2 text-sm">
            <dt className={inverse ? "text-background/70" : "text-muted"}>
              {line.label}
            </dt>
            <span
              className={`min-w-4 flex-1 translate-y-[-3px] border-b border-dotted ${
                inverse ? "border-background/30" : "border-foreground/20"
              }`}
              aria-hidden
            />
            <dd
              className={`whitespace-nowrap font-semibold ${
                line.own && !inverse ? "ember-text" : ""
              }`}
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PathPanel({ path }: { path: InstallPath }) {
  const inverse = path.id === "square";
  return (
    <article
      className={`relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border p-6 sm:p-8 ${
        inverse
          ? "border-transparent bg-foreground text-background"
          : "border-ember-2/30 bg-surface shadow-lg shadow-ember-2/5"
      }`}
    >
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p
          className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.28em] ${
            inverse ? "text-background/60" : "ember-text"
          }`}
        >
          {path.label}
        </p>
        {inverse && (
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Image src="/logo.png" alt="" width={20} height={20} />
            <span className="font-display">{brand}</span>
            <span className="text-background/40" aria-hidden>
              ×
            </span>
            <SquareMark className="size-[18px] shrink-0" />
            <span className="tracking-tight">Square</span>
          </p>
        )}
      </div>

      {inverse ? <SquareScene /> : <OmilinkScene />}

      <div>
        <h3 className="font-display text-2xl font-medium tracking-tight">
          {path.title}
        </h3>
        <p
          className={`mt-3 text-sm leading-relaxed ${
            inverse ? "text-background/70" : "text-muted"
          }`}
        >
          {path.lead}
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {path.points.map((point) => (
          <li key={point.title} className="flex gap-3.5">
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-[1px] ${
                inverse ? "bg-background" : "ember-gradient"
              }`}
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">{point.title}</p>
              <p
                className={`mt-0.5 text-[13px] leading-relaxed ${
                  inverse ? "text-background/65" : "text-muted"
                }`}
              >
                {point.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Bill path={path} inverse={inverse} />
    </article>
  );
}

export function Install() {
  const { order } = installSection;
  return (
    <section
      id={installSection.id}
      className="install-scene scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={installSection.eyebrow}
          title={installSection.title}
          subtitle={installSection.subtitle}
          center
        />

        <Reveal className="mt-12 flex flex-col items-center lg:mt-16">
          <div className="flex items-center gap-3 rounded-full border border-hairline bg-surface py-2 pl-3 pr-4 text-sm">
            <span className="relative flex size-2.5">
              <span className="pulse-ring ember-gradient absolute inset-0 rounded-full" />
              <span className="ember-gradient relative size-2.5 rounded-full" />
            </span>
            <span className="text-muted">{installSection.sourceLabel}</span>
            <span className="font-medium">{order.table}</span>
            <span className="ember-text font-display font-medium">
              {formatPrice(order.total)}
            </span>
          </div>

          {/* La fourche relie la commande au centre de chaque panneau : sa
              largeur vaut une colonne plus une gouttière (gap-6). */}
          <div
            className="relative hidden h-16 w-[calc(50%+0.75rem)] lg:block"
            aria-hidden
          >
            <span className="absolute left-1/2 top-0 h-1/2 w-px bg-ember-2/35" />
            <span className="absolute inset-x-0 bottom-0 top-1/2 border-x border-t border-ember-2/35" />
            <span className="fork-pulse ember-gradient absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_var(--ember-1)]" />
            <span className="fork-pulse fork-pulse-late ember-gradient absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_var(--ember-1)]" />
          </div>
        </Reveal>

        <div className="relative mt-8 grid gap-6 lg:mt-0 lg:grid-cols-2">
          {installSection.paths.map((path, index) => (
            <Reveal key={path.id} delay={index * 120} className="lg:row-start-1">
              <PathPanel path={path} />
            </Reveal>
          ))}
          <span className="mx-auto max-lg:row-start-2 flex size-11 items-center justify-center rounded-full border border-hairline bg-background font-display text-xs italic text-muted lg:absolute lg:left-1/2 lg:top-1/2 lg:z-10 lg:-translate-x-1/2 lg:-translate-y-1/2">
            {installSection.joiner}
          </span>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted lg:mt-14">
          {installSection.facts.map((fact) => (
            <span key={fact} className="flex items-center gap-1.5">
              <span className="text-ember-1">✓</span>
              {fact}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-xl text-center text-[11px] leading-relaxed text-faint">
          {installSection.footnote}
        </p>
      </div>
    </section>
  );
}
