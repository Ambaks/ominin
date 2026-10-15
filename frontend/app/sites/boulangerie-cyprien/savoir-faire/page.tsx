import type { Metadata } from "next";
import { ChapterNav } from "@/components/sites/cyprien/chapter-nav";
import { ButtonLink, Eyebrow, Lines, Media, PageHero, vars } from "@/components/sites/cyprien/ui";
import { cyprienHref, ogImage, orderPath, photos } from "@/lib/sites/cyprien";

const description =
  "Pains au levain bio sur farines du Moulin Calvet, viennoiseries au beurre AOP Charentes-Poitou, pâtisseries simples et gourmandes : le savoir-faire de Cyprien, à Toulouse.";

export const metadata: Metadata = {
  title: "Savoir-faire",
  description,
  openGraph: {
    title: "Savoir-faire · Boulangerie Cyprien",
    description,
    images: [ogImage(photos.faconnage)],
  },
};

const chapters = [
  { id: "boulangerie", label: "Boulangerie" },
  { id: "viennoiserie", label: "Viennoiserie" },
  { id: "patisserie", label: "Pâtisserie" },
];

const breads = [
  { name: "Pain des Copains", detail: "Farine semi-complète de blé bio, levain 100 % naturel." },
  { name: "Pain Cyprien", detail: "Farine bio certifiée." },
  { name: "Tourte aux blés anciens", detail: "Grand épeautre, farine bio certifiée." },
  { name: "Pain complet", detail: "Farine bio certifiée." },
  { name: "Baguette de tradition", detail: "Nature, ou aux graines que l’on torréfie nous‑mêmes." },
  { name: "Baguette au charbon végétal actif", detail: "Pour son originalité." },
  { name: "Pain de mie, pain viennois, pain burger", detail: "100 % artisanaux." },
];

const pastries = [
  "Paris-Brest",
  "Baba au rhum revisité",
  "Millefeuille caramel",
  "Tarte framboise-basilic",
  "Éclair tout chocolat",
  "Chou praliné-pécan",
];

