import Link from "next/link";
import { collectSiteUrl, siteUrl } from "@/lib/site";
import {
  contact,
  cyprienHref,
  formatSlot,
  midiPlaces,
  nav,
  orderPath,
  shops,
  socials,
  telHref,
} from "@/lib/sites/cyprien";
import { Stamp } from "./stamp";
import { ButtonLink, ExternalLink } from "./ui";

export function CyprienFooter() {
  return (
    <footer className="cy-footer cy-night">
      <div className="cy-wrap">
        <div className="cy-footer-grid">
          <div className="cy-footer-brand">
            <Stamp id="cachet-pied" className="cy-footer-stamp" />
            <p className="cy-footer-tagline">
              Authenticité, Tradition,
              <br />
              Amitié &amp; Fait-maison.
            </p>
            <ButtonLink href={cyprienHref(orderPath)} variant="paper">
              Commander en ligne
            </ButtonLink>
          </div>

          <div>
            <h2 className="cy-footer-title">Boutiques</h2>
            <ul className="cy-footer-list">
              {shops.map((shop) => (
                <li key={shop.id}>
                  <p className="cy-footer-name">{shop.name}</p>
                  <p>
                    {shop.street}, {shop.city}
                  </p>
                  <p>
                    <a href={telHref(shop.phone)} className="cy-footer-link">
                      {shop.phone}
                    </a>
                  </p>
                  {shop.hours ? (
                    <div className="cy-footer-hours">
                      {shop.hours.map((entry) => (
                        <p key={entry.label}>
                          {entry.label}
                          {entry.slots.map((slot) => (
                            <span key={slot[0]}>{formatSlot(slot)}</span>
                          ))}
                        </p>
                      ))}
                      {shop.closed && (
                        <p>
                          {shop.closed}
                          <span>Fermé</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="cy-footer-hours">Horaires&nbsp;: nous appeler</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="cy-footer-title">Cyprien le midi</h2>
            <ul className="cy-footer-list">
              {midiPlaces.map((place) => (
                <li key={place.id}>
                  <p className="cy-footer-name">{place.name.replace("Cyprien le midi ", "")}</p>
                  <p>
                    {place.street}, {place.city}
                  </p>
                  <p>
                    <a href={telHref(place.phone)} className="cy-footer-link">
                      {place.phone}
                    </a>
                  </p>
                  <div className="cy-footer-hours">
                    {place.hours.map((entry) => (
                      <p key={entry.label}>
                        {entry.label}
                        {entry.slots.map((slot) => (
                          <span key={slot[0]}>{formatSlot(slot)}</span>
                        ))}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="cy-footer-title">Contact</h2>
            <ul className="cy-footer-list cy-footer-contact">
              <li>
                <a href={`mailto:${contact.email}`} className="cy-footer-link">
                  {contact.email}
                </a>
              </li>
              <li>
                <a href={telHref(contact.phone)} className="cy-footer-link">
                  {contact.phone}
                </a>
              </li>
              <li>
                <ExternalLink href={socials.instagram.href} className="cy-footer-link">
                  Instagram
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href={socials.facebook.href} className="cy-footer-link">
                  Facebook
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href={socials.midiInstagram.href} className="cy-footer-link">
                  Instagram du midi
                </ExternalLink>
              </li>
            </ul>
          </div>
        </div>

        <nav aria-label="Plan du site" className="cy-footer-nav">
          <ul>
            <li>
              <Link href={cyprienHref("/")}>Accueil</Link>
            </li>
            {nav.map((item) => (
              <li key={item.path}>
                <Link href={cyprienHref(item.path)}>{item.label}</Link>
              </li>
            ))}
            <li>
              <Link href={cyprienHref(orderPath)}>Commander</Link>
            </li>
          </ul>
        </nav>

        <div className="cy-footer-bottom">
          <p>Boulangerie Cyprien · CO’PAINS, Toulouse</p>
          <ul>
            <li>
              <Link href={cyprienHref("/mentions-legales")}>Mentions légales</Link>
            </li>
            <li>
              <Link href={cyprienHref("/conditions-de-vente")}>Conditions de vente</Link>
            </li>
            <li>
              <a href={`${collectSiteUrl}/connexion`}>Espace équipe</a>
            </li>
          </ul>
          <p>
            Site et commande en ligne : <a href={siteUrl}>Ominin</a>
          </p>
        </div>
      </div>
      <div className="cy-wrap">
        <svg className="cy-footer-giant" viewBox="0 -150 1000 156" aria-hidden="true" focusable="false">
          <text x="0" y="0" textLength="1000" lengthAdjust="spacing">
            CYPRIEN
          </text>
        </svg>
      </div>
    </footer>
  );
}
