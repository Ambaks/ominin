import { mapsUrl, type Restaurant } from "@/lib/menu-data";

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

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11.4 11.4 0 003.6.58 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.6a1 1 0 01-.25 1z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1 2.1-.3 3.4a9.6 9.6 0 003.9 4c1.4.6 2.4.9 3.2.7.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a7 7 0 00-7 7c0 5.1 6.3 12.4 6.6 12.7a.6.6 0 00.9 0C12.7 21.4 19 14.1 19 9a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
    </svg>
  );
}

/*
 * Bas de carte : ce qu'un client cherche une fois qu'il a choisi — appeler,
 * trouver, revenir. Le téléphone et l'adresse sont actionnables ici comme
 * dans le hero : à plus de 13 000 px du haut de page, renvoyer le client
 * chercher le seul lien appelable en haut n'aurait aucun sens.
 */
export function MenuFooter({ restaurant }: { restaurant: Restaurant }) {
  const phone = restaurant.phone.trim();
  const address = restaurant.address.trim();
  const hours = restaurant.hours.trim();

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-5 py-12 text-center lg:max-w-5xl lg:px-10 lg:py-16">
        <div className="flex flex-col items-center gap-4">
          <p className="font-display text-2xl font-medium lg:text-3xl">
            {restaurant.name}
          </p>

          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="ember-gradient flex items-center gap-3 rounded-full px-6 py-3 font-display text-lg text-background transition-transform active:scale-95 lg:text-xl"
            >
              <PhoneIcon />
              {phone}
            </a>
          )}

          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-hairline px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-ember-1"
            >
              <WhatsAppIcon />
              Commander sur WhatsApp
            </a>
          )}

          {address && (
            <a
              href={mapsUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              <PinIcon />
              {address}
            </a>
          )}

          {hours && <p className="text-sm text-muted">{hours}</p>}
        </div>

        {restaurant.googleReviewUrl && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted">
              Vous avez aimé ? Dites-le sur Google.
            </p>
            <a
              href={restaurant.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-ember-2/40 bg-surface/70 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:border-ember-2"
            >
              <StarIcon />
              Laisser un avis Google
            </a>
          </div>
        )}

        <div className="text-xs leading-relaxed text-muted">
          <p>Prix nets en euros, service compris.</p>
          <p className="mt-1">
            Propulsé par <span className="ember-text font-semibold">Ominin</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