export default function SavoirFairePage() {
  return (
    <>
      <PageHero
        eyebrow="Savoir-faire"
        title={["Plus qu’un", <em key="e">savoir-faire</em>]}
        intro="Tous nos produits sont faits maison et sortent de notre laboratoire, grâce au talent de salariés qui partagent la même ambition."
        photo={photos.laboratoire}
        focus="55% 45%"
      />

      <ChapterNav chapters={chapters} label="Chapitres" />

      {/* Boulangerie */}
      <section id="boulangerie" className="cy-section" aria-labelledby="titre-boulangerie">
        <div className="cy-wrap">
          <div className="cy-chapter-head">
            <div>
              <span className="cy-big-num" aria-hidden="true" data-reveal="up">
                01
              </span>
              <Lines id="titre-boulangerie" className="cy-h2" lines={["La", <em key="e">boulangerie</em>]} />
            </div>
            <p className="cy-lead" data-reveal="up">
              Des farines de qualité, des blés régionaux, et pour l’essentiel un levain bio 100 % naturel.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="grid gap-5 lg:col-span-5">
              <Media photo={photos.faconnage} className="aspect-[4/3]" focus="35% 50%" />
              <Media
                photo={photos.painLevain}
                className="aspect-[4/5] w-3/4 justify-self-end"
                delay={2}
              />
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="cy-prose" data-reveal="up">
                <p>
                  Nous travaillons avec les farines du <strong>Moulin Calvet</strong>, meunier à taille humaine
                  originaire de l’Aveyron. Nos farines sont donc issues de blés régionaux, qui nécessitent peu de
                  transport.
                </p>
                <p>
                  Dès l’ouverture, nous avons eu la chance de nous associer au talent d’un jeune boulanger formé chez
                  les <strong>Compagnons du Devoir</strong>. Il a mis en place une gamme de pains élaborés à base de
                  farines de qualité, pour l’essentiel sur levain bio 100 % naturel.
                </p>
              </div>

              <h3 className="cy-label mt-12 mb-4 text-(--cy-teal-deep)">La gamme</h3>
              <ul className="cy-range" data-reveal="list">
                {breads.map((bread, index) => (
                  <li key={bread.name} style={vars({ "--i": index })}>
                    <strong>{bread.name}</strong>
                    <span>{bread.detail}</span>
                  </li>
                ))}
              </ul>

              <aside className="cy-note mt-12" data-reveal="up" aria-label="La Meilleure Boulangerie de France">
                <div className="cy-score">
                  <span className="cy-score-num" aria-hidden="true">
                    9<small>/10</small>
                  </span>
                  <p className="cy-score-text">
                    <span className="sr-only">9 sur 10. </span>
                    Participants à « La Meilleure Boulangerie de France », édition 2018 sur M6 : notre pain phare, le
                    Pain des Copains, a reçu 9/10 du jury, Norbert Tarayre et Bruno Cormerais.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Viennoiserie */}
      <section id="viennoiserie" className="cy-section cy-deep" aria-labelledby="titre-viennoiserie">
        <div className="cy-wrap">
          <div className="cy-chapter-head">
            <div>
              <span className="cy-big-num" aria-hidden="true" data-reveal="up">
                02
              </span>
              <Lines id="titre-viennoiserie" className="cy-h2" lines={["La", <em key="e">viennoiserie</em>]} />
            </div>
            <p className="cy-lead" data-reveal="up">
              100 % artisanales, au beurre AOP Charentes-Poitou, et cuites en continu pour être toujours fraîches et
              croustillantes.
            </p>
          </div>

          {/* Trois photos d’original doux : chacune reste petite. */}
          <div className="grid gap-5 sm:grid-cols-3">
            <Media
              photo={photos.croissantsFour}
              className="aspect-[4/5]"
              focus="55% 60%"
            />
            <Media
              photo={photos.viennoiseries}
              className="aspect-[4/5]"
              delay={1}
            />
            <Media
              photo={photos.viennoiseriesCrues}
              className="aspect-[4/5]"
              focus="30% 50%"
              delay={2}
            />
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <blockquote className="cy-pull" data-reveal="up">
                <p>
                  « Trois fois “Meilleur croissant au beurre AOP d’Île-de-France”, Lionel a su amener le croissant au
                  meilleur niveau à Paris, avant de venir le proposer aux Toulousains. »
                </p>
                <footer>Boulangerie Cyprien</footer>
              </blockquote>
            </div>
            <div className="cy-prose lg:col-span-5 lg:col-start-8" data-reveal="up" data-delay="1">
              <p>
                Nos viennoiseries sont confectionnées avec les meilleurs produits, à commencer par le{" "}
                <strong>beurre AOP Charentes-Poitou</strong>, et cuites en continu toute la journée.
              </p>
              <p>
                <strong>Côté chocolatine</strong>, nous incorporons une troisième barre de chocolat, pour plus de
                gourmandise : un produit réalisé dans les règles de l’art. En 2022, Toulouse Secret l’a classée
                5ᵉ de sa sélection des meilleures chocolatines de Toulouse.
              </p>
              <p>Et le chausson aux pommes, pour qui préfère le feuilletage aux fruits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pâtisserie */}
      <section id="patisserie" className="cy-section" aria-labelledby="titre-patisserie">
        <div className="cy-wrap">
          <div className="cy-chapter-head">
            <div>
              <span className="cy-big-num" aria-hidden="true" data-reveal="up">
                03
              </span>
              <Lines id="titre-patisserie" className="cy-h2" lines={["La", <em key="e">pâtisserie</em>]} />
            </div>
            <p className="cy-lead" data-reveal="up">
              Pour Lionel, une pâtisserie est réussie lorsqu’elle crée une addiction.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <blockquote className="cy-pull cy-pull-long" data-reveal="up">
                <p>
                  « On a envie d’y retourner ou… pas. Je ne cherche pas la performance dans mes pâtisseries, je veux
                  qu’elles soient simples et gourmandes. Le savoir-faire doit avant tout être au service du goût et du
                  plaisir. Parfois, à vouloir trop en faire, on oublie la simplicité, qui est souvent gage de
                  perfection. »
                </p>
                <footer>Lionel Fauré</footer>
              </blockquote>

              <div className="cy-prose mt-12" data-reveal="up">
                <p>
                  Tout au long de l’année, notre gamme évolue au fil des saisons et des explorations de nouvelles
                  saveurs de toute l’équipe. En janvier, la galette des rois à la frangipane ; en décembre, les bûches
                  de Noël ; et nos gâteaux de voyage.
                </p>
              </div>

              <h3 className="cy-label mt-12 mb-4 text-(--cy-teal-deep)">Quelques pâtisseries citées par la presse et nos clients</h3>
              <ul className="cy-range" data-reveal="list">
                {pastries.map((pastry, index) => (
                  <li key={pastry} style={vars({ "--i": index })}>
                    <strong>{pastry}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid content-start gap-5 lg:col-span-4 lg:col-start-9">
              <Media photo={photos.patisseries} className="aspect-[4/5]" />
              <Media photo={photos.pateDetaillage} className="aspect-square" delay={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Commande */}
      <section className="cy-tealband cy-section" aria-labelledby="titre-gateau">
        <div className="cy-wrap grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-7">
            <Eyebrow>Commande en ligne</Eyebrow>
            <Lines id="titre-gateau" className="cy-h2" lines={["Un gâteau", <em key="e">pour le jour J ?</em>]} />
          </div>
          <div className="lg:col-span-4 lg:col-start-9" data-reveal="up">
            <p className="cy-lead">
              Gâteaux et entremets se commandent à l’avance : payez en ligne, retirez-les au 55 rue de la République à
              l’heure choisie.
            </p>
            <div className="mt-8">
              <ButtonLink href={cyprienHref(orderPath)} variant="paper">
                Commander
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
