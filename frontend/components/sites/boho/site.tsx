import Image from "next/image";
import type { CSSProperties } from "react";
import { BulleBooking } from "@/components/bulles/booking";
import { HeroBubble } from "@/components/sites/boho/hero-bubble";
import { BohoCanvas, KilimMark, Orb } from "@/components/sites/boho/marks";
import { formatDuration } from "@/lib/bulles/format";
import { carteUrl } from "@/lib/bulles/links";
import type { BulleOffer } from "@/lib/bulles/public";
import { formatCents } from "@/lib/club/format";
import type { Restaurant } from "@/lib/menu-data";
import { bohoLinks, bohoPhotos } from "@/lib/sites/boho";

/*
 * Le site du Boho sert à réserver, pas à lire la carte. Il s'ouvre sur une
 * bulle de verre posée dans la nuit du jardin, puis l'affiche et la
 * réservation côte à côte. Le lieu se raconte ensuite, sans prix ; la carte
 * reste à un lien. L'adresse et les horaires viennent de la base, les bulles
 * de leurs réglages. Sans bulles ouvertes, on réserve par téléphone.
 */

const PROMESSES = [
  { titre: "Votre musique, votre ambiance.", texte: "La bulle est à vous : c'est vous qui donnez le ton de la soirée." },
  { titre: "Un moment à partager.", texte: "En famille ou entre copines, pour un anniversaire ou une soirée en couple." },
  { titre: "Un espace intime.", texte: "Rideaux tirés, au chaud, rien que pour vous au fond du jardin." },
];

const TABLEAUX = [
  { titre: "À table", texte: "Des grillades, des pizzas, et des assiettes à poser au milieu pour que chacun se serve." },
  { titre: "Au bar", texte: "Des cocktails, des smoothies, des milkshakes et des jus pressés, pour ouvrir la soirée ou la faire durer." },
  { titre: "Les chichas", texte: "Au charbon naturel, à savourer au jardin, sous les suspensions en rotin." },
];

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Le numéro tel que l'affiche l'écrit : 07 72 29 62 98. */
const nationalPhone = (phone: string) => phone.replace(/^\+33\s*/, "0");

/** Une ligne par jour ; les services d'un même jour restent ensemble. */
const hourLines = (hours: string) =>
  hours.split(/\s*[·/]\s*(?=\p{Lu}\p{Ll}{2})/u).map((line) => line.replace(/\s*·\s*/g, ", "));

