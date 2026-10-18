"use client";

import { useState } from "react";
import { ChefTag, chefCard } from "@/components/menu/chef-pairings";
import { FormuleModal, openFormule, type Picks } from "@/components/menu/formules";
import { CART_PAIRINGS_COUNT } from "@/lib/gestion/constants";
import { plainLine, useCart } from "@/lib/menu/cart";
import { formatPrice, lineName } from "@/lib/menu/format";
import { cartPairings, formuleMatch, type FormuleMatch } from "@/lib/menu/pairings";

const addClass =
  "ember-gradient min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold text-background tabular-nums transition-transform active:scale-95";

function Row({
  image,
  title,
  why,
  children,
}: {
  image?: string;
  title: string;
  why: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
        <img src={image} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-medium leading-tight">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{why}</p>
      </div>
      {children}
    </li>
  );
}

/** Les choix d'une ligne du panier, rangés par groupe comme les retient une formule. */
function linePicks({ offer, line, articleId }: FormuleMatch): Picks {
  const options: Record<string, string[]> = {};
  for (const { group_id, choice_id } of line.choices) {
    (options[group_id] ??= []).push(choice_id);
  }
  return { [offer.etapeId]: { articleId, options } };
}

/**
 * L'accord du chef au panier : une formule qu'un plat commandé entame (le
 * reste à son prix de formule), puis les accords de ce qui est commandé,
 * chacun ajouté d'un toucher.
 */
export function CartPairings() {
  const { pairings, formuleOffers, lines, closed, addLine, setQuantity, track } = useCart();
  const [composing, setComposing] = useState<FormuleMatch | null>(null);
  if (!pairings) return null;

  const match = formuleMatch(lines, formuleOffers ?? [], (offer, articleId) =>
    Boolean(
      openFormule(offer.formule, closed)
        ?.etapes.find((etape) => etape.id === offer.etapeId)
        ?.articles.some((article) => article.id === articleId)
    )
  );
  const suggested = cartPairings(
    lines,
    pairings,
    closed,
    CART_PAIRINGS_COUNT - (match ? 1 : 0)
  );

  return (
    <>
      {(match || suggested.length > 0) && (
        <section aria-label="L'accord du chef" className={`mt-5 ${chefCard}`}>
          <ChefTag>L&apos;accord du chef</ChefTag>
          <ul className="flex flex-col gap-3">
            {match && (
              <Row
                image={match.offer.rest.image}
                title={match.offer.formule.name}
                why={`Avec votre ${match.line.name} : ${match.offer.rest.name.toLowerCase()} à ${formatPrice(
                  match.extra
                )} au lieu de ${formatPrice(match.offer.rest.regularPrice)}`}
              >
                <button
                  type="button"
                  onClick={() => setComposing(match)}
                  aria-haspopup="dialog"
                  aria-label={`Composer la ${match.offer.formule.name}, ${formatPrice(match.extra)} de plus`}
                  className={addClass}
                >
                  + {formatPrice(match.extra)}
                </button>
              </Row>
            )}
            {suggested.map(({ item, why }) => (
              <Row key={item.id} image={item.image} title={lineName(item)} why={why}>
                <button
                  type="button"
                  onClick={() => {
                    addLine(plainLine(item));
                    track("panier", { items: [item.id] });
                  }}
                  aria-label={`Ajouter : ${lineName(item)}, ${formatPrice(item.price)}`}
                  className={addClass}
                >
                  + {formatPrice(item.price)}
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}
      {composing && (
        <FormuleModal
          formule={composing.offer.formule}
          initialPicks={linePicks(composing)}
          onClose={() => setComposing(null)}
          onAdded={(selections) => {
            // La formule reprend le plat commandé seul : sa ligne perd une
            // unité, sauf si le client en a choisi un autre dans la feuille.
            const kept = selections.some(
              (selection) =>
                selection.etape_id === composing.offer.etapeId &&
                selection.article_id === composing.articleId
            );
            if (kept) setQuantity(composing.line.key, composing.line.quantity - 1);
          }}
        />
      )}
    </>
  );
}
