import Image from "next/image";
import { formatPrice, type Badge, type MenuItem } from "@/lib/menu-data";

const BADGE_LABELS: Record<Badge, string> = {
  maison: "Recette maison",
  top: "Top vente",
  nouveau: "Nouveauté",
};

function Badges({ badges }: { badges?: Badge[] }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge}
          className="ember-text rounded-full border border-ember-2/35 bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
        >
          {BADGE_LABELS[badge]}
        </span>
      ))}
    </div>
  );
}

function OrderButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      disabled
      title="Commande à table bientôt disponible"
      className={`ember-gradient shrink-0 cursor-not-allowed rounded-full font-semibold text-background opacity-45 ${
        compact ? "px-3.5 py-1.5 text-xs" : "px-5 py-2.5 text-sm"
      }`}
    >
      + Ajouter
    </button>
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
    <article className="overflow-hidden rounded-2xl border border-hairline bg-surface">
      {item.image && (
        <div className="relative aspect-video">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-surface via-transparent to-transparent" />
          <div className="absolute left-4 top-4">
            <Badges badges={item.badges} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-xl font-medium">{item.name}</h3>
          <span className="font-display text-lg text-ember-1">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="text-sm leading-relaxed text-muted">{item.description}</p>
        )}
        <Pairing pairing={item.pairing} />
        <div className="mt-1 flex justify-end">
          <OrderButton />
        </div>
      </div>
    </article>
  );
}

/** Compact row with optional thumbnail for regular items. */
function RowCard({ item }: { item: MenuItem }) {
  return (
    <article className="flex gap-4 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Badges badges={item.badges} />
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-base font-medium">{item.name}</h3>
          <span
            aria-hidden
            className="min-w-4 flex-1 border-b border-dotted border-faint/50"
          />
          <span className="font-display text-base text-ember-1">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="text-[13px] leading-relaxed text-muted">
            {item.description}
          </p>
        )}
        <Pairing pairing={item.pairing} />
        <div className="mt-auto pt-1.5">
          <OrderButton compact />
        </div>
      </div>
      {item.image && (
        <div className="relative size-24 shrink-0 self-center overflow-hidden rounded-xl sm:size-28">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
      )}
    </article>
  );
}

export function DishCard({ item }: { item: MenuItem }) {
  return item.featured && item.image ? (
    <FeaturedCard item={item} />
  ) : (
    <RowCard item={item} />
  );
}
