import Image from "next/image";
import type { CSSProperties } from "react";
import { FallingLeaves, KilimMark, Orb } from "@/components/sites/boho/marks";
import { formatDuration } from "@/lib/bulles/format";
import { bulleUrl, carteUrl } from "@/lib/bulles/links";
import type { BulleOffer } from "@/lib/bulles/public";
import { formatCents } from "@/lib/club/format";
import type { MenuCategory, Restaurant } from "@/lib/menu-data";
import { bohoLinks, bohoPhotos } from "@/lib/sites/boho";

/*
 * Le site du Boho en une page, à la manière d'une soirée au jardin : il
 * s'ouvre sur la terrasse au crépuscule, passe par les bulles, la carte et
 * les chichas, et finit dans la nuit. La carte, les prix, l'adresse et les
 * horaires viennent de la base, les bulles de leurs réglages.
 */

const euros = (price: number) => formatCents(Math.round(price * 100));

/** Le plus petit prix d'une catégorie : « dès 6 € ». */
const fromPrice = (category: MenuCategory) =>
  euros(Math.min(...category.items.map((item) => item.price)));

const isChicha = (category: MenuCategory) => /chicha/i.test(category.name);

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function BohoSite({
  restaurant,
  offer,
}: {
  restaurant: Restaurant;
  offer: BulleOffer | null;
}) {
  const menuUrl = carteUrl(restaurant.slug);
  const reserveUrl = bulleUrl(restaurant.slug);
  const categories = restaurant.categories.filter((category) => category.items.length > 0);
  const chichas = categories.find(isChicha);
  const carte = categories.filter((category) => !isChicha(category));
  const hours = restaurant.hours.split(" / ");
  const duration = offer && formatDuration(offer.durationMinutes);

  return (
    <>
      <header className="bo-header">
        <a href="#haut" className="bo-brand" aria-label="BOHO, haut de page">
          <KilimMark className="bo-brand-mark" />
          <span>BOHO</span>
        </a>
        <nav aria-label="Navigation principale" className="bo-nav">
          {offer && <a href="#bulles">Les bulles</a>}
          <a href="#carte">La carte</a>
          {chichas && <a href="#chichas">Chichas</a>}
          <a href="#infos">Nous trouver</a>
          {offer && (
            <a href={reserveUrl} className="bo-button bo-button--small">
              Réserver ma bulle
            </a>
          )}
        </nav>
      </header>

      <main id="haut">
        <section className="bo-hero">
          <FallingLeaves />
          <div className="bo-hero-text">
            <p className="bo-script bo-hero-script" data-reveal="fade">
              Côté Jardin
            </p>
            <h1 className="bo-hero-title" data-reveal="up">
              BOHO
            </h1>
            <p className="bo-rule-title" data-reveal="fade">
              Restaurant · Chicha
            </p>
            <p className="bo-hero-lead" data-reveal="up" style={{ "--d": "0.1s" } as CSSProperties}>
              L&rsquo;élégance de la simplicité, le plaisir d&rsquo;une expérience à partager.
              Grillades, cocktails et chichas sous les guirlandes.
            </p>
            <div className="bo-actions" data-reveal="up" style={{ "--d": "0.2s" } as CSSProperties}>
              {offer && (
                <a href={reserveUrl} className="bo-button">
                  Réserver ma bulle · {formatCents(offer.placeCents)}/pers.
                </a>
              )}
              <a href={menuUrl} className="bo-button bo-button--ghost">
                Voir la carte
              </a>
            </div>
          </div>
          <div className="bo-hero-photo" data-reveal="fade">
            <Image
              src={bohoPhotos.terrasse.src}
              alt={bohoPhotos.terrasse.alt}
              width={716}
              height={1024}
              priority
              sizes="(min-width: 960px) 34rem, 100vw"
            />
          </div>
        </section>
        <div className="bo-kilim" aria-hidden />

        {offer && (
          <section id="bulles" className="bo-section bo-night">
            <div className="bo-wrap">
              <div className="bo-split" data-reveal="up">
                <div>
                  <p className="bo-eyebrow bo-eyebrow--light">Au fond du jardin</p>
                  <h2 className="bo-h2">
                    {offer.bulles.length} bulles,
                    <br />
                    rien que pour vous.
                  </h2>
                </div>
                <p className="bo-lead">
                  Des hublots chauffés, rideaux tirés, posés dans le jardin. On s&rsquo;y installe à
                  plusieurs, on commande la chicha et la carte, et la bulle est à vous pendant{" "}
                  {duration}.
                </p>
              </div>
              <ul className="bo-orbs" aria-label="Les bulles">
                {offer.bulles.map((bulle, index) => (
                  <li key={bulle.id} data-reveal="up" style={{ "--d": `${index * 0.08}s` } as CSSProperties}>
                    <Orb color={bulle.color} className="bo-orb--large" />
                    <span className="bo-orb-name">{bulle.name}</span>
                  </li>
                ))}
              </ul>
              <div className="bo-facts" data-reveal="up">
                <div className="bo-arch bo-arch--red">
                  <span className="bo-eyebrow bo-eyebrow--paper">La bulle</span>
                  <span className="bo-arch-price">{formatCents(offer.placeCents)}</span>
                  <span>par personne</span>
                </div>
                <dl className="bo-fact-list">
                  <div>
                    <dt>{duration}</dt>
                    <dd>la bulle est à vous, sur un créneau fixe</dd>
                  </div>
                  <div>
                    <dt>Dès {offer.minParty}</dt>
                    <dd>
                      personnes, jusqu&rsquo;à {offer.maxParty} par bulle
                    </dd>
                  </div>
                  <div>
                    <dt>À partager</dt>
                    <dd>chacun paie sa place par un lien</dd>
                  </div>
                </dl>
              </div>
              <div className="bo-center" data-reveal="fade">
                <a href={reserveUrl} className="bo-button">
                  Choisir mon créneau
                </a>
              </div>
            </div>
          </section>
        )}

        {offer && (
          <section className="bo-section bo-paper">
            <div className="bo-wrap">
              <h2 className="bo-h2 bo-text-center" data-reveal="up">
                Réserver,{" "}
                <span className="bo-nowrap">
                  c&rsquo;est <span className="bo-script bo-script--inline">chill</span>.
                </span>
              </h2>
              <ol className="bo-steps">
                <li data-reveal="up">
                  <span className="bo-step-number">1</span>
                  <strong>Choisissez le soir et la bulle</strong>
                  <span>On voit en direct celles encore libres, créneau par créneau.</span>
                </li>
                <li data-reveal="up" style={{ "--d": "0.08s" } as CSSProperties}>
                  <span className="bo-step-number">2</span>
                  <strong>Payez votre place, partagez le lien</strong>
                  <span>
                    {formatCents(offer.placeCents)} par personne : vos amis paient la leur, ou vous
                    payez pour tout le monde.
                  </span>
                </li>
                <li data-reveal="up" style={{ "--d": "0.16s" } as CSSProperties}>
                  <span className="bo-step-number">3</span>
                  <strong>Dès {offer.minParty} places payées, c&rsquo;est confirmé</strong>
                  <span>
                    Votre pass arrive par e-mail. Dans la bulle, la carte s&rsquo;ouvre une fois toutes les places
                    payées.
                  </span>
                </li>
              </ol>
            </div>
          </section>
        )}
        <div className="bo-kilim" aria-hidden />

        <section id="carte" className="bo-section bo-paper">
          <div className="bo-wrap">
            <div className="bo-split bo-split--end" data-reveal="up">
              <div>
                <p className="bo-eyebrow">La carte</p>
                <h2 className="bo-h2">À partager, ou pas.</h2>
              </div>
              <a href={menuUrl} className="bo-button bo-button--ink">
                Toute la carte
              </a>
            </div>
            <ul className="bo-menu-index">
              {carte.map((category, index) => (
                <li key={category.id} data-reveal="up" style={{ "--d": `${(index % 4) * 0.05}s` } as CSSProperties}>
                  <a href={`${menuUrl}#${category.id}`}>
                    <span className="bo-menu-name">{category.name}</span>
                    <span className="bo-menu-dots" aria-hidden />
                    <span className="bo-menu-price">dès {fromPrice(category)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {chichas && (
          <section id="chichas" className="bo-section bo-dusk">
            <div className="bo-wrap">
              <div className="bo-center bo-stack" data-reveal="up">
                {chichas.tagline && <p className="bo-eyebrow bo-eyebrow--paper">{chichas.tagline}</p>}
                <h2 className="bo-h2">{chichas.name}</h2>
              </div>
              <ul className="bo-chichas">
                {chichas.items.map((item, index) => (
                  <li key={item.id} className="bo-arch bo-arch--line" data-reveal="up" style={{ "--d": `${index * 0.08}s` } as CSSProperties}>
                    <svg viewBox="0 0 40 80" aria-hidden className="bo-smoke">
                      <path d="M20 78c-10-12 10-20 0-34s10-20 0-40" />
                    </svg>
                    <span className="bo-chicha-name">{item.name}</span>
                    <span className="bo-arch-price bo-arch-price--gold">{euros(item.price)}</span>
                    {item.description && <span className="bo-chicha-note">{item.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {restaurant.affiches && restaurant.affiches.length > 0 && (
          <section className="bo-section bo-paper">
            <div className="bo-wrap bo-stack">
              <div data-reveal="up">
                <p className="bo-eyebrow">En ce moment</p>
                <h2 className="bo-h2">Les offres du Boho.</h2>
              </div>
              <div className="bo-affiches">
                {restaurant.affiches.map((affiche) => (
                  <a key={affiche.id} href={menuUrl} data-reveal="up">
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL téléversée ou saisie par le gérant */}
                    <img src={affiche.image} alt="Offre du moment au Boho" />
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
        <div className="bo-kilim" aria-hidden />
      </main>

      <footer id="infos" className="bo-footer">
        <div className="bo-wrap">
          <div className="bo-footer-grid">
            <div>
              <p className="bo-eyebrow bo-eyebrow--light">Adresse</p>
              <p>{restaurant.address}</p>
              <a href={bohoLinks.maps}>Itinéraire</a>
            </div>
            <div>
              <p className="bo-eyebrow bo-eyebrow--light">Horaires</p>
              {hours.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div>
              <p className="bo-eyebrow bo-eyebrow--light">Contact</p>
              <p>
                <a href={telHref(restaurant.phone)}>{restaurant.phone}</a>
              </p>
              <a href={bohoLinks.tiktok}>TikTok {bohoLinks.tiktokHandle}</a>
            </div>
          </div>
          <div className="bo-footer-end">
            <span className="bo-footer-word" aria-hidden>
              BOHO
            </span>
            <span className="bo-footer-note">Site et réservations par Ominin</span>
          </div>
        </div>
      </footer>
    </>
  );
}
