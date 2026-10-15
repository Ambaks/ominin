import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { Marquee } from "@/components/sites/cyprien/marquee";
import { ShopCard } from "@/components/sites/cyprien/places";
import { Stamp } from "@/components/sites/cyprien/stamp";
import { Story, type StoryChapter } from "@/components/sites/cyprien/story";
import { Arrow, ButtonLink, Eyebrow, ExternalLink, Lines, Media, vars } from "@/components/sites/cyprien/ui";
import { cyprienHref, formatPressDate, orderPath, PHOTO_SIZES, photos, press, shops, signatureNames, stampSrc } from "@/lib/sites/cyprien";

export const metadata: Metadata = {
  title: { absolute: "Boulangerie Cyprien · Boulangerie-pâtisserie artisanale à Toulouse" },
};

const QUOTE: { word: string; em?: boolean }[] = [
  { word: "La" },
  { word: "simplicité", em: true },
  { word: "est" },
  { word: "l’habit" },
  { word: "de" },
  { word: "la" },
  { word: "perfection", em: true },
];

const chapters: StoryChapter[] = [
  {
    id: "boulangerie",
    kicker: "Boulangerie",
    title: (
      <>
        Des farines de l’Aveyron, <em>un levain bio</em>
      </>
    ),
    body: (
      <>
        <p>
          Nos farines viennent du Moulin Calvet, meunier à taille humaine de l’Aveyron : des blés régionaux, qui
          voyagent peu. Dès l’ouverture, un jeune boulanger formé chez les Compagnons du Devoir a bâti la gamme, pour
          l’essentiel sur levain bio 100 % naturel.
        </p>
        <ul aria-label="Quelques pains de la gamme">
          <li>Pain des Copains</li>
          <li>Pain Cyprien</li>
          <li>Tourte aux blés anciens</li>
          <li>Pain complet</li>
          <li>Baguette de tradition</li>
        </ul>
      </>
    ),
    photo: photos.faconnage,
    focus: "38% 50%",
  },
  {
    id: "viennoiserie",
    kicker: "Viennoiserie",
    title: (
      <>
        Le croissant, <em>au meilleur niveau</em>
      </>
    ),
    body: (
      <>
        <blockquote className="cy-pull cy-pull-long">
          <p>
            « Trois fois “Meilleur croissant au beurre AOP d’Île-de-France”, Lionel a su amener le croissant au meilleur
            niveau à Paris, avant de venir le proposer aux Toulousains. »
          </p>
          <footer>Boulangerie Cyprien</footer>
        </blockquote>
        <p>Des viennoiseries 100 % artisanales, confectionnées ici même, au laboratoire.</p>
      </>
    ),
    photo: photos.viennoiseries,
    focus: "35% 50%",
  },
  {
    id: "patisserie",
    kicker: "Pâtisserie",
    title: (
      <>
        Simples <em>et gourmandes</em>
      </>
    ),
    body: (
      <>
        <blockquote className="cy-pull">
          <p>« Je ne cherche pas la performance dans mes pâtisseries, je veux qu’elles soient simples et gourmandes. »</p>
          <footer>Lionel Fauré</footer>
        </blockquote>
        <p>La gamme évolue au fil des saisons et des explorations de toute l’équipe.</p>
      </>
    ),
    photo: photos.pateDetaillage,
    focus: "50% 60%",
  },
];

const featured = press.find((item) => item.highlight);
const otherOutlets = [...new Set(press.map((item) => item.outlet))].filter((outlet) => outlet !== featured?.outlet);

