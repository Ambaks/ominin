import {
  BADGE_LABELS,
  formatPrice,
  stockSrcSet,
  typographie,
  typographieNom,
  type Badge,
  type MenuItem,
} from "@/lib/menu-data";
import { AddToOrder, DishPhotoOpener } from "./add-to-order";

function Badges({ badges, className = "" }: { badges?: Badge[]; className?: string }) {
  if (!badges?.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
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
 */
function Description({ text }: { text?: string }) {
  if (!text) return null;
  const className = "text-sm leading-relaxed text-muted lg:text-[15px]";
  const lines = typographie(text).split("\n");
  if (lines.length === 1) return <p className={className}>{lines[0]}</p>;
  return (
    <ul className={`dish-lines ${className}`}>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function Pairing({ pairing }: { pairing?: string }) {
  if (!pairing) return null;
  return (
    <p className="font-display text-[13px] italic text-ember-1/85">{pairing}</p>
  );
}

/** Large photo card for featured items. */
function FeaturedCard({
  item,
  priority,
  featured,
  nameShown = true,
  photo = true,
}: {
  item: MenuItem;
  priority?: boolean;
  /** Plat vedette de sa section : un thème peut le mettre en grand. */
  featured?: boolean;
  /** Faux : la ligne se lit sans photo (Restaurant.tilesAsLines). */
  photo?: boolean;
  /** Faux : le nom redit le titre de la section, il ne reste que pour les lecteurs d'écran. */
  nameShown?: boolean;
}) {
  return (
    <article
      data-featured={featured || undefined}
      className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-300 hover:border-ember-2/45 lg:rounded-3xl">
      {item.image && photo && (
        <div className="dish-photo relative aspect-video overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image */}
          <img
            src={item.image}
            // Le plat vedette s'affiche en grand : sa photo de banque est
            // demandée à la taille de l'écran (vignettes : la source suffit).
            srcSet={featured ? stockSrcSet(item.image, [640, 960, 1280]) : undefined}
            sizes={featured ? "(min-width: 1024px) 34rem, 100vw" : undefined}
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
          <div className="dish-badges absolute left-4 top-4">
            <Badges badges={item.badges} />
          </div>
          <DishPhotoOpener item={item} />
        </div>
      )}
      <div className="dish-body flex flex-col gap-2 p-4 lg:gap-3 lg:p-5">
        <div className="dish-head flex items-baseline justify-between gap-4">
          <h3
            className={`font-display text-lg font-medium sm:text-xl lg:text-2xl ${nameShown ? "" : "sr-only"}`}
          >
            {/* Nom et espace en un seul nœud de texte : séparés, Chrome
                perdait l'espace et lisait « Pilonsx3 ». */}
            {typographieNom(item.detail ? `${item.name} ` : item.name)}
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
        {/* Les mêmes étiquettes sous le nom, masquées par défaut : un thème
            qui montre des vignettes trop petites pour elles les fait passer
            ici (.theme-boho) — l'une des deux copies reste en display: none. */}
        <Badges badges={item.badges} className="dish-badges-inline hidden" />
        <Description text={item.description} />
        <Pairing pairing={item.pairing} />
        <div className="dish-action mt-1 flex justify-end">
          <AddToOrder item={item} />
        </div>
      </div>
    </article>
  );
}

export function DishCard({
  item,
  priority,
  featured,
  nameShown,
  photo,
}: {
  item: MenuItem;
  priority?: boolean;
  featured?: boolean;
  nameShown?: boolean;
  photo?: boolean;
}) {
  return (
    <FeaturedCard
      item={item}
      priority={priority}
      featured={featured}
      nameShown={nameShown}
      photo={photo}
    />
  );
}
