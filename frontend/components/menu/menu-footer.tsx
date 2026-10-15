import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PhoneIcon, PinIcon } from "@/components/menu/contact-icons";
import { keepHyphenated } from "@/components/menu/keep-hyphenated";
import { NameWords } from "@/components/menu/name-words";
import {
  brandName,
  displayAddress,
  displayPhone,
  mapsUrl,
  type Restaurant,
} from "@/lib/menu-data";

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 text-ember-1"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" />
    </svg>
  );
}

/*
 * Bas de carte : ce qu'un client cherche une fois qu'il a choisi — appeler,
 * trouver, revenir. Le téléphone et l'adresse sont actionnables ici comme
 * dans le hero : à plus de 13 000 px du haut de page, renvoyer le client
 * chercher le seul lien appelable en haut n'aurait aucun sens.
 */
export function MenuFooter({
  restaurant,
  themeToggle,
}: {
  restaurant: Restaurant;
  /** Palette Ominin : au téléphone, le bouton clair/sombre vit ici plutôt
      que dans la barre des catégories, où il rognait les pastilles. */
  themeToggle?: boolean;
}) {
  const phone = restaurant.phone.trim();
  const address = restaurant.address.trim();
  const hours = restaurant.hours.trim();
  // Une carte qui imprime des allergènes renvoie aussi vers l'équipe : la liste
  // ne remplace pas la question d'un client allergique.
  const printsAllergens = restaurant.categories.some((category) =>
    category.items.some((item) => item.allergens?.length)
  );
  const hasPhotos =
    Boolean(restaurant.coverImage || restaurant.formulesBanner) ||
    restaurant.categories.some((category) => category.items.some((item) => item.image));
  // La palette Ominin (themeToggle) garde le logo du héros, qu'elle sait éclaircir.
  const brandLogo = themeToggle ? undefined : restaurant.footerLogo;

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-5 py-12 text-center lg:max-w-5xl lg:px-10 lg:py-16">
        {restaurant.glossary && (
          <section aria-labelledby="menu-glossary" className="footer-glossary w-full max-w-md text-left">
            <h2 id="menu-glossary" className="font-display text-xl">
              Infos
            </h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              {restaurant.glossary.map(({ term, definition }) => (
                <div key={term}>
                  <dt className="inline font-semibold text-foreground">{keepHyphenated(term)}</dt>
                  <dd className="inline text-muted">{keepHyphenated(`\u00a0: ${definition}`)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="flex flex-col items-center gap-4">
          <p className="footer-name font-display text-2xl font-medium lg:text-3xl">
            {restaurant.logo && restaurant.logoIsName ? (
              // eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres
              <img
                src={brandLogo ?? restaurant.logo}
                alt={brandName(restaurant)}
                className={brandLogo ? "h-auto w-72 max-w-full lg:w-96" : `h-12 w-auto lg:h-14 ${restaurant.whiteLogo ? "logo-white" : ""}`}
              />
            ) : (
              <NameWords name={brandName(restaurant)} />
            )}
          </p>

          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="footer-phone ember-gradient flex items-center gap-3 rounded-full px-6 py-3 font-display text-lg text-background transition-transform active:scale-95 lg:text-xl"
            >
              <PhoneIcon className="size-5 shrink-0" />
              {displayPhone(phone)}
            </a>
          )}

          {address && (
            <a
              href={mapsUrl(address, restaurant.placeId)}
              target="_blank"
              rel="noopener noreferrer"
              // L'icône suit le texte : en flex, une adresse sur deux lignes
              // la laissait flotter loin à gauche.
              className="footer-address block max-w-xs px-2 py-3 text-sm text-muted transition-colors hover:text-foreground"
            >
              <PinIcon className="mr-1.5 inline size-4 align-[-0.2em]" />
              {keepHyphenated(displayAddress(address))}
            </a>
          )}

          {hours && <p className="text-sm text-muted">{hours}</p>}

          {printsAllergens && (
            <p className="text-sm text-muted">
              Allergies ou intolérances&nbsp;: demandez à l&rsquo;équipe avant de commander.
            </p>
          )}
        </div>

        {restaurant.googleReviewUrl && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted">
              Vous avez aimé&nbsp;? Dites-le sur&nbsp;Google.
            </p>
            <a
              href={restaurant.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-review flex items-center gap-2 rounded-full border border-ember-2/40 bg-surface/70 px-5 py-3 text-sm font-semibold backdrop-blur transition-colors hover:border-ember-2"
            >
              <StarIcon />
              Laisser un avis Google
            </a>
          </div>
        )}

        <div className="text-xs leading-relaxed text-muted">
          {restaurant.allergensUrl && (
            <p className="mb-2">
              <a
                href={restaurant.allergensUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline decoration-hairline underline-offset-4 transition-colors hover:decoration-foreground"
              >
                Tableau des allergènes
              </a>
            </p>
          )}
          <p>Prix nets en euros, service compris.</p>
          {hasPhotos && <p>Photos non contractuelles.</p>}
          <p className="mt-1 flex items-center justify-center gap-2">
            <span>
              Propulsé par <span className="ember-text font-semibold">Ominin</span>
            </span>
            {themeToggle && <ThemeToggle className="sm:hidden" />}
          </p>
        </div>
      </div>
    </footer>
  );
}
