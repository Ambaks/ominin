import type { ReactNode } from "react";
import { KitHeading } from "./heading";
import { Reveal } from "./reveal";

export interface BentoItem {
  stat: string;
  /** Petit mot posé devant le chiffre (« jusqu'à »). */
  statPrefix?: string;
  title: string;
  description: string;
  /** Deux colonnes : la carte d'ouverture, avec son visuel. */
  wide?: boolean;
}

/** Grille de cartes à grand chiffre ; la première peut porter un visuel. */
/** Cases occupées sur deux colonnes : impaires, la dernière carte s'étire. */
const cells = (items: readonly BentoItem[]) =>
  items.reduce((sum, item) => sum + (item.wide ? 2 : 1), 0);

export function KitBento({
  id,
  eyebrow,
  title,
  items,
  lead,
}: {
  id: string;
  eyebrow: string;
  title: string;
  items: readonly BentoItem[];
  /** Visuel de la première carte, à côté de son texte. */
  lead?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-24 sm:px-6 lg:px-10 lg:pb-12 lg:pt-32">
        <KitHeading eyebrow={eyebrow} title={title} />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal
              key={item.title}
              as="article"
              delay={(i % 3) * 100}
              className={`kit-card relative overflow-hidden rounded-3xl border border-hairline bg-surface p-7 ${
                item.wide ? "sm:col-span-2" : ""
              } ${
                // Dernière carte seule sur sa rangée à deux colonnes : pleine largeur.
                i === items.length - 1 && cells(items) % 2 === 1 ? "sm:max-lg:col-span-2" : ""
              }`}
            >
              <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-ember-2/15 blur-3xl" />
              <div className={i === 0 && lead ? "relative grid items-end gap-x-10 lg:grid-cols-2" : "relative"}>
                <div>
                  <p className="kit-display ember-text whitespace-nowrap text-5xl lg:text-6xl">
                    {item.statPrefix && (
                      <span className="mr-2 align-middle text-xl tracking-tight lg:text-2xl">{item.statPrefix}</span>
                    )}
                    {item.stat}
                  </p>
                  <h3 className="mt-6 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
                {i === 0 && lead}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Deux durées ou deux taux, à l'échelle, qui se remplissent à l'apparition. */
export function KitBars({ rows }: { rows: { label: string; value: string; share: number; ember?: boolean }[] }) {
  return (
    <Reveal className="mt-7 flex flex-col gap-3 lg:mt-0">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="flex justify-between text-xs font-semibold text-muted">
            <span>{row.label}</span>
            <span className="tabular-nums">{row.value}</span>
          </p>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-hairline">
            <div
              className={`kit-bar h-full rounded-full ${row.ember ? "ember-gradient" : "bg-faint"}`}
              style={{ width: `${Math.max(row.share * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </Reveal>
  );
}
