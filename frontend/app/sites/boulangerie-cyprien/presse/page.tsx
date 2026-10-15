import type { Metadata } from "next";
import { Arrow, ExternalLink, PageHero } from "@/components/sites/cyprien/ui";
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

export default function PressePage() {
  return (
    <>
      <PageHero
        eyebrow="Presse"
        title={["Ils parlent", <em key="e">de Cyprien</em>]}
        intro="Articles, émissions et guides : la presse raconte Cyprien depuis l’ouverture, en octobre 2017."
      />

      <section className="cy-wrap mt-16 pb-(--cy-section) lg:mt-24" aria-label="Parutions">
        {byYear(press).map(([year, items]) => (
          <div key={year} className="cy-press-year">
            <h2 data-reveal="up">{year}</h2>
            <ol>
              {items.map((item) => (
                <li key={`${item.outlet}-${item.date}`} className="cy-press-row" data-reveal="up">
                  <p className="cy-press-outlet">
                    {item.outlet}
                    <span className="cy-press-date mt-1 block font-normal tracking-normal normal-case">
                      {formatPressDate(item.date)}
                    </span>
                  </p>
                  <h3>{item.title ? `« ${item.title} »` : item.summary}</h3>
                  {item.url && (
                    <ExternalLink href={item.url} className="cy-press-go">
                      Lire
                      <span className="sr-only"> l’article de {item.outlet}</span>
                      <Arrow />
                    </ExternalLink>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="cy-caption border-t border-(--cy-line) pt-8">
          Journalistes : écrivez-nous à{" "}
          <a href={`mailto:${contact.email}`} className="cy-link text-(--cy-teal-deep)">
            {contact.email}
          </a>
          .
        </p>
      </section>
    </>
  );
}
