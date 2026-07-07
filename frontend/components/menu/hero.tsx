import Image from "next/image";
import type { Restaurant } from "@/lib/menu-data";

export function Hero({ restaurant }: { restaurant: Restaurant }) {
  return (
    <header className="relative h-[46svh] min-h-80 w-full overflow-hidden lg:h-[52svh] lg:min-h-96">
      {restaurant.coverImage ? (
        <Image
          src={restaurant.coverImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="ember-gradient absolute inset-0 opacity-25" />
      )}
      {/* Scrim: keeps the photo moody and the text legible */}
      <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/55 to-background" />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl px-5 pb-6 lg:max-w-5xl lg:px-10 lg:pb-10">
        <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em] lg:text-xs lg:tracking-[0.35em]">
          {restaurant.tagline}
        </p>
        <h1 className="mt-2 font-display text-5xl font-medium leading-none tracking-tight sm:text-6xl lg:text-7xl">
          {restaurant.name}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted lg:mt-6 lg:gap-3 lg:text-sm">
          <span className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur">
            {restaurant.hours}
          </span>
          <span className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur">
            {restaurant.address}
          </span>
          <a
            href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
            className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur transition-colors hover:text-foreground"
          >
            {restaurant.phone}
          </a>
        </div>
      </div>
    </header>
  );
}
