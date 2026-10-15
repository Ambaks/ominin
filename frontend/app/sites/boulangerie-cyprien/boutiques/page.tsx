import type { Metadata } from "next";
import Link from "next/link";
import { ShopCard } from "@/components/sites/cyprien/places";
import { ButtonLink, Eyebrow, ExternalLink, Lines, Media, PageHero } from "@/components/sites/cyprien/ui";
import { contact, cyprienHref, ogImage, orderPath, photos, shops, socials, telHref } from "@/lib/sites/cyprien";

const description =
  "Les deux boutiques Cyprien à Toulouse : 55 rue de la République (Saint-Cyprien) et 7 place du Fer à Cheval. Horaires, téléphone, itinéraire et retrait des commandes en ligne.";

export const metadata: Metadata = {
  title: "Boutiques",
  description,
  openGraph: {
    title: "Boutiques · Boulangerie Cyprien",
    description,
    images: [ogImage(photos.boutique)],
  },
};

export default function BoutiquesPage() {
  return (
    <>
      <PageHero
        eyebrow="Nos boutiques"
        title={["Deux boutiques", <em key="e">à Toulouse</em>]}
        intro="La boutique de la rue de la République, ouverte en octobre 2017, et depuis 2025 celle de la place du Fer à Cheval."
        photo={photos.boutique}
        focus="50% 55%"
      />

      <section className="cy-section" aria-label="Adresses et horaires">
        <div className="cy-wrap">
          <div className="cy-places">
            {shops.map((shop, index) => (
              <div key={shop.id} data-reveal="up" data-delay={index || undefined}>
                <ShopCard shop={shop} as="h2" />
              </div>
            ))}
          </div>
          <p className="cy-caption mt-6">
            Les commandes passées en ligne se retirent à la boutique Saint-Cyprien, 55 rue de la République.
          </p>
        </div>
      </section>

      {/* La boutique */}
      <section className="cy-section cy-deep" aria-labelledby="titre-lieu">
        <div className="cy-wrap cy-split">
          <Media
            photo={photos.laboratoire}
            className="aspect-[4/3]"
            focus="60% 50%"
          />
          <div>
            <Eyebrow>Saint-Cyprien</Eyebrow>
            <Lines id="titre-lieu" className="cy-h2" lines={["Un laboratoire", <em key="e">à vue</em>]} />
            <div className="cy-prose mt-6" data-reveal="up">
              <p>
                Brique blanche, bois et un laboratoire vitré qu’on voit depuis la boutique : l’intérieur de la rue de la
                République est l’œuvre du designer Christophe Bro.
              </p>
              <p>
                Sur la rive gauche, à 80 mètres du métro Saint-Cyprien – République et à 200 mètres du marché couvert.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Commande */}
      <section className="cy-night cy-section" aria-labelledby="titre-commande-boutiques">
        <div className="cy-wrap grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-7">
            <Eyebrow>Une commande de gâteau ?</Eyebrow>
            <Lines
              id="titre-commande-boutiques"
              className="cy-h2"
              lines={["Commandez", <em key="e">en ligne</em>]}
            />
          </div>
          <div className="lg:col-span-4 lg:col-start-9" data-reveal="up">
            <p className="cy-lead">
              Payez en ligne, et retirez votre commande au 55 rue de la République à l’heure choisie.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={cyprienHref(orderPath)} variant="paper">
                Commander
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="cy-section" aria-labelledby="titre-contact">
        <div className="cy-wrap grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Eyebrow>Une demande ?</Eyebrow>
            <Lines id="titre-contact" className="cy-h2" lines={["Nous", <em key="e">joindre</em>]} />
          </div>
          <div className="lg:col-span-6 lg:col-start-7" data-reveal="up">
            <ul className="cy-range">
              <li>
                <strong>Par téléphone</strong>
                <a href={telHref(contact.phone)} className="cy-link cy-link-tall justify-self-start">
                  {contact.phone}
                </a>
              </li>
              <li>
                <strong>Par courriel</strong>
                <a href={`mailto:${contact.email}`} className="cy-link cy-link-tall justify-self-start">
                  {contact.email}
                </a>
              </li>
              <li>
                <strong>Instagram</strong>
                <ExternalLink href={socials.instagram.href} className="cy-link cy-link-tall justify-self-start">
                  {socials.instagram.handle}
                </ExternalLink>
              </li>
              <li>
                <strong>Facebook</strong>
                <ExternalLink href={socials.facebook.href} className="cy-link cy-link-tall justify-self-start">
                  {socials.facebook.handle}
                </ExternalLink>
              </li>
            </ul>
            <p className="cy-caption mt-8">
              Pour déjeuner, Cyprien le midi vous accueille place Dupuy et rue Gabriel Péri.{" "}
              <Link href={cyprienHref("/le-midi")} className="cy-link text-(--cy-teal-deep)">
                Voir les adresses
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
