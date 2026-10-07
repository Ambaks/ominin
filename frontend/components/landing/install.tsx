import { Reveal } from "@/components/portal/reveal";
import {
  brand,
  installSection,
  type BillLine,
  type InstallPath,
} from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import {
  OnPartnerChange,
  PartnerCycle,
  PartnerLockup,
  PartnerZone,
} from "./integration-showcase";
import { OmilinkScene, TillScene } from "./install-scenes";
import { KitHeading } from "@/components/landing-kit/heading";

/*
 * Le panneau caisse s'inverse (fond = couleur du texte de la page) : noir et
 * blanc comme le matériel de caisse, il tranche avec le panneau Omilink,
 * braise comme le reste du site. `inverse` bascule les quelques teintes
 * concernées.
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
        className={`kit-display text-sm italic ${
          inverse ? "text-background/60" : "text-muted"
        }`}
      >
        {installSection.billLabel}
      </p>
      {/* Sur téléphone, le montant passe sous son libellé plutôt que de se
          tasser au bout des pointillés. */}
      <dl className="mt-3 flex flex-col gap-2.5">
        {lines.map((line) => (
          <div key={line.label} className="flex flex-wrap items-baseline gap-x-2 text-sm sm:flex-nowrap">
            <dt className={`sm:shrink-0 sm:whitespace-nowrap ${inverse ? "text-background/70" : "text-muted"}`}>
              {line.label}
            </dt>
            <span
              className={`hidden min-w-4 flex-1 translate-y-[-3px] border-b border-dotted sm:block ${
                inverse ? "border-background/30" : "border-foreground/20"
              }`}
              aria-hidden
            />
            <dd
              className={`w-full font-semibold leading-5 sm:w-auto sm:min-w-0 sm:text-right ${
                line.own ? (inverse ? "kit-display italic" : "ember-text") : ""
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

const { integrations } = installSection;

function PathPanel({ path }: { path: InstallPath }) {
  const inverse = path.id === "caisse";
  return (
    <article
      className={`relative flex h-full min-w-0 flex-col gap-6 overflow-hidden rounded-3xl border p-6 sm:p-8 ${
        inverse
          ? "border-transparent bg-foreground text-background"
          : "border-ember-2/30 bg-surface shadow-lg shadow-ember-2/5"
      }`}
    >
      {inverse ? (
        <PartnerZone className="flex flex-col gap-6">
          <PartnerLockup
            brand={brand}
            names={integrations.names}
            icons={integrations.icons}
            spoken={integrations.spoken}
            controls={integrations.controls}
          />
          {/* Les illustrations tiennent dès 360 px ; en deçà, le texte et
              l'addition suffisent. */}
          <div className="max-[359px]:hidden">
            <TillScene />
          </div>
        </PartnerZone>
      ) : (
        <>
          {/* Même poids que « Ominin × … » en face : les deux panneaux
              s'ouvrent sur leur nom. */}
          <p className="ember-text kit-display flex h-8 items-center text-lg font-semibold">
            {path.label}
          </p>
          <div className="max-[359px]:hidden">
            <OmilinkScene />
          </div>
        </>
      )}

      <div>
        <h3 className="kit-display text-balance text-2xl font-medium tracking-tight">
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

      {path.cta && (
        <a
          href={path.cta.href}
          className={`-mt-2 self-start text-sm font-medium underline underline-offset-4 transition-colors ${
            inverse
              ? "decoration-background/30 hover:decoration-background"
              : "decoration-hairline hover:decoration-foreground"
          }`}
        >
          {path.cta.label}{" "}
          <span className="whitespace-nowrap">{path.cta.action}</span>
        </a>
      )}

      <Bill path={path} inverse={inverse} />
    </article>
  );
}

export function Install() {
  const { order } = installSection;
  return (
    <section
      id={installSection.id}
      className="install-scene scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-24">
        <KitHeading
          eyebrow={installSection.eyebrow}
          title={installSection.title}
          subtitle={installSection.subtitle}
          center
        />

        <PartnerCycle
          count={integrations.names.length}
          intervalMs={integrations.intervalMs}
        >
          <Reveal className="mt-12 flex flex-col items-center lg:mt-16">
            <div className="flex items-center gap-3 rounded-full border border-hairline bg-surface py-2 pl-3 pr-4 text-sm">
              <span className="relative flex size-2.5">
                <span className="pulse-ring ember-gradient absolute inset-0 rounded-full" />
                <span className="ember-gradient relative size-2.5 rounded-full" />
              </span>
              {/* Sur les plus petits écrans, la table et le montant suffisent. */}
              <span className="whitespace-nowrap text-muted max-[359px]:hidden">
                {installSection.sourceLabel}
              </span>
              <span className="whitespace-nowrap font-medium">{order.table}</span>
              <span className="ember-text kit-display font-medium">
                {formatPrice(order.total)}
              </span>
            </div>

            {/* La fourche relie la commande au centre de chaque panneau : sa
                largeur vaut une colonne plus une gouttière (gap-6). Le point
                de gauche part à chaque partenaire, vers la caisse qui va le
                recevoir ; celui de droite bat au rythme de l'imprimante. */}
            <div
              className="relative hidden h-16 w-[calc(50%+0.75rem)] lg:block"
              aria-hidden
            >
              <span className="absolute left-1/2 top-0 h-1/2 w-px bg-ember-2/35" />
              <span className="absolute inset-x-0 bottom-0 top-1/2 border-x border-t border-ember-2/35" />
              <span className="fork-pulse ember-gradient absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_var(--ember-1)]" />
              <OnPartnerChange>
                <span className="fork-arrival ember-gradient absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_10px_var(--ember-1)]" />
              </OnPartnerChange>
            </div>
          </Reveal>

          <div className="relative mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:mt-0 lg:grid-cols-2">
            {installSection.paths.map((path, index) => (
              <Reveal key={path.id} delay={index * 120} className="lg:row-start-1">
                <PathPanel path={path} />
              </Reveal>
            ))}
            <span className="mx-auto max-lg:row-start-2 flex size-11 items-center justify-center rounded-full border border-hairline bg-background kit-display text-xs italic text-muted lg:absolute lg:left-1/2 lg:top-1/2 lg:z-10 lg:-translate-x-1/2 lg:-translate-y-1/2">
              {installSection.joiner}
            </span>
          </div>
        </PartnerCycle>

        <div className="mx-auto mt-10 flex w-fit flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted max-sm:flex-col max-sm:items-start lg:mt-14">
          {installSection.facts.map((fact) => (
            <span key={fact} className="flex items-baseline gap-1.5">
              <span className="text-ember-1">✓</span>
              {fact}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-relaxed text-muted">
          {installSection.footnote}
        </p>
      </div>
    </section>
  );
}
