import { BADGE_LABELS, formatPrice, type Badge, type MenuItem } from "@/lib/menu-data";
import { AddToOrder } from "./add-to-order";

function Badges({ badges }: { badges?: Badge[] }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full bg-ember-1 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-background"
        >
          {BADGE_LABELS[badge]}
        </span>
      ))}
    </div>
  );
}

function Pairing({ pairing }: { pairing?: string }) {
  if (!pairing) return null;
  return (
    <p className="font-display text-[13px] italic text-ember-1/85">{pairing}</p>
  );
}

/** Large photo card for featured items. */
function FeaturedCard({ item }: { item: MenuItem }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-300 hover:border-ember-2/45 lg:rounded-3xl">
      {item.image && (
        <div className="relative aspect-video overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image */}
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-surface via-transparent to-transparent" />
          <div className="absolute left-4 top-4">
            <Badges badges={item.badges} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 p-4 lg:gap-3 lg:p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-lg font-medium sm:text-xl lg:text-2xl">
            {item.name}
            {item.detail && " "}
            {item.detail && (
              <span className="dish-detail ml-2 whitespace-nowrap align-middle text-sm font-normal text-muted">
                {item.detail}
              </span>
            )}
          </h3>
          <div className="flex shrink-0 flex-col items-end">
            <span className="dish-price font-display text-xl text-ember-1 lg:text-2xl">
              {formatPrice(item.price)}
            </span>
            {item.tarif && (
              <span className="text-[11px] leading-tight text-faint">
                {/* Une remise se lit mieux à côté du prix barré ; une
                    majoration barrée ferait croire à une bonne affaire. */}
                {item.tarif.basePrice > item.price && (
                  <span className="mr-1 line-through">
                    {formatPrice(item.tarif.basePrice)}
                  </span>
                )}
                {item.tarif.name}
              </span>
            )}
          </div>
        </div>
        {item.description && (
          <p className="text-sm leading-relaxed text-muted lg:text-[15px]">{item.description}</p>
        )}
        <Pairing pairing={item.pairing} />
        <div className="mt-1 flex justify-end">
          <AddToOrder item={item} />
        </div>
      </div>
    </article>
  );
}

export function DishCard({ item }: { item: MenuItem }) {
  return <FeaturedCard item={item} />;
}
