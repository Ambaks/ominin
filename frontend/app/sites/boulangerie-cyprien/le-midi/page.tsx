import type { Metadata } from "next";
import { MidiHours } from "@/components/sites/cyprien/midi-hours";
import { Arrow, Eyebrow, ExternalLink, Lines, Media, PageHero } from "@/components/sites/cyprien/ui";
import { midiPlaces, ogImage, photos, socials } from "@/lib/sites/cyprien";

const description =
  "Cyprien le midi : un déjeuner sain, équilibré et gourmand en libre-service, place Dupuy et rue Gabriel Péri à Toulouse. Produits locaux, pains et desserts de la boulangerie.";

export const metadata: Metadata = {
  title: "Le midi",
  description,
  openGraph: {
    title: "Le midi · Boulangerie Cyprien",
    description,
    images: [ogImage(photos.midiAssiette)],
  },
};

export default function LeMidiPage() {
  return (
    <>
      <PageHero
        eyebrow="Cyprien le midi"
        title={["Le midi", <em key="e">chez Cyprien</em>]}
        intro="Des produits sains et locaux, en libre-service, pour la pause déjeuner : place Dupuy et rue Gabriel Péri."
        photo={photos.midiAssiette}
        side
      />

      {/* Le principe */}
      <section className="cy-section" aria-labelledby="titre-principe">
        <div className="cy-wrap">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <Eyebrow>Le principe</Eyebrow>
              <Lines id="titre-principe" className="cy-h2" lines={["Self-service,", <em key="e">healthy</em>]} />
            </div>
            <div className="cy-prose lg:col-span-5 lg:col-start-8 lg:pt-10" data-reveal="up">
              <p>
                Cyprien se développe avec deux adresses dédiées à la pause déjeuner. Notre concept : des produits en
                libre-service, pour vous laisser le temps de composer vous-même votre menu, à consommer sur place ou à
                emporter.
              </p>
              <p>
                Un déjeuner sain, équilibré et gourmand, des recettes créatives, le tout dans une ambiance épurée et
                chaleureuse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Les horaires */}
      <section className="cy-night cy-section" aria-labelledby="titre-horaires">
        <div className="cy-wrap">
          <div className="cy-head-stack">
            <Eyebrow>Deux adresses</Eyebrow>
            <Lines id="titre-horaires" className="cy-h2" lines={["L’heure", <em key="e">du déjeuner</em>]} />
          </div>
          <MidiHours places={midiPlaces} />
        </div>
      </section>

      {/* Les produits */}
      <section className="cy-section cy-deep" aria-labelledby="titre-produits">
        <div className="cy-wrap cy-split">
          <Media photo={photos.legumesLocaux} className="aspect-[5/6]" />
          <div>
            <Eyebrow>Les produits</Eyebrow>
            <Lines id="titre-produits" className="cy-h2" lines={["Sains", <em key="e">et locaux</em>]} />
            <div className="cy-prose mt-6" data-reveal="up">
              <p>
                En harmonie avec notre façon de penser et de vivre, nous vous proposons le midi des produits 100 %
                artisanaux, avec des ingrédients locaux de qualité sélectionnés par notre équipe de cuisiniers, dans
                le respect des saisons.
              </p>
              <p>
                Notre gamme salée est préparée chaque matin place Dupuy, pour être consommée le jour même. Nos pains
                à sandwich et nos desserts arrivent directement du laboratoire de nos boulangers et pâtissiers, à la
                boulangerie Cyprien.
              </p>
            </div>
            <div className="mt-10" data-reveal="up">
              <ExternalLink href={socials.midiInstagram.href} className="cy-arrow-link">
                {socials.midiInstagram.handle} sur Instagram
                <Arrow />
              </ExternalLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
