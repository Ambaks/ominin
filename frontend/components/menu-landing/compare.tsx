import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { compareSection } from "@/lib/menu-landing-data";

/*
 * Tarifs et comparatif Sunday (plaquette, page 7) : les frais fixes d'une
 * année côte à côte, le tableau ligne à ligne, puis l'addition Ominin et
 * l'appel au composeur. Sous sm, chaque ligne du tableau passe en bloc :
 * l'intitulé au-dessus, Ominin et Sunday côte à côte.
 */

const oursCell = "bg-[color-mix(in_oklab,var(--ember-1)_8%,transparent)]";

export function MenuCompare() {
  const { columns, rows } = compareSection;
  return (
    <section id={compareSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <KitHeading eyebrow={compareSection.eyebrow} title={compareSection.title} subtitle={compareSection.subtitle} />

        <Reveal className="g-glass mt-12 p-g-pad">
          <dl className="grid gap-g-pad sm:grid-cols-2">
            {compareSection.totals.map((total) => (
              <div key={total.label} className="g-plate flex items-center justify-between gap-6 px-6 py-5">
                <dt className="max-w-[15rem] text-sm leading-snug text-muted">{total.label}</dt>
                <dd className={`kit-display whitespace-nowrap text-5xl tabular-nums ${total.ours ? "ember-text" : ""}`}>{total.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal className="g-glass mt-g-gap p-g-pad">
          <div className="g-plate overflow-hidden">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="grid grid-cols-2 sm:table-row">
                  <td className="hidden sm:table-cell sm:w-[24%]" />
                  <th scope="col" className={`${oursCell} px-4 py-4 sm:px-6`}>
                    <span className="ember-text font-display text-lg font-semibold">{columns.ours}</span>
                  </th>
                  <th scope="col" className="px-4 py-4 font-display text-lg font-semibold sm:px-6">
                    {columns.theirs}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="grid grid-cols-2 border-t border-hairline sm:table-row">
                    <th scope="row" className="col-span-2 px-4 pt-4 text-xs font-bold uppercase tracking-[0.12em] text-muted sm:px-6 sm:py-4 sm:text-sm sm:normal-case sm:tracking-normal sm:text-foreground">
                      {row.label}
                    </th>
                    <td className={`${oursCell} px-4 py-3 align-top leading-relaxed sm:px-6 sm:py-4`}>
                      <strong className="font-bold text-ember-1">{row.ours[0]}</strong>
                      {row.ours[1]}
                    </td>
                    <td className="px-4 py-3 align-top leading-relaxed text-muted sm:px-6 sm:py-4">{row.theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal className="g-glass mt-g-gap p-g-pad">
          <div className="grid gap-g-pad sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
            {compareSection.bill.map((line) => (
              <div key={line.label} className="g-plate p-5">
                <p className="kit-display ember-text text-3xl">{line.value}</p>
                <p className="mt-2 text-sm leading-snug text-muted">{line.label}</p>
              </div>
            ))}
            <div className="flex items-center justify-center p-3 sm:col-span-3 lg:col-span-1">
              <a href={compareSection.cta.href} className="g-btn g-btn-primary g-press group">
                {compareSection.cta.label}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>
            </div>
          </div>
        </Reveal>
        <p className="mt-6 text-xs leading-relaxed text-faint">{compareSection.sources}</p>
      </div>
    </section>
  );
}
