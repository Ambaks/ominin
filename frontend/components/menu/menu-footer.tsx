import type { Restaurant } from "@/lib/menu-data";

const LANGUAGES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
];

export function MenuFooter({ restaurant }: { restaurant: Restaurant }) {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center">
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
