import { allergenLine, BADGE_LABELS, formatPrice, hasFormats } from "@/lib/menu/format";
import { type Badge, type MenuItem } from "@/lib/menu-data";
import { AddToOrder } from "./add-to-order";
import { DishIndicators } from "./dish-indicators";
import { keepHyphenated } from "./keep-hyphenated";
import { RewardHint } from "./reward-hint";

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

/**
 * Une description sur plusieurs lignes est une liste — la composition d'un
 * menu (« 1 cuisse… / + 1 accompagnement… / + 1 boisson ») ; sur une seule,
 * un paragraphe.
 *
 * `detail` (« 33 cl ») suit aussi la description, caché : un thème qui le
 * préfère là plutôt qu'à côté du nom l'y montre (.dish-detail-after,
 * globals.css) — au bout du paragraphe, ou sur sa ligne.
 *
 * Les prix des formats (`tarifs`) ferment la description, sur leur ligne
 * (.dish-tarifs).
 */
function Description({ text, tarifs, detail }: { text?: string; tarifs?: string; detail?: string }) {
  const className = "text-sm leading-relaxed text-muted lg:text-[15px]";
  const ownLine = detail ? <p className={`dish-detail-after hidden ${className}`}>{detail}</p> : null;
  const lines = [
    ...(text ? text.split("\n").map((line) => ({ line, hook: undefined })) : []),
    ...(tarifs ? [{ line: tarifs, hook: "dish-tarifs" }] : []),
  ];
  if (lines.length === 0) return ownLine;
  if (lines.length === 1) {
    return (
      <p className={lines[0].hook ? `${lines[0].hook} ${className}` : className}>
        {keepHyphenated(lines[0].line)}
        {detail && <span className="dish-detail-after hidden">{detail}</span>}
      </p>
    );
  }
  return (
    <>
      <ul className={`dish-lines ${className}`}>
        {lines.map(({ line, hook }) => (
          <li key={line} className={hook}>
            {keepHyphenated(line)}
          </li>
        ))}
      </ul>
      {ownLine}
    </>
  );
}

/** Les allergènes que l'établissement déclare pour ce plat. */
export function Allergens({ item }: { item: MenuItem }) {
  if (!item.allergens?.length) return null;
  return (
    <p className="dish-allergens text-xs leading-relaxed text-faint">
      {allergenLine(item.allergens)}
    </p>
  );
}

/** Click & collect : le délai que le plat demande avant son retrait. */
function Notice({ hours }: { hours?: number }) {
  if (!hours) return null;
  return (
    <p className="dish-notice text-xs font-semibold text-ember-2">
      À commander {hours}&nbsp;h à l&apos;avance
    </p>
  );
}

function Pairing({ pairing }: { pairing?: string }) {
  if (!pairing) return null;
  return (
    <p className="font-display text-[13px] italic text-ember-1/85">{pairing}</p>
  );
}

/** Large photo card for featured items. */
function FeaturedCard({ item, priority, span }: { item: MenuItem; priority?: boolean; span?: boolean }) {
  return (
    <article
      // data-item : un thème peut marquer un plat précis (globals.css).
      data-item={item.id}
      // Une fiche que la mise en page d'un thème peut étendre à la rangée (globals.css).
      data-span={span || undefined}
      className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-300 hover:border-ember-2/45 lg:rounded-3xl"
    >
      {item.image && (
        <div className="dish-photo relative aspect-video overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image */}
          <img
            src={item.image}
            alt=""
            // La première photo de la carte est souvent l'élément le plus
            // lourd du premier écran : chargée tout de suite, pas en différé.
            loading={priority ? "eager" : "lazy"}
            // Les autres passent après le JavaScript : la page est trop
            // courte pour que « lazy » les retienne.
            fetchPriority={priority ? "high" : "low"}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="dish-photo-fade absolute inset-0 bg-linear-to-t from-surface via-transparent to-transparent" />
          <div className="absolute left-4 top-4">
            <Badges badges={item.badges} />
          </div>
        </div>
      )}
      <div className="dish-body flex flex-col gap-2 p-4 lg:gap-3 lg:p-5">
        <div className="dish-head flex items-baseline justify-between gap-4">
          <h3 className="font-display text-lg font-medium sm:text-xl lg:text-2xl">
            {/* L'espace reste collé au nom, dans son nœud de texte : séparé,
                Chrome le perdait et lisait « Pilonsx3 ». Il est insécable, le
                format part avec le dernier mot (pas seul, en retrait, sur sa
                ligne) ; un trait d'union ne coupe pas (« Pop- / Corn »). */}
            {keepHyphenated(item.detail ? `${item.name}\u00a0` : item.name)}
            {item.detail && (
              <span
                data-detail={item.detail}
                className="dish-detail ml-1 whitespace-nowrap align-middle text-sm font-normal text-muted"
              >
                {item.detail}
              </span>
            )}
          </h3>
          <div className="flex shrink-0 flex-col items-end">
            <span className="dish-price font-display text-xl text-ember-1 lg:text-2xl">
              {/* En formats, le prix affiché est celui du plus petit : la girafe
                  de Paulaner ne coûte pas 3 €. */}
              {hasFormats(item) && "dès\u00a0"}
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
        <DishIndicators item={item} />
        <Description text={item.description} tarifs={item.tarifs} detail={item.detail} />
        <Notice hours={item.noticeHours} />
        <Allergens item={item} />
        <Pairing pairing={item.pairing} />
        <RewardHint itemId={item.id} />
        <div className="dish-action mt-1 flex justify-end">
          <AddToOrder item={item} />
        </div>
      </div>
    </article>
  );
}

export function DishCard({ item, priority, span }: { item: MenuItem; priority?: boolean; span?: boolean }) {
  return <FeaturedCard item={item} priority={priority} span={span} />;
}
