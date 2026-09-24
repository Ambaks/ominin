"use client";

import { useState } from "react";
import { isUnavailable, OptionsModal } from "@/components/menu/add-to-order";
import { cartLineKey, useCart } from "@/lib/menu/cart";
import {
  fetchLoyaltyBalance,
  pointsEarned,
  type LoyaltyProgram,
  type LoyaltyReward,
} from "@/lib/menu/loyalty";
import type { MenuItem } from "@/lib/menu-data";

/*
 * Fidélité, dans la feuille de commande. Le client laisse son numéro ou son
 * email : son solde s'affiche, avec les paliers qu'il peut s'offrir. Un
 * article offert rejoint le panier comme une ligne à part, payée en points.
 * Changer de contact, c'est changer de solde : les lignes offertes repartent.
 */

type LookupState = "idle" | "loading" | "error";

export function LoyaltySection({
  program,
  contact,
  onContactChange,
  balance,
  onBalance,
}: {
  program: LoyaltyProgram;
  contact: string;
  onContactChange: (contact: string) => void;
  /** Solde du contact saisi ; null tant qu'il n'a pas été consulté. */
  balance: number | null;
  onBalance: (balance: number | null) => void;
}) {
  const cart = useCart();
  const [lookup, setLookup] = useState<LookupState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<{
    item: MenuItem;
    reward: LoyaltyReward;
  } | null>(null);

  const remaining = balance === null ? 0 : balance - cart.pointsSpent;
  const earned = pointsEarned(cart.earningTotal, program.pointsPerEuro);

  const changeContact = (value: string) => {
    onContactChange(value);
    if (balance !== null) {
      onBalance(null);
      cart.clearRewards();
    }
  };

  const showBalance = async () => {
    if (!contact.trim()) return;
    setLookup("loading");
    setError(null);
    try {
      const points = await fetchLoyaltyBalance(cart.slug, contact.trim());
      if (points === null) {
        setLookup("error");
        setError("Le programme de fidélité n'est plus proposé.");
        return;
      }
      onBalance(points);
      setLookup("idle");
    } catch (lookupError) {
      setLookup("error");
      setError(
        lookupError instanceof Error ? lookupError.message : "Solde introuvable."
      );
    }
  };

  const offer = (item: MenuItem, reward: LoyaltyReward) => {
    if ((item.options?.length ?? 0) > 0) {
      setPicking({ item, reward });
      return;
    }
    cart.addLine({
      key: cartLineKey(item.id, [], reward.id),
      itemId: item.id,
      name: item.name,
      unitPrice: 0,
      optionSummary: [],
      choices: [],
      stock: item.stock,
      reward: { id: reward.id, points: reward.points },
    });
    cart.track("panier", { items: [item.id] });
  };

  return (
    <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-hairline p-4">
      <div>
        <h4 className="text-sm font-semibold">Fidélité</h4>
        <p className="mt-0.5 text-xs text-muted">
          1&nbsp;€ dépensé = {program.pointsPerEuro.toLocaleString("fr-FR")}&nbsp;
          {program.pointsPerEuro > 1 ? "points" : "point"}. Laissez votre
          numéro ou votre email pour cumuler et utiliser vos points.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void showBalance();
        }}
      >
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          value={contact}
          onChange={(event) => changeContact(event.target.value)}
          placeholder="Téléphone ou email"
          aria-label="Téléphone ou email pour la fidélité"
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-ember-2/50"
        />
        <button
          type="submit"
          disabled={!contact.trim() || lookup === "loading"}
          className="shrink-0 rounded-xl border border-hairline px-3 py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          {lookup === "loading" ? "…" : "Voir mes points"}
        </button>
      </form>
      {error && <p className="text-xs text-ember-3">{error}</p>}

      {balance !== null && (
        <>
          <p className="text-sm">
            <span className="font-display text-xl font-semibold text-ember-1">
              {remaining}
            </span>{" "}
            {remaining === 1 ? "point disponible" : "points disponibles"}
            {cart.pointsSpent > 0 && (
              <span className="text-xs text-muted">
                {" "}
                ({cart.pointsSpent} utilisés sur {balance})
              </span>
            )}
          </p>
          {earned > 0 && (
            <p className="-mt-2 text-xs text-muted">
              +{earned} {earned === 1 ? "point" : "points"}{" "}
              avec cette commande,
              crédités à l&rsquo;encaissement.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {program.rewards.map((reward) => {
              const reachable = remaining >= reward.points;
              return (
                <li key={reward.id} className="flex flex-col gap-2">
                  <p className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold">{reward.label}</span>
                    <span
                      className={`shrink-0 font-semibold ${reachable ? "text-ember-1" : "text-faint"}`}
                    >
                      {reward.points}&nbsp;pts
                    </span>
                  </p>
                  {reachable ? (
                    <div className="flex flex-wrap gap-1.5">
                      {reward.items
                        .filter((item) => !isUnavailable(item))
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => offer(item, reward)}
                            className="rounded-full border border-ember-2/40 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-raised"
                          >
                            + {item.name}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-faint">
                      Encore {reward.points - remaining}{" "}
                      {reward.points - remaining === 1 ? "point" : "points"}.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {picking && (
        <OptionsModal
          item={picking.item}
          reward={{ id: picking.reward.id, points: picking.reward.points }}
          onClose={() => setPicking(null)}
          onAdded={() => {}}
        />
      )}
    </section>
  );
}
