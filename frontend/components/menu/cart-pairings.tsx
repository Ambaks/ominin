"use client";

import { useState } from "react";
import { ChefTag, chefCard, ShownMark, suggestionButton, SuggestionRow } from "@/components/menu/chef-pairings";
import { FormuleModal, openFormule, type Picks } from "@/components/menu/formules";
import { CART_PAIRINGS_COUNT } from "@/lib/gestion/constants";
import { plainLine, useCart } from "@/lib/menu/cart";
import { formatPrice, lineName } from "@/lib/menu/format";
import { cartPairings, formuleMatch, type FormuleMatch } from "@/lib/menu/pairings";

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
        <section aria-label="Le combo parfait" className={`mt-5 ${chefCard} p-3.5`}>
          {match && <ShownMark kind="formule" />}
          {suggested.length > 0 && <ShownMark kind="panier" />}
          <ChefTag />
          <ul className="flex flex-col gap-3">
            {match && (
              <li>
                <SuggestionRow
                  image={match.offer.rest.image}
                  title={match.offer.formule.name}
                  why={`${match.offer.rest.name} à ${formatPrice(match.extra)} au lieu de ${formatPrice(
                    match.offer.rest.regularPrice
                  )}`}
                >
                  <button
                    type="button"
                    onClick={() => setComposing(match)}
                    aria-haspopup="dialog"
                    aria-label={`Composer la ${match.offer.formule.name}, ${formatPrice(match.extra)} de plus`}
                    className={suggestionButton()}
                  >
                    + {formatPrice(match.extra)}
                  </button>
                </SuggestionRow>
              </li>
            )}
            {suggested.map(({ item, why, choices }) => (
              <li key={item.id}>
                <SuggestionRow image={item.image} title={lineName(item)} why={why}>
                  <button
                    type="button"
                    onClick={() => {
                      addLine(plainLine(item, "panier", choices));
                      track("panier", { items: [item.id] });
                    }}
                    aria-label={`Ajouter : ${lineName(item)}, ${formatPrice(item.price)}`}
                    className={suggestionButton()}
                  >
                    + {formatPrice(item.price)}
                  </button>
                </SuggestionRow>
              </li>
            ))}
          </ul>
        </section>
      )}
      {composing && (
        <FormuleModal
          formule={composing.offer.formule}
          initialPicks={linePicks(composing)}
          accord="formule"
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
