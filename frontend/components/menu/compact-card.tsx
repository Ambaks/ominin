import { formatPrice } from "@/lib/menu/format";
import type { MenuItem, OptionChoice } from "@/lib/menu-data";
import { AddToOrder } from "./add-to-order";
import { Allergens } from "./dish-card";
import { keepHyphenated } from "./keep-hyphenated";
import { RewardHint } from "./reward-hint";

const VOLUME = /\d+(?:[.,]\d+)?\s?c?l\b/i;

/**
 * « 4 cl ou bouteille », sur une ligne : du premier format, son volume
 * seul (le prix affiché est le sien) ; « ou » part avec le format qui le
 * suit, le nombre avec son unité. La minuscule après « ou », sauf à un sigle
 * (« IPA »).
 */
function formatsInfo(choices: OptionChoice[]) {
  return choices
    .map(({ name }, i) => {
      if (i === 0) return name.match(VOLUME)?.[0] ?? name;
      return `ou\u00a0${/^\p{Lu}\p{Ll}/u.test(name) ? name[0].toLowerCase() + name.slice(1) : name}`;
    })
    .join(" ")
    .replace(/(\d) (?=\p{L})/gu, "$1\u00a0");
}

/**
 * Un article d'une section en vignettes : la photo en rond, le nom, dessous
 * sa description (« Rhum ambré, ginger beer… ») puis son format (« 4 cl »)
 * ou ses formats (« 6 cl ou bouteille ») — le prix affiché est alors celui
 * du premier —, le prix et le « + » en bas. Une section ne passe en
 * vignettes que faite d'articles sans accord, pastille ni mention : la
 * fiche n'en montre pas.
 */
export function CompactCard({ item }: { item: MenuItem }) {
  const formats = item.options?.find((group) => group.formats)?.choices;

  return (
    <article data-item={item.id} className="dish-mini">
      <div className="dish-mini-thumb" aria-hidden>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
          <img src={item.image} alt="" loading="lazy" fetchPriority="low" />
        ) : (
          <span>{[...item.name][0]}</span>
        )}
      </div>
      <div className="dish-mini-text">
        <h3 className="dish-mini-name font-display">{keepHyphenated(item.name)}</h3>
        {item.description && (
          <p className="dish-mini-info dish-mini-description">{keepHyphenated(item.description)}</p>
        )}
        {(formats || item.detail) && (
          <p className="dish-mini-info">{formats ? formatsInfo(formats) : item.detail}</p>
        )}
        {item.tarif && (
          <p className="dish-mini-info dish-mini-tarif">
            {/* Une remise se lit à côté du prix barré ; une majoration barrée
                ferait croire à une bonne affaire (DishCard). */}
            {item.tarif.basePrice > item.price && <s>{formatPrice(item.tarif.basePrice)}</s>}{" "}
            {item.tarif.name}
          </p>
        )}
      </div>
      <div className="dish-mini-foot">
        <p className="dish-mini-price font-display">
          {/* « 4 cl ou bouteille » à 7 € se lisait comme le prix des deux. */}
          {formats && <small>dès</small>}
          <span>{formatPrice(item.price)}</span>
        </p>
        <div className="dish-action">
          <AddToOrder item={item} />
        </div>
      </div>
      <div className="dish-mini-extra">
        <Allergens item={item} />
        <RewardHint itemId={item.id} />
      </div>
    </article>
  );
}