export function BohoSite({
  restaurant,
  offer,
}: {
  restaurant: Restaurant;
  offer: BulleOffer | null;
}) {
  const phone = nationalPhone(restaurant.phone);
  const phoneHref = telHref(restaurant.phone);

  return (
    <>
      <BohoCanvas />
      <header className="bo-header">
        <a href="#haut" className="bo-brand" aria-label="BOHO, haut de page">
          <KilimMark className="bo-brand-mark" />
          <span>BOHO</span>
        </a>
        <nav aria-label="Navigation principale" className="bo-nav">
          {offer && <a href="#bulles">Les bulles</a>}
          <a href="#boho">Le lieu</a>
          <a href="#infos">Nous trouver</a>
          <a href="#reserver" className="bo-button bo-button--small">
            Réserver
          </a>
        </nav>
      </header>

      <main id="haut">
        <section className="bo-hero">
          <div className="bo-hero-photo">
            <Image src={bohoPhotos.domes.src} alt={bohoPhotos.domes.alt} fill priority sizes="100vw" />
          </div>
          <HeroBubble />
          <div className="bo-hero-marque">
            <p className="bo-script bo-hero-script" data-refract>
              Côté Jardin
            </p>
            <h1 className="bo-hero-title" data-refract>
              BOHO
            </h1>
          </div>
          <div className="bo-hero-panel">
            <p className="bo-hero-lead">Dînez sous un dôme de verre, au fond du jardin.</p>
            <p className="bo-hero-sub">
              Pour un anniversaire, une soirée en couple ou entre amis.
              {offer && ` À\u00a0partir de ${formatCents(offer.placeCents)} par\u00a0personne.`}
            </p>
            <div className="bo-actions">
              <a href="#reserver" className="bo-button">
                Réserver ma bulle
              </a>
              <a href="#boho" className="bo-button bo-button--ghost">
                Découvrir le lieu
              </a>
            </div>
          </div>
        </section>

        <section id="reserver" className="bo-section">
          <div className="bo-wrap bo-reserver">
            <figure className="bo-affiche" data-reveal="up">
              <Image
                src={bohoPhotos.afficheBulles.src}
                alt={bohoPhotos.afficheBulles.alt}
                width={bohoPhotos.afficheBulles.width}
                height={bohoPhotos.afficheBulles.height}
                sizes="(min-width: 60rem) 34rem, 100vw"
              />
            </figure>
            <div id="reserver-outil" className="bo-reserver-outil" tabIndex={-1}>
              <div className="bo-stack-sm bo-reserver-titre">
                <h2 className="bo-h2">Choisissez votre soir.</h2>
                {offer ? (
                  <p className="bo-lead">
                    {formatCents(offer.placeCents)} par personne, {formatDuration(offer.durationMinutes)}, de{" "}
                    {offer.minParty} à {offer.maxParty} personnes.
                  </p>
                ) : (
                  <p className="bo-lead">Réservation conseillée, places limitées : appelez-nous pour choisir votre soir.</p>
                )}
              </div>
              {offer ? (
                <BulleBooking offer={offer} />
              ) : (
                <a href={phoneHref} className="bo-button">
                  Appeler le {phone}
                </a>
              )}
            </div>
          </div>
        </section>

        <section id="bulles" className="bo-section">
          <div className="bo-wrap">
            <ul className="bo-promesses">
              {PROMESSES.map((promesse) => (
                <li key={promesse.titre} data-reveal="up">
                  <strong>{promesse.titre}</strong>
                  <span>{promesse.texte}</span>
                </li>
              ))}
            </ul>
            {offer && (
              <ul className="bo-orbs" aria-label="Les bulles">
                {offer.bulles.map((bulle, index) => (
                  <li key={bulle.id} data-reveal="up" style={{ "--d": `${index * 0.08}s` } as CSSProperties}>
                    <Orb color={bulle.color} className="bo-orb--large" />
                    <span className="bo-orb-name">{bulle.name}</span>
                  </li>
                ))}
              </ul>
            )}
            {offer && (
              <ol className="bo-capsule" data-reveal="up">
                <li>
                  <span className="bo-step-number">1</span>
                  <strong>Choisissez le soir et la bulle</strong>
                  <span>On voit en direct celles encore libres, créneau par créneau.</span>
                </li>
                <li>
                  <span className="bo-step-number">2</span>
                  <strong>Payez votre place, partagez le lien</strong>
                  <span>Vos amis paient la leur par un lien, ou vous payez pour tout le monde.</span>
                </li>
                <li>
                  <span className="bo-step-number">3</span>
                  <strong>Dès {offer.minParty} places payées, c&rsquo;est confirmé</strong>
                  <span>
                    Votre pass arrive par e-mail. Dans la bulle, la carte s&rsquo;ouvre une fois toutes les places payées.
                  </span>
                </li>
              </ol>
            )}
          </div>
        </section>

        <section id="boho" className="bo-section">
          <div className="bo-wrap bo-lieu">
            <div className="bo-hublot" data-reveal="up">
              <div className="bo-hublot-photo">
                <Image src={bohoPhotos.jardin.src} alt={bohoPhotos.jardin.alt} fill sizes="(min-width: 60rem) 34rem, 100vw" />
              </div>
            </div>
            <div className="bo-lieu-texte">
              <div className="bo-stack-sm" data-reveal="up">
                <h2 className="bo-h2">L&rsquo;élégance de la simplicité.</h2>
                <p className="bo-lead">
                  Une pergola de bois, des suspensions en rotin, des guirlandes qui s&rsquo;allument à la tombée du jour.
                  On vient au Boho à deux ou à plusieurs, pour dîner, boire un verre ou s&rsquo;attarder autour d&rsquo;une
                  chicha.
                </p>
              </div>
              <dl className="bo-tableaux" data-reveal="up">
                {TABLEAUX.map((tableau) => (
                  <div key={tableau.titre}>
                    <dt>{tableau.titre}</dt>
                    <dd>{tableau.texte}</dd>
                  </div>
                ))}
              </dl>
              <a href={carteUrl(restaurant.slug)} className="bo-lien">
                Voir la carte du restaurant
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer id="infos" className="bo-footer">
        <div className="bo-wrap">
          <div className="bo-footer-appel">
            <p className="bo-script bo-footer-script">À très vite au jardin</p>
            <a href="#reserver" className="bo-button">
              Réserver ma bulle
            </a>
          </div>
          <div className="bo-footer-grid">
            <div>
              <h2 className="bo-footer-titre">Adresse</h2>
              <p>{restaurant.address}</p>
              <a href={bohoLinks.maps}>Itinéraire</a>
            </div>
            <div>
              <h2 className="bo-footer-titre">Horaires</h2>
              {hourLines(restaurant.hours).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div>
              <h2 className="bo-footer-titre">Contact</h2>
              <a href={phoneHref}>{phone}</a>
              <a href={bohoLinks.tiktok}>TikTok {bohoLinks.tiktokHandle}</a>
            </div>
          </div>
          <p className="bo-footer-note">Site et réservations par Ominin</p>
        </div>
      </footer>
    </>
  );
}
