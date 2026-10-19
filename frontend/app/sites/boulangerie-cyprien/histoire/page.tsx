import type { Metadata } from "next";
import { ButtonLink, Eyebrow, Lines, Media, PageHero } from "@/components/sites/cyprien/ui";
import { contact, cyprienHref, ogImage, orderPath, photos, telHref, timeline } from "@/lib/sites/cyprien";

const description =
  "Cyprien, c’est d’abord trois amis : Gilles Guiraud, ancien avocat, Lionel Fauré, cycliste devenu pâtissier, et Pierre-Jean Souviron. Ouverte en octobre 2017 rue de la République, à Toulouse.";

export const metadata: Metadata = {
  title: "L’histoire",
  description,
  openGraph: {
    title: "L’histoire · Boulangerie Cyprien",
    description,
    images: [ogImage(photos.fondateurs)],
  },
};

const values = [
  { word: "Authenticité", text: "Faire des choses simples, bonnes et gourmandes. « 100 % artisanal » est inscrit sur l’enseigne et souligne le logo." },
  { word: "Tradition", text: "Respecter les règles de l’art de la pâtisserie et de la boulangerie, pour retrouver les goûts de l’enfance." },
  { word: "Amitié", text: "Une belle amitié, et une complémentarité des compétences pour mener le projet à bien." },
  { word: "Fait-maison", text: "Pains, viennoiseries, pâtisserie fine, gâteaux de voyage, sandwichs, soupes et salades : tout sort de notre laboratoire." },
];

