import type { Restaurant } from "@/lib/menu-data";

const LANGUAGES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
];

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

export function MenuFooter({ restaurant }: { restaurant: Restaurant }) {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center lg:max-w-5xl lg:px-10 lg:py-14">
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

        <div className="flex gap-2" aria-label="Langue">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              disabled={code !== "fr"}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide ${
                code === "fr"
                  ? "ember-gradient text-background"
                  : "cursor-not-allowed border border-hairline text-faint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="text-xs leading-relaxed text-faint">
          <p>{restaurant.name}</p>
          <p>
            {restaurant.address} · {restaurant.phone}
          </p>
          <p>Prix nets en euros, service compris.</p>
        </div>

        <p className="text-xs text-faint">
          Propulsé par <span className="ember-text font-semibold">Ominin</span>
        </p>
      </div>
    </footer>
  );
}
