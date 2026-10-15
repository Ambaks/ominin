import type { Metadata } from "next";
import { NewTabNote, PressRow } from "@/components/sites/cyprien/press";
import { Eyebrow, Lines, PageHero } from "@/components/sites/cyprien/ui";
import { contact, formatPressDate, ogImage, photos, press, type PressItem } from "@/lib/sites/cyprien";

const description =
  "La Dépêche, Actu.fr, France Bleu, LCI, Le Journal Toulousain, M6, Petit Futé : ce que la presse dit de la Boulangerie Cyprien depuis son ouverture en 2017.";

export const metadata: Metadata = {
  title: "Presse",
  description,
  openGraph: {
    title: "Presse · Boulangerie Cyprien",
    description,
    images: [ogImage(photos.laboratoire)],
  },
};

/** Les parutions groupées par année, dans l’ordre de la liste (la plus récente d’abord). */
function byYear(items: readonly PressItem[]): [string, PressItem[]][] {
  const years = new Map<string, PressItem[]>();
  for (const item of items) {
    const year = item.date.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), item]);
  }
  return [...years];
}

/** Dans l’ordre du titre, qui est aussi celui des dates : noté, classé, recommandé. */
const awards = press.flatMap((item) => (item.award ? [{ ...item, award: item.award }] : [])).reverse();

export default function PressePage() {
  return (
    <>
      <PageHero
        eyebrow="Presse"
        title={["Cyprien", <em key="e">dans la presse</em>]}
        intro="Articles, émissions et guides : la presse raconte Cyprien depuis l’ouverture, en octobre 2017."
      />

      {/* Distinctions */}
      <section className="cy-night cy-section mt-16 lg:mt-24" aria-labelledby="titre-distinctions">
        <div className="cy-wrap">
          <Eyebrow>Distinctions</Eyebrow>
          <Lines id="titre-distinctions" className="cy-h2" lines={["Noté, classé,", <em key="e">recommandé</em>]} />
          <ul className="cy-awards">
            {awards.map((item, index) => {
              const { figure, unit, sup, spoken, text } = item.award;
              return (
                <li key={item.outlet} className="cy-award" data-reveal="up" data-delay={index || undefined}>
                  {/* Un mot (« Recommandé ») se compose en italique, sur la ligne de base des chiffres. */}
                  <p className={`cy-award-figure ${/\d/.test(figure) ? "" : "cy-award-word"}`}>
                    <span aria-hidden={spoken ? true : undefined}>
                      {figure}
                      {unit && <small>{unit}</small>}
                      {sup && <sup>{sup}</sup>}
                    </span>
                    {spoken && <span className="sr-only">{spoken}</span>}
                  </p>
                  <p className="cy-award-text">{text}</p>
                  <p className="cy-award-source">
                    {item.outlet} · {formatPressDate(item.date)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Revue de presse */}
      <section className="cy-section" aria-labelledby="titre-parutions">
        <div className="cy-wrap">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow>Revue de presse</Eyebrow>
              <Lines id="titre-parutions" className="cy-h2" lines={["Année", <em key="e">après année</em>]} />
            </div>
            <p className="cy-lead lg:col-span-4 lg:col-start-9" data-reveal="up">
              Du plus récent au tout premier, avec un lien vers chaque article encore en ligne.
            </p>
          </div>
          <NewTabNote />
          <div className="mt-12 lg:mt-16">
            {byYear(press).map(([year, items]) => (
              <div key={year} className="cy-press-year">
                <h3 data-reveal="up">{year}</h3>
                <ol>
                  {items.map((item) => (
                    <PressRow key={`${item.outlet}-${item.date}`} item={item} />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact presse */}
      <section className="cy-tealband cy-section" aria-labelledby="titre-contact-presse">
        <div className="cy-wrap grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-7">
            <Eyebrow>Contact presse</Eyebrow>
            <Lines id="titre-contact-presse" className="cy-h2" lines={["Vous écrivez", <em key="e">sur Cyprien ?</em>]} />
          </div>
          <div className="lg:col-span-4 lg:col-start-9" data-reveal="up">
            <p className="cy-lead">
              Un article, un reportage, une émission : <span className="whitespace-nowrap">écrivez-nous</span> à{" "}
              <a href={`mailto:${contact.email}`} className="cy-link whitespace-nowrap">
                {contact.email}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