export default function HistoirePage() {
  return (
    <>
      <PageHero
        eyebrow="L’histoire"
        title={["Cyprien : trois amis", <em key="e">qui s’associent</em>]}
        intro="Notre projet est avant tout l’histoire d’une belle amitié, et d’une complémentarité des compétences pour le réaliser."
        photo={photos.fondateurs}
        side
      />

      {/* Les associés */}
      <section className="cy-section" aria-labelledby="titre-associes">
        <div className="cy-wrap">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <Eyebrow>Les associés</Eyebrow>
                <Lines
                  id="titre-associes"
                  className="cy-h2"
                  lines={["Avant tout", <em key="e">une histoire d’amitié</em>]}
                />
                <p className="cy-caption mt-8 max-w-[34ch]">
                  Les fondateurs sont nés à l’hôpital de La Grave, à 300 mètres de la boutique.
                </p>
              </div>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <article className="border-t border-(--cy-line) pt-10" data-reveal="up" aria-labelledby="gilles">
                <p className="cy-num">Toulousain d’origine</p>
                <h3 id="gilles" className="cy-h3 mt-3">
                  Gilles Guiraud
                </h3>
                <div className="cy-prose mt-5">
                  <p>
                    Avocat pendant huit ans au barreau de Toulouse, Gilles décide de prendre le pari de changer de vie,
                    pour se consacrer entièrement à un projet avec deux de ses meilleurs amis.
                  </p>
                </div>
              </article>

              <article className="mt-12 border-t border-(--cy-line) pt-10" data-reveal="up" aria-labelledby="lionel">
                <p className="cy-num">Son ami d’enfance</p>
                <h3 id="lionel" className="cy-h3 mt-3">
                  Lionel Fauré
                </h3>
                <div className="cy-prose mt-5">
                  <p>
                    Toulousain d’origine lui aussi, Lionel embrasse à 18 ans une carrière de sportif de haut niveau
                    dans le cyclisme sur route. À 26 ans, contrarié par des blessures à répétition, il voit sa carrière
                    lui échapper ; installé à Paris, il se reconvertit dans la pâtisserie.
                  </p>
                  <p>
                    Avec la même énergie et la même exigence que dans le sport, il obtient rapidement son CAP de
                    pâtisserie et travaille dans de grandes maisons parisiennes : Carette, place du Trocadéro, et La
                    Pâtisserie des Rêves de Philippe Conticini.
                  </p>
                </div>
                <blockquote className="cy-pull mt-8">
                  <p>
                    « Trois fois “Meilleur croissant au beurre AOP d’Île-de-France”, Lionel a su amener le croissant au
                    meilleur niveau à Paris. »
                  </p>
                  <footer>Boulangerie Cyprien</footer>
                </blockquote>
              </article>

              <article className="mt-12 border-t border-(--cy-line) pt-10" data-reveal="up" aria-labelledby="pierre-jean">
                <p className="cy-num">Le troisième associé</p>
                <h3 id="pierre-jean" className="cy-h3 mt-3">
                  Pierre-Jean Souviron
                </h3>
                <div className="cy-prose mt-5">
                  <p>Cogérant de Cyprien, aux côtés de Gilles et de Lionel.</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="cy-section cy-deep" aria-labelledby="titre-valeurs">
        <div className="cy-wrap">
          <div className="cy-chapter-head">
            <div>
              <Eyebrow>Nos valeurs</Eyebrow>
              <Lines
                id="titre-valeurs"
                className="cy-h2"
                lines={["Une volonté d’être", <em key="e">100 % artisans</em>, <em key="f">et authentiques</em>]}
              />
            </div>
            <div data-reveal="up">
              <blockquote className="cy-pull">
                <p>« La simplicité est l’habit de la perfection. »</p>
                <footer>Wladimir Wolf-Gozin, cher à Lionel Fauré</footer>
              </blockquote>
            </div>
          </div>
          <ul className="cy-values">
            {values.map((value, index) => (
              <li key={value.word} data-reveal="up" data-delay={index || undefined}>
                <strong>{value.word}</strong>
                <p>{value.text}</p>
              </li>
            ))}
          </ul>
          <p className="cy-motto mt-14 max-w-[30ch]" data-reveal="up">
            Chaque jour, toute notre énergie pour produire, avec amour et passion, des produits destinés à procurer du
            plaisir.
          </p>
        </div>
      </section>

      {/* Les dates */}
      <section className="cy-night cy-section" aria-labelledby="titre-dates">
        <div className="cy-wrap">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <Eyebrow>Les dates</Eyebrow>
                <Lines id="titre-dates" className="cy-h2" lines={["Depuis", <em key="e">2017</em>]} />
              </div>
            </div>
            <ol className="cy-timeline lg:col-span-7 lg:col-start-6">
              {timeline.map((step) => (
                <li key={step.title} data-reveal="up">
                  <p className="cy-when">{step.when}</p>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-20 flex flex-wrap gap-3">
            <ButtonLink href={cyprienHref("/presse")} variant="ghost-night">
              La presse en parle
            </ButtonLink>
            <ButtonLink href={cyprienHref(orderPath)} variant="paper">
              Commander
            </ButtonLink>
          </div>
        </div>
      </section>
      {/* L’équipe */}
      <section className="cy-section" aria-labelledby="titre-equipe">
        <div className="cy-wrap cy-split cy-split-rev">
          {/* Original doux : la photo reste sous 560 px de large. */}
          <figure className="w-full lg:max-w-[35rem] lg:justify-self-end">
            <Media photo={photos.equipeFournil} className="aspect-[4/3]" />
          </figure>
          <div>
            <Eyebrow>L’équipe</Eyebrow>
            <Lines id="titre-equipe" className="cy-h2" lines={["Grandir,", <em key="e">et faire grandir</em>]} />
            <div className="cy-prose mt-6" data-reveal="up">
              <p>
                L’aventure a démarré avec pour seuls salariés un boulanger, un apprenti boulanger et une apprentie en
                pâtisserie. Dès la première année, nous étions fiers d’avoir créé des emplois : 11 salariés et
                apprentis.
              </p>
              <p>
                Engagés dans l’apprentissage, nous recrutons chaque année de nouveaux apprentis et voulons continuer à
                former des personnes qui partagent notre état d’esprit.
              </p>
              <p>
                <strong>Un stage, un apprentissage, une journée d’essai ?</strong> Nos portes sont ouvertes à toutes
                les personnes animées de bonne volonté, de courage et d’envie d’apprendre un métier magnifique.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href={`mailto:${contact.email}?subject=Candidature`}>Nous écrire</ButtonLink>
              <a href={telHref(contact.phone)} className="cy-arrow-link">
                {contact.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