export default function CyprienHome() {
  const order = cyprienHref(orderPath);

  return (
    <>
      {/* Vitrine */}
      <section className="cy-hero" aria-labelledby="titre-accueil">
        <div className="cy-wrap cy-hero-head">
          <div className="cy-hero-top cy-label cy-load" style={vars({ "--d": "0s" })}>
            <span>
              Boulangerie · Pâtisserie<span className="cy-hero-top-extra"> · 100 % artisanale</span>
            </span>
            <span>Saint-Cyprien, Toulouse</span>
          </div>
          <h1 id="titre-accueil">
            <span className="sr-only">Boulangerie Cyprien</span>
            <span className="cy-hero-mark" aria-hidden="true" data-hero-mark>
              {"CYPRIEN".split("").map((letter, index) => (
                <span key={index} style={vars({ "--i": index })}>
                  {letter}
                </span>
              ))}
            </span>
          </h1>
          <div className="cy-hero-body">
            <p className="cy-tagline cy-load-lines">
              <span className="cy-line">
                <span style={vars({ "--i": 4 })}>Authenticité, Tradition,</span>
              </span>
              <span className="cy-line">
                <span style={vars({ "--i": 5 })}>Amitié &amp; Fait-maison.</span>
              </span>
            </p>
            <div className="cy-hero-aside cy-load" style={vars({ "--d": "0.8s" })}>
              <p className="cy-lead">
                Pain au levain bio, viennoiseries au beurre AOP et pâtisserie fine, faits maison rue de la République
                depuis octobre 2017.
              </p>
              <div className="cy-hero-ctas">
                <ButtonLink href={order}>Commander</ButtonLink>
                <ButtonLink href={cyprienHref("/boutiques")} variant="ghost">
                  Nos boutiques
                </ButtonLink>
              </div>
            </div>
          </div>
          {/* Les croissants en grand, la boutique en vis-à-vis. Les deux photos
              sont larges (2,1:1) et recadrées dans des formats plus hauts : la
              partie affichée est plus large que son cadre, d’où PHOTO_SIZES —
              sans lui, le navigateur chargeait une version trois fois trop
              petite. */}
          <figure className="cy-hero-figure">
            <div className="cy-hero-pair">
              <div className="cy-hero-main">
                <div className="cy-hero-media">
                  <div className="cy-par-hero">
                    <Image
                      src={photos.croissantsFour.src}
                      alt={photos.croissantsFour.alt}
                      fill
                      preload
                      sizes={PHOTO_SIZES}
                      className="cy-kenburns object-cover"
                      style={{ objectPosition: "50% 60%" }}
                    />
                  </div>
                </div>
                <div className="cy-hero-stamp">
                  <Stamp id="cachet-accueil" />
                </div>
              </div>
              <div className="cy-hero-side">
                <div className="cy-hero-media">
                  <div className="cy-par-hero">
                    <Image
                      src={photos.boutique.src}
                      alt={photos.boutique.alt}
                      fill
                      sizes={PHOTO_SIZES}
                      className="object-cover"
                      style={{ objectPosition: "8% 50%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="cy-hero-caption cy-label" data-reveal="fade">
              Les croissants au beurre AOP Charentes-Poitou, et la boutique de la rue de la République
            </figcaption>
          </figure>
        </div>
        <Marquee items={signatureNames} label="Quelques produits de la maison" />
      </section>

      {/* Manifeste */}
      <section className="cy-section" aria-labelledby="titre-manifeste">
        <div className="cy-wrap">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <Eyebrow as="h2" id="titre-manifeste">
                Notre état d’esprit
              </Eyebrow>
              <figure>
                <blockquote className="cy-quote cy-words">
                  {QUOTE.map(({ word, em }, index) => (
                    <Fragment key={index}>
                      <span style={vars({ "--i": index })}>
                        {index === 0 && <><span className="cy-guillemet">«</span>&#8239;</>}
                        {em ? <em>{word}</em> : word}
                        {index === QUOTE.length - 1 && <>&#8239;<span className="cy-guillemet">»</span></>}
                      </span>{" "}
                    </Fragment>
                  ))}
                </blockquote>
                <figcaption className="cy-cite" data-reveal="up">
                  Une phrase de Wladimir Wolf-Gozin, à laquelle Lionel Fauré est particulièrement attaché.
                </figcaption>
              </figure>
              <div className="cy-prose mt-12" data-reveal="up" data-delay="1">
                <p className="cy-motto">Retrouver les goûts de notre enfance et revenir à l’essentiel.</p>
                <p>
                  Faire des choses simples, bonnes et gourmandes, dans le respect des règles de l’art de la pâtisserie
                  et de la boulangerie. Pains, viennoiseries, pâtisserie fine, gâteaux de voyage, mais aussi
                  sandwichs, soupes et salades : tout est fait maison, dans notre laboratoire.
                </p>
              </div>
            </div>
            <div className="lg:col-span-4 lg:col-start-9 lg:pt-28">
              <Media
                photo={photos.farineMains}
                className="aspect-[4/5]"
                focus="50% 70%"
              />
            </div>
          </div>

          <ul className="cy-figures">
            <li className="cy-figure" data-reveal="up">
              <span className="cy-figure-num">
                100&#8239;%
              </span>
              <span className="cy-figure-text">artisanal : c’est écrit sur l’enseigne, et sous le logo.</span>
            </li>
            <li className="cy-figure" data-reveal="up" data-delay="1">
              <span className="cy-figure-num">
                4
              </span>
              <span className="cy-figure-text">
                adresses à Toulouse : deux boutiques, et deux{" "}
                <Link href={cyprienHref("/le-midi")} className="cy-link">
                  Cyprien le midi
                </Link>
                .
              </span>
            </li>
            <li className="cy-figure" data-reveal="up" data-delay="2">
              <span className="cy-figure-num">
                11
              </span>
              <span className="cy-figure-text">salariés et apprentis dès la première année.</span>
            </li>
            <li className="cy-figure" data-reveal="up" data-delay="3">
              <span className="cy-figure-num">
                4,6/5
              </span>
              <span className="cy-figure-text">sur plus de 900 avis Google.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Signatures */}
      <section className="cy-section cy-deep" aria-labelledby="titre-signatures">
        <div className="cy-wrap">
          <div className="cy-head-inline">
            <div>
              <Eyebrow>La vitrine</Eyebrow>
              <Lines id="titre-signatures" className="cy-h2" lines={["Nos", <em key="e">signatures</em>]} />
            </div>
            <p className="cy-lead" data-reveal="up">
              Le pain phare de la maison, et trois spécialités de la vitrine.
            </p>
          </div>

          <article className="cy-sig-feature" aria-labelledby="sig-copains">
            <Media photo={photos.painLevain} className="aspect-[4/5]" />
            <div data-reveal="up">
              <p className="cy-num">N° 01 · Le pain phare</p>
              <h3 id="sig-copains" className="cy-h2 mt-4">
                Pain des <em>Copains</em>
              </h3>
              <p className="cy-lead mt-6 max-w-[38ch]">
                Farine semi-complète de blé bio et levain 100 % naturel : notre pain phare.
              </p>
              <div className="cy-score">
                <span className="cy-score-num" aria-hidden="true">
                  9<small>/10</small>
                </span>
                <p className="cy-score-text">
                  <span className="sr-only">9 sur 10 : </span>
                  la note du jury de « La Meilleure Boulangerie de France », sur M6 en 2018 — Norbert Tarayre et
                  Bruno Cormerais.
                </p>
              </div>
            </div>
          </article>

          <div className="cy-sig-grid">
            <article className="cy-tile" data-reveal="up" aria-labelledby="sig-croissant">
              <div className="cy-tile-art" aria-hidden="true">
                <p className="cy-tile-word">
                  AOP
                  <span>Charentes-Poitou</span>
                </p>
              </div>
              <div className="cy-tile-body">
                <p className="cy-num">N° 02</p>
                <h3 id="sig-croissant" className="cy-h3">
                  Croissant au beurre AOP
                </h3>
                <p>
                  Beurre AOP Charentes-Poitou, et des fournées toute la journée : toujours frais, toujours
                  croustillant.
                </p>
              </div>
            </article>
            <article className="cy-tile" data-reveal="up" data-delay="1" aria-labelledby="sig-chocolatine">
              <div className="cy-tile-art" aria-hidden="true">
                <span className="cy-tile-three">3</span>
                <span className="cy-tile-bars">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
              <div className="cy-tile-body">
                <p className="cy-num">N° 03</p>
                <h3 id="sig-chocolatine" className="cy-h3">
                  Chocolatine à trois barres
                </h3>
                <p>
                  Une troisième barre de chocolat, pour plus de gourmandise. En 2025, Toulouse Secret la classe 5ᵉ
                  des meilleures chocolatines de Toulouse.
                </p>
              </div>
            </article>
            <article className="cy-tile cy-tile-ink" data-reveal="up" data-delay="2" aria-labelledby="sig-charbon">
              <div className="cy-tile-art" aria-hidden="true">
                <p className="cy-tile-charbon">
                  Charbon
                  <br />
                  végétal
                  <span>Baguette de tradition</span>
                </p>
              </div>
              <div className="cy-tile-body">
                <p className="cy-num">N° 04</p>
                <h3 id="sig-charbon" className="cy-h3">
                  Baguette au charbon végétal actif
                </h3>
                <p>
                  Une baguette de tradition noire comme l’encre, pour son originalité. LCI et Le24heures en ont parlé
                  dès 2018.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Savoir-faire */}
      <section className="cy-night cy-section" aria-labelledby="titre-savoir-faire">
        <div className="cy-wrap">
          <div className="cy-head-inline">
            <div>
              <Eyebrow>Savoir-faire</Eyebrow>
              <Lines id="titre-savoir-faire" className="cy-h2" lines={["Derrière", <em key="e">la vitre</em>]} />
            </div>
            <p className="cy-lead" data-reveal="up">
              Le laboratoire vitré se voit depuis la boutique. Pains, viennoiseries, pâtisseries : tout est fait
              maison, ici, par l’équipe.
            </p>
          </div>
          <Story
            chapters={chapters}
            after={
              <ButtonLink href={cyprienHref("/savoir-faire")} variant="ghost-night">
                Tout le savoir-faire
              </ButtonLink>
            }
          />
        </div>
      </section>

      {/* Commande en ligne */}
      <section className="cy-section" aria-labelledby="titre-commande">
        <div className="cy-wrap cy-order-grid">
          <Media photo={photos.patisseries} className="aspect-[4/5]" />
          <div className="cy-slip-wrap" data-reveal="up">
            <div className="cy-slip">
              <div className="cy-slip-head">
                <span className="cy-label">Bon de commande</span>
                <Image src={stampSrc} alt="" width={340} height={341} sizes="128px" className="cy-slip-stamp" />
              </div>
              <h2 id="titre-commande" className="cy-h2">
                Votre gâteau,
                <br />
                <em>le jour J</em>
              </h2>
              <p className="cy-lead mt-5 max-w-[36ch]">
                Commandez en ligne, payez en ligne, et passez le prendre à l’heure choisie : il vous attend en
                boutique.
              </p>
              <ol className="cy-slip-steps" data-reveal="list" data-delay="3">
                <li style={vars({ "--i": 0 })}>
                  <b>1</b>
                  <strong>Choisissez</strong>
                  <span>Gâteaux et entremets se commandent à l’avance.</span>
                </li>
                <li style={vars({ "--i": 1 })}>
                  <b>2</b>
                  <strong>Payez en ligne</strong>
                  <span>Par carte, au moment de la commande.</span>
                </li>
                <li style={vars({ "--i": 2 })}>
                  <b>3</b>
                  <strong>Retirez</strong>
                  <span>Au 55 rue de la République, à l’heure choisie.</span>
                </li>
              </ol>
              <div className="cy-slip-foot">
                <ButtonLink href={order}>Commander</ButtonLink>
                <p>
                  Retrait à la boutique <span className="whitespace-nowrap">Saint-Cyprien</span> uniquement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* L’histoire, en bref */}
      <section className="cy-section cy-deep" aria-labelledby="titre-histoire">
        <div className="cy-wrap cy-split">
          <figure>
            <Media
              photo={photos.fondateurs}
              className="aspect-[32/33]"
              parallax={false}
            />
            <figcaption className="cy-caption">Les trois associés, derrière la vitrine des pâtisseries.</figcaption>
          </figure>
          <div>
            <Eyebrow>L’histoire</Eyebrow>
            <Lines
              id="titre-histoire"
              className="cy-h2"
              lines={["Avant tout,", <em key="a">une histoire</em>, <em key="b">d’amitié</em>]}
            />
            <p className="cy-lead mt-6" data-reveal="up">
              Un avocat qui change de vie, son ami d’enfance, cycliste devenu pâtissier, et un troisième associé :
              Cyprien ouvre en octobre 2017 au 55 rue de la République.
            </p>
            <div className="mt-10">
              <ButtonLink href={cyprienHref("/histoire")} variant="ghost">
                Lire l’histoire
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Presse, en bref */}
      {featured?.url && (
        <section className="cy-press-teaser" aria-labelledby="titre-presse">
          <div className="cy-wrap">
            <div className="cy-press-teaser-grid">
              <div>
                <Eyebrow>Presse</Eyebrow>
                <h2 id="titre-presse" className="cy-h3" data-reveal="up" data-delay="1">
                  Ils parlent de Cyprien
                </h2>
              </div>
              <figure data-reveal="up">
                <blockquote className="cy-press-quote">
                  <span className="cy-guillemet">«</span>&#8239;{featured.title}&#8239;
                  <span className="cy-guillemet">»</span>
                </blockquote>
                <figcaption className="cy-press-source">
                  {featured.outlet}, {formatPressDate(featured.date)}
                  <ExternalLink href={featured.url} className="cy-arrow-link">
                    Lire
                    <span className="sr-only"> l’article de {featured.outlet}</span>
                    <Arrow />
                  </ExternalLink>
                </figcaption>
              </figure>
            </div>
            <div className="cy-press-teaser-foot" data-reveal="fade">
              <dl className="cy-outlets">
                <dt>Et aussi</dt>
                {otherOutlets.map((outlet) => (
                  <dd key={outlet}>{outlet}</dd>
                ))}
              </dl>
              <ButtonLink href={cyprienHref("/presse")} variant="ghost">
                Toute la presse
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* Boutiques */}
      <section className="cy-section cy-deep" aria-labelledby="titre-boutiques">
        <div className="cy-wrap">
          <Eyebrow>Nos boutiques</Eyebrow>
          <Lines id="titre-boutiques" className="cy-h2 cy-h2-xl" lines={["Deux adresses à Toulouse"]} />
          <p className="cy-lead mt-6 max-w-[44ch]" data-reveal="up">
            La boutique de la rue de la République et, depuis 2025, celle de la place du Fer à Cheval. Les commandes
            passées en ligne se retirent rue de la République.
          </p>
          <div className="cy-places mt-12">
            {shops.map((shop, index) => (
              <div key={shop.id} data-reveal="up" data-delay={index || undefined}>
                <ShopCard shop={shop} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
